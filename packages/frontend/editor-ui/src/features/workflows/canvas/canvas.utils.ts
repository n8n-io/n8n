import type {
	IConnection,
	IConnections,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { computed, shallowReactive, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import type {
	BoundingBox,
	CanvasConnection,
	CanvasConnectionData,
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
 * Adds an `{ x, y }` offset to a position (a `{ x, y }` or a `[x, y]` tuple),
 * returning a new `{ x, y }`.
 */
export function applyOffset(
	position: { x: number; y: number } | [number, number],
	offset: { x: number; y: number },
): { x: number; y: number } {
	const x = Array.isArray(position) ? position[0] : position.x;
	const y = Array.isArray(position) ? position[1] : position.y;
	return { x: x + offset.x, y: y + offset.y };
}

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
 * Builds an empty `CanvasRenderData` object.
 *
 * `CanvasRenderData` is a wide projection façade — production code populates
 * it via `useWorkflowDocumentRenderData(documentId)`. This helper exists for
 * the two cases that can't go through that path:
 * - placeholder values before the underlying workflow document is hydrated
 *   (e.g. the workflow-diff side panels' initial render);
 * - test fixtures that only care about a few fields.
 *
 * Centralizing it here keeps the ~20+ consumers off the hook when new by-id
 * projections land — they update one default at a time, not 20 mock literals.
 */
export function createEmptyCanvasRenderData(
	overrides: Partial<CanvasRenderData> = {},
): CanvasRenderData {
	return {
		nodeInputsByNodeId: shallowReactive(new Map()),
		nodeOutputsByNodeId: shallowReactive(new Map()),
		pinnedDataByNodeName: {},
		pinnedDataByNodeId: shallowReactive(new Map()),
		nodeTypeDescriptionByNodeId: shallowReactive(new Map()),
		isTriggerByNodeId: shallowReactive(new Map()),
		subtitleByNodeId: shallowReactive(new Map()),
		simulatedNodeTypeDescriptionByNodeId: shallowReactive(new Map()),
		validationErrorsByNodeId: shallowReactive(new Map()),
		executionIssuesByNodeName: shallowReactive(new Map()),
		executionPinDataByNodeName: {},
		isExecutionDataDisplayed: false,
		executionStatusByNodeId: shallowReactive(new Map()),
		executionRunDataByNodeId: shallowReactive(new Map()),
		executionRunDataOutputMapByNodeId: shallowReactive(new Map()),
		executionWaitingByNodeId: shallowReactive(new Map()),
		executionRunningByNodeId: shallowReactive(new Map()),
		executionWaitingForNextByNodeId: shallowReactive(new Map()),
		tooltipByNodeId: shallowReactive(new Map()),
		hasIssuesByNodeId: shallowReactive(new Map()),
		renderTypeByNodeId: shallowReactive(new Map()),
		additionalPropertiesByNodeId: computed(() => ({})),
		...overrides,
	};
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
 * Resolve a rendered canvas connection back to real workflow node endpoints.
 * Collapsed-group remapping rewrites `source` / `target` for display only,
 * while storing the canonical workflow ids and handles on `data.canonicals`.
 * A merged edge represents several workflow connections - this returns the first,
 * as we only allow groups with single input/output connections.
 */
export function resolveCanonicalConnection(
	connection: Connection & { data?: CanvasConnectionData },
): Connection {
	const canonical = connection.data?.canonicals?.[0];
	const { source, target, sourceHandle, targetHandle } = canonical ?? connection;

	return {
		source,
		target,
		sourceHandle,
		targetHandle,
	};
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
