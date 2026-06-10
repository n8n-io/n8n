import type {
	IConnection,
	IConnections,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import type { Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import type {
	BoundingBox,
	CanvasConnection,
	CanvasConnectionPort,
	CanvasNodeDefaultRender,
	CanvasNodeDefaultRenderLabelSize,
} from './canvas.types';
import { CanvasConnectionMode } from './canvas.types';
import type { Connection } from '@vue-flow/core';
import { isValidCanvasConnectionMode, isValidNodeConnectionType } from '@/app/utils/typeGuards';
import { NodeConnectionTypes } from 'n8n-workflow';
import { NODE_MIN_INPUT_ITEMS_COUNT } from '@/app/constants';
import { calculateNodeSize } from '@/app/utils/nodeViewUtils';
import { CanvasRenderDataKey } from '@/app/constants/injectionKeys';
import { injectStrict } from '@/app/utils/injectStrict';
import type { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';

/**
 * Per-node canvas render data (input/output port maps) shape, as produced by
 * `useWorkflowDocumentRenderData` and consumed by canvas components.
 */
export type CanvasRenderData = ReturnType<typeof useWorkflowDocumentRenderData>;

/**
 * Display size for a node with `Default` render type — pulls port counts from
 * render data and forwards to `calculateNodeSize`. Single source of truth for
 * "what size would this node render at?" outside of the actual VueFlow runtime.
 */
export function computeNodeDisplaySize(
	nodeId: string,
	renderOptions: CanvasNodeDefaultRender['options'],
	renderData: CanvasRenderData,
	isExperimentalNdvActive: boolean,
): { width: number; height: number } {
	const inputs = renderData.nodeInputsByNodeId.get(nodeId)?.value ?? [];
	const outputs = renderData.nodeOutputsByNodeId.get(nodeId)?.value ?? [];

	const mainInputCount = inputs.filter((p) => p.type === 'main').length || 1;
	const mainOutputCount = outputs.filter((p) => p.type === 'main').length || 1;
	const nonMainInputCount =
		inputs.filter((p) => p.type !== 'main').length +
		outputs.filter((p) => p.type !== 'main').length;

	return calculateNodeSize(
		renderOptions.configuration ?? false,
		renderOptions.configurable ?? false,
		mainInputCount,
		mainOutputCount,
		nonMainInputCount,
		isExperimentalNdvActive,
	);
}

/**
 * Injects the canvas render data from the component tree. Provided by an
 * ancestor canvas component. Throws if no provider is registered.
 */
export function injectCanvasRenderData(): Ref<CanvasRenderData> {
	return injectStrict(CanvasRenderDataKey);
}

/**
 * Maps multiple legacy n8n connections to VueFlow connections
 */
export function mapLegacyConnectionsToCanvasConnections(
	legacyConnections: IConnections,
	nodes: INodeUi[],
): CanvasConnection[] {
	const mappedConnections: CanvasConnection[] = [];
	const nodeIdByName = new Map(nodes.map((n) => [n.name, n.id]));

	Object.keys(legacyConnections).forEach((fromNodeName) => {
		const fromId = nodeIdByName.get(fromNodeName) ?? '';
		const fromConnectionTypes = Object.keys(
			legacyConnections[fromNodeName],
		) as NodeConnectionType[];

		fromConnectionTypes.forEach((fromConnectionType) => {
			const fromPorts = legacyConnections[fromNodeName][fromConnectionType];
			fromPorts?.forEach((toPorts, fromIndex) => {
				toPorts?.forEach((toPort) => {
					const toNodeName = toPort.node;
					const toId = nodeIdByName.get(toNodeName) ?? '';
					const toConnectionType = toPort.type;
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
								source: {
									node: fromNodeName,
									index: fromIndex,
									type: fromConnectionType,
								},
								target: {
									node: toNodeName,
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

/**
 * Maps a single legacy n8n connection to a VueFlow connection
 */
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

/**
 * Parses a canvas connection handle string into its parts:
 * - mode
 * - type
 * - index
 */
export function parseCanvasConnectionHandleString(handle: string | null | undefined) {
	const [mode, type, index] = (handle ?? '').split('/');

	const resolvedMode = isValidCanvasConnectionMode(mode) ? mode : CanvasConnectionMode.Output;
	const resolvedType = isValidNodeConnectionType(type) ? type : NodeConnectionTypes.Main;
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

/**
 * Creates a canvas connection handle string from its parts
 */
export function createCanvasConnectionHandleString({
	mode,
	type = NodeConnectionTypes.Main,
	index = 0,
}: {
	mode: 'inputs' | 'outputs';
	type?: NodeConnectionType;
	index?: number;
}) {
	return `${mode}/${type}/${index}`;
}

/**
 * Creates a canvas connection ID from a connection
 */
export function createCanvasConnectionId(connection: Connection) {
	return `[${connection.source}/${connection.sourceHandle}][${connection.target}/${connection.targetHandle}]`;
}

/**
 * Maps a VueFlow connection to a legacy n8n connection
 */
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

/**
 * Maps legacy n8n node inputs to VueFlow connection handles
 */
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
		const type = isValidNodeConnectionType(typeValue) ? typeValue : NodeConnectionTypes.Main;
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

/**
 * Checks if two bounding boxes overlap
 */
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

/**
 * Inserts spacers between endpoints to visually separate them
 */
export function insertSpacersBetweenEndpoints<T>(endpoints: T[], requiredEndpointsCount = 0) {
	const endpointsWithSpacers: Array<T | null> = [...endpoints];
	const optionalNonMainInputsCount = endpointsWithSpacers.length - requiredEndpointsCount;
	const spacerCount =
		NODE_MIN_INPUT_ITEMS_COUNT - requiredEndpointsCount - optionalNonMainInputsCount;

	// Insert `null` in between required non-main inputs and non-required non-main inputs
	// to separate them visually if there are less than `minEndpointsCount` inputs in total
	if (endpointsWithSpacers.length < NODE_MIN_INPUT_ITEMS_COUNT) {
		for (let i = 0; i < spacerCount; i++) {
			endpointsWithSpacers.splice(requiredEndpointsCount + i, 0, null);
		}
	}

	return endpointsWithSpacers;
}

export function getLabelSize(label: string = ''): number {
	if (label.length <= 2) {
		return 0;
	} else if (label.length <= 6) {
		return 1;
	} else {
		return 2;
	}
}

export function getMaxNodePortsLabelSize(
	ports: CanvasConnectionPort[],
): CanvasNodeDefaultRenderLabelSize {
	const labelSizes: CanvasNodeDefaultRenderLabelSize[] = ['small', 'medium', 'large'];
	const labelSizeIndexes = ports.reduce<number[]>(
		(sizeAcc, input) => {
			if (input.type === NodeConnectionTypes.Main) {
				sizeAcc.push(getLabelSize(input.label ?? ''));
			}

			return sizeAcc;
		},
		[0],
	);

	return labelSizes[Math.max(...labelSizeIndexes)];
}

export function shouldIgnoreCanvasShortcut(el: Element): boolean {
	return (
		['INPUT', 'TEXTAREA'].includes(el.tagName) ||
		el.closest('[contenteditable]') !== null ||
		el.closest('.ignore-key-press-canvas') !== null
	);
}
