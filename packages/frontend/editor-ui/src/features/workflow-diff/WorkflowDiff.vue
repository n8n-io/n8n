<script setup lang="ts">
import type { IWorkflowDb } from '@/Interface';
import Node from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnection, CanvasNode } from '@/types';
import { getWorkflowHistory, getWorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SyncedCanvas from './SyncedCanvas.vue';
import { useProvideViewportSync } from './viewport.sync';
import { compareWorkflows, NodeDiffStatus } from './workflowDiff';

const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const router = useRouter();

nodeTypesStore.loadNodeTypesIfNotLoaded();

async function fetchWorkflowHistory(id: string) {
	const data = await getWorkflowHistory(rootStore.restApiContext, id, { take: 20 });
	return data;
}

function formatDate(dateString: string) {
	const date = new Date(dateString);

	const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	const formattedTime = date.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});

	return `${formattedDate}, ${formattedTime}`;
}

const { state: workflowHistory } = useAsyncState(
	() => fetchWorkflowHistory('WuOmWlv48kpnugsQ'),
	[],
);

async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
	const data = await getWorkflowVersion(rootStore.restApiContext, 'WuOmWlv48kpnugsQ', id);
	return data as unknown as IWorkflowDb;
	// const workflowData = await getWorkflow(rootStore.restApiContext, id);
	// return workflowData;
}

const props = defineProps<{
	sourceWorkflowId: string;
	targetWorkflowId: string;
}>();

type DiffProps = {
	workflow: IWorkflowDb;
	workflowObject: Workflow;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
};

const { state: sourceWorkflow, execute: fetchSourceWorkflow } = useAsyncState<
	DiffProps | undefined,
	[],
	false
>(
	async () => {
		const workflow = await fetchWorkflow(props.sourceWorkflowId);
		const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);

		const { nodes, connections } = useCanvasMapping({
			nodes: ref(workflow.nodes),
			connections: ref(workflow.connections),
			// @ts-ignore they match....
			workflowObject: ref(workflowObject),
		});

		return { workflow, workflowObject, nodes: nodes.value, connections: connections.value };
	},
	undefined,
	{
		resetOnExecute: true,
		shallow: false,
	},
);

watch(
	() => props.sourceWorkflowId,
	() => fetchSourceWorkflow(),
);

const { state: targetWorkflow, execute: fetchTargetWorkflow } = useAsyncState<
	DiffProps | undefined,
	[],
	false
>(
	async () => {
		const workflow = await fetchWorkflow(props.targetWorkflowId);
		const workflowObject = workflowsStore.getWorkflow(workflow.nodes, workflow.connections);

		const { nodes, connections } = useCanvasMapping({
			nodes: ref(workflow.nodes),
			connections: ref(workflow.connections),
			// @ts-ignore they match....
			workflowObject: ref(workflowObject),
		});

		return { workflow, workflowObject, nodes: nodes.value, connections: connections.value };
	},
	undefined,
	{
		resetOnExecute: true,
		shallow: false,
	},
);

watch(
	() => props.targetWorkflowId,
	() => fetchTargetWorkflow(),
);

const diff = computed(() => {
	const test = compareWorkflows(
		sourceWorkflow.value?.workflow.nodes ?? [],
		targetWorkflow.value?.workflow.nodes ?? [],
	);
	return test;
});

const nodeChanges = computed(() => {
	if (!diff.value) return [];
	return [...diff.value.values()].filter((change) => change.status !== NodeDiffStatus.Eq);
});

function getStatusClass(id: string) {
	return diff.value?.get(id)?.status ?? 'unknown';
}

useProvideViewportSync();

function handleVersionSelection(source: 'sourceWorkflowId' | 'targetWorkflowId', event: Event) {
	const selectElement = event.target as HTMLSelectElement;
	const selectedVersionId = selectElement.value;

	router.push({ params: { [source]: selectedVersionId } });
}
</script>

<template>
	<div style="display: flex; flex-direction: column; width: 100%">
		<div>
			<div>
				<ul>
					<li v-for="change in nodeChanges" :key="change.node.id">
						<span v-if="change.status === 'deleted'"> (Deleted)</span>
						<span v-else-if="change.status === 'added'"> (Added)</span>
						<span v-else-if="change.status === 'modified'"> (Modified)</span>
						<span v-else-if="change.status === 'equal'"> (Equal)</span>
						<span>{{ change.node.name }}</span>
					</li>
				</ul>
			</div>
		</div>

		<div class="workflow-diff">
			<div class="workflow-diff__view">
				<div class="version-select-container">
					<select
						:value="props.sourceWorkflowId"
						@input="handleVersionSelection('sourceWorkflowId', $event)"
					>
						<option
							v-for="version in workflowHistory"
							:key="version.versionId"
							:value="version.versionId"
						>
							{{ formatDate(version.createdAt) }}
						</option>
					</select>
				</div>
				<template v-if="sourceWorkflow">
					<SyncedCanvas
						:id="sourceWorkflowId"
						:nodes="sourceWorkflow.nodes"
						:connections="sourceWorkflow.connections"
					>
						<template #node="{ nodeProps }">
							<Node v-bind="nodeProps" :class="{ [getStatusClass(nodeProps.id)]: true }">
								<template #toolbar />
							</Node>
						</template>
					</SyncedCanvas>
				</template>
			</div>
			<div class="workflow-diff__view" style="border-left: 1px solid black">
				<div class="version-select-container">
					<select
						:value="targetWorkflowId"
						@input="handleVersionSelection('targetWorkflowId', $event)"
					>
						<option
							v-for="version in workflowHistory"
							:key="version.versionId"
							:value="version.versionId"
						>
							{{ formatDate(version.createdAt) }}
						</option>
					</select>
				</div>
				<template v-if="sourceWorkflowId === targetWorkflowId">
					<div
						style="
							width: 100%;
							height: 100%;
							display: flex;
							align-items: center;
							justify-content: center;
						"
					>
						<p>Select a different version to compare</p>
					</div>
				</template>
				<template v-else-if="targetWorkflow">
					<SyncedCanvas
						:id="targetWorkflowId"
						:nodes="targetWorkflow.nodes"
						:connections="targetWorkflow.connections"
					>
						<template #node="{ nodeProps }">
							<Node v-bind="nodeProps" :class="{ [getStatusClass(nodeProps.id)]: true }">
								<template #toolbar />
							</Node>
						</template>
					</SyncedCanvas>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.workflow-diff {
	display: grid;
	grid-template-columns: 1fr 1fr;
	width: 100%;
	flex: 1;
	position: relative;
}

.workflow-diff__view {
	position: relative;
}

.version-select-container {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1;
	padding: 12px;
}

.deleted {
	--canvas-node--background: transparent;
	--canvas-node--border-color: rgba(234, 31, 48, 1);

	--color-node-icon-blue: rgba(234, 31, 48, 1);
	--color-node-icon-gray: rgba(234, 31, 48, 1);
	--color-node-icon-black: rgba(234, 31, 48, 1);
	--color-node-icon-blue: rgba(234, 31, 48, 1);
	--color-node-icon-light-blue: rgba(234, 31, 48, 1);
	--color-node-icon-dark-blue: rgba(234, 31, 48, 1);
	--color-node-icon-orange: rgba(234, 31, 48, 1);
	--color-node-icon-orange-red: rgba(234, 31, 48, 1);
	--color-node-icon-pink-red: rgba(234, 31, 48, 1);
	--color-node-icon-red: rgba(234, 31, 48, 1);
	--color-node-icon-light-green: rgba(234, 31, 48, 1);
	--color-node-icon-green: rgba(234, 31, 48, 1);
	--color-node-icon-dark-green: rgba(234, 31, 48, 1);
	--color-node-icon-azure: rgba(234, 31, 48, 1);
	--color-node-icon-purple: rgba(234, 31, 48, 1);
	--color-node-icon-crimson: rgba(234, 31, 48, 1);

	position: relative;
	&::after {
		content: '';
		position: absolute;
		background-image: linear-gradient(
			45deg,
			#fdb6ad 10%,
			#feecea 10%,
			#feecea 50%,
			#fdb6ad 50%,
			#fdb6ad 60%,
			#feecea 60%,
			#feecea 100%
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
		background-color: rgba(234, 31, 48, 1);
		border-bottom-left-radius: 8px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
	}

	&:deep(.canvas-node-handle-main-output > div) {
		background-color: rgba(234, 31, 48, 1);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: rgba(234, 31, 48, 1);
	}
}

.added {
	--canvas-node--border-color: rgb(16, 142, 73);
	--canvas-node--background: rgba(16, 142, 73, 0.16);
	position: relative;
	&::before {
		content: 'A';
		position: absolute;
		bottom: 0px;
		left: 0px;
		background-color: rgb(16, 142, 73);
		border-bottom-left-radius: 8px;
		border-top-right-radius: 2px;
		color: var(--color-text-xlight);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
	}

	&:deep(.canvas-node-handle-main-output > div) {
		background-color: rgb(16, 142, 73);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: rgb(16, 142, 73);
	}
}

.equal {
	--canvas-node--border-color: var(--color-foreground-xdark);
	--canvas-node--background: rgba(251, 252, 254, 0.5);
	position: relative;

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
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}

.modified {
	--canvas-node--border-color: rgb(255, 201, 21);
	--canvas-node--background: rgba(255, 201, 21, 0.16);
	position: relative;
	&::before {
		content: 'M';
		position: absolute;
		bottom: 0px;
		left: 0px;
		background-color: rgba(255, 201, 21, 1);
		border-bottom-left-radius: 8px;
		border-top-right-radius: 2px;
		color: rgba(65, 66, 68, 1);
		text-align: center;
		font-family: var(--font-family-monospace);
		font-size: 6px;
		font-style: normal;
		font-weight: 700;
		line-height: 120%;
		padding: 2px 2px 2px 4px;
	}

	&:deep(.canvas-node-handle-main-output .source) {
		background-color: rgb(255, 201, 21);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: rgb(255, 201, 21);
	}
}
</style>
