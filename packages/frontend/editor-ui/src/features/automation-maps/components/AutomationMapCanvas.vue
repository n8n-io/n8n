<script setup lang="ts">
import type {
	AutomationMapAnnotations,
	AutomationMapChange,
	AutomationMapEdge,
	AutomationMapGraph,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { PanelPosition, useVueFlow, VueFlow, type Edge, type Node } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { computed, nextTick, ref, watch } from 'vue';

import CanvasArrowHeadMarker from '@/features/workflows/canvas/components/elements/edges/CanvasArrowHeadMarker.vue';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import CanvasControlButtons from '@/features/workflows/canvas/components/elements/buttons/CanvasControlButtons.vue';

import { layoutAutomationMap } from '../automationMap.layout';
import type { MapFocusState, MapSelection } from '../automationMap.types';
import MapDataTableNode from './MapDataTableNode.vue';
import MapEdge, { type MapEdgeData } from './MapEdge.vue';
import MapGroupNode from './MapGroupNode.vue';
import MapServiceNode from './MapServiceNode.vue';
import MapWorkflowNode from './MapWorkflowNode.vue';

const props = defineProps<{
	graph: AutomationMapGraph;
	annotations: AutomationMapAnnotations | null;
	changes: AutomationMapChange[];
	selection: MapSelection | null;
	highlightedWorkflowIds: string[];
	search: string;
	showDataLinks: boolean;
}>();

const emit = defineEmits<{
	select: [selection: MapSelection | null];
}>();

const CANVAS_ID = 'automation-map';
const MARKER_ID = 'automation-map-arrow';
const ENTRY_TRIGGER_KINDS = new Set(['schedule', 'webhook', 'form', 'chat', 'app', 'mcp']);

const i18n = useI18n();
const vueFlow = useVueFlow(CANVAS_ID);
const zoom = ref(1);
const hoveredNodeId = ref<string | null>(null);

const layout = computed(() =>
	layoutAutomationMap(props.graph, props.annotations, {
		dataTables: i18n.baseText('automationMaps.group.dataTables'),
		services: i18n.baseText('automationMaps.group.services'),
	}),
);

const selectedNodeId = computed(() => {
	if (!props.selection) return null;
	if (props.selection.kind === 'workflow') return `wf:${props.selection.id}`;
	if (props.selection.kind === 'dataTable') return `dt:${props.selection.id}`;
	return `svc:${props.selection.id}`;
});

const focusNodeId = computed(() => hoveredNodeId.value ?? selectedNodeId.value);

const neighbors = computed(() => {
	const map = new Map<string, Set<string>>();
	for (const edge of props.graph.edges) {
		map.set(edge.source, (map.get(edge.source) ?? new Set()).add(edge.target));
		map.set(edge.target, (map.get(edge.target) ?? new Set()).add(edge.source));
	}
	return map;
});

const highlightedNodeIds = computed(
	() => new Set(props.highlightedWorkflowIds.map((id) => `wf:${id}`)),
);

function focusFor(nodeId: string): MapFocusState {
	if (focusNodeId.value) {
		if (nodeId === focusNodeId.value) return 'focused';
		if (neighbors.value.get(focusNodeId.value)?.has(nodeId)) return 'related';
		return 'dimmed';
	}
	if (highlightedNodeIds.value.size > 0) {
		return highlightedNodeIds.value.has(nodeId) ? 'focused' : 'dimmed';
	}
	return 'normal';
}

function edgeFocus(edge: AutomationMapEdge): MapFocusState {
	if (focusNodeId.value) {
		return edge.source === focusNodeId.value || edge.target === focusNodeId.value
			? 'focused'
			: 'dimmed';
	}
	if (highlightedNodeIds.value.size > 0) {
		return highlightedNodeIds.value.has(edge.source) && highlightedNodeIds.value.has(edge.target)
			? 'focused'
			: 'dimmed';
	}
	return 'normal';
}

const normalizedSearch = computed(() => props.search.trim().toLowerCase());
const matches = (text: string) =>
	!normalizedSearch.value || text.toLowerCase().includes(normalizedSearch.value);

const changesById = computed(
	() => new Map(props.changes.map((change) => [change.workflowId, change.change])),
);

const nodes = computed<Node[]>(() => {
	const positions = layout.value.positions;
	const edges = props.graph.edges;
	const result: Node[] = layout.value.groups.map((group) => ({
		id: group.id,
		type: 'mapGroup',
		position: { x: group.x, y: group.y },
		data: {
			group,
			focus: focusNodeId.value || highlightedNodeIds.value.size ? 'dimmed' : 'normal',
		},
		draggable: false,
		selectable: false,
		focusable: false,
		zIndex: -1,
	}));

	for (const workflow of props.graph.workflows) {
		const id = `wf:${workflow.id}`;
		const outgoing = edges.filter((edge) => edge.source === id);
		const incoming = edges.filter((edge) => edge.target === id);
		const serviceNodeTypes = [
			...new Set(
				outgoing
					.filter((edge) => edge.kind === 'uses')
					.map((edge) =>
						props.graph.services.find((service) => `svc:${service.key}` === edge.target),
					)
					.map((service) => service?.nodeType)
					.filter((nodeType): nodeType is string => Boolean(nodeType)),
			),
		];
		const dataTableCount = new Set(
			[...outgoing, ...incoming]
				.filter((edge) => edge.kind === 'reads' || edge.kind === 'writes')
				.map((edge) => (edge.source === id ? edge.target : edge.source)),
		).size;
		result.push({
			id,
			type: 'mapWorkflow',
			position: positions.get(id) ?? { x: 0, y: 0 },
			data: {
				workflow,
				summary: props.annotations?.workflowSummaries[workflow.id] ?? workflow.description,
				isEntryPoint: workflow.triggers.some((trigger) => ENTRY_TRIGGER_KINDS.has(trigger.kind)),
				serviceNodeTypes,
				dataTableCount,
				change: changesById.value.get(workflow.id) ?? null,
				focus: focusFor(id),
				matchesSearch: matches(`${workflow.name} ${workflow.description}`),
			},
		});
	}

	for (const dataTable of props.graph.dataTables) {
		const id = `dt:${dataTable.id}`;
		result.push({
			id,
			type: 'mapDataTable',
			position: positions.get(id) ?? { x: 0, y: 0 },
			data: {
				dataTable,
				readers: edges.filter((edge) => edge.kind === 'reads' && edge.source === id).length,
				writers: edges.filter((edge) => edge.kind === 'writes' && edge.target === id).length,
				focus: focusFor(id),
				matchesSearch: matches(dataTable.name),
			},
		});
	}

	for (const service of props.graph.services) {
		const id = `svc:${service.key}`;
		result.push({
			id,
			type: 'mapService',
			position: positions.get(id) ?? { x: 0, y: 0 },
			data: {
				service,
				usedBy: edges.filter((edge) => edge.target === id).length,
				focus: focusFor(id),
				matchesSearch: matches(service.name),
			},
		});
	}
	return result;
});

function edgeLabel(edge: AutomationMapEdge) {
	if (edge.kind === 'dispatches' && edge.via) {
		return i18n.baseText('automationMaps.edge.via', { interpolate: { via: edge.via } });
	}
	if (edge.kind === 'errorHandler') return i18n.baseText('automationMaps.edge.onError');
	if (edge.kind === 'reads') return i18n.baseText('automationMaps.edge.reads');
	if (edge.kind === 'writes') return i18n.baseText('automationMaps.edge.writes');
	if (edge.kind === 'references') return i18n.baseText('automationMaps.edge.references');
	return null;
}

const edges = computed<Array<Edge<MapEdgeData>>>(() =>
	props.graph.edges
		.filter((edge) => {
			if (edge.kind === 'calls' || edge.kind === 'dispatches') return true;
			if (props.showDataLinks) return true;
			return (
				focusNodeId.value !== null &&
				(edge.source === focusNodeId.value || edge.target === focusNodeId.value)
			);
		})
		.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: 'mapEdge',
			data: {
				kind: edge.kind,
				label: edgeLabel(edge),
				focus: edgeFocus(edge),
				labelVisible:
					focusNodeId.value !== null &&
					(edge.target === focusNodeId.value ||
						(edge.source === focusNodeId.value && !edge.target.startsWith('wf:'))),
				markerId: MARKER_ID,
			},
		})),
);

function selectionFromNodeId(nodeId: string): MapSelection | null {
	const [prefix, ...rest] = nodeId.split(':');
	const id = rest.join(':');
	if (prefix === 'wf') return { kind: 'workflow', id };
	if (prefix === 'dt') return { kind: 'dataTable', id };
	if (prefix === 'svc') return { kind: 'service', id };
	return null;
}

function onNodeClick({ node }: { node: Node }) {
	emit('select', selectionFromNodeId(node.id));
}

function onNodeMouseEnter({ node }: { node: Node }) {
	if (node.type !== 'mapGroup') hoveredNodeId.value = node.id;
}

function onNodeMouseLeave() {
	hoveredNodeId.value = null;
}

async function fitView() {
	await vueFlow.fitView({ padding: 0.08, duration: 300 });
}

async function centerOn(nodeId: string) {
	const node = vueFlow.findNode(nodeId);
	if (!node) return;
	await vueFlow.setCenter(
		node.position.x + (node.dimensions.width || 300) / 2,
		node.position.y + (node.dimensions.height || 116) / 2,
		{ zoom: Math.max(vueFlow.viewport.value.zoom, 0.9), duration: 400 },
	);
}

watch(
	() => props.highlightedWorkflowIds,
	async (workflowIds) => {
		if (workflowIds.length === 0) return;
		await vueFlow.fitView({
			nodes: workflowIds.map((id) => `wf:${id}`),
			padding: 0.3,
			maxZoom: 1,
			duration: 400,
		});
	},
);

watch(
	() => props.graph,
	async () => {
		await nextTick();
		await fitView();
	},
);

function minimapNodeColor(node: Node) {
	if (node.type === 'mapGroup') return 'transparent';
	if (node.type === 'mapWorkflow') return 'var(--color--foreground--shade-2)';
	return 'var(--color--primary--tint-1)';
}

defineExpose({ centerOn, fitView });
</script>

<template>
	<VueFlow
		:id="CANVAS_ID"
		:nodes="nodes"
		:edges="edges"
		:class="$style.canvas"
		:min-zoom="0.05"
		:max-zoom="2"
		:nodes-connectable="false"
		:nodes-draggable="true"
		:elements-selectable="true"
		:delete-key-code="null"
		pan-on-scroll
		fit-view-on-init
		data-test-id="automation-map-canvas"
		@node-click="onNodeClick"
		@node-mouse-enter="onNodeMouseEnter"
		@node-mouse-leave="onNodeMouseLeave"
		@pane-click="emit('select', null)"
		@viewport-change="zoom = $event.zoom"
	>
		<template #node-mapGroup="nodeProps">
			<MapGroupNode :data="nodeProps.data" />
		</template>
		<template #node-mapWorkflow="nodeProps">
			<MapWorkflowNode :data="nodeProps.data" :selected="nodeProps.id === selectedNodeId" />
		</template>
		<template #node-mapDataTable="nodeProps">
			<MapDataTableNode :data="nodeProps.data" :selected="nodeProps.id === selectedNodeId" />
		</template>
		<template #node-mapService="nodeProps">
			<MapServiceNode :data="nodeProps.data" :selected="nodeProps.id === selectedNodeId" />
		</template>
		<template #edge-mapEdge="edgeProps">
			<MapEdge v-bind="edgeProps" />
		</template>

		<CanvasArrowHeadMarker :id="MARKER_ID" />
		<CanvasBackground :viewport="vueFlow.viewport.value" :striped="false" />
		<MiniMap
			:class="$style.minimap"
			:height="120"
			:width="200"
			:position="PanelPosition.BottomLeft"
			pannable
			zoomable
			:node-color="minimapNodeColor"
			:node-border-radius="8"
		/>
		<CanvasControlButtons
			:class="$style.controls"
			:zoom="zoom"
			:read-only="true"
			:show-interactive="false"
			@zoom-to-fit="fitView"
			@zoom-in="vueFlow.zoomIn()"
			@zoom-out="vueFlow.zoomOut()"
		/>
	</VueFlow>
</template>

<style lang="scss" module>
.canvas {
	width: 100%;
	height: 100%;

	:global(.vue-flow__node-mapGroup) {
		cursor: default;
	}
}

.minimap {
	margin-bottom: var(--spacing--xl) !important;
}

.controls {
	left: 216px !important;
}
</style>
