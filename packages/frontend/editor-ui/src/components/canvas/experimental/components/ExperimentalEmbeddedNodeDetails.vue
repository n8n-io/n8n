<script setup lang="ts">
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import { N8nText } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { watchOnce } from '@vueuse/core';
import { computed, provide, ref } from 'vue';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { useI18n } from '@n8n/i18n';
import type { Workflow } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';
import { getNodeSubTitleText } from '@/components/canvas/experimental/experimentalNdv.utils';
import ExperimentalEmbeddedNdvActions from '@/components/canvas/experimental/components/ExperimentalEmbeddedNdvActions.vue';
import { useCanvas } from '@/composables/useCanvas';

const { nodeId, isReadOnly } = defineProps<{
	nodeId: string;
	isReadOnly?: boolean;
}>();

const i18n = useI18n();
const ndvStore = useNDVStore();
const experimentalNdvStore = useExperimentalNdvStore();
const isExpanded = computed(() => !experimentalNdvStore.collapsedNodes[nodeId]);
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const node = computed(() => workflowsStore.getNodeById(nodeId) ?? null);
const nodeType = computed(() => {
	if (node.value) {
		return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
	}
	return null;
});
const vf = useVueFlow();
const { isPaneMoving } = useCanvas();
const isVisible = computed(() =>
	vf.isNodeIntersecting(
		{ id: nodeId },
		{
			x: -vf.viewport.value.x / vf.viewport.value.zoom,
			y: -vf.viewport.value.y / vf.viewport.value.zoom,
			width: vf.dimensions.value.width / vf.viewport.value.zoom,
			height: vf.dimensions.value.height / vf.viewport.value.zoom,
		},
	),
);
const isOnceVisible = ref(isVisible.value);

const subTitle = computed(() =>
	node.value && nodeType.value
		? getNodeSubTitleText(node.value, nodeType.value, !isExpanded.value, i18n)
		: undefined,
);
const expressionResolveCtx = computed<ExpressionLocalResolveContext | undefined>(() => {
	if (!node.value) {
		return undefined;
	}

	const runIndex = 0; // not changeable for now
	const execution = workflowsStore.workflowExecutionData;
	const nodeName = node.value.name;

	function findInputNode(): ExpressionLocalResolveContext['inputNode'] {
		const taskData = (execution?.data?.resultData.runData[nodeName] ?? [])[runIndex];
		const source = taskData?.source[0];

		if (source) {
			return {
				name: source.previousNode,
				branchIndex: source.previousNodeOutput ?? 0,
				runIndex: source.previousNodeRun ?? 0,
			};
		}

		const inputs = workflowObject.value.getParentNodesByDepth(nodeName, 1);

		if (inputs.length > 0) {
			return {
				name: inputs[0].name,
				branchIndex: inputs[0].indicies[0] ?? 0,
				runIndex: 0,
			};
		}

		return undefined;
	}

	return {
		localResolve: true,
		envVars: useEnvironmentsStore().variablesAsObject,
		workflow: workflowObject.value,
		execution,
		nodeName,
		additionalKeys: {},
		inputNode: findInputNode(),
		connections: workflowsStore.connectionsBySourceNode,
	};
});

const maxHeightOnFocus = computed(() => vf.dimensions.value.height * 0.8);
const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

function handleToggleExpand() {
	experimentalNdvStore.setNodeExpanded(nodeId);
}

function handleOpenNdv() {
	if (node.value) {
		ndvStore.setActiveNodeName(node.value.name);
	}
}

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

watchOnce(isVisible, (visible) => {
	isOnceVisible.value = isOnceVisible.value || visible;
});
</script>

<template>
	<div
		:class="[
			$style.component,
			isExpanded ? $style.expanded : $style.collapsed,
			node?.disabled ? $style.disabled : '',
		]"
		:style="{
			'--max-height-on-focus': `${maxHeightOnFocus / experimentalNdvStore.maxCanvasZoom}px`,
			pointerEvents: isPaneMoving ? 'none' : 'auto', // Don't interrupt canvas panning
		}"
	>
		<template v-if="!node || !isOnceVisible" />
		<ExperimentalCanvasNodeSettings
			v-else-if="isExpanded"
			tabindex="-1"
			:node-id="nodeId"
			:class="$style.settingsView"
			:is-read-only="isReadOnly"
			:sub-title="subTitle"
			:input-node-name="expressionResolveCtx?.inputNode?.name"
		>
			<template #actions>
				<ExperimentalEmbeddedNdvActions
					:is-expanded="isExpanded"
					@open-ndv="handleOpenNdv"
					@toggle-expand="handleToggleExpand"
				/>
			</template>
		</ExperimentalCanvasNodeSettings>
		<div v-else role="button" :class="$style.collapsedContent" @click="handleToggleExpand">
			<NodeIcon :node-type="nodeType" :size="18" />
			<div :class="$style.collapsedNodeName">
				<N8nText bold>
					{{ node.name }}
				</N8nText>
				<N8nText bold size="small" color="text-light">
					{{ subTitle }}
				</N8nText>
			</div>
			<ExperimentalEmbeddedNdvActions
				:is-expanded="isExpanded"
				@open-ndv="handleOpenNdv"
				@toggle-expand="handleToggleExpand"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	align-items: flex-start !important;
	justify-content: stretch;
	border-width: 1px !important;
	border-radius: var(--border-radius-base) !important;
	overflow: hidden;

	--canvas-node--border-color: var(--color-text-lighter);
	--expanded-max-height: min(
		calc(var(--canvas-node--height) * 2),
		var(--max-height-on-focus),
		300px
	);

	&.expanded {
		user-select: text;
		cursor: auto;
		height: auto;
		max-height: var(--expanded-max-height);
		min-height: var(--spacing-3xl);

		:global(.selected) & {
			max-height: var(--max-height-on-focus);
		}
	}
	&.collapsed {
		overflow: hidden;
		height: var(--spacing-2xl);
	}
}

:root :global(.vue-flow__node):has(.component) {
	z-index: 10;

	:global(.selected) & {
		z-index: 11;
	}
}

.collapsedContent,
.settingsView {
	z-index: 1000;
	width: 100%;

	height: auto;
	max-height: calc(var(--expanded-max-height) - var(--border-width-base) * 2);
	min-height: var(--spacing-2xl); // should be multiple of GRID_SIZE

	:global(.selected) & {
		max-height: calc(var(--max-height-on-focus) - var(--border-width-base) * 2);
	}
}

.collapsedContent {
	height: 100%;
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	background-color: white;
	padding: var(--spacing-2xs) var(--spacing-4xs) var(--spacing-2xs) var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	cursor: pointer;

	.disabled & {
		background-color: var(--color-foreground-light);
	}

	& > * {
		zoom: var(--canvas-zoom-compensation-factor, 1);
		flex-grow: 0;
		flex-shrink: 0;
	}
}

.collapsedNodeName {
	width: 0;
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-5xs);

	& > * {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.settingsView {
	& > * {
		zoom: var(--canvas-zoom-compensation-factor, 1);
	}
}
</style>
