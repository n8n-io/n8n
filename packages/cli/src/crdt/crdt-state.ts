import { Logger } from '@n8n/backend-common';
import {
	CRDTEngine,
	createCRDTProvider,
	seedValueDeep,
	type CRDTDoc,
	type Unsubscribe,
} from '@n8n/crdt';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import debounce from 'lodash/debounce';
import type { IConnections, Workflow } from 'n8n-workflow';

import { calculateNodeSize } from './node-size-calculator';

interface Subscriber {
	userId: User['id'];
	pushRef: string;
}

/**
 * Flat edge format stored in CRDT (Vue Flow native).
 */
export interface CRDTEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle: string;
	targetHandle: string;
}

/**
 * Computed handle for a node (Vue Flow compatible).
 * Pre-computed on the server to avoid expression evaluation on the main thread.
 */
export interface ComputedHandle {
	handleId: string; // e.g., "inputs/main/0" or "outputs/ai_tool/1"
	type: string; // NodeConnectionType (e.g., "main", "ai_tool")
	mode: 'inputs' | 'outputs';
	index: number;
	displayName?: string;
	required?: boolean;
	maxConnections?: number;
}

/**
 * Node data for seeding, including pre-computed handles and subtitle.
 */
export interface NodeSeedData {
	id: string;
	name: string;
	inputs?: ComputedHandle[];
	outputs?: ComputedHandle[];
	/** Pre-computed subtitle from expression evaluation */
	subtitle?: string;
	[key: string]: unknown;
}

/**
 * Data structure for seeding a workflow into a CRDT document.
 */
export interface WorkflowSeedData {
	id: string;
	name: string;
	nodes: NodeSeedData[];
	connections: IConnections;
	settings?: Record<string, unknown>;
}

/**
 * Convert IConnections (nested format) to flat edges (Vue Flow format).
 *
 * @param connections - IConnections from workflow
 * @param nodeIdByName - Map from node name to node ID
 * @returns Flat edges array
 */
function iConnectionsToEdges(
	connections: IConnections,
	nodeIdByName: Map<string, string>,
): CRDTEdge[] {
	const edges: CRDTEdge[] = [];

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		const sourceId = nodeIdByName.get(sourceName);
		if (!sourceId) continue;

		for (const [type, outputs] of Object.entries(sourceConns)) {
			if (!outputs) continue;

			outputs.forEach((targets, outputIndex) => {
				if (!targets) return;

				targets.forEach((target) => {
					const targetId = nodeIdByName.get(target.node);
					if (!targetId) return;

					const sourceHandle = `outputs/${type}/${outputIndex}`;
					const targetHandle = `inputs/${target.type}/${target.index}`;

					edges.push({
						id: `[${sourceId}/${sourceHandle}][${targetId}/${targetHandle}]`,
						source: sourceId,
						target: targetId,
						sourceHandle,
						targetHandle,
					});
				});
			});
		}
	}

	return edges;
}

const DEBOUNCE_DELAY_MS = 1500; // 1.5 seconds
const MAX_WAIT_MS = 5000; // 5 seconds max wait

/**
 * A workflow room manages a single CRDT document and its associated workflow.
 * Handles debounced autosaving and change detection.
 *
 * Note: We use a simple "dirty" flag for change detection instead of state vector
 * comparison because Yjs deletions are tombstones that don't increment the deleting
 * client's clock - they just reference existing items. This means state vectors
 * don't change for deletion-only updates.
 */
export class WorkflowRoom {
	private readonly debouncedSave: ReturnType<typeof debounce>;
	private isDirty = false;

	constructor(
		readonly doc: CRDTDoc,
		readonly workflow: Workflow,
		private readonly unsubscribe: Unsubscribe,
		readonly originalVersionId: string,
		private readonly saveCallback: (room: WorkflowRoom) => Promise<void>,
		private readonly logger: Logger,
	) {
		this.debouncedSave = debounce(
			() => {
				this.logger.debug('[CRDT] Executing debounced save', { docId: doc.id });
				void this.saveCallback(this);
			},
			DEBOUNCE_DELAY_MS,
			{ maxWait: MAX_WAIT_MS },
		);
	}

	/**
	 * Schedule a debounced save. Call this after each document update.
	 * Marks the room as dirty (has unsaved changes).
	 */
	scheduleSave(): void {
		this.isDirty = true;
		this.debouncedSave();
	}

	/**
	 * Check if there are unsaved changes.
	 */
	hasUnsavedChanges(): boolean {
		this.logger.debug('[CRDT] Checking unsaved changes', {
			docId: this.doc.id,
			isDirty: this.isDirty,
		});
		return this.isDirty;
	}

	/**
	 * Mark the room as clean (no unsaved changes) after a successful save.
	 */
	markClean(): void {
		this.isDirty = false;
		this.logger.debug('[CRDT] Marked room as clean', { docId: this.doc.id });
	}

	/**
	 * Cancel any pending debounced save and trigger an immediate final save.
	 * Returns a promise that resolves when the save completes.
	 */
	async finalSave(): Promise<void> {
		this.debouncedSave.cancel();
		this.logger.debug('[CRDT] Triggering final save', { docId: this.doc.id });
		await this.saveCallback(this);
	}

	/**
	 * Clean up resources.
	 */
	destroy(): void {
		this.debouncedSave.cancel();
		this.unsubscribe();
	}
}

/**
 * In-memory state management for CRDT documents.
 *
 * For production use, this would need to be extended with:
 * - Database persistence
 * - Document cleanup on inactivity
 * - Multi-instance support via pubsub
 */
@Service()
export class CRDTState {
	/** CRDT documents by docId */
	private docs = new Map<string, CRDTDoc>();

	/** Workflow rooms by docId - each room has a doc, workflow, and sync subscriptions */
	private rooms = new Map<string, WorkflowRoom>();

	/** Track which documents have been seeded with initial data */
	private seededDocs = new Set<string>();

	/** Subscribers by docId */
	private subscribers = new Map<string, Subscriber[]>();

	/** pushRef to docIds mapping for cleanup */
	private pushRefDocs = new Map<string, Set<string>>();

	private readonly provider = createCRDTProvider({ engine: CRDTEngine.yjs });

	constructor(private readonly logger: Logger) {}

	/**
	 * Get or create a CRDT document
	 */
	private getOrCreateDoc(docId: string): CRDTDoc {
		let doc = this.docs.get(docId);
		if (!doc) {
			doc = this.provider.createDoc(docId);
			this.docs.set(docId, doc);
			this.logger.debug('Created CRDT document', { docId });
		}
		return doc;
	}

	/**
	 * Get the current state of a document as Uint8Array
	 */
	getStateBytes(docId: string): Uint8Array {
		const doc = this.getOrCreateDoc(docId);
		return doc.encodeState();
	}

	/**
	 * Apply an update (Uint8Array) to a document
	 */
	applyUpdateBytes(docId: string, update: Uint8Array): void {
		const doc = this.getOrCreateDoc(docId);
		doc.applyUpdate(update);
		this.logger.debug('[CRDT] Applied update', { docId, size: update.length });
	}

	/**
	 * Get the current awareness state as Uint8Array
	 */
	getAwarenessBytes(docId: string): Uint8Array {
		const doc = this.getOrCreateDoc(docId);
		const awareness = doc.getAwareness();
		return awareness.encodeState();
	}

	/**
	 * Apply an awareness update (Uint8Array) to a document
	 */
	applyAwarenessBytes(docId: string, update: Uint8Array): void {
		const doc = this.getOrCreateDoc(docId);
		const awareness = doc.getAwareness();
		awareness.applyUpdate(update);
	}

	/**
	 * Add a subscriber to a document
	 */
	addSubscriber(docId: string, userId: User['id'], pushRef: string): void {
		let subs = this.subscribers.get(docId);
		if (!subs) {
			subs = [];
			this.subscribers.set(docId, subs);
		}

		// Don't add duplicates
		if (!subs.some((s) => s.pushRef === pushRef)) {
			subs.push({ userId, pushRef });
			this.logger.debug('Added subscriber', { docId, pushRef });
		}

		// Track pushRef -> docIds for cleanup
		let docIds = this.pushRefDocs.get(pushRef);
		if (!docIds) {
			docIds = new Set();
			this.pushRefDocs.set(pushRef, docIds);
		}
		docIds.add(docId);
	}

	/**
	 * Get all subscribers for a document
	 */
	getSubscribers(docId: string): Subscriber[] {
		return this.subscribers.get(docId) || [];
	}

	/**
	 * Remove a subscriber from all documents (e.g., on disconnect)
	 */
	removeSubscriber(pushRef: string): void {
		const docIds = this.pushRefDocs.get(pushRef);
		if (!docIds) return;

		for (const docId of docIds) {
			const subs = this.subscribers.get(docId);
			if (subs) {
				const index = subs.findIndex((s) => s.pushRef === pushRef);
				if (index !== -1) {
					subs.splice(index, 1);
					this.logger.debug('Removed subscriber', { docId, pushRef });

					// Cleanup empty subscriber lists and potentially docs
					if (subs.length === 0) {
						this.subscribers.delete(docId);
						// Optionally destroy doc if no subscribers
						// For now, keep it in memory for subsequent connections
					}
				}
			}
		}

		this.pushRefDocs.delete(pushRef);
	}

	/**
	 * Get document for direct access (e.g., for initial data seeding)
	 */
	getDoc(docId: string): CRDTDoc {
		return this.getOrCreateDoc(docId);
	}

	/**
	 * Clean up a document when no more connections exist.
	 * This removes the document from memory and clears seeded state.
	 */
	cleanupDoc(docId: string): void {
		const room = this.rooms.get(docId);
		if (room) {
			room.destroy();
			this.rooms.delete(docId);
		}

		const doc = this.docs.get(docId);
		if (doc) {
			doc.destroy();
			this.docs.delete(docId);
			this.seededDocs.delete(docId);
			this.logger.debug('Cleaned up CRDT document', { docId });
		}
	}

	/**
	 * Create and register a workflow room for a document.
	 * The room handles its own debounced saving via the provided callback.
	 */
	createWorkflowRoom(
		docId: string,
		workflow: Workflow,
		unsubscribe: Unsubscribe,
		originalVersionId: string,
		saveCallback: (room: WorkflowRoom) => Promise<void>,
	): WorkflowRoom {
		const doc = this.docs.get(docId);
		if (!doc) {
			throw new Error(`Document not found: ${docId}`);
		}

		const room = new WorkflowRoom(
			doc,
			workflow,
			unsubscribe,
			originalVersionId,
			saveCallback,
			this.logger,
		);
		this.rooms.set(docId, room);
		this.logger.debug('[CRDT] Created workflow room', { docId, workflowId: workflow.id });
		return room;
	}

	/**
	 * Get the workflow room for a document.
	 * Returns undefined if the document doesn't have an associated room.
	 */
	getRoom(docId: string): WorkflowRoom | undefined {
		return this.rooms.get(docId);
	}

	/**
	 * Check if a document needs to be seeded with initial data.
	 * Returns true if the document hasn't been seeded yet.
	 */
	needsSeeding(docId: string): boolean {
		return !this.seededDocs.has(docId);
	}

	/**
	 * Seed a document with workflow data.
	 * This should only be called once per document (on first connection).
	 *
	 * Converts IConnections to flat edges format for CRDT storage.
	 */
	seedWorkflow(docId: string, workflow: WorkflowSeedData): void {
		if (this.seededDocs.has(docId)) {
			this.logger.debug('Document already seeded, skipping', { docId });
			return;
		}

		const doc = this.getOrCreateDoc(docId);

		// Build node name -> id lookup for edge conversion
		const nodeIdByName = new Map<string, string>();
		for (const node of workflow.nodes) {
			if (node.id && node.name) {
				nodeIdByName.set(node.name, node.id);
			}
		}

		// Convert IConnections to flat edges
		const edges = iConnectionsToEdges(workflow.connections, nodeIdByName);

		doc.transact(() => {
			// Seed workflow metadata
			const meta = doc.getMap<unknown>('meta');
			meta.set('id', workflow.id);
			meta.set('name', workflow.name);
			if (workflow.settings) {
				meta.set('settings', workflow.settings);
			}

			// Seed nodes - each node is a nested CRDTMap for fine-grained updates
			const nodesMap = doc.getMap<unknown>('nodes');
			for (const node of workflow.nodes) {
				if (node.id) {
					// Create a nested CRDTMap for this node
					const nodeMap = doc.createMap<unknown>();
					for (const [key, value] of Object.entries(node)) {
						if (key === 'parameters' && value !== undefined) {
							// Deep seed parameters for fine-grained conflict resolution
							// This allows concurrent edits to different parameter fields
							nodeMap.set(key, seedValueDeep(doc, value));
						} else if ((key === 'inputs' || key === 'outputs') && Array.isArray(value)) {
							// Store pre-computed handles as CRDT arrays
							const handlesArray = doc.createArray<unknown>();
							for (const handle of value as ComputedHandle[]) {
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
						} else {
							// Other node properties (id, type, name, position, etc.) stored flat
							nodeMap.set(key, value);
						}
					}

					// Compute and store node size based on handles
					const size = calculateNodeSize({
						inputs: node.inputs ?? [],
						outputs: node.outputs ?? [],
					});
					nodeMap.set('size', [size.width, size.height]);

					nodesMap.set(node.id, nodeMap);
				}
			}

			// Seed edges (flat format, Vue Flow compatible)
			const edgesMap = doc.getMap<unknown>('edges');
			for (const edge of edges) {
				const edgeMap = doc.createMap<unknown>();
				edgeMap.set('source', edge.source);
				edgeMap.set('target', edge.target);
				edgeMap.set('sourceHandle', edge.sourceHandle);
				edgeMap.set('targetHandle', edge.targetHandle);
				edgesMap.set(edge.id, edgeMap);
			}
		});

		this.seededDocs.add(docId);
		this.logger.debug('Seeded workflow into CRDT document', {
			docId,
			workflowId: workflow.id,
			nodeCount: workflow.nodes.length,
			edgeCount: edges.length,
		});
	}
}
