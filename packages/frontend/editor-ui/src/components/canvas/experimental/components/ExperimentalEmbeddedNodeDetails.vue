<script setup lang="ts">
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { onBeforeUnmount, ref, computed, provide } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import NodeTitle from '@/components/NodeTitle.vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { watchOnce } from '@vueuse/core';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import type { ExpressionLocalResolveContext } from '@/types/expressions';

const { nodeId, isReadOnly, isConfigurable } = defineProps<{
	nodeId: string;
	isReadOnly?: boolean;
	isConfigurable: boolean;
}>();

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

const isMoving = ref(false);

const moveStartListener = vf.onMoveStart(() => {
	isMoving.value = true;
});

const moveEndListener = vf.onMoveEnd(() => {
	isMoving.value = false;
});

onBeforeUnmount(() => {
	moveStartListener.off();
	moveEndListener.off();
});

const isVisible = computed(() =>
	vf.isNodeIntersecting(
		{ id: nodeId },
		{
			x: -vf.viewport.value.x / vf.viewport.value.zoom,
			y: -vf.viewport.value.y / vf.viewport.value.zoom,
			width: vf.viewportRef.value?.offsetWidth ?? 0,
			height: vf.viewportRef.value?.offsetHeight ?? 0,
		},
	),
);
const isOnceVisible = ref(isVisible.value);

provide(
	ExpressionLocalResolveContextSymbol,
	computed<ExpressionLocalResolveContext | undefined>(() => {
		if (!node.value) {
			return undefined;
		}

		const workflow = workflowsStore.getCurrentWorkflow();
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

			const inputs = workflow.getParentNodesByDepth(nodeName, 1);

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
			workflow,
			execution,
			nodeName,
			additionalKeys: {},
			inputNode: findInputNode(),
		};
	}),
);

watchOnce(isVisible, (visible) => {
	isOnceVisible.value = isOnceVisible.value || visible;
});

function handleToggleExpand() {
	experimentalNdvStore.setNodeExpanded(nodeId);
}
</script>

<template>
	<div
		ref="container"
		:class="[$style.component, isExpanded ? $style.expanded : $style.collapsed]"
		:style="{
			'--zoom': `${1 / experimentalNdvStore.maxCanvasZoom}`,
			'--node-width-scaler': isConfigurable ? 1 : 1.5,
		}"
	>
		<template v-if="isOnceVisible">
			<ExperimentalCanvasNodeSettings
				v-if="isExpanded"
				:node-id="nodeId"
				:class="$style.settingsView"
				:no-wheel="
					!isMoving /* to not interrupt panning while allowing scroll of the settings pane, allow wheel event while panning */
				"
				:is-read-only="isReadOnly"
			>
				<template #actions>
					<N8nIconButton
						icon="minimize-2"
						type="secondary"
						text
						size="mini"
						icon-size="large"
						aria-label="Toggle expand"
						@click="handleToggleExpand"
					/>
				</template>
			</ExperimentalCanvasNodeSettings>
			<div v-else role="button " :class="$style.collapsedContent" @click="handleToggleExpand">
				<NodeTitle
					v-if="node"
					class="node-name"
					:model-value="node.name"
					:node-type="nodeType"
					read-only
				/>
				<N8nIcon icon="maximize-2" size="large" />
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
:root .component {
	position: relative;
	align-items: flex-start;
	justify-content: stretch;
	overflow: hidden;
	border-width: 1px !important;
	border-radius: var(--border-radius-base) !important;
	width: calc(var(--canvas-node--width) * var(--node-width-scaler));

	&.expanded {
		cursor: default;
		height: auto;
	}
	&.collapsed {
		height: calc(16px * 4);
	}
}

:root :global(.vue-flow__node):has(.component) {
	z-index: 10;

	:global(.selected) & {
		z-index: 11;
	}
}

:root .collapsedContent,
:root .settingsView {
	z-index: 1000;
	width: 100%;

	height: auto;
	max-height: min(calc(var(--canvas-node--height) * 2), 300px);
	min-height: var(--spacing-3xl); // should be multiple of GRID_SIZE
}

.collapsedContent {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-s);
	background-color: white;
	padding: var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	color: var(--color-text-base);
	cursor: pointer;

	& > * {
		zoom: calc(var(--zoom) * 1.25);
	}
}

.settingsView {
	& > * {
		zoom: var(--zoom);
	}
}
</style>
