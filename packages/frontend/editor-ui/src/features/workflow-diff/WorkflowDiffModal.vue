<script setup lang="ts">
import Node from '@/components/canvas/elements/nodes/CanvasNode.vue';
import Modal from '@/components/Modal.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import DiffBadge from '@/features/workflow-diff/DiffBadge.vue';
import NodeDiff from '@/features/workflow-diff/NodeDiff.vue';
import SyncedWorkflowCanvas from '@/features/workflow-diff/SyncedWorkflowCanvas.vue';
import { useProvideViewportSync } from '@/features/workflow-diff/useViewportSync';
import { NodeDiffStatus, useWorkflowDiff } from '@/features/workflow-diff/useWorkflowDiff';
import type { IWorkflowDb } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nHeading, N8nIconButton, N8nRadioButtons, N8nText } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { useAsyncState } from '@vueuse/core';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import type { IWorkflowSettings } from 'n8n-workflow';
import { computed, ref, useCssModule } from 'vue';
import HighlightedEdge from './HighlightedEdge.vue';
import WorkflowDiffAside from './WorkflowDiffAside.vue';

const props = defineProps<{
	data: { eventBus: EventBus; workflowId: string; direction: 'push' | 'pull' };
}>();

const { selectedDetailId, onNodeClick } = useProvideViewportSync();

const telemetry = useTelemetry();
const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();

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
	computed(() => sourceWorkFlow.value.state.value?.workflow),
	computed(() => targetWorkFlow.value.state.value?.workflow),
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
		label: 'Nodes',
		disabled: nodeChanges.value.length === 0,
		data: {
			count: nodeChanges.value.length,
		},
	},
	{
		value: 'connectors' as const,
		label: 'Connectors',
		disabled: connectionsDiff.value.size === 0,
		data: {
			count: connectionsDiff.value.size,
		},
	},
	{
		value: 'settings' as const,
		label: 'Settings',
		disabled: settingsDiff.value.length === 0,
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
	const value = tabs.value.find((tab) => !tab.disabled)?.value ?? 'nodes';
	activeTab.value = value;
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
	return {
		oldString: JSON.stringify(sourceNode, null, 2) ?? '',
		newString: JSON.stringify(targetNode, null, 2) ?? '',
	};
});

function handleBeforeClose() {
	selectedDetailId.value = undefined;
}

const changesCount = computed(
	() => nodeChanges.value.length + connectionsDiff.value.size + settingsDiff.value.length,
);

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
		@before-close="handleBeforeClose"
	>
		<template #header="{ closeDialog }">
			<div :class="$style.header">
				<div :class="$style.headerLeft">
					<N8nIconButton
						icon="arrow-left"
						type="secondary"
						class="mr-xs"
						@click="closeDialog"
					></N8nIconButton>
					<N8nHeading tag="h1" size="xlarge">
						{{
							sourceWorkFlow.state.value?.workflow?.name ||
							targetWorkFlow.state.value?.workflow?.name
						}}
					</N8nHeading>
				</div>

				<div>
					<ElDropdown
						trigger="click"
						:popper-options="{
							placement: 'bottom-end',
							modifiers,
						}"
						:popper-class="$style.popper"
						class="mr-xs"
						@visible-change="setActiveTab"
					>
						<N8nButton type="secondary">
							<div v-if="changesCount" :class="$style.circleBadge">
								{{ changesCount }}
							</div>
							Changes
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
												<NodeIcon :node-type="change.type" :size="16" />
												{{ change.node.name }}
											</ElDropdownItem>
										</ul>
										<ul v-if="activeTab === 'connectors'" :class="$style.changes">
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
															<NodeIcon :node-type="change[1].connection.sourceType" :size="16" />
															{{ change[1].connection.source?.name }}
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
															<NodeIcon :node-type="change[1].connection.targetType" :size="16" />
															{{ change[1].connection.target?.name }}
														</ElDropdownItem>
													</ul>
												</div>
											</li>
										</ul>
										<ul v-if="activeTab === 'settings'">
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
						@click="previousNodeChange"
					></N8nIconButton>
					<N8nIconButton
						icon="chevron-right"
						type="secondary"
						:class="$style.navigationButton"
						@click="nextNodeChange"
					></N8nIconButton>
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
										? `Remote (${sourceControlStore.preferences.branchName})`
										: 'Local'
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
									<template v-if="targetWorkFlow.state.value?.remote">
										<N8nText color="text-dark" size="large"> Deleted workflow </N8nText>
										<N8nText color="text-base"> The workflow was deleted on the database </N8nText>
									</template>
									<template v-else>
										<N8nText color="text-dark" size="large"> Deleted workflow </N8nText>
										<N8nText color="text-base"> The workflow was deleted on remote </N8nText>
									</template>
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
										? `Remote (${sourceControlStore.preferences.branchName})`
										: 'Local'
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
									<template v-if="targetWorkFlow.state.value?.remote">
										<N8nText color="text-dark" size="large"> Deleted workflow </N8nText>
										<N8nText color="text-base"> The workflow was deleted on remote </N8nText>
									</template>
									<template v-else>
										<N8nText color="text-dark" size="large"> Deleted workflow </N8nText>
										<N8nText color="text-base"> The workflow was deleted on the data base </N8nText>
									</template>
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

<style module>
.workflowDiffModal {
	margin-bottom: 0;
	border-radius: 0;

	:global(.el-dialog__body) {
		padding: 0;
	}
	:global(.el-dialog__header) {
		padding: 11px 16px;
		border-bottom: 1px solid var(--color-border);
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
	border: 1px solid var(--color-foreground-light);
	background: var(--color-foreground-xlight);
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
	box-shadow: 0px 6px 16px 0px rgba(68, 28, 23, 0.06);
	:global(.el-popper__arrow) {
		display: none;
	}
}

.changes {
	list-style: none;
	margin: 0;
	padding: 0;
	> li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 8px;
	}
}

.separator {
	width: 1px;
	height: 10px;
	background-color: var(--color-foreground-xdark);
	margin: -5px 23px;
	position: relative;
	z-index: 1;
}

.clickableChange {
	display: flex;
	align-items: center;
	gap: 8px;
	border-radius: 4px;
}

.clickableChangeActive {
	background-color: var(--color-background-medium);
}

.deleted,
.added,
.modified {
	position: relative;
	&::before {
		position: absolute;
		bottom: 0px;
		left: 0px;
		border-bottom-left-radius: 6px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		font-family: var(--font-family-monospace);
		font-size: 8px;
		font-weight: 700;
		z-index: 1;
		width: 16px;
		height: 16px;
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}

	&[data-node-type='n8n-nodes-base.stickyNote'],
	&[data-node-type='n8n-nodes-base.manualTrigger'] {
		&::before {
			left: auto;
			right: 0px;
			border-top-right-radius: 0;
			border-top-left-radius: 2px;
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 6px;
		}
	}
}

.deleted {
	--canvas-node--background: rgba(234, 31, 48, 0.2);
	--canvas-node--border-color: var(--color-node-icon-red);
	--color-sticky-background: rgba(234, 31, 48, 0.2);
	--color-sticky-border: var(--color-node-icon-red);
	&::before {
		content: 'D';
		background-color: var(--color-node-icon-red);
	}
	:global(.canvas-node-handle-main-output > div) {
		background-color: var(--color-node-icon-red);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-red);
	}
}
.added {
	--canvas-node--border-color: var(--color-node-icon-green);
	--canvas-node--background: rgba(14, 171, 84, 0.2);
	--color-sticky-background: rgba(14, 171, 84, 0.2);
	--color-sticky-border: var(--color-node-icon-green);
	position: relative;
	&::before {
		content: 'N';
		background-color: var(--color-node-icon-green);
	}
	:global(.canvas-node-handle-main-output > div) {
		background-color: var(--color-node-icon-green);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-green);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-green);
	}
}
.equal {
	opacity: 0.5;
	position: relative;
	pointer-events: none;
	cursor: default;
	--color-sticky-background: rgba(126, 129, 134, 0.2);
	--canvas-node-icon-color: var(--color-foreground-xdark);
	--color-sticky-border: var(--color-foreground-xdark);
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}
.modified {
	--canvas-node--border-color: var(--color-node-icon-orange);
	--canvas-node--background: rgba(255, 150, 90, 0.2);
	--color-sticky-background: rgba(255, 150, 90, 0.2);
	--color-sticky-border: var(--color-node-icon-orange);
	position: relative;
	&::before {
		content: 'M';
		background-color: var(--color-node-icon-orange);
	}
	:global(.canvas-node-handle-main-output .source) {
		--color-foreground-xdark: var(--color-node-icon-orange);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-orange);
	}
}

.edge-deleted {
	--canvas-edge-color: var(--color-node-icon-red);
	--edge-highlight-color: rgba(234, 31, 48, 0.2);
}
.edge-added {
	--canvas-edge-color: var(--color-node-icon-green);
	--edge-highlight-color: rgba(14, 171, 84, 0.2);
}
.edge-equal {
	opacity: 0.5;
}

.noNumberDiff {
	min-height: 41px;
	margin-bottom: 10px !important;
	:global(.blob-num) {
		display: none;
	}
}

.circleBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background-color: var(--color-background-medium);
	color: var(--color-text-dark);
	font-size: 10px;
	font-weight: bold;
	line-height: 1;
}

.dropdownContent {
	min-width: 300px;
	padding: 2px 12px;
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
	border-top: 1px solid #ddd;
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
}

.headerLeft {
	display: flex;
	align-items: center;
}

.navigationButton {
	height: 34px !important;
	width: 34px !important;
}
</style>
