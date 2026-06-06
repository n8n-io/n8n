import type { Connection } from '@vue-flow/core';
import uniq from 'lodash/uniq';
import type { IConnection, IConnections, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { CanvasConnectionMode } from '@/features/workflows/canvas/canvas.types';
import {
	createCanvasConnectionHandleString,
	mapCanvasConnectionToLegacyConnection,
	mapLegacyConnectionToCanvasConnection,
	parseCanvasConnectionHandleString,
} from '@/features/workflows/canvas/canvas.utils';

type WorkflowDocumentConnectionAccess = {
	connectionsBySourceNode: IConnections;
	getNodeById: (id: string) => INodeUi | undefined;
};

type MappedCanvasConnection = {
	sourceNode: INodeUi;
	targetNode: INodeUi;
	mappedConnection: [IConnection, IConnection];
};

export type CanvasConnectionReplacement = {
	connectionToRemove: Connection;
	addBeforeRemoval: Connection[];
	addAfterRemoval: Connection[];
	trackHistory?: boolean;
};

export type NodeConnectionReplacements = {
	connectionsToRemove: Connection[];
	connectionsToAdd: Connection[];
};

type CanvasConnectionReplacementDependencies = {
	workflowDocumentStore: WorkflowDocumentConnectionAccess;
	createConnection: (
		connection: Connection,
		options?: {
			trackHistory?: boolean;
			keepPristine?: boolean;
			validateNodeGroups?: boolean;
		},
	) => void;
	deleteConnection: (
		connection: Connection,
		options?: {
			trackHistory?: boolean;
			trackBulk?: boolean;
			validateNodeGroups?: boolean;
		},
	) => void;
	isConnectionAllowed: (
		sourceNode: INodeUi,
		targetNode: INodeUi,
		sourceConnection: IConnection,
		targetConnection: IConnection,
	) => boolean;
	isConnectionReplacementAllowedForNodeGroups: (replacement: {
		nodeIds: string[];
		connectionsToRemove: Array<[IConnection, IConnection]>;
		connectionsToAdd: Array<[IConnection, IConnection]>;
		connectionsBySourceNode: IConnections;
	}) => boolean;
};

type ReplaceCanvasConnectionInput = CanvasConnectionReplacement &
	CanvasConnectionReplacementDependencies;

type GetNodeConnectionReplacementsInput = {
	previousNode: INodeUi;
	newNode: INodeUi;
	connectionPairs: Array<[IConnection, IConnection]>;
	getNodeByName: (name: string) => INodeUi | null | undefined;
	isConnectionAllowed: (
		sourceNode: INodeUi,
		targetNode: INodeUi,
		sourceConnection: IConnection,
		targetConnection: IConnection,
	) => boolean;
};

export function createInputConnectionHandle(type: NodeConnectionType) {
	return createCanvasConnectionHandleString({
		type,
		index: 0,
		mode: CanvasConnectionMode.Input,
	});
}

export function createMainOutputConnectionHandle() {
	return createCanvasConnectionHandleString({
		type: NodeConnectionTypes.Main,
		index: 0,
		mode: CanvasConnectionMode.Output,
	});
}

export function getPrimaryConnectionForNewNode(
	node: INodeUi,
	lastInteractedWithNodeId: string,
	lastInteractedWithNodeHandle: string | null,
): Connection {
	if (!lastInteractedWithNodeHandle) {
		return {
			source: lastInteractedWithNodeId,
			sourceHandle: createMainOutputConnectionHandle(),
			target: node.id,
			targetHandle: createInputConnectionHandle(NodeConnectionTypes.Main),
		};
	}

	const { type: connectionType, mode } = parseCanvasConnectionHandleString(
		lastInteractedWithNodeHandle,
	);
	const nodeHandle = createInputConnectionHandle(connectionType);

	if (mode === CanvasConnectionMode.Input) {
		return {
			source: node.id,
			sourceHandle: nodeHandle,
			target: lastInteractedWithNodeId,
			targetHandle: lastInteractedWithNodeHandle,
		};
	}

	return {
		source: lastInteractedWithNodeId,
		sourceHandle: lastInteractedWithNodeHandle,
		target: node.id,
		targetHandle: nodeHandle,
	};
}

export function getNodeConnectionReplacements({
	previousNode,
	newNode,
	connectionPairs,
	getNodeByName,
	isConnectionAllowed,
}: GetNodeConnectionReplacementsInput): NodeConnectionReplacements {
	const connectionsToRemove: Connection[] = [];
	const connectionsToAdd: Connection[] = [];

	for (const pair of connectionPairs) {
		const sourceNode = getNodeByName(pair[0].node);
		const targetNode = getNodeByName(pair[1].node);
		if (!sourceNode || !targetNode) continue;

		connectionsToRemove.push(mapLegacyConnectionToCanvasConnection(sourceNode, targetNode, pair));

		const newSourceIConnection = {
			...pair[0],
			node: pair[0].node === previousNode.name ? newNode.name : pair[0].node,
		};
		const newTargetIConnection = {
			...pair[1],
			node: pair[1].node === previousNode.name ? newNode.name : pair[1].node,
		};

		const newSourceNode = sourceNode.name === previousNode.name ? newNode : sourceNode;
		const newTargetNode = targetNode.name === previousNode.name ? newNode : targetNode;

		if (
			!isConnectionAllowed(newSourceNode, newTargetNode, newSourceIConnection, newTargetIConnection)
		) {
			continue;
		}

		connectionsToAdd.push(
			mapLegacyConnectionToCanvasConnection(newSourceNode, newTargetNode, [
				newSourceIConnection,
				newTargetIConnection,
			]),
		);
	}

	return { connectionsToRemove, connectionsToAdd };
}

export function mapCanvasConnectionsToLegacyConnections(
	connections: Connection[],
	workflowDocumentStore: WorkflowDocumentConnectionAccess,
): Array<[IConnection, IConnection]> | undefined {
	const mappedConnections = getMappedCanvasConnections(connections, workflowDocumentStore);
	return mappedConnections?.map(({ mappedConnection }) => mappedConnection);
}

export function replaceCanvasConnection({
	workflowDocumentStore,
	createConnection,
	deleteConnection,
	isConnectionAllowed,
	isConnectionReplacementAllowedForNodeGroups,
	connectionToRemove,
	addBeforeRemoval,
	addAfterRemoval,
	trackHistory = false,
}: ReplaceCanvasConnectionInput): boolean {
	const removal = getMappedCanvasConnection(connectionToRemove, workflowDocumentStore);
	if (!removal) return false;

	const additions = getMappedCanvasConnections(
		[...addBeforeRemoval, ...addAfterRemoval],
		workflowDocumentStore,
	);
	if (!additions) return false;

	const areAdditionsAllowed = additions.every(
		({ sourceNode, targetNode, mappedConnection: [sourceConnection, targetConnection] }) =>
			isConnectionAllowed(sourceNode, targetNode, sourceConnection, targetConnection),
	);
	if (!areAdditionsAllowed) return false;

	const nodeIds = uniq([
		removal.sourceNode.id,
		removal.targetNode.id,
		...additions.flatMap(({ sourceNode, targetNode }) => [sourceNode.id, targetNode.id]),
	]);

	const isReplacementAllowed = isConnectionReplacementAllowedForNodeGroups({
		nodeIds,
		connectionsToRemove: [removal.mappedConnection],
		connectionsToAdd: additions.map(({ mappedConnection }) => mappedConnection),
		connectionsBySourceNode: workflowDocumentStore.connectionsBySourceNode,
	});
	if (!isReplacementAllowed) return false;

	for (const connection of addBeforeRemoval) {
		createConnection(connection, { trackHistory, validateNodeGroups: false });
	}

	deleteConnection(connectionToRemove, {
		trackHistory,
		trackBulk: false,
		validateNodeGroups: false,
	});

	for (const connection of addAfterRemoval) {
		createConnection(connection, { trackHistory, validateNodeGroups: false });
	}

	return true;
}

function getMappedCanvasConnection(
	connection: Connection,
	workflowDocumentStore: WorkflowDocumentConnectionAccess,
): MappedCanvasConnection | undefined {
	const sourceNode = workflowDocumentStore.getNodeById(connection.source);
	const targetNode = workflowDocumentStore.getNodeById(connection.target);
	if (!sourceNode || !targetNode) return undefined;

	return {
		sourceNode,
		targetNode,
		mappedConnection: mapCanvasConnectionToLegacyConnection(sourceNode, targetNode, connection),
	};
}

function getMappedCanvasConnections(
	connections: Connection[],
	workflowDocumentStore: WorkflowDocumentConnectionAccess,
): MappedCanvasConnection[] | undefined {
	const mappedConnections: MappedCanvasConnection[] = [];

	for (const connection of connections) {
		const mappedConnection = getMappedCanvasConnection(connection, workflowDocumentStore);
		if (!mappedConnection) return undefined;

		mappedConnections.push(mappedConnection);
	}

	return mappedConnections;
}
