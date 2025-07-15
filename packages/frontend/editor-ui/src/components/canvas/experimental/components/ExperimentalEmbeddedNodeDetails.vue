<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import NodeTitle from '@/components/NodeTitle.vue';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { useActiveElement, watchOnce } from '@vueuse/core';
import { computed, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';

const { nodeId, isReadOnly, isConfigurable } = defineProps<{
	nodeId: string;
	isReadOnly?: boolean;
	isConfigurable: boolean;
}>();

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
const shouldShowInputPanel = ref(false);

const containerRef = useTemplateRef('container');
const inputPanelContainerRef = useTemplateRef('inputPanelContainer');
const activeElement = useActiveElement();

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

		const inputs = workflow.value.getParentNodesByDepth(nodeName, 1);

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
		workflow: workflow.value,
		execution,
		nodeName,
		additionalKeys: {},
		inputNode: findInputNode(),
	};
});

const workflow = computed(() => workflowsStore.getCurrentWorkflow());

function handleToggleExpand() {
	experimentalNdvStore.setNodeExpanded(nodeId);
}

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

watchOnce(isVisible, (visible) => {
	isOnceVisible.value = isOnceVisible.value || visible;
});

watch([activeElement, vf.getSelectedNodes], ([active, selected]) => {
	if (active && containerRef.value?.contains(active)) {
		// TODO: find a way to implement this without depending on test ID
		shouldShowInputPanel.value =
			!!active.closest('[data-test-id=inline-expression-editor-input]') ||
			!!inputPanelContainerRef.value?.contains(active);
	}

	if (selected.every((sel) => sel.id !== node.value?.id)) {
		shouldShowInputPanel.value = false;
	}
});
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
				tabindex="-1"
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
			<Transition name="input">
				<div
					v-if="shouldShowInputPanel && node"
					ref="inputPanelContainer"
					:class="$style.inputPanelContainer"
					:tabindex="-1"
				>
					<InputPanel
						:class="$style.inputPanel"
						:workflow="workflow"
						:run-index="0"
						compact
						push-ref=""
						display-mode="schema"
						disable-display-mode-selection
						:active-node-name="node.name"
						:current-node-name="expressionResolveCtx?.inputNode?.name"
						:is-mapping-onboarded="ndvStore.isMappingOnboarded"
						:focused-mappable-input="ndvStore.focusedMappableInput"
					>
						<template #header>
							<N8nText :class="$style.inputPanelTitle" :bold="true" color="text-light" size="small">
								Input
							</N8nText>
						</template>
					</InputPanel>
				</div>
			</Transition>
		</template>
	</div>
</template>

<style lang="scss" module>
:root .component {
	position: relative;
	align-items: flex-start;
	justify-content: stretch;
	border-width: 1px !important;
	border-radius: var(--border-radius-base) !important;
	width: calc(var(--canvas-node--width) * var(--node-width-scaler));

	&.expanded {
		cursor: default;
		height: auto;
		max-height: min(calc(var(--canvas-node--height) * 2), 300px);
		min-height: var(--spacing-3xl);
	}
	&.collapsed {
		overflow: hidden;
		height: var(--spacing-3xl);
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
	border-radius: var(--border-radius-base);

	height: auto;
	max-height: calc(min(calc(var(--canvas-node--height) * 2), 300px) - var(--border-width-base) * 2);
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

.inputPanelContainer {
	position: absolute;
	right: 100%;
	top: 0;
	padding-right: var(--spacing-4xs);
	margin-top: calc(-1 * var(--border-width-base));
	width: 180px;
	z-index: 2000;
	max-height: 80vh;
}

.inputPanel {
	border: var(--border-base);
	border-width: 1px;
	background-color: var(--color-background-light);
	border-radius: var(--border-radius-large);
	zoom: var(--zoom);
	box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05);
	padding: var(--spacing-2xs);
	height: 100%;
}

.inputPanelTitle {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>

<style lang="scss" scoped>
.input-enter-active,
.input-leave-active {
	transition: opacity 0.3s ease;
}

.input-enter-from,
.input-leave-to {
	opacity: 0;
}
</style>
