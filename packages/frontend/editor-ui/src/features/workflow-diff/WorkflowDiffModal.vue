<script setup lang="ts">
import Node from '@/features/canvas/components/elements/nodes/CanvasNode.vue';
import Modal from '@/components/Modal.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { STICKY_NODE_TYPE, WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import DiffBadge from '@/features/workflow-diff/DiffBadge.vue';
import NodeDiff from '@/features/workflow-diff/NodeDiff.vue';
import SyncedWorkflowCanvas from '@/features/workflow-diff/SyncedWorkflowCanvas.vue';
import { useProvideViewportSync } from '@/features/workflow-diff/useViewportSync';
import { NodeDiffStatus, useWorkflowDiff } from '@/features/workflow-diff/useWorkflowDiff';
import type { IWorkflowDb } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { removeWorkflowExecutionData } from '@/utils/workflowUtils';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { useAsyncState } from '@vueuse/core';
import type { IWorkflowSettings } from 'n8n-workflow';
import { computed, onMounted, onUnmounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import HighlightedEdge from './HighlightedEdge.vue';
import WorkflowDiffAside from './WorkflowDiffAside.vue';

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
	data: { eventBus: EventBus; workflowId: string; direction: 'push' | 'pull' };
}>();

const { selectedDetailId, onNodeClick, syncIsEnabled } = useProvideViewportSync();

const telemetry = useTelemetry();
const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const workflowsStore = useWorkflowsStore();

const manualAsyncConfiguration = {
	resetOnExecute: true,
	shallow: false,
	immediate: false,
} as const;

const remote = useAsyncState<{ workflow?: IWorkflowDb; remote: boolean } | undefined, [], false>(
	async () => {
		try {
			const { workflowId } = props.data;
			const { content: workflow } = await sourceControlStore.getRemoteWorkflow(workflowId);
			return { workflow, remote: true };
		} catch {
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
			const workflow = await workflowsStore.fetchWorkflow(workflowId);
			return { workflow, remote: false };
		} catch {
			return { workflow: undefined, remote: false };
		}
	},
	undefined,
	manualAsyncConfiguration,
);

useAsyncState(async () => {
	await Promise.all([nodeTypesStore.loadNodeTypesIfNotLoaded()]);
	await Promise.all([remote.execute(), local.execute()]);
	return true;
}, false);

const sourceWorkFlow = computed(() => (props.data.direction === 'push' ? remote : local));

const targetWorkFlow = computed(() => (props.data.direction === 'push' ? local : remote));

const { source, target, nodesDiff, connectionsDiff } = useWorkflowDiff(
	computed(() => removeWorkflowExecutionData(sourceWorkFlow.value.state.value?.workflow)),
	computed(() => removeWorkflowExecutionData(targetWorkFlow.value.state.value?.workflow)),
);

type SettingsChange = {
	name: string;
	before: string;
	after: string;
};
const settingsDiff = computed(() => {
	const sourceSettings: IWorkflowSettings =
		sourceWorkFlow.value.state.value?.workflow?.settings ?? {};
	const targetSettings: IWorkflowSettings =
		targetWorkFlow.value.state.value?.workflow?.settings ?? {};

	const allKeys = new Set<keyof IWorkflowSettings>(
		[...Object.keys(sourceSettings), ...Object.keys(targetSettings)].filter(
			(key): key is keyof IWorkflowSettings => key in sourceSettings || key in targetSettings,
		),
	);

	const settings = Array.from(allKeys).reduce<SettingsChange[]>((acc, key) => {
		const val1 = sourceSettings[key];
		const val2 = targetSettings[key];

		if (val1 !== val2) {
			acc.push({
				name: key,
				before: String(val1),
				after: String(val2),
			});
		}
		return acc;
	}, []);

	const sourceName = sourceWorkFlow.value.state.value?.workflow?.name;
	const targetName = targetWorkFlow.value.state.value?.workflow?.name;

	if (sourceName && targetName && sourceName !== targetName) {
		settings.unshift({
			name: 'name',
			before: sourceName,
			after: targetName,
		});
	}

	const sourceTags = (sourceWorkFlow.value.state.value?.workflow?.tags ?? []).map((tag) =>
		typeof tag === 'string' ? tag : tag.name,
	);
	const targetTags = (targetWorkFlow.value.state.value?.workflow?.tags ?? []).map((tag) =>
		typeof tag === 'string' ? tag : tag.name,
	);

	if (sourceTags.join('') !== targetTags.join('')) {
		settings.push({
			name: 'tags',
			before: JSON.stringify(sourceTags, null, 2),
			after: JSON.stringify(targetTags, null, 2),
		});
	}

	return settings;
});

function getNodeStatusClass(id: string) {
	const status = nodesDiff.value?.get(id)?.status ?? 'equal';
	return $style[status];
}

function getEdgeStatusClass(id: string) {
	const status = connectionsDiff.value.get(id)?.status ?? NodeDiffStatus.Eq;
	return $style[`edge-${status}`];
}

const nodeChanges = computed(() => {
	if (!nodesDiff.value) return [];
	return [...nodesDiff.value.values()]
		.filter((change) => change.status !== NodeDiffStatus.Eq)
		.map((change) => ({
			...change,
			type: nodeTypesStore.getNodeType(change.node.type, change.node.typeVersion),
		}));
});

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

const activeTab = ref<'nodes' | 'connectors' | 'settings'>();

const tabs = computed(() => [
	{
		value: 'nodes' as const,
		label: i18n.baseText('workflowDiff.nodes'),
		disabled: false,
		data: {
			count: nodeChanges.value.length,
		},
	},
	{
		value: 'connectors' as const,
		label: i18n.baseText('workflowDiff.connectors'),
		disabled: false,
		data: {
			count: connectionsDiff.value.size,
		},
	},
	{
		value: 'settings' as const,
		label: i18n.baseText('workflowDiff.settings'),
		disabled: false,
		data: {
			count: settingsDiff.value.length,
		},
	},
]);

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

const selectedNode = computed(() => {
	if (!selectedDetailId.value) return undefined;

	const node = nodesDiff.value.get(selectedDetailId.value)?.node;
	if (!node) return undefined;

	return node;
});

const nodeDiffs = computed(() => {
	if (!selectedDetailId.value) {
		return {
			oldString: '',
			newString: '',
		};
	}
	const sourceNode = sourceWorkFlow.value?.state.value?.workflow?.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);
	const targetNode = targetWorkFlow.value?.state.value?.workflow?.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);
	// Custom replacer to exclude certain properties and format others
	function replacer(key: string, value: unknown, nodeType?: string) {
		if (key === 'position') {
			return undefined; // exclude this property
		}

		if (
			(key === 'jsCode' || (key === 'content' && nodeType === STICKY_NODE_TYPE)) &&
			typeof value === 'string'
		) {
			return value.split('\n');
		}

		return value;
	}

	const withNodeType = (type?: string) => (key: string, value: unknown) =>
		replacer(key, value, type);

	return {
		oldString: JSON.stringify(sourceNode, withNodeType(sourceNode?.type), 2) ?? '',
		newString: JSON.stringify(targetNode, withNodeType(targetNode?.type), 2) ?? '',
	};
});

function handleBeforeClose() {
	selectedDetailId.value = undefined;

	// Check if we have history to go back to avoid empty navigation issues
	if (window.history.length > 1) {
		// Use router.back() to maintain proper navigation flow when possible
		router.back();
	} else {
		// Fallback to query parameter manipulation when no navigation history
		const newQuery = { ...route.query };
		delete newQuery.diff;
		delete newQuery.direction;
		void router.replace({ query: newQuery });
	}
}

// Handle ESC key since Element Plus Dialog doesn't trigger before-close on ESC
function handleEscapeKey(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		handleBeforeClose();
	}
}

onMounted(() => {
	document.addEventListener('keydown', handleEscapeKey, true);
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleEscapeKey, true);
});

const changesCount = computed(
	() => nodeChanges.value.length + connectionsDiff.value.size + settingsDiff.value.length,
);

const isSourceWorkflowNew = computed(() => {
	const sourceExists = !!sourceWorkFlow.value.state.value?.workflow;
	const targetExists = !!targetWorkFlow.value.state.value?.workflow;

	// Source is "new" only when it doesn't exist but target does AND
	// we're in a context where the target is being pushed/pulled to create the source
	// Push: remote (source) doesn't exist, local (target) does -> creating new on remote
	// Pull: local (source) doesn't exist, remote (target) does -> creating new on local
	return !sourceExists && targetExists;
});

onNodeClick((nodeId) => {
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

const modifiers = [
	{
		name: 'preventOverflow',
		options: {
			boundary: 'viewport',
			padding: 8,
		},
	},
	{
		name: 'offset',
		options: {
			offset: [80, 8],
		},
	},
];
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
						<N8nButton type="secondary" style="--button-border-radius: 4px 0 0 4px">
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
						style="--button-border-radius: 0; margin: 0 -1px"
						@click="previousNodeChange"
					/>
					<N8nIconButton
						icon="chevron-right"
						type="secondary"
						:class="$style.navigationButton"
						style="--button-border-radius: 0 4px 4px 0"
						@click="nextNodeChange"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.workflowDiffContent">
				<div :class="$style.workflowDiff">
					<div :class="$style.workflowDiffPanel">
						<template v-if="sourceWorkFlow.state.value">
							<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
								<N8nIcon v-if="sourceWorkFlow.state.value.remote" icon="git-branch" />
								{{
									sourceWorkFlow.state.value.remote
										? i18n.baseText('workflowDiff.remote', {
												interpolate: { branchName: sourceControlStore.preferences.branchName },
											})
										: i18n.baseText('workflowDiff.local')
								}}
							</N8nText>
							<template v-if="sourceWorkFlow.state.value.workflow">
								<SyncedWorkflowCanvas
									id="top"
									:nodes="source.nodes"
									:connections="source.connections"
								>
									<template #node="{ nodeProps }">
										<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
											<template #toolbar />
										</Node>
									</template>
									<template #edge="{ edgeProps, arrowHeadMarkerId }">
										<HighlightedEdge
											v-bind="edgeProps"
											:marker-end="`url(#${arrowHeadMarkerId})`"
											:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
										/>
									</template>
								</SyncedWorkflowCanvas>
							</template>
							<template v-else>
								<div :class="$style.emptyWorkflow">
									<N8nHeading size="large">{{
										isSourceWorkflowNew
											? i18n.baseText('workflowDiff.newWorkflow')
											: i18n.baseText('workflowDiff.deletedWorkflow')
									}}</N8nHeading>
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
								</div>
							</template>
						</template>
					</div>
					<div :class="$style.workflowDiffPanel">
						<template v-if="targetWorkFlow.state.value">
							<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
								<N8nIcon v-if="targetWorkFlow.state.value.remote" icon="git-branch" />
								{{
									targetWorkFlow.state.value.remote
										? i18n.baseText('workflowDiff.remote', {
												interpolate: { branchName: sourceControlStore.preferences.branchName },
											})
										: i18n.baseText('workflowDiff.local')
								}}
							</N8nText>
							<template v-if="targetWorkFlow.state.value.workflow">
								<SyncedWorkflowCanvas
									id="bottom"
									:nodes="target.nodes"
									:connections="target.connections"
								>
									<template #node="{ nodeProps }">
										<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
											<template #toolbar />
										</Node>
									</template>
									<template #edge="{ edgeProps, arrowHeadMarkerId }">
										<HighlightedEdge
											v-bind="edgeProps"
											:marker-end="`url(#${arrowHeadMarkerId})`"
											:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
										/>
									</template>
								</SyncedWorkflowCanvas>
							</template>
							<template v-else>
								<div :class="$style.emptyWorkflow">
									<N8nHeading size="large">{{
										i18n.baseText('workflowDiff.deletedWorkflow')
									}}</N8nHeading>
									<N8nText v-if="targetWorkFlow.state.value?.remote" color="text-base">{{
										i18n.baseText('workflowDiff.deletedWorkflow.remote')
									}}</N8nText>
									<N8nText v-else color="text-base">{{
										i18n.baseText('workflowDiff.deletedWorkflow.database')
									}}</N8nText>
								</div>
							</template>
						</template>
					</div>
				</div>
				<WorkflowDiffAside
					v-if="selectedNode"
					:node="selectedNode"
					@close="selectedDetailId = undefined"
				>
					<template #default="{ outputFormat }">
						<NodeDiff v-bind="nodeDiffs" :output-format="outputFormat" />
					</template>
				</WorkflowDiffAside>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
/* Diff colors are now centralized in @n8n/design-system tokens */

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
	position: absolute;
	top: 12px;
	left: 12px;
	z-index: 1;
	border-radius: 4px;
	border: 1px solid var(--color--foreground--tint-1);
	background: var(--color--foreground--tint-2);
	display: flex;
	height: 30px;
	padding: 0 12px;
	align-items: center;
	gap: 8px;
	align-self: stretch;
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

.deleted,
.added,
.modified {
	position: relative;
	&::before {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translate(-50%, -50%);
		border-radius: 4px;
		color: var(--color--text--tint-3);
		font-family: Inter, var(--font-family);
		font-size: 10px;
		font-weight: 700;
		z-index: 1;
		width: 16px;
		height: 16px;
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}
}

.deleted {
	--canvas-node--background: var(--diff-del-faint);
	--canvas-node--border-color: var(--diff-del);
	--color-sticky-background: var(--diff-del-faint);
	--color-sticky-border: var(--diff-del);
	&::before {
		content: 'D';
		background-color: var(--diff-del);
	}
	:global(.canvas-node-handle-main-output > div:empty) {
		background-color: var(--diff-del);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff-del);
	}

	/* Ensure disabled nodes still show diff border color */
	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff-del) !important;
	}
}
.added {
	--canvas-node--border-color: var(--diff-new);
	--canvas-node--background: var(--diff-new-faint);
	--color-sticky-background: var(--diff-new-faint);
	--color-sticky-border: var(--diff-new);
	position: relative;
	&::before {
		content: 'N';
		background-color: var(--diff-new);
	}
	:global(.canvas-node-handle-main-output > div:empty) {
		background-color: var(--diff-new);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff-new);
	}

	/* Ensure disabled nodes still show diff border color */
	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff-new) !important;
	}
}
.equal {
	opacity: 0.5;
	position: relative;
	pointer-events: none;
	cursor: default;
	--color-sticky-background: rgba(126, 129, 134, 0.2);
	--canvas-node-icon-color: var(--color--foreground--shade-2);
	--color-sticky-border: var(--color--foreground--shade-2);
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}
.modified {
	--canvas-node--border-color: var(--diff-modified);
	--canvas-node--background: var(--diff-modified-faint);
	--color-sticky-background: var(--diff-modified-faint);
	--color-sticky-border: var(--diff-modified);
	position: relative;
	&::before {
		content: 'M';
		background-color: var(--diff-modified);
	}
	:global(.canvas-node-handle-main-output > div:empty) {
		background-color: var(--diff-modified);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff-modified);
	}

	/* Ensure disabled nodes still show diff border color */
	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff-modified) !important;
	}
}

.edge-deleted {
	--canvas-edge-color: var(--diff-del);
	--edge-highlight-color: var(--diff-del-light);
}
.edge-added {
	--canvas-edge-color: var(--diff-new);
	--edge-highlight-color: var(--diff-new-light);
}
.edge-equal {
	opacity: 0.5;
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

.workflowDiffContent {
	display: flex;
	height: 100%;
}

.workflowDiff {
	display: flex;
	flex-direction: column;
	height: 100%;
	flex: 1;
}

.workflowDiffPanel {
	flex: 1;
	position: relative;
	border-top: 1px solid var(--color--foreground);
}

.emptyWorkflow {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
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
