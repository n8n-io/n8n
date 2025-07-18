<script setup lang="ts">
import Edge from '@/components/canvas/elements/edges/CanvasEdge.vue';
import Node from '@/components/canvas/elements/nodes/CanvasNode.vue';
import Modal from '@/components/Modal.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import DiffBadge from '@/features/workflow-diff/DiffBadge.vue';
import NodeDiff from '@/features/workflow-diff/NodeDiff.vue';
import SyncedWorkflowCanvas from '@/features/workflow-diff/SyncedWorkflowCanvas.vue';
import { useProvideViewportSync } from '@/features/workflow-diff/useViewportSync';
import {
	compareWorkflowsNodes,
	mapConnections,
	NodeDiffStatus,
} from '@/features/workflow-diff/useWorkflowDiff';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnection, CanvasNode } from '@/types';
import { N8nText } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { BaseEdge } from '@vue-flow/core';
import { useAsyncState } from '@vueuse/core';
import { ElDropdown, ElDropdownMenu } from 'element-plus';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, ref, useCssModule } from 'vue';

const props = defineProps<{
	data: { eventBus: EventBus; workflowId: string; direction: 'push' | 'pull' };
}>();

const { selectedDetailId, onNodeClick } = useProvideViewportSync();

const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();

const manualAsyncConfiguration = {
	resetOnExecute: true,
	shallow: false,
	immediate: false,
} as const;

type WorkflowDiff = {
	workflow?: IWorkflowDb;
	workflowObject: ReturnType<typeof workflowsStore.getWorkflow>;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
	remote: boolean;
};

const defaultWorkflowDiff = (remote: boolean) => ({
	workflow: undefined,
	workflowObject: workflowsStore.getWorkflow([], {}),
	nodes: [],
	connections: [],
	remote,
});

const remote = useAsyncState<WorkflowDiff | undefined, [], false>(
	async () => {
		try {
			const { workflowId } = props.data;
			const { content: workflow } = await sourceControlStore.getRemoteWorkflow(workflowId);
			const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);
			const { nodes, connections } = useCanvasMapping({
				nodes: ref(workflow.nodes),
				connections: ref(workflow.connections),
				// @ts-expect-error it expects expressions but they are not needed
				workflowObject: ref(workflowObject),
			});

			return {
				workflow,
				workflowObject,
				nodes: nodes.value.map((node) => {
					node.draggable = false;
					node.selectable = false;
					node.focusable = false;
					return node;
				}),
				connections: connections.value,
				remote: true,
			};
		} catch {
			return defaultWorkflowDiff(true);
		}
	},
	undefined,
	manualAsyncConfiguration,
);

const local = useAsyncState<WorkflowDiff | undefined, [], false>(
	async () => {
		try {
			const { workflowId } = props.data;
			const workflow = await workflowsStore.fetchWorkflow(workflowId);
			const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);
			const { nodes, connections } = useCanvasMapping({
				nodes: ref(workflow.nodes),
				connections: ref(workflow.connections),
				// @ts-expect-error it expects expressions but they are not needed
				workflowObject: ref(workflowObject),
			});

			return {
				workflow,
				workflowObject,
				nodes: nodes.value.map((node) => {
					node.draggable = false;
					node.selectable = false;
					node.focusable = false;
					return node;
				}),
				connections: connections.value,
				remote: false,
			};
		} catch {
			return defaultWorkflowDiff(false);
		}
	},
	undefined,
	manualAsyncConfiguration,
);

useAsyncState(async () => {
	await Promise.all([
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		credentialsStore.fetchCredentialTypes(false),
	]);
	await Promise.all([remote.execute(), local.execute()]);
	return true;
}, false);

const topWorkFlow = computed(() => (props.data.direction === 'push' ? remote : local));

const bottomWorkFlow = computed(() => (props.data.direction === 'push' ? local : remote));

const diff = computed(() => {
	return compareWorkflowsNodes(
		topWorkFlow.value.state.value?.workflow?.nodes ?? [],
		bottomWorkFlow.value.state.value?.workflow?.nodes ?? [],
	);
});

type Connection = {
	id: string;
	source: INodeUi;
	target: INodeUi;
	sourceType: INodeTypeDescription | null;
	targetType: INodeTypeDescription | null;
};

function formatConnectionDiff(
	id: string,
	status: NodeDiffStatus,
	collection: Map<string, CanvasConnection>,
	accumulator: Map<string, { status: NodeDiffStatus; connection: Connection }>,
) {
	const connection = collection.get(id);
	if (!connection) return;

	const sourceNode = diff.value.get(connection.source)?.node as INodeUi;
	const targetNode = diff.value.get(connection.target)?.node as INodeUi;

	accumulator.set(id, {
		status,
		connection: {
			id,
			source: sourceNode,
			target: targetNode,
			sourceType: nodeTypesStore.getNodeType(sourceNode.type, sourceNode.typeVersion),
			targetType: nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion),
		},
	});
}

const connectionsDiff = computed(() => {
	const source = mapConnections(topWorkFlow.value.state.value?.connections ?? []);
	const target = mapConnections(bottomWorkFlow.value.state.value?.connections ?? []);

	const added = target.set.difference(source.set);
	const removed = source.set.difference(target.set);

	const acc = new Map<string, { status: NodeDiffStatus; connection: Connection }>();

	added.values().forEach((id) => formatConnectionDiff(id, NodeDiffStatus.Added, target.map, acc));
	removed
		.values()
		.forEach((id) => formatConnectionDiff(id, NodeDiffStatus.Deleted, source.map, acc));
	return acc;
});

type SettingsChange = {
	name: string;
	before: string;
	after: string;
};
const settingsDiff = computed(() => {
	const topSettings = topWorkFlow.value.state.value?.workflow?.settings ?? {};
	const bottomSettings = bottomWorkFlow.value.state.value?.workflow?.settings ?? {};

	const allKeys = new Set([...Object.keys(topSettings), ...Object.keys(bottomSettings)]);

	return [...allKeys].reduce<SettingsChange[]>((acc, key) => {
		const val1 = topSettings[key as keyof typeof topSettings];
		const val2 = bottomSettings[key as keyof typeof bottomSettings];

		if (val1 !== val2) {
			acc.push({
				name: key,
				before: String(val1),
				after: String(val2),
			});
		}
		return acc;
	}, []);
});

function getNodeStatusClass(id: string) {
	const status = diff.value?.get(id)?.status ?? 'equal';
	return $style[status];
}

function getEdgeStatusClass(id: string) {
	const status = connectionsDiff.value.get(id)?.status ?? NodeDiffStatus.Eq;
	return $style[`edge-${status}`];
}

const nodeChanges = computed(() => {
	if (!diff.value) return [];
	return [...diff.value.values()]
		.filter((change) => change.status !== NodeDiffStatus.Eq)
		.map((change) => ({
			...change,
			type: nodeTypesStore.getNodeType(change.node.type, change.node.typeVersion),
		}));
});

function nextNodeChange() {
	const currentIndex = nodeChanges.value.findIndex(
		(change) => change.node.id === selectedDetailId.value,
	);

	const nextIndex = (currentIndex + 1) % nodeChanges.value.length;
	selectedDetailId.value = nodeChanges.value[nextIndex]?.node.id;
}

function previousNodeChange() {
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
		count: nodeChanges.value.length,
		disabled: nodeChanges.value.length === 0,
	},
	{
		value: 'connectors' as const,
		label: 'Connectors',
		count: connectionsDiff.value.size,
		disabled: connectionsDiff.value.size === 0,
	},
	{
		value: 'settings' as const,
		label: 'Settings',
		count: settingsDiff.value.length,
		disabled: settingsDiff.value.length === 0,
	},
]);
function setActiveTab(active: boolean) {
	if (!active) {
		activeTab.value = undefined;
		return;
	}

	const value = tabs.value.find((tab) => !tab.disabled)?.value ?? 'nodes';
	activeTab.value = value;
}

const detailsPanelData = computed(() => {
	if (!selectedDetailId.value) return undefined;

	const node = diff.value.get(selectedDetailId.value)?.node;
	if (!node) return undefined;

	const type = nodeTypesStore.getNodeType(node?.type, node?.typeVersion);

	return {
		node,
		type,
	};
});

const nodeDiffs = computed(() => {
	if (!selectedDetailId.value) {
		return {
			oldString: '',
			newString: '',
		};
	}
	const sourceNode = topWorkFlow.value?.state.value?.workflow?.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);
	const targetNode = bottomWorkFlow.value?.state.value?.workflow?.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);
	return {
		oldString: JSON.stringify(sourceNode, null, 2) ?? '',
		newString: JSON.stringify(targetNode, null, 2) ?? '',
	};
});

const outputFormat = ref<'side-by-side' | 'line-by-line'>('line-by-line');
function toggleOutputFormat() {
	outputFormat.value = outputFormat.value === 'line-by-line' ? 'side-by-side' : 'line-by-line';
}

const panelWidth = ref(350);
function onResize({ width }: { width: number }) {
	panelWidth.value = width;
}

function handleBeforeClose() {
	selectedDetailId.value = undefined;
}

const changesCount = computed(
	() => nodeChanges.value.length + connectionsDiff.value.size + settingsDiff.value.length,
);

onNodeClick((nodeId) => {
	const status = diff.value.get(nodeId)?.status;

	if (status && status !== NodeDiffStatus.Eq) {
		selectedDetailId.value = nodeId;
	}
});
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
			<div style="display: flex; align-items: center; justify-content: space-between">
				<div style="display: flex; align-items: center">
					<N8nIconButton
						icon="arrow-left"
						type="secondary"
						class="mr-xs"
						@click="closeDialog"
					></N8nIconButton>
					<n8n-heading tag="h1" size="xlarge">
						{{
							topWorkFlow.state.value?.workflow?.name || bottomWorkFlow.state.value?.workflow?.name
						}}
					</n8n-heading>
				</div>

				<div>
					<ElDropdown
						trigger="click"
						:popper-options="{ modifiers: [{ name: 'offset', options: { offset: [0, 0] } }] }"
						:popper-class="$style.popper"
						@visible-change="setActiveTab"
					>
						<N8nButton type="secondary">
							<div v-if="changesCount" :class="$style.circleBadge">
								{{ changesCount }}
							</div>
							Changes
						</N8nButton>
						<template #dropdown>
							<ElDropdownMenu>
								<div style="min-width: 300px; padding: 2px 12px">
									<N8nRadioButtons v-model="activeTab" :options="tabs" :class="$style.tabs">
										<template #option="{ label, count }">
											<span v-if="count" class="mr-3xs">
												{{ count }}
											</span>
											{{ label }}
										</template>
									</N8nRadioButtons>
									<div>
										<ul v-if="activeTab === 'nodes'" :class="$style.changes">
											<li v-for="change in nodeChanges" :key="change.node.id">
												<DiffBadge :type="change.status" />
												<NodeIcon :node-type="change.type" :size="16" />
												{{ change.node.name }}
											</li>
										</ul>
										<ul v-if="activeTab === 'connectors'" :class="$style.changes">
											<li v-for="change in connectionsDiff" :key="change[0]">
												<div>
													<DiffBadge :type="change[1].status" />
												</div>
												<div>
													<ul :class="$style.changesNested">
														<li>
															<NodeIcon :node-type="change[1].connection.sourceType" :size="16" />{{
																change[1].connection.source.name
															}}
														</li>
														<li>
															<NodeIcon :node-type="change[1].connection.targetType" :size="16" />
															{{ change[1].connection.target.name }}
														</li>
													</ul>
												</div>
											</li>
										</ul>
										<ul v-if="activeTab === 'settings'">
											<li v-for="setting in settingsDiff" :key="setting.name">
												<N8nText color="text-dark" size="small" tag="div" bold>{{
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
						@click="previousNodeChange"
					></N8nIconButton>
					<N8nIconButton
						icon="chevron-right"
						type="secondary"
						@click="nextNodeChange"
					></N8nIconButton>
				</div>
			</div>
		</template>
		<template #content>
			<div style="display: flex; height: 100%">
				<div style="display: flex; flex-direction: column; height: 100%; flex: 1">
					<div style="flex: 1; position: relative; border-top: 1px solid #ddd">
						<template v-if="topWorkFlow.state.value">
							<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
								<N8nIcon v-if="topWorkFlow.state.value.remote" icon="git-branch" />
								{{ topWorkFlow.state.value.remote ? 'Remote' : 'Local' }}
							</N8nText>
							<template v-if="topWorkFlow.state.value.workflow">
								<SyncedWorkflowCanvas
									id="top"
									:nodes="topWorkFlow.state.value.nodes"
									:connections="topWorkFlow.state.value.connections"
								>
									<template #node="{ nodeProps }">
										<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
											<template #toolbar />
										</Node>
									</template>
									<template #edge="{ edgeProps, arrowHeadMarkerId }">
										<Edge
											v-bind="edgeProps"
											read-only
											:selected="false"
											:marker-end="`url(#${arrowHeadMarkerId})`"
											:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
										>
											<template #highlight="{ segments }">
												<BaseEdge
													v-for="segment in segments"
													:key="segment[0]"
													:style="{
														strokeWidth: 15,
														stroke: 'var(--edge-highlight-color)',
													}"
													:path="segment[0]"
													:interaction-width="0"
												/>
											</template>
										</Edge>
									</template>
								</SyncedWorkflowCanvas>
							</template>
							<template v-else>
								<div
									style="
										height: 100%;
										display: flex;
										flex-direction: column;
										align-items: center;
										justify-content: center;
									"
								>
									<template v-if="bottomWorkFlow.state.value?.remote">
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
					<div style="flex: 1; position: relative; border-top: 1px solid #ddd">
						<template v-if="bottomWorkFlow.state.value">
							<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
								<N8nIcon v-if="bottomWorkFlow.state.value.remote" icon="git-branch" />
								{{ bottomWorkFlow.state.value.remote ? 'Remote' : 'Local' }}
							</N8nText>
							<template v-if="bottomWorkFlow.state.value.workflow">
								<SyncedWorkflowCanvas
									id="bottom"
									:nodes="bottomWorkFlow.state.value.nodes"
									:connections="bottomWorkFlow.state.value.connections"
								>
									<template #node="{ nodeProps }">
										<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
											<template #toolbar />
										</Node>
									</template>
									<template #edge="{ edgeProps, arrowHeadMarkerId }">
										<Edge
											v-bind="edgeProps"
											read-only
											:selected="false"
											:marker-end="`url(#${arrowHeadMarkerId})`"
											:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
										>
											<template #highlight="{ segments }">
												<BaseEdge
													v-for="segment in segments"
													:key="segment[0]"
													:style="{
														strokeWidth: 15,
														stroke: 'var(--edge-highlight-color)',
													}"
													:path="segment[0]"
													:interaction-width="0"
												/>
											</template>
										</Edge>
									</template>
								</SyncedWorkflowCanvas>
							</template>
							<template v-else>
								<div
									style="
										height: 100%;
										display: flex;
										flex-direction: column;
										align-items: center;
										justify-content: center;
									"
								>
									<template v-if="bottomWorkFlow.state.value?.remote">
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
				<N8nResizeWrapper
					v-if="detailsPanelData"
					:width="panelWidth"
					:min-width="260"
					:supported-directions="['left']"
					:grid-size="8"
					:style="{
						width: `${panelWidth}px`,
						display: 'flex',
						flexDirection: 'column',
						height: '100%',
						borderLeft: '1px solid var(--color-foreground-base)',
						borderTop: '1px solid var(--color-foreground-base)',
					}"
					outset
					@resize="onResize"
				>
					<div
						style="
							display: flex;
							flex-direction: row;
							align-items: center;
							gap: 8px;
							padding: 12px 10px;
						"
					>
						<NodeIcon class="ml-xs" :node-type="detailsPanelData.type" :size="16" />
						<N8nHeading size="small" color="text-dark" bold>
							{{ detailsPanelData.node.name }}
						</N8nHeading>
						<N8nIconButton
							icon="file-diff"
							type="secondary"
							class="ml-auto"
							@click="toggleOutputFormat"
						></N8nIconButton>
						<N8nIconButton
							icon="x"
							type="secondary"
							text
							@click="selectedDetailId = undefined"
						></N8nIconButton>
					</div>
					<NodeDiff v-bind="nodeDiffs" :output-format style="flex: 1" />
				</N8nResizeWrapper>
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
	/* dropshadow-floating-card */
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

.changesNested {
	list-style: none;
	margin: 0;
	padding: 0;
	> li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
	}
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
	/* --color-foreground-xdark: var(--color-node-icon-red); */
	--edge-highlight-color: rgba(234, 31, 48, 0.2);
}
.edge-added {
	--canvas-edge-color: var(--color-node-icon-green);
	/* --color-foreground-xdark: var(--color-node-icon-green); */
	--edge-highlight-color: rgba(14, 171, 84, 0.2);
}
.edge-equal {
	opacity: 0.5;
}

.noNumberDiff {
	min-height: 41px;
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
</style>
