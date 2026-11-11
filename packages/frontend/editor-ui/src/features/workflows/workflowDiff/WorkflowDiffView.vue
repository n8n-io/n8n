<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { onClickOutside, useEventListener } from '@vueuse/core';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import WorkflowDiffEmptyState from '@/features/workflows/workflowDiff/WorkflowDiffEmptyState.vue';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';
import WorkflowDiffToolbar from './WorkflowDiffToolbar.vue';
import WorkflowDiffContent from '@/features/workflows/workflowDiff/WorkflowDiffContent.vue';
import WorkflowDiffNodeItem from '@/features/workflows/workflowDiff/WorkflowDiffNodeItem.vue';
import { useProvideViewportSync } from '@/features/workflows/workflowDiff/useViewportSync';
import { useWorkflowDiff } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import { useWorkflowDiffUI } from '@/features/workflows/workflowDiff/useWorkflowDiffUI';
import type { IWorkflowDb, INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removeWorkflowExecutionData } from '@/app/utils/workflowUtils';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { NodeDiffStatus } from 'n8n-workflow';
import { computed, ref, useCssModule, onMounted } from 'vue';
import { telemetry } from '@/app/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

import { N8nButton, N8nDropdownMenu, N8nSegmentControl, N8nText } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		sourceWorkflow?: IWorkflowDb;
		targetWorkflow?: IWorkflowDb;
		sourceLabel?: string;
		targetLabel?: string;
		tidyUp?: boolean;
		showBackButton?: boolean;
		showFullscreenButton?: boolean;
		requireCanvasFocus?: boolean;
		/** Hides the workflow name when the parent already shows it. Fullscreen still shows it. */
		hideTitle?: boolean;
		canvasIdPrefix?: string;
		source?: 'version_history' | 'push_pull_modal' | 'unknown';
	}>(),
	{
		sourceWorkflow: undefined,
		targetWorkflow: undefined,
		sourceLabel: 'Before',
		targetLabel: 'After',
		showBackButton: false,
		showFullscreenButton: false,
		requireCanvasFocus: false,
		hideTitle: false,
		canvasIdPrefix: undefined,
		source: 'unknown',
	},
);
const emit = defineEmits<{
	back: [];
}>();

const { selectedDetailId, onNodeClick, syncIsEnabled } = useProvideViewportSync();

// Teleported, not just `position: fixed`: a `container-type` ancestor would trap it.
const isFullscreen = ref(false);
const viewer = ref<HTMLElement>();
const isCanvasFocused = ref(false);
const isWheelEnabled = computed(
	() => !props.requireCanvasFocus || isFullscreen.value || isCanvasFocused.value,
);

onClickOutside(viewer, () => {
	isCanvasFocused.value = false;
});

function onFocusOut(event: FocusEvent) {
	if (!(event.relatedTarget instanceof Node) || !viewer.value?.contains(event.relatedTarget)) {
		isCanvasFocused.value = false;
	}
}

function toggleFullscreen() {
	isFullscreen.value = !isFullscreen.value;
	isCanvasFocused.value = false;
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
	if (event.key !== 'Escape') return;
	isCanvasFocused.value = false;
	if (!isFullscreen.value) return;
	event.preventDefault();
	isFullscreen.value = false;
});

const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();
const i18n = useI18n();
const toast = useToast();

const { source, target, sourceRenderData, targetRenderData, nodesDiff, connectionsDiff } =
	useWorkflowDiff(
		computed(() => removeWorkflowExecutionData(props.sourceWorkflow)),
		computed(() => removeWorkflowExecutionData(props.targetWorkflow)),
	);

// Use shared composable for UI logic
const {
	settingsDiff,
	nodeChanges,
	nextNodeChange,
	previousNodeChange,
	activeTab,
	tabs,
	setActiveTab,
	selectedNode,
	nodeDiffs,
	changesCount,
	isSourceWorkflowNew,
	setSelectedDetailId,
} = useWorkflowDiffUI({
	sourceWorkflow: computed(() => props.sourceWorkflow),
	targetWorkflow: computed(() => props.targetWorkflow),
	nodesDiff,
	connectionsDiff,
	selectedDetailId,
});

onNodeClick((nodeId: string) => {
	const node = nodesDiff.value.get(nodeId);
	if (!node) {
		return;
	}

	if (node.status !== NodeDiffStatus.Eq) {
		selectedDetailId.value = nodeId;
	}
});

onMounted(async () => {
	try {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowDiff.error.loadNodeTypes'));
	}
});

const onChangesDropdownVisibleChange = (visible: boolean) => {
	setActiveTab(visible);
	if (visible) {
		telemetry.track('user_opens_diff_changes_list', {
			instance_id: rootStore.instanceId,
			workflow_id: props.sourceWorkflow?.id ?? props.targetWorkflow?.id,
			source: props.source,
		});
	}
};

const onNodeChangeSelect = (change: { node: INodeUi; status: NodeDiffStatus }) => {
	setSelectedDetailId(change.node.id);
	telemetry.track('user_clicks_node_in_diff_changes_list', {
		instance_id: rootStore.instanceId,
		workflow_id: props.sourceWorkflow?.id ?? props.targetWorkflow?.id,
		node_id: change.node.id,
		node_name: change.node.name,
		node_status: change.status,
		source: props.source,
	});
};
</script>

<template>
	<Teleport to="body" :disabled="!isFullscreen">
		<div
			ref="viewer"
			:class="[
				$style.workflowDiffViewContainer,
				{
					[$style.fullscreen]: isFullscreen,
					nowheel: !isWheelEnabled,
				},
			]"
			:tabindex="requireCanvasFocus && !isFullscreen ? 0 : undefined"
			data-test-id="workflow-diff-view"
			@pointerdown="isCanvasFocused = true"
			@focusin="isCanvasFocused = true"
			@focusout="onFocusOut"
		>
			<WorkflowDiffToolbar
				v-model:sync-is-enabled="syncIsEnabled"
				:title="sourceWorkflow?.name || targetWorkflow?.name"
				:hide-title="hideTitle"
				:show-back-button="showBackButton"
				:show-fullscreen-button="showFullscreenButton"
				:is-fullscreen="isFullscreen"
				@back="emit('back')"
				@previous="previousNodeChange"
				@next="nextNodeChange"
				@fullscreen="toggleFullscreen"
			>
				<template #header-prefix><slot name="header-prefix" /></template>
				<template #changes>
					<N8nDropdownMenu
						:items="[]"
						placement="bottom-end"
						width="320px"
						data-test-id="workflow-diff-changes-menu"
						@update:model-value="onChangesDropdownVisibleChange"
					>
						<template #trigger>
							<N8nButton variant="outline">
								<div v-if="changesCount" :class="$style.circleBadge">
									{{ changesCount }}
								</div>
								{{ i18n.baseText('workflowDiff.changes') }}
							</N8nButton>
						</template>
						<template #content>
							<div :class="$style.dropdownContent">
								<N8nSegmentControl v-model="activeTab" :options="tabs" :class="$style.tabs">
									<template #option="{ label, data: optionData }">
										{{ label }}
										<span v-if="optionData?.count" class="ml-4xs"> ({{ optionData.count }}) </span>
									</template>
								</N8nSegmentControl>
								<div>
									<ul v-if="activeTab === 'nodes'">
										<template v-if="nodeChanges.length > 0">
											<WorkflowDiffNodeItem
												v-for="change in nodeChanges"
												:key="change.node.id"
												:badge-type="change.status"
												:node-type="change.type"
												:node-name="change.node.name"
												:is-active="selectedDetailId === change.node.id"
												@select="onNodeChangeSelect(change)"
											/>
										</template>
										<WorkflowDiffEmptyState
											v-else
											:text="i18n.baseText('workflowDiff.noChanges')"
										/>
									</ul>
									<ul v-if="activeTab === 'connectors'" :class="$style.changes">
										<template v-if="connectionsDiff.size > 0">
											<li v-for="change in connectionsDiff" :key="change[0]">
												<div>
													<DiffBadge :type="change[1].status" />
												</div>
												<div>
													<ul>
														<WorkflowDiffNodeItem
															:node-type="change[1].connection.sourceType"
															:node-name="change[1].connection.source?.name"
															:is-active="selectedDetailId === change[1].connection.source?.id"
															is-compact
															@select="setSelectedDetailId(change[1].connection.source?.id)"
														/>
														<div :class="$style.separator"></div>
														<WorkflowDiffNodeItem
															:node-type="change[1].connection.targetType"
															:node-name="change[1].connection.target?.name"
															:is-active="selectedDetailId === change[1].connection.target?.id"
															is-compact
															@select="setSelectedDetailId(change[1].connection.target?.id)"
														/>
													</ul>
												</div>
											</li>
										</template>
										<WorkflowDiffEmptyState
											v-else
											:text="i18n.baseText('workflowDiff.noChanges')"
										/>
									</ul>
									<ul v-if="activeTab === 'settings'" :class="$style.settings">
										<template v-if="settingsDiff.length > 0">
											<li v-for="setting in settingsDiff" :key="setting.name">
												<N8nText color="text-dark" size="medium" tag="div" bold>{{
													i18n.baseText(`workflowSettings.${setting.name}` as BaseTextKey)
												}}</N8nText>
												<NodeDiff
													:old-string="setting.before"
													:new-string="setting.after"
													:class="$style.noNumberDiff"
												/>
											</li>
										</template>
										<WorkflowDiffEmptyState
											v-else
											:text="i18n.baseText('workflowDiff.noChanges')"
										/>
									</ul>
								</div>
							</div>
						</template>
					</N8nDropdownMenu>
				</template>
			</WorkflowDiffToolbar>

			<div
				:class="[
					$style.canvasArea,
					{ [$style.focused]: requireCanvasFocus && isCanvasFocused && !isFullscreen },
				]"
				data-test-id="workflow-diff-canvas-area"
			>
				<WorkflowDiffContent
					:class="$style.canvasContent"
					:source-nodes="source.nodes"
					:source-connections="source.connections"
					:source-render-data="sourceRenderData"
					:target-nodes="target.nodes"
					:target-connections="target.connections"
					:target-render-data="targetRenderData"
					:source-label="sourceLabel"
					:target-label="targetLabel"
					:source-exists="!!sourceWorkflow"
					:target-exists="!!targetWorkflow"
					:selected-node="selectedNode"
					:node-diffs="nodeDiffs"
					:is-source-workflow-new="isSourceWorkflowNew"
					:apply-layout="tidyUp"
					:nodes-diff="nodesDiff"
					:connections-diff="connectionsDiff"
					:canvas-id-prefix="canvasIdPrefix"
					@close-aside="selectedDetailId = undefined"
				>
					<template v-if="$slots.sourceLabel" #sourceLabel>
						<slot name="sourceLabel" />
					</template>
					<template v-if="$slots.sourceEmptyText" #sourceEmptyText>
						<slot name="sourceEmptyText" />
					</template>
					<template v-if="$slots.targetLabel" #targetLabel>
						<slot name="targetLabel" />
					</template>
					<template v-if="$slots.targetEmptyText" #targetEmptyText>
						<slot name="targetEmptyText" />
					</template>
				</WorkflowDiffContent>
				<N8nText v-if="!isWheelEnabled" size="small" color="text-light" :class="$style.focusHint">
					{{ i18n.baseText('promotions.preview.workflow.activateCanvas') }}
				</N8nText>
			</div>
		</div>
	</Teleport>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.workflowDiffViewContainer {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
}

.canvasArea {
	position: relative;
	flex: 1;
	min-height: 0;
}

.canvasContent {
	position: relative;
	z-index: 0;
}

.focused::after {
	@include focus.focus-ring;

	content: '';
	position: absolute;
	inset: 0;
	outline-offset: calc(-1 * var(--focus--border-width));
	border-radius: 0 0 var(--radius--xs) var(--radius--xs);
	pointer-events: none;
	z-index: 1;
}

.focusHint {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: color-mix(in srgb, var(--background--surface) 85%, transparent);
	pointer-events: none;
	white-space: nowrap;
	z-index: 1;
}

.fullscreen {
	position: fixed;
	inset: 0;
	z-index: var(--workflow-diff-fullscreen--z);
	background: var(--color--background--light-3);
}

.tabs {
	width: 100%;
}

.changes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	> li {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing--2xs);
		padding-left: var(--spacing--2xs);
	}
}

.separator {
	width: 1px;
	height: 10px;
	background-color: var(--color--foreground--shade-2);
	margin-left: var(--spacing--sm);
	position: relative;
	z-index: 1;
}

.circleBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background-color: var(--color--primary);
	color: var(--color--text--tint-3);
	font-size: 10px;
	font-weight: bold;
	line-height: 1;
}

.dropdownContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 320px;
	padding: var(--spacing--3xs);

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 400px;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--xs);
		padding: var(--spacing--2xs);
	}

	.noNumberDiff {
		min-height: 41px;
		margin: 0;
		overflow: hidden;
		:global(.blob-num) {
			display: none;
		}
	}
}
</style>
