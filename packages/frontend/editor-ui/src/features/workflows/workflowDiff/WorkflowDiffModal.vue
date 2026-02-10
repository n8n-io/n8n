<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/app/constants';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';
import WorkflowDiffContent from '@/features/workflows/workflowDiff/WorkflowDiffContent.vue';
import { useProvideViewportSync } from '@/features/workflows/workflowDiff/useViewportSync';
import { useWorkflowDiff } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import { useWorkflowDiffUI } from '@/features/workflows/workflowDiff/useWorkflowDiffUI';
import type { IWorkflowDb } from '@/Interface';
import type { SourceControlledFileStatus } from '@n8n/api-types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { removeWorkflowExecutionData } from '@/app/utils/workflowUtils';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { useAsyncState } from '@vueuse/core';
import { NodeDiffStatus } from 'n8n-workflow';
import { computed, onMounted, onUnmounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import {
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nRadioButtons,
	N8nText,
} from '@n8n/design-system';

const props = defineProps<{
	data: {
		eventBus: EventBus;
		workflowId: string;
		direction: 'push' | 'pull';
		workflowStatus?: SourceControlledFileStatus;
	};
}>();

const { selectedDetailId, onNodeClick, syncIsEnabled } = useProvideViewportSync();

const telemetry = useTelemetry();
const toast = useToast();
const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const workflowsListStore = useWorkflowsListStore();

const manualAsyncConfiguration = {
	resetOnExecute: true,
	shallow: false,
	immediate: false,
} as const;

const isClosed = ref(false);

const remote = useAsyncState<{ workflow?: IWorkflowDb; remote: boolean } | undefined, [], false>(
	async () => {
		if (props.data.direction === 'push' && props.data.workflowStatus === 'created') {
			return { workflow: undefined, remote: true };
		}

		try {
			const { workflowId } = props.data;
			const { content: workflow } = await sourceControlStore.getRemoteWorkflow(workflowId);
			return { workflow, remote: true };
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			handleBeforeClose();
			return { workflow: undefined, remote: true };
		}
	},
	undefined,
	manualAsyncConfiguration,
);

const local = useAsyncState<{ workflow?: IWorkflowDb; remote: boolean } | undefined, [], false>(
	async () => {
		try {
			const { workflowId } = props.data;
			const workflow = await workflowsListStore.fetchWorkflow(workflowId);
			return { workflow, remote: false };
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			handleBeforeClose();
			return { workflow: undefined, remote: false };
		}
	},
	undefined,
	manualAsyncConfiguration,
);

const sourceWorkFlow = computed(() => (props.data.direction === 'push' ? remote : local));
const targetWorkFlow = computed(() => (props.data.direction === 'push' ? local : remote));

const { source, target, nodesDiff, connectionsDiff } = useWorkflowDiff(
	computed(() => removeWorkflowExecutionData(sourceWorkFlow.value.state.value?.workflow)),
	computed(() => removeWorkflowExecutionData(targetWorkFlow.value.state.value?.workflow)),
);

// Use shared composable for UI logic
const {
	settingsDiff,
	nodeChanges,
	activeTab,
	tabs,
	selectedNode,
	nodeDiffs,
	changesCount,
	isSourceWorkflowNew,
	modifiers,
} = useWorkflowDiffUI({
	sourceWorkflow: computed(() => sourceWorkFlow.value.state.value?.workflow),
	targetWorkflow: computed(() => targetWorkFlow.value.state.value?.workflow),
	nodesDiff,
	connectionsDiff,
	selectedDetailId,
});

function getWorkflowLabel(isRemote: boolean): string {
	return isRemote
		? i18n.baseText('workflowDiff.remote', {
				interpolate: { branchName: sourceControlStore.preferences.branchName },
			})
		: i18n.baseText('workflowDiff.local');
}

const sourceLabel = computed(() =>
	getWorkflowLabel(sourceWorkFlow.value.state.value?.remote ?? false),
);
const targetLabel = computed(() =>
	getWorkflowLabel(targetWorkFlow.value.state.value?.remote ?? false),
);

// Navigation with telemetry
function nextNodeChange() {
	telemetry.track('User iterated over changes', {
		workflow_id: props.data.workflowId,
		context: 'next',
	});
	const currentIndex = nodeChanges.value.findIndex(
		(change) => change.node.id === selectedDetailId.value,
	);
	const nextIndex = (currentIndex + 1) % nodeChanges.value.length;
	selectedDetailId.value = nodeChanges.value[nextIndex]?.node.id;
}

function previousNodeChange() {
	telemetry.track('User iterated over changes', {
		workflow_id: props.data.workflowId,
		context: 'previous',
	});
	const currentIndex = nodeChanges.value.findIndex(
		(change) => change.node.id === selectedDetailId.value,
	);
	const previousIndex = (currentIndex - 1 + nodeChanges.value.length) % nodeChanges.value.length;
	selectedDetailId.value = nodeChanges.value[previousIndex]?.node.id;
}

function setActiveTab(active: boolean) {
	if (!active) {
		activeTab.value = undefined;
		return;
	}
	telemetry.track('User clicked workflow diff changes button', {
		workflow_id: props.data.workflowId,
	});
	activeTab.value = 'nodes';
}

function trackTabChange(value: 'nodes' | 'connectors' | 'settings') {
	telemetry.track('User clicked changes tabs', {
		workflow_id: props.data.workflowId,
		context: `${value}_tab`,
	});
}

function handleBeforeClose() {
	if (isClosed.value) return;
	isClosed.value = true;

	selectedDetailId.value = undefined;

	if (window.history.length > 1) {
		router.back();
	} else {
		const newQuery = { ...route.query };
		delete newQuery.diff;
		delete newQuery.direction;
		void router.replace({ query: newQuery });
	}
}

function handleEscapeKey(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		handleBeforeClose();
	}
}

onMounted(async () => {
	document.addEventListener('keydown', handleEscapeKey, true);
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	void remote.execute();
	void local.execute();
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleEscapeKey, true);
});

onNodeClick((nodeId: string) => {
	const node = nodesDiff.value.get(nodeId);
	if (!node) {
		return;
	}

	telemetry.track('User clicked to view node changes', {
		workflow_id: props.data.workflowId,
		node_type: node.node.type,
		context: 'canvas',
	});

	if (node.status !== NodeDiffStatus.Eq) {
		selectedDetailId.value = nodeId;
	}
});

function setSelectedDetailId(
	nodeId: string | undefined,
	context: 'nodes' | 'connectors' | 'settings',
) {
	if (!nodeId) {
		selectedDetailId.value = undefined;
		return;
	}

	selectedDetailId.value = nodeId;
	const node = nodesDiff.value.get(nodeId);
	if (!node) {
		return;
	}

	telemetry.track('User clicked to view node changes', {
		workflow_id: props.data.workflowId,
		node_type: node.node.type,
		context: `${context}_list`,
	});
}
</script>

<template>
	<Modal
		:event-bus="data.eventBus"
		:name="WORKFLOW_DIFF_MODAL_KEY"
		:custom-class="$style.workflowDiffModal"
		height="100%"
		width="100%"
		max-width="100%"
		max-height="100%"
		:close-on-press-escape="false"
		@before-close="handleBeforeClose"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.headerLeft">
					<N8nIconButton
						icon="arrow-left"
						type="secondary"
						:class="[$style.backButton, 'mr-xs']"
						icon-size="large"
						@click="handleBeforeClose"
					></N8nIconButton>
					<N8nHeading tag="h4" size="medium">
						{{
							sourceWorkFlow.state.value?.workflow?.name ||
							targetWorkFlow.state.value?.workflow?.name
						}}
					</N8nHeading>
				</div>

				<div :class="$style.headerRight">
					<N8nCheckbox
						v-model="syncIsEnabled"
						label-size="small"
						label="Sync views"
						class="mb-0 mr-s"
					/>
					<ElDropdown
						trigger="click"
						:popper-options="{
							placement: 'bottom-end',
							modifiers,
						}"
						:popper-class="$style.popper"
						@visible-change="setActiveTab"
					>
						<N8nButton type="secondary" style="--button--radius: 4px 0 0 4px">
							<div v-if="changesCount" :class="$style.circleBadge">
								{{ changesCount }}
							</div>
							{{ i18n.baseText('workflowDiff.changes') }}
						</N8nButton>
						<template #dropdown>
							<ElDropdownMenu :hide-on-click="false">
								<div :class="$style.dropdownContent">
									<N8nRadioButtons
										v-model="activeTab"
										:options="tabs"
										:class="$style.tabs"
										class="mb-xs"
										@update:model-value="trackTabChange"
									>
										<template #option="{ label, data: optionData }">
											{{ label }}
											<span v-if="optionData?.count" class="ml-4xs">
												({{ optionData.count }})
											</span>
										</template>
									</N8nRadioButtons>
									<div>
										<ul v-if="activeTab === 'nodes'">
											<template v-if="nodeChanges.length > 0">
												<ElDropdownItem
													v-for="change in nodeChanges"
													:key="change.node.id"
													:class="{
														[$style.clickableChange]: true,
														[$style.clickableChangeActive]: selectedDetailId === change.node.id,
													}"
													@click.prevent="setSelectedDetailId(change.node.id, activeTab)"
												>
													<DiffBadge :type="change.status" />
													<NodeIcon :node-type="change.type" :size="16" class="ml-2xs mr-4xs" />
													<span :class="$style.nodeName">{{ change.node.name }}</span>
												</ElDropdownItem>
											</template>
											<li v-else :class="$style.emptyState">
												<N8nText color="text-base" size="small">{{
													i18n.baseText('workflowDiff.noChanges')
												}}</N8nText>
											</li>
										</ul>
										<ul v-if="activeTab === 'connectors'" :class="$style.changes">
											<template v-if="connectionsDiff.size > 0">
												<li v-for="change in connectionsDiff" :key="change[0]">
													<div>
														<DiffBadge :type="change[1].status" />
													</div>
													<div style="flex: 1">
														<ul :class="$style.changesNested">
															<ElDropdownItem
																:class="{
																	[$style.clickableChange]: true,
																	[$style.clickableChangeActive]:
																		selectedDetailId === change[1].connection.source?.id,
																}"
																@click.prevent="
																	setSelectedDetailId(change[1].connection.source?.id, activeTab)
																"
															>
																<NodeIcon
																	:node-type="change[1].connection.sourceType"
																	:size="16"
																	class="ml-2xs mr-4xs"
																/>
																<span :class="$style.nodeName">{{
																	change[1].connection.source?.name
																}}</span>
															</ElDropdownItem>
															<div :class="$style.separator"></div>
															<ElDropdownItem
																:class="{
																	[$style.clickableChange]: true,
																	[$style.clickableChangeActive]:
																		selectedDetailId === change[1].connection.target?.id,
																}"
																@click.prevent="
																	setSelectedDetailId(change[1].connection.target?.id, activeTab)
																"
															>
																<NodeIcon
																	:node-type="change[1].connection.targetType"
																	:size="16"
																	class="ml-2xs mr-4xs"
																/>
																<span :class="$style.nodeName">{{
																	change[1].connection.target?.name
																}}</span>
															</ElDropdownItem>
														</ul>
													</div>
												</li>
											</template>
											<li v-else :class="$style.emptyState">
												<N8nText color="text-base" size="small">{{
													i18n.baseText('workflowDiff.noChanges')
												}}</N8nText>
											</li>
										</ul>
										<ul v-if="activeTab === 'settings'">
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
											<li v-else :class="$style.emptyState">
												<N8nText color="text-base" size="small">{{
													i18n.baseText('workflowDiff.noChanges')
												}}</N8nText>
											</li>
										</ul>
									</div>
								</div>
							</ElDropdownMenu>
						</template>
					</ElDropdown>
					<N8nIconButton
						icon="chevron-left"
						type="secondary"
						:class="$style.navigationButton"
						style="--button--radius: 0; margin: 0 -1px"
						@click="previousNodeChange"
					/>
					<N8nIconButton
						icon="chevron-right"
						type="secondary"
						:class="$style.navigationButton"
						style="--button--radius: 0 4px 4px 0"
						@click="nextNodeChange"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<WorkflowDiffContent
				:source-nodes="source.nodes"
				:source-connections="source.connections"
				:target-nodes="target.nodes"
				:target-connections="target.connections"
				:source-label="sourceLabel"
				:target-label="targetLabel"
				:source-exists="!!sourceWorkFlow.state.value?.workflow"
				:target-exists="!!targetWorkFlow.state.value?.workflow"
				:selected-node="selectedNode"
				:node-diffs="nodeDiffs"
				:is-source-workflow-new="isSourceWorkflowNew"
				:nodes-diff="nodesDiff"
				:connections-diff="connectionsDiff"
				@close-aside="selectedDetailId = undefined"
			>
				<template #sourceLabel>
					<N8nText
						v-if="sourceWorkFlow.state.value"
						color="text-dark"
						size="small"
						:class="$style.sourceBadge"
					>
						<N8nIcon v-if="sourceWorkFlow.state.value.remote" icon="git-branch" />
						{{ sourceLabel }}
					</N8nText>
				</template>
				<template #sourceEmptyText>
					<N8nText v-if="sourceWorkFlow.state.value?.remote" color="text-base">{{
						isSourceWorkflowNew
							? i18n.baseText('workflowDiff.newWorkflow.remote')
							: i18n.baseText('workflowDiff.deletedWorkflow.remote')
					}}</N8nText>
					<N8nText v-else color="text-base">{{
						isSourceWorkflowNew
							? i18n.baseText('workflowDiff.newWorkflow.database')
							: i18n.baseText('workflowDiff.deletedWorkflow.database')
					}}</N8nText>
				</template>
				<template #targetLabel>
					<N8nText
						v-if="targetWorkFlow.state.value"
						color="text-dark"
						size="small"
						:class="$style.sourceBadge"
					>
						<N8nIcon v-if="targetWorkFlow.state.value.remote" icon="git-branch" />
						{{ targetLabel }}
					</N8nText>
				</template>
				<template #targetEmptyText>
					<N8nText v-if="targetWorkFlow.state.value?.remote" color="text-base">{{
						i18n.baseText('workflowDiff.deletedWorkflow.remote')
					}}</N8nText>
					<N8nText v-else color="text-base">{{
						i18n.baseText('workflowDiff.deletedWorkflow.database')
					}}</N8nText>
				</template>
			</WorkflowDiffContent>
		</template>
	</Modal>
</template>

<style module lang="scss">
.workflowDiffModal {
	margin-bottom: 0;
	border-radius: 0;

	:global(.el-dialog__body) {
		padding: 0;
	}
	:global(.el-dialog__header) {
		padding: 11px 16px;
	}
	:global(.el-dialog__headerbtn) {
		display: none;
	}
}

.sourceBadge {
	composes: sourceBadge from './workflowDiff.module.scss';
}

.tabs {
	display: flex;
	flex-direction: row;
	:global(.n8n-radio-button) {
		flex: 1;
	}
	:global(.n8n-radio-button > div) {
		justify-content: center;
	}
}

.popper {
	box-shadow: 0 6px 16px 0 rgba(68, 28, 23, 0.06);
	:global(.el-popper__arrow) {
		display: none;
	}
}

.changes {
	> li {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing--2xs);
		padding: 10px 0 var(--spacing--3xs) var(--spacing--2xs);

		> div {
			min-width: 0;
		}

		.clickableChange {
			padding: var(--spacing--3xs) var(--spacing--xs) var(--spacing--3xs) 0;
			margin-left: -4px;
		}
	}

	.changesNested {
		margin-top: -3px;
		width: 100%;
		min-width: 0;
	}
}

.clickableChange {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	border-radius: 4px;
	padding: var(--spacing--xs) var(--spacing--2xs);
	margin-right: var(--spacing--xs);
	line-height: unset;
	min-width: 0;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--light-3);
	}
}

.clickableChangeActive {
	background-color: var(--color--background--light-3);
}

.nodeName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.separator {
	width: 1px;
	height: 10px;
	background-color: var(--color--foreground--shade-2);
	margin: 0 0 -5px var(--spacing--xs);
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
	min-width: 320px;
	padding: 0 12px;

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 400px;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.noNumberDiff {
		min-height: 41px;
		margin: 0 12px 10px 0;
		overflow: hidden;
		:global(.blob-num) {
			display: none;
		}
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;

	.navigationButton {
		height: 34px;
		width: 34px;
	}

	.backButton {
		border: none;
	}
}

.headerLeft,
.headerRight {
	display: flex;
	align-items: center;
}

.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--md) var(--spacing--xs);
}
</style>
