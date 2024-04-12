import type { IConnections, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasConnection, CanvasConnectionPortType, CanvasConnectionPort } from '@/types';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

export function mapLegacyConnections(
	legacyConnections: IConnections,
	nodes: INodeUi[],
): CanvasConnection[] {
	const mappedConnections: CanvasConnection[] = [];

	Object.keys(legacyConnections).forEach((fromNodeName) => {
		const fromId = nodes.find((node) => node.name === fromNodeName)?.id;

		Object.keys(legacyConnections[fromNodeName]).forEach((fromConnectionType) => {
			legacyConnections[fromNodeName][fromConnectionType].forEach((portTargets, fromPort) => {
				portTargets.forEach((portTarget) => {
					const toId = nodes.find((node) => node.name === portTarget.node)?.id;
					const toPort = portTarget.index;
					const toConnectionType = portTarget.type;

					if (fromId && toId) {
						mappedConnections.push({
							id: `[${fromId}/${fromConnectionType}/${fromPort}][${toId}/${toConnectionType}/${toPort}]`,
							source: fromId,
							target: toId,
							sourceHandle: `outputs/${fromConnectionType}/${fromPort}`,
							targetHandle: `inputs/${toConnectionType}/${toPort}`,
							data: {
								source: {
									index: fromPort,
									type: fromConnectionType as CanvasConnectionPortType,
								},
								target: {
									index: toPort,
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

export function normalizeElementEndpoints(
	endpoints: INodeTypeDescription['inputs'],
): CanvasConnectionPort[] {
	if (typeof endpoints === 'string') {
		console.warn('Node endpoints have not been evaluated', endpoints);
		return [];
	}

	return endpoints.map((endpoint, index) => {
		if (typeof endpoint === 'string') {
			const port = endpoints.slice(0, index).filter((e) => e === endpoint).length;
			return {
				type: endpoint,
				index: port,
			};
		} else {
			return {
				type: endpoint.type,
				index: 0,
			};
		}
	});
}
