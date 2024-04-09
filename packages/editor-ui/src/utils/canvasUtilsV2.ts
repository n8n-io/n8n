import type { IConnections, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type {
	CanvasConnection,
	CanvasConnectionEndpointType,
	CanvasElementEndpoint,
} from '@/types';

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
							source: {
								id: fromId,
								port: fromPort,
								type: fromConnectionType as CanvasConnectionEndpointType,
							},
							target: {
								id: toId,
								port: toPort,
								type: toConnectionType as CanvasConnectionEndpointType,
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
): CanvasElementEndpoint[] {
	// @TODO Handle string case
	if (typeof endpoints === 'string') {
		return [];
	}

	return endpoints.map((endpoint, index) => {
		if (typeof endpoint === 'string') {
			const port = endpoints.slice(0, index).filter((e) => e === endpoint).length;
			return {
				type: endpoint,
				port,
			};
		} else {
			return {
				type: endpoint.type,
				port: 0,
			};
		}
	});
}
