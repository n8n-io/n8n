import { Logger } from '@n8n/backend-common';
import {
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	encodeMessage,
	decodeMessage,
	isMapChange,
	type CRDTDoc,
	type CRDTMap,
	type Unsubscribe,
} from '@n8n/crdt';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Application } from 'express';
import type { IncomingMessage, Server } from 'http';
import { ServerResponse } from 'http';
import type {
	INode,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodePropertyOptions,
	INodeTypeDescription,
	IWorkflowBase,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeHelpers, Workflow } from 'n8n-workflow';
import { parse as parseUrl } from 'url';
import { v4 as uuid } from 'uuid';
import type { WebSocket } from 'ws';
import { Server as WSServer } from 'ws';

import { AuthService } from '@/auth/auth.service';
import { NodeTypes } from '@/node-types';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { CRDTState, WorkflowRoom, type ComputedHandle, type NodeSeedData } from './crdt-state';
import { calculateNodeSize } from './node-size-calculator';
import { syncWorkflowWithDoc } from './sync-workflow-with-doc';

interface CRDTConnection {
	ws: WebSocket;
	userId: User['id'];
	docId: string;
}

interface CRDTWebSocketRequest extends AuthenticatedRequest<{}, {}, {}, { docId?: string }> {
	ws?: WebSocket;
}

/**
 * WebSocket service for CRDT document synchronization.
 *
 * Provides a dedicated /crdt endpoint that handles binary sync messages
 * directly, without going through the push connection.
 */
@Service()
export class CRDTWebSocketService {
	private wsServer: WSServer | null = null;

	/** Active connections by docId */
	private connections = new Map<string, Set<CRDTConnection>>();

	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly state: CRDTState,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowHistoryService: WorkflowHistoryService,
	) {}

	/**
	 * Set up WebSocket server upgrade handler
	 */
	setupWebSocketServer(restEndpoint: string, server: Server, app: Application) {
		this.wsServer = new WSServer({ noServer: true });

		server.on('upgrade', (request: IncomingMessage, socket, upgradeHead) => {
			const pathname = parseUrl(request.url ?? '').pathname;

			if (pathname === `/${restEndpoint}/crdt`) {
				this.wsServer!.handleUpgrade(request, socket, upgradeHead, (ws) => {
					// Attach ws to request for use in handler
					(request as unknown as CRDTWebSocketRequest).ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-expect-error `handle` isn't documented
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});
	}

	/**
	 * Set up the /crdt endpoint handler
	 */
	setupCRDTHandler(restEndpoint: string, app: Application) {
		app.use(
			`/${restEndpoint}/crdt`,
			this.authService.createAuthMiddleware({ allowSkipMFA: false }),
			async (req: CRDTWebSocketRequest, res: ServerResponse) =>
				await this.handleConnection(req, res),
		);
	}

	private async handleConnection(req: CRDTWebSocketRequest, res: ServerResponse) {
		const { ws, user } = req;
		const docId = req.query.docId;

		if (!ws) {
			res.statusCode = 400;
			res.end('WebSocket connection required');
			return;
		}

		if (!user) {
			ws.close(1008, 'Authentication required');
			return;
		}

		if (!docId) {
			ws.close(1008, 'Missing docId parameter');
			return;
		}

		this.logger.debug('[CRDT] WebSocket connected', { docId, userId: user.id });

		// Seed workflow data on first connection
		if (this.state.needsSeeding(docId)) {
			try {
				await this.seedWorkflowDoc(docId);
			} catch (error) {
				this.logger.error('Failed to seed workflow', { docId, error });
				ws.close(1011, 'Failed to load workflow');
				return;
			}
		}

		const connection: CRDTConnection = { ws, userId: user.id, docId };
		this.addConnection(connection);

		// Set binary type for efficient transfer
		ws.binaryType = 'arraybuffer';

		// Send initial state (with sync message prefix)
		const initialState = this.state.getStateBytes(docId);
		this.sendMessage(ws, MESSAGE_SYNC, initialState);

		// Send initial awareness state if available
		const awarenessState = this.state.getAwarenessBytes(docId);
		if (awarenessState.length > 0) {
			this.sendMessage(ws, MESSAGE_AWARENESS, awarenessState);
		}

		// Handle incoming messages
		ws.on('message', (data: ArrayBuffer | Buffer) => {
			this.handleMessage(connection, data);
		});

		ws.on('close', () => {
			this.removeConnection(connection);
			this.logger.debug('[CRDT] WebSocket disconnected', { docId, userId: user.id });
		});

		ws.on('error', (error) => {
			this.logger.error('[CRDT] WebSocket error', { docId, userId: user.id, error });
			this.removeConnection(connection);
		});
	}

	/**
	 * Load workflow from database and seed into CRDT document.
	 * Also creates a Workflow instance and sets up sync with the CRDT document.
	 *
	 * Handles are computed server-side using NodeHelpers.getNodeInputs/getNodeOutputs
	 * to avoid expression evaluation on the main thread in the frontend.
	 */
	private async seedWorkflowDoc(docId: string): Promise<void> {
		// docId is the workflow ID
		const workflowEntity = await this.workflowRepository.findById(docId);

		if (!workflowEntity) {
			throw new Error(`Workflow not found: ${docId}`);
		}

		// Create a Workflow instance FIRST (needed for handle computation)
		const workflow = new Workflow({
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: workflowEntity.nodes,
			connections: workflowEntity.connections,
			active: workflowEntity.activeVersionId !== null,
			nodeTypes: this.nodeTypes,
			staticData: workflowEntity.staticData,
			settings: workflowEntity.settings,
		});

		// Compute handles for each node and prepare seed data
		const nodesWithHandles = this.computeNodeHandles(workflow, workflowEntity.nodes);

		// Seed the CRDT document with workflow data including pre-computed handles
		this.state.seedWorkflow(docId, {
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: nodesWithHandles,
			connections: workflowEntity.connections,
			settings: workflowEntity.settings as Record<string, unknown> | undefined,
		});

		// Set up sync between CRDT document and Workflow instance
		const doc = this.state.getDoc(docId);
		const syncUnsub = syncWorkflowWithDoc(doc, workflow);

		// Set up handle recomputation when parameters change
		const handleUnsub = this.setupHandleRecomputation(doc, workflow);

		// Subscribe to document updates to broadcast server-side changes (like handle recomputation)
		// to all connected clients
		const updateUnsub = doc.onUpdate((update) => {
			this.broadcastToAll(docId, MESSAGE_SYNC, update);
		});

		// Combined unsubscribe
		const unsubscribe = () => {
			syncUnsub();
			handleUnsub();
			updateUnsub();
		};

		// Create the workflow room with a save callback
		this.state.createWorkflowRoom(
			docId,
			workflow,
			unsubscribe,
			workflowEntity.versionId,
			async (room) => await this.saveWorkflow(room),
		);

		this.logger.debug('[CRDT] Seeded workflow into CRDT document', {
			docId,
			workflowId: workflowEntity.id,
			nodeCount: workflowEntity.nodes.length,
			versionId: workflowEntity.versionId,
		});
	}

	/**
	 * Compute input and output handles and subtitle for all nodes in a workflow.
	 * Uses NodeHelpers.getNodeInputs/getNodeOutputs which can evaluate expressions.
	 */
	private computeNodeHandles(workflow: Workflow, nodes: INode[]): NodeSeedData[] {
		return nodes.map((node) => {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const nodeTypeDescription = nodeType?.description;

			let inputs: ComputedHandle[] = [];
			let outputs: ComputedHandle[] = [];
			let subtitle: string | undefined;

			if (nodeTypeDescription) {
				// Compute inputs
				const rawInputs = NodeHelpers.getNodeInputs(workflow, node, nodeTypeDescription);
				inputs = this.normalizeHandles(rawInputs, 'inputs');

				// Compute outputs
				const rawOutputs = NodeHelpers.getNodeOutputs(workflow, node, nodeTypeDescription);
				outputs = this.normalizeHandles(rawOutputs, 'outputs');

				// Compute subtitle
				subtitle = this.computeNodeSubtitle(workflow, node, nodeTypeDescription);
			}

			return {
				...node,
				inputs,
				outputs,
				subtitle,
			} as NodeSeedData;
		});
	}

	/**
	 * Normalize raw inputs/outputs into ComputedHandle format.
	 * Handles both simple string types and full configuration objects.
	 */
	private normalizeHandles(
		rawHandles: Array<NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration>,
		mode: 'inputs' | 'outputs',
	): ComputedHandle[] {
		const handles: ComputedHandle[] = [];

		// Group by type to compute correct indices
		const byType = new Map<string, number>();

		for (const raw of rawHandles) {
			// Normalize to object form
			const config = typeof raw === 'string' ? { type: raw } : (raw as INodeInputConfiguration);

			const type = config.type;
			const currentIndex = byType.get(type) ?? 0;
			byType.set(type, currentIndex + 1);

			handles.push({
				handleId: `${mode}/${type}/${currentIndex}`,
				type,
				mode,
				index: currentIndex,
				displayName: config.displayName,
				required: config.required,
				maxConnections: config.maxConnections,
			});
		}

		return handles;
	}

	/**
	 * Compute subtitle for a node using the same logic as frontend useNodeHelpers.
	 * Priority: notesInFlow > nodeType.subtitle expression > operation display name
	 */
	private computeNodeSubtitle(
		workflow: Workflow,
		node: INode,
		nodeType: INodeTypeDescription,
	): string | undefined {
		// 1. Notes in flow
		if (node.notesInFlow && node.notes) {
			return node.notes;
		}

		// 2. Node type subtitle expression
		if (nodeType.subtitle !== undefined) {
			try {
				return workflow.expression.getSimpleParameterValue(
					node,
					nodeType.subtitle,
					'internal',
					{},
					undefined,
					undefined,
				) as string | undefined;
			} catch {
				// Expression evaluation failed, fall through
			}
		}

		// 3. Operation parameter display name
		if (node.parameters?.operation !== undefined) {
			const operation = node.parameters.operation as string;
			const operationProp = nodeType.properties?.find((p) => p.name === 'operation');
			if (operationProp?.options) {
				const option = operationProp.options.find(
					(o) => (o as INodePropertyOptions).value === operation,
				);
				if (option) {
					return (option as INodePropertyOptions).name;
				}
			}
			return operation;
		}

		return undefined;
	}

	/**
	 * Set up handle recomputation when nodes are added or parameters change.
	 * This is necessary because:
	 * - Newly added nodes need their handles computed server-side
	 * - Handles can be dynamic based on parameter values (e.g., Merge node's numberInputs)
	 */
	private setupHandleRecomputation(doc: CRDTDoc, workflow: Workflow): Unsubscribe {
		const nodesMap = doc.getMap<unknown>('nodes');

		const nodesUnsub = nodesMap.onDeepChange((changes) => {
			// Track nodes that need handle computation
			const affectedNodeIds = new Set<string>();

			for (const change of changes) {
				// Only process map changes (not array changes)
				if (!isMapChange(change)) continue;

				const nodeId = change.path[0] as string;
				if (!nodeId) continue;

				// Case 1: New node added (path length 1, action 'add')
				// When a node is added, path is [nodeId] and action is 'add'
				if (change.path.length === 1 && change.action === 'add') {
					affectedNodeIds.add(nodeId);
				}
				// Case 2: Parameter changed (path format: [nodeId, 'parameters', ...paramPath])
				else if (change.path.length >= 2 && change.path[1] === 'parameters') {
					affectedNodeIds.add(nodeId);
				}
			}

			if (affectedNodeIds.size === 0) return;

			// Recompute handles for affected nodes
			doc.transact(() => {
				for (const nodeId of affectedNodeIds) {
					const nodeMap = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (!nodeMap) continue;

					// Read node data directly from CRDT (not from Workflow instance)
					// This ensures we have the latest parameters, since multiple onDeepChange
					// handlers may fire in undefined order
					const node = this.crdtNodeMapToINode(nodeMap, nodeId);
					if (!node) continue;

					const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
					if (!nodeType?.description) continue;

					// Recompute handles using the fresh node data from CRDT
					const rawInputs = NodeHelpers.getNodeInputs(workflow, node, nodeType.description);
					const newInputs = this.normalizeHandles(rawInputs, 'inputs');

					const rawOutputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType.description);
					const newOutputs = this.normalizeHandles(rawOutputs, 'outputs');

					// Update handles in CRDT
					this.updateHandlesInCRDT(doc, nodeMap, 'inputs', newInputs);
					this.updateHandlesInCRDT(doc, nodeMap, 'outputs', newOutputs);

					// Compute and store node size based on updated handles
					const size = calculateNodeSize({ inputs: newInputs, outputs: newOutputs });
					nodeMap.set('size', [size.width, size.height]);

					// Recompute subtitle
					const newSubtitle = this.computeNodeSubtitle(workflow, node, nodeType.description);
					if (newSubtitle !== undefined) {
						nodeMap.set('subtitle', newSubtitle);
					} else {
						nodeMap.delete('subtitle');
					}
				}
			});
		});

		return nodesUnsub;
	}

	/**
	 * Convert a CRDT node map to an INode object.
	 * Reads directly from CRDT to get the latest data.
	 *
	 * @param nodeMap The CRDT map containing node data
	 * @param nodeIdFallback Optional node ID to use if 'id' is not stored in the map
	 */
	private crdtNodeMapToINode(nodeMap: CRDTMap<unknown>, nodeIdFallback?: string): INode | null {
		const id = (nodeMap.get('id') as string | undefined) ?? nodeIdFallback;
		const name = nodeMap.get('name') as string | undefined;
		const type = nodeMap.get('type') as string | undefined;
		const typeVersion = nodeMap.get('typeVersion') as number | undefined;
		const position = nodeMap.get('position') as [number, number] | undefined;

		if (!id || !name || !type) return null;

		// Get parameters - handle both CRDTMap and plain object
		const rawParams = nodeMap.get('parameters');
		let parameters: Record<string, unknown> = {};
		if (rawParams && typeof rawParams === 'object') {
			if ('toJSON' in rawParams) {
				parameters = (rawParams as { toJSON(): Record<string, unknown> }).toJSON();
			} else {
				parameters = rawParams as Record<string, unknown>;
			}
		}

		return {
			id,
			name,
			type,
			typeVersion: typeVersion ?? 1,
			position: position ?? [0, 0],
			parameters,
		} as INode;
	}

	/**
	 * Update handles array in CRDT for a node.
	 */
	private updateHandlesInCRDT(
		doc: CRDTDoc,
		nodeMap: CRDTMap<unknown>,
		key: 'inputs' | 'outputs',
		handles: ComputedHandle[],
	): void {
		// Create new handles array
		const handlesArray = doc.createArray<unknown>();
		for (const handle of handles) {
			const handleMap = doc.createMap<unknown>();
			handleMap.set('handleId', handle.handleId);
			handleMap.set('type', handle.type);
			handleMap.set('mode', handle.mode);
			handleMap.set('index', handle.index);
			if (handle.displayName) handleMap.set('displayName', handle.displayName);
			if (handle.required !== undefined) handleMap.set('required', handle.required);
			if (handle.maxConnections !== undefined)
				handleMap.set('maxConnections', handle.maxConnections);
			handlesArray.push(handleMap);
		}
		nodeMap.set(key, handlesArray);
	}

	private handleMessage(connection: CRDTConnection, data: ArrayBuffer | Buffer) {
		const { docId, userId } = connection;

		const rawData = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer);
		const { messageType, payload } = decodeMessage(rawData);

		if (messageType === MESSAGE_SYNC) {
			this.logger.debug('[CRDT] Received sync message', {
				docId,
				userId,
				payloadSize: payload.length,
			});

			// Apply sync update and broadcast to other clients
			this.state.applyUpdateBytes(docId, payload);
			this.broadcastMessage(docId, MESSAGE_SYNC, payload, connection);

			// Schedule a debounced save via the room
			const room = this.state.getRoom(docId);
			room?.scheduleSave();
		} else if (messageType === MESSAGE_AWARENESS) {
			// Apply awareness update and broadcast to other clients
			this.state.applyAwarenessBytes(docId, payload);
			this.broadcastMessage(docId, MESSAGE_AWARENESS, payload, connection);
		} else {
			this.logger.warn('[CRDT] Unknown message type', { docId, messageType });
		}
	}

	/**
	 * Send an encoded message to a client.
	 */
	private sendMessage(ws: WebSocket, messageType: number, payload: Uint8Array) {
		if (ws.readyState === ws.OPEN) {
			ws.send(encodeMessage(messageType, payload));
		}
	}

	/**
	 * Broadcast an encoded message to all clients except sender.
	 */
	private broadcastMessage(
		docId: string,
		messageType: number,
		payload: Uint8Array,
		sender: CRDTConnection,
	) {
		const docConnections = this.connections.get(docId);
		if (!docConnections) return;

		for (const conn of docConnections) {
			if (conn !== sender && conn.ws.readyState === conn.ws.OPEN) {
				this.sendMessage(conn.ws, messageType, payload);
			}
		}
	}

	/**
	 * Broadcast an encoded message to ALL connected clients (no sender exclusion).
	 * Used for server-originated updates like handle recomputation.
	 */
	private broadcastToAll(docId: string, messageType: number, payload: Uint8Array) {
		const docConnections = this.connections.get(docId);
		if (!docConnections) return;

		for (const conn of docConnections) {
			if (conn.ws.readyState === conn.ws.OPEN) {
				this.sendMessage(conn.ws, messageType, payload);
			}
		}
	}

	private addConnection(connection: CRDTConnection) {
		const { docId } = connection;
		let docConnections = this.connections.get(docId);
		if (!docConnections) {
			docConnections = new Set();
			this.connections.set(docId, docConnections);
		}
		docConnections.add(connection);
	}

	private removeConnection(connection: CRDTConnection) {
		const { docId } = connection;
		const docConnections = this.connections.get(docId);
		if (docConnections) {
			docConnections.delete(connection);
			if (docConnections.size === 0) {
				this.connections.delete(docId);
				this.logger.debug('[CRDT] Last connection removed, closing room', { docId });

				// Trigger final save via the room, then clean up
				const room = this.state.getRoom(docId);
				if (room) {
					void room.finalSave().finally(() => {
						this.state.cleanupDoc(docId);
						this.logger.debug('[CRDT] Room closed, document cleaned up', { docId });
					});
				} else {
					this.state.cleanupDoc(docId);
				}
			}
		}
	}

	/**
	 * Save the workflow from a room to the database.
	 * Only saves if there are unsaved changes (dirty flag set by scheduleSave).
	 * Creates a new version in workflow history when saving.
	 */
	private async saveWorkflow(room: WorkflowRoom): Promise<void> {
		const docId = room.doc.id;
		this.logger.debug('[CRDT] saveWorkflow called', { docId });

		// Skip if no changes since last save
		if (!room.hasUnsavedChanges()) {
			this.logger.debug('[CRDT] No changes to save, skipping', { docId });
			return;
		}

		const { workflow } = room;

		try {
			// Convert nodes from object to array format for database
			const nodes = Object.values(workflow.nodes);
			const connections = workflow.connectionsBySourceNode;

			// Generate a new versionId for this save
			const versionId = uuid();

			// Save to workflow history (saveVersion only uses nodes, connections, versionId)
			await this.workflowHistoryService.saveVersion(
				'CRDT Sync',
				{ nodes, connections, versionId } as IWorkflowBase,
				docId,
				true,
			);

			// Update the main workflow record
			await this.workflowRepository.update(
				{ id: docId },
				{
					name: workflow.name,
					nodes,
					connections,
					settings: workflow.settings,
					versionId,
					updatedAt: new Date(),
				},
			);

			// Mark room as clean after successful save
			room.markClean();

			this.logger.debug('[CRDT] Saved workflow to database', {
				docId,
				workflowId: workflow.id,
				versionId,
				nodeCount: nodes.length,
				connectionCount: Object.keys(connections).length,
			});
		} catch (error) {
			this.logger.error('[CRDT] Failed to save workflow', { docId, error });
		}
	}
}
