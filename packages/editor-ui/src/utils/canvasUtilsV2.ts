import type { IConnection, IConnections, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasConnection, CanvasConnectionPortType, CanvasConnectionPort } from '@/types';
import { v4 as uuid } from 'uuid';
import { Connection } from '@vue-flow/core';
import { useWorkflowsStore } from '@/stores/workflows.store';

export function mapLegacyConnectionsToCanvasConnections(
	legacyConnections: IConnections,
	nodes: INodeUi[],
): CanvasConnection[] {
	const mappedConnections: CanvasConnection[] = [];

	Object.keys(legacyConnections).forEach((fromNodeName) => {
		const fromId = nodes.find((node) => node.name === fromNodeName)?.id;
		const fromConnectionTypes = Object.keys(legacyConnections[fromNodeName]);

		fromConnectionTypes.forEach((fromConnectionType) => {
			const fromPorts = legacyConnections[fromNodeName][fromConnectionType];
			fromPorts.forEach((toPorts, fromIndex) => {
				toPorts.forEach((toPort) => {
					const toId = nodes.find((node) => node.name === toPort.node)?.id;
					const toConnectionType = toPort.type;
					const toIndex = toPort.index;

					if (fromId && toId) {
						mappedConnections.push({
							id: `[${fromId}/${fromConnectionType}/${fromIndex}][${toId}/${toConnectionType}/${toIndex}]`,
							source: fromId,
							target: toId,
							sourceHandle: `outputs/${fromConnectionType}/${fromIndex}`,
							targetHandle: `inputs/${toConnectionType}/${toIndex}`,
							data: {
								fromNodeName,
								source: {
									index: fromIndex,
									type: fromConnectionType as CanvasConnectionPortType,
								},
								target: {
									index: toIndex,
									type: toConnectionType as CanvasConnectionPortType,
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

export function mapCanvasConnectionToLegacyConnection(
	sourceNode: INodeUi,
	targetNode: INodeUi,
	connection: Connection,
): [IConnection, IConnection] {
	// Output
	const sourceNodeName = sourceNode?.name ?? '';
	const [, sourceType, sourceIndex] = (connection.sourceHandle ?? '').split('/');

	// Input
	const targetNodeName = targetNode?.name ?? '';
	const [, targetType, targetIndex] = (connection.targetHandle ?? '').split('/');

	return [
		{
			node: sourceNodeName,
			type: sourceType,
			index: parseInt(sourceIndex, 10),
		},
		{
			node: targetNodeName,
			type: targetType,
			index: parseInt(targetIndex, 10),
		},
	];
}

export function mapLegacyEndpointsToCanvasConnectionPort(
	endpoints: INodeTypeDescription['inputs'],
): CanvasConnectionPort[] {
	if (typeof endpoints === 'string') {
		console.warn('Node endpoints have not been evaluated', endpoints);
		return [];
	}

	return endpoints.map((endpoint, endpointIndex) => {
		const type = typeof endpoint === 'string' ? endpoint : endpoint.type;
		const label = typeof endpoint === 'string' ? undefined : endpoint.displayName;
		const index =
			endpoints
				.slice(0, endpointIndex + 1)
				.filter((e) => (typeof e === 'string' ? e : e.type) === type).length - 1;
		const required = typeof endpoint === 'string' ? false : endpoint.required;

		return {
			type,
			index,
			label,
			...(required ? { required } : {}),
		};
	});
}

export function getUniqueNodeName(name: string, existingNames: Set<string>): string {
	if (!existingNames.has(name)) {
		return name;
	}

	for (let i = 1; i < 100; i++) {
		const newName = `${name} ${i}`;
		if (!existingNames.has(newName)) {
			return newName;
		}
	}

	return `${name} ${uuid()}`;
}
