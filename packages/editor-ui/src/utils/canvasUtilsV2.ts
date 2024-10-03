import type { IConnection, IConnections, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { BoundingBox, CanvasConnection, CanvasConnectionPort } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { Connection } from '@vue-flow/core';
import { isValidCanvasConnectionMode, isValidNodeConnectionType } from '@/utils/typeGuards';
import { NodeConnectionType } from 'n8n-workflow';

export function mapLegacyConnectionsToCanvasConnections(
	legacyConnections: IConnections,
	nodes: INodeUi[],
): CanvasConnection[] {
	const mappedConnections: CanvasConnection[] = [];

	Object.keys(legacyConnections).forEach((fromNodeName) => {
		const fromId = nodes.find((node) => node.name === fromNodeName)?.id ?? '';
		const fromConnectionTypes = Object.keys(
			legacyConnections[fromNodeName],
		) as NodeConnectionType[];

		fromConnectionTypes.forEach((fromConnectionType) => {
			const fromPorts = legacyConnections[fromNodeName][fromConnectionType];
			fromPorts.forEach((toPorts, fromIndex) => {
				toPorts.forEach((toPort) => {
					const toId = nodes.find((node) => node.name === toPort.node)?.id ?? '';
					const toConnectionType = toPort.type as NodeConnectionType;
					const toIndex = toPort.index;

					const sourceHandle = createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						type: fromConnectionType,
						index: fromIndex,
					});

					const targetHandle = createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						type: toConnectionType,
						index: toIndex,
					});

					const connectionId = createCanvasConnectionId({
						source: fromId,
						sourceHandle,
						target: toId,
						targetHandle,
					});

					if (fromId && toId) {
						mappedConnections.push({
							id: connectionId,
							source: fromId,
							target: toId,
							sourceHandle,
							targetHandle,
							data: {
								fromNodeName,
								source: {
									index: fromIndex,
									type: fromConnectionType,
								},
								target: {
									index: toIndex,
									type: toConnectionType,
								},
							},
						});
					}
				});
			});
		});
	});

	return mappedConnections;
}

export function mapLegacyConnectionToCanvasConnection(
	sourceNode: INodeUi,
	targetNode: INodeUi,
	legacyConnection: [IConnection, IConnection],
): Connection {
	const source = sourceNode.id;
	const sourceHandle = createCanvasConnectionHandleString({
		mode: CanvasConnectionMode.Output,
		type: legacyConnection[0].type,
		index: legacyConnection[0].index,
	});
	const target = targetNode.id;
	const targetHandle = createCanvasConnectionHandleString({
		mode: CanvasConnectionMode.Input,
		type: legacyConnection[1].type,
		index: legacyConnection[1].index,
	});

	return {
		source,
		sourceHandle,
		target,
		targetHandle,
	};
}

export function parseCanvasConnectionHandleString(handle: string | null | undefined) {
	const [mode, type, index] = (handle ?? '').split('/');

	const resolvedMode = isValidCanvasConnectionMode(mode) ? mode : CanvasConnectionMode.Output;
	const resolvedType = isValidNodeConnectionType(type) ? type : NodeConnectionType.Main;
	let resolvedIndex = parseInt(index, 10);
	if (isNaN(resolvedIndex)) {
		resolvedIndex = 0;
	}

	return {
		mode: resolvedMode,
		type: resolvedType,
		index: resolvedIndex,
	};
}

export function createCanvasConnectionHandleString({
	mode,
	type = NodeConnectionType.Main,
	index = 0,
}: {
	mode: 'inputs' | 'outputs';
	type?: NodeConnectionType;
	index?: number;
}) {
	return `${mode}/${type}/${index}`;
}

export function createCanvasConnectionId(connection: Connection) {
	return `[${connection.source}/${connection.sourceHandle}][${connection.target}/${connection.targetHandle}]`;
}

export function mapCanvasConnectionToLegacyConnection(
	sourceNode: INodeUi,
	targetNode: INodeUi,
	connection: Connection,
): [IConnection, IConnection] {
	// Output
	const sourceNodeName = sourceNode?.name ?? '';
	const { type: sourceType, index: sourceIndex } = parseCanvasConnectionHandleString(
		connection.sourceHandle,
	);

	// Input
	const targetNodeName = targetNode?.name ?? '';
	const { type: targetType, index: targetIndex } = parseCanvasConnectionHandleString(
		connection.targetHandle,
	);

	return [
		{
			node: sourceNodeName,
			type: sourceType,
			index: sourceIndex,
		},
		{
			node: targetNodeName,
			type: targetType,
			index: targetIndex,
		},
	];
}

export function mapLegacyEndpointsToCanvasConnectionPort(
	endpoints: INodeTypeDescription['inputs'],
	endpointNames: string[] = [],
): CanvasConnectionPort[] {
	if (typeof endpoints === 'string') {
		console.warn('Node endpoints have not been evaluated', endpoints);
		return [];
	}

	return endpoints.map((endpoint, endpointIndex) => {
		const typeValue = typeof endpoint === 'string' ? endpoint : endpoint.type;
		const type = isValidNodeConnectionType(typeValue) ? typeValue : NodeConnectionType.Main;
		const label =
			typeof endpoint === 'string' ? endpointNames[endpointIndex] : endpoint.displayName;
		const index =
			endpoints
				.slice(0, endpointIndex + 1)
				.filter((e) => (typeof e === 'string' ? e : e.type) === type).length - 1;
		const required = typeof endpoint === 'string' ? false : endpoint.required;
		const maxConnections = typeof endpoint === 'string' ? undefined : endpoint.maxConnections;

		return {
			type,
			index,
			label,
			...(maxConnections ? { maxConnections } : {}),
			...(required ? { required } : {}),
		};
	});
}

export function checkOverlap(node1: BoundingBox, node2: BoundingBox) {
	return !(
		// node1 is completely to the left of node2
		(
			node1.x + node1.width <= node2.x ||
			// node2 is completely to the left of node1
			node2.x + node2.width <= node1.x ||
			// node1 is completely above node2
			node1.y + node1.height <= node2.y ||
			// node2 is completely above node1
			node2.y + node2.height <= node1.y
		)
	);
}
