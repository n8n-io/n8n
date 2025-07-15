<script setup lang="ts">
import Edge from '@/components/canvas/elements/edges/CanvasEdge.vue';
import Node from '@/components/canvas/elements/nodes/CanvasNode.vue';
import Modal from '@/components/Modal.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import DiffBadge from '@/features/workflow-diff/DiffBadge.vue';
import SyncedWorkflowCanvas from '@/features/workflow-diff/SyncedWorkflowCanvas.vue';
import { useProvideViewportSync } from '@/features/workflow-diff/useViewportSync';
import { compareWorkflowsNodes, NodeDiffStatus } from '@/features/workflow-diff/useWorkflowDiff';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnection, CanvasNode } from '@/types';
import type { EventBus } from '@n8n/utils/event-bus';
import { useAsyncState } from '@vueuse/core';
import { ElDropdown, ElDropdownMenu } from 'element-plus';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, ref, useCssModule } from 'vue';

const props = defineProps<{
	data: { eventBus: EventBus; workflowId: string; direction: 'push' | 'pull' };
}>();

useProvideViewportSync();

const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const sourceControlStore = useSourceControlStore();

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
				nodes: nodes.value,
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
				nodes: nodes.value,
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

const topWorkFlow = computed(() => {
	return props.data.direction === 'push' ? remote : local;
});

const bottomWorkFlow = computed(() => {
	return props.data.direction === 'push' ? local : remote;
});

const diff = computed(() => {
	return compareWorkflowsNodes(
		topWorkFlow.value.state.value?.workflow?.nodes ?? [],
		bottomWorkFlow.value.state.value?.workflow?.nodes ?? [],
	);
});

function mapConnections(connections: CanvasConnection[]) {
	return connections.reduce(
		(acc, connection) => {
			acc.set.add(connection.id);
			acc.map.set(connection.id, connection);
			return acc;
		},
		{ set: new Set<string>(), map: new Map<string, CanvasConnection>() },
	);
}

type Connection = {
	id: string;
	source: INodeUi;
	target: INodeUi;
	sourceType: INodeTypeDescription | null;
	targetType: INodeTypeDescription | null;
};

const connectionsDiff = computed(() => {
	// if (!(topWorkFlow.value.state.value && bottomWorkFlow.value.state.value))
	// 	return new Map<string, { status: NodeDiffStatus; connection: Connection }>();

	const source = mapConnections(topWorkFlow.value.state.value?.connections ?? []);
	const target = mapConnections(bottomWorkFlow.value.state.value?.connections ?? []);

	console.log(source, target);

	const added = target.set.difference(source.set);
	const removed = source.set.difference(target.set);

	console.log(added, removed);

	const test = new Map<string, { status: NodeDiffStatus; connection: Connection }>();

	function formatDiff(
		id: string,
		status: NodeDiffStatus,
		collection: Map<string, CanvasConnection>,
	) {
		const connection = collection.get(id);
		if (!connection) return;

		const sourceNode = diff.value.get(connection.source)?.node as INodeUi;
		const targetNode = diff.value.get(connection.target)?.node as INodeUi;

		test.set(id, {
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

	added.values().forEach((id) => formatDiff(id, NodeDiffStatus.Added, target.map));
	removed.values().forEach((id) => formatDiff(id, NodeDiffStatus.Deleted, source.map));
	return test;
});

function getNodeStatusClass(id: string) {
	const status = diff.value?.get(id)?.status ?? 'equal';
	return $style[status];
}

function getEdgeStatusClass(id: string) {
	if (!connectionsDiff.value) return 'edge-equal';
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

const activeTab = ref<'nodes' | 'connectors' | 'settings'>('nodes');
const tabs = computed(() => [
	{
		value: 'nodes',
		label: 'Nodes',
		count: nodeChanges.value.length,
		disabled: nodeChanges.value.length === 0,
	},
	{
		value: 'connectors',
		label: 'Connectors',
		count: connectionsDiff.value.size,
		disabled: connectionsDiff.value.size === 0,
	},
	// {
	// 	value: 'settings',
	// 	label: 'Settings',
	// },
]);
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
					>
						<N8nButton type="secondary">
							{{ nodeChanges.length + connectionsDiff.size }} Changes
						</N8nButton>
						<template #dropdown>
							<ElDropdownMenu>
								<div style="width: 300px; padding: 2px 12px">
									<N8nRadioButtons v-model="activeTab" :options="tabs" :class="$style.tabs">
										<template #option="{ label, count }">
											<div>
												<span v-if="count" class="badge">{{ count }}</span>
												{{ label }}
											</div>
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
									</div>
								</div>
							</ElDropdownMenu>
						</template>
					</ElDropdown>
				</div>
			</div>
		</template>
		<template #content>
			<div style="display: flex; flex-direction: column; height: 100%">
				<div style="flex: 1; position: relative; border-top: 1px solid #ddd">
					<template v-if="topWorkFlow.state.value">
						<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
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
								<template #edge="{ edgeProps }">
									<Edge
										v-bind="edgeProps"
										read-only
										:selected="false"
										:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
									/>
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
							{{ bottomWorkFlow.state.value.remote ? 'Remote' : 'Local' }}
						</N8nText>
						<template v-if="bottomWorkFlow.state.value.workflow">
							<SyncedWorkflowCanvas
								id="bottom"
								:nodes="bottomWorkFlow.state.value.nodes"
								:connections="bottomWorkFlow.state.value.connections"
								><template #node="{ nodeProps }">
									<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
										<template #toolbar />
									</Node>
								</template>
								<template #edge="{ edgeProps }">
									<Edge
										v-bind="edgeProps"
										read-only
										:selected="false"
										:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
									/>
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

.deleted {
	--canvas-node--background: transparent;
	--canvas-node--border-color: var(--color-node-icon-red);
	position: relative;
	&::after {
		content: '';
		position: absolute;
		background-image: linear-gradient(
			45deg,
			rgba(234, 31, 48, 1) 10%,
			rgba(234, 31, 48, 0.15) 10%,
			rgba(234, 31, 48, 0.15) 50%,
			rgba(234, 31, 48, 1) 50%,
			rgba(234, 31, 48, 1) 60%,
			rgba(234, 31, 48, 0.15) 60%,
			rgba(234, 31, 48, 0.15) 100%
		);
		background-size: 7.07px 7.07px;
		width: 100%;
		height: 100%;
		top: 0;
		z-index: -1;
		border-radius: 8px;
	}
	&::before {
		content: 'D';
		position: absolute;
		bottom: 0px;
		left: 0px;
		background-color: var(--color-node-icon-red);
		border-bottom-left-radius: 6px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
		z-index: 1;
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
	--canvas-node--background: transparent;
	position: relative;
	&::after {
		content: '';
		position: absolute;
		background-color: var(--color-node-icon-green);
		background-size: 7.07px 7.07px;
		width: 100%;
		height: 100%;
		top: 0;
		z-index: -1;
		border-radius: 8px;
		opacity: 0.2;
	}
	&::before {
		content: 'A';
		position: absolute;
		bottom: 0px;
		left: 0px;
		background-color: var(--color-node-icon-green);
		border-bottom-left-radius: 6px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
		z-index: 1;
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
	--color-node-icon-blue: var(--color-foreground-xdark);
	--color-node-icon-gray: var(--color-foreground-xdark);
	--color-node-icon-black: var(--color-foreground-xdark);
	--color-node-icon-blue: var(--color-foreground-xdark);
	--color-node-icon-light-blue: var(--color-foreground-xdark);
	--color-node-icon-dark-blue: var(--color-foreground-xdark);
	--color-node-icon-orange: var(--color-foreground-xdark);
	--color-node-icon-orange-red: var(--color-foreground-xdark);
	--color-node-icon-pink-red: var(--color-foreground-xdark);
	--color-node-icon-red: var(--color-foreground-xdark);
	--color-node-icon-light-green: var(--color-foreground-xdark);
	--color-node-icon-green: var(--color-foreground-xdark);
	--color-node-icon-dark-green: var(--color-foreground-xdark);
	--color-node-icon-azure: var(--color-foreground-xdark);
	--color-node-icon-purple: var(--color-foreground-xdark);
	--color-node-icon-crimson: var(--color-foreground-xdark);
	--color-sticky-border: var(--color-foreground-xdark);
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}
.modified {
	--canvas-node--border-color: var(--color-node-icon-orange);
	--canvas-node--background: transparent;
	position: relative;
	&::before {
		content: 'M';
		position: absolute;
		bottom: 0px;
		left: 0px;
		background-color: var(--color-node-icon-orange);
		border-bottom-left-radius: 6px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
		z-index: 1;
	}
	&::after {
		content: '';
		position: absolute;
		background-color: var(--color-node-icon-orange);
		background-size: 7.07px 7.07px;
		width: 100%;
		height: 100%;
		top: 0;
		z-index: -1;
		border-radius: 8px;
		opacity: 0.2;
	}
	:global(.canvas-node-handle-main-output .source) {
		--color-foreground-xdark: var(--color-node-icon-orange);
	}
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-orange);
	}
}

.edge-deleted {
	--color-foreground-xdark: var(--color-node-icon-red);
}
.edge-added {
	--color-foreground-xdark: var(--color-node-icon-green);
}
.edge-equal {
	opacity: 0.5;
}
</style>
