<script setup lang="ts">
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { onBeforeUnmount, ref, computed, useTemplateRef, watch } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import NodeTitle from '@/components/NodeTitle.vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { useActiveElement, useDebounce, watchOnce } from '@vueuse/core';
import { useNDVStore } from '@/stores/ndv.store';
import { useI18n } from '@n8n/i18n';
import RunData from '@/components/RunData.vue';

const { nodeId, isReadOnly, isSelected, isConfigurable } = defineProps<{
	nodeId: string;
	isReadOnly?: boolean;
	isSelected?: boolean;
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
const containerRef = useTemplateRef('container');
const inputPanelRef = useTemplateRef('inputPanelContainer');
const activeElement = useActiveElement();
const shouldShowInputPanel = ref(false);

const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const locale = useI18n();
const runDataProps = computed<
	Pick<InstanceType<typeof RunData>['$props'], 'node' | 'runIndex' | 'overrideOutputs'> | undefined
>(() => {
	const runIndex = 0;
	const source =
		node.value &&
		workflowsStore.workflowExecutionData?.data?.resultData.runData[node.value.name]?.[runIndex]
			?.source?.[0];
	const inputNode = source && workflowsStore.nodesByName[source.previousNode];

	if (!source || !inputNode) {
		return undefined;
	}

	return {
		node: {
			...inputNode,
			disabled: false, // For RunData component to render data from disabled nodes as well
		},
		runIndex: source.previousNodeRun ?? 0,
		overrideOutputs: [source.previousNodeOutput ?? 0],
	};
});

function handleToggleExpand() {
	experimentalNdvStore.setNodeExpanded(nodeId);
}

watchOnce(isVisible, (visible) => {
	isOnceVisible.value = isOnceVisible.value || visible;
});

watch(
	() => isSelected,
	(selected) => {
		if (!selected) {
			shouldShowInputPanel.value = false;
		}
	},
);

watch(activeElement, (active) => {
	if (
		active &&
		containerRef.value?.contains(active) &&
		active.closest('[data-test-id=inline-expression-editor-input]')
	) {
		shouldShowInputPanel.value = true;
	}
});
</script>

<template>
	<div
		ref="container"
		:class="[$style.component, isExpanded ? $style.expanded : $style.collapsed, 'nodrag']"
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
			<Transition name="input">
				<div
					v-if="shouldShowInputPanel && node"
					ref="inputPanelContainer"
					:class="$style.inputPanelContainer"
					:tabindex="-1"
				>
					<RunData
						v-if="runDataProps"
						v-bind="runDataProps"
						:class="$style.inputPanel"
						:workflow="workflow"
						:too-much-data-title="locale.baseText('ndv.output.tooMuchData.title')"
						:no-data-in-branch-message="locale.baseText('ndv.output.noOutputDataInBranch')"
						:executing-message="locale.baseText('ndv.output.executing')"
						pane-type="input"
						compact
						disable-pin
						disable-edit
						disable-hover-highlight
						display-mode="schema"
						disable-display-mode-selection
						disable-run-index-selection
						mapping-enabled
					>
						<template #header>
							<N8nText :class="$style.inputPanelTitle" :bold="true" color="text-light" size="small">
								Input
							</N8nText>
						</template>
					</RunData>
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
		min-height: calc(16px * 4);
	}
	&.collapsed {
		overflow: hidden;
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
	padding-bottom: var(--spacing-xs);
	padding-bottom: var(--spacing-s);
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
