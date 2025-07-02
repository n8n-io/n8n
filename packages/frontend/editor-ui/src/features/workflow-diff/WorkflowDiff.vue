<script setup lang="ts">
import type { IWorkflowDb } from '@/Interface';
import Edge from '@/components/canvas/elements/edges/CanvasEdge.vue';
import Node from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { useCredentialsStore } from '@/stores/credentials.store';
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
import { compareWorkflowsNodes, NodeDiffStatus } from './workflowDiff';

const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const router = useRouter();

async function fetchWorkflowHistory(id: string) {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
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
		immediate: false,
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

		console.log(connections);

		return { workflow, workflowObject, nodes: nodes.value, connections: connections.value };
	},
	undefined,
	{
		resetOnExecute: true,
		shallow: false,
		immediate: false,
	},
);

watch(
	() => props.targetWorkflowId,
	() => fetchTargetWorkflow(),
);

useAsyncState(async () => {
	await Promise.all([
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		credentialsStore.fetchCredentialTypes(false),
	]);

	await Promise.all([fetchSourceWorkflow(), fetchTargetWorkflow()]);

	return true;
}, false);

const diff = computed(() => {
	if (!(sourceWorkflow.value && targetWorkflow.value)) return undefined;
	const test = compareWorkflowsNodes(
		sourceWorkflow.value?.workflow.nodes,
		targetWorkflow.value?.workflow.nodes,
	);
	return test;
});

const connectionsDiff = computed(() => {
	if (!(sourceWorkflow.value && targetWorkflow.value)) return undefined;
	const sourceConnections = new Set(sourceWorkflow.value.connections.map((item) => item.id));
	const targetConnections = new Set(targetWorkflow.value.connections.map((item) => item.id));

	const added = targetConnections.difference(sourceConnections);
	const removed = sourceConnections.difference(targetConnections);

	const test = new Map<string, string>();

	added.values().forEach((id) => {
		test.set(id, NodeDiffStatus.Added);
	});

	removed.values().forEach((id) => {
		test.set(id, NodeDiffStatus.Deleted);
	});

	return test;
});

const nodeChanges = computed(() => {
	if (!diff.value) return [];
	return [...diff.value.values()].filter((change) => change.status !== NodeDiffStatus.Eq);
});

function getNodeStatusClass(id: string) {
	return diff.value?.get(id)?.status ?? 'equal';
}

function getEdgeStatusClass(id: string) {
	if (!connectionsDiff.value) return 'edge-equal';
	const status = connectionsDiff.value.get(id);
	return status ? `edge-${status}` : 'edge-equal';
}

useProvideViewportSync();

function handleVersionSelection(source: 'sourceWorkflowId' | 'targetWorkflowId', event: Event) {
	const selectElement = event.target as HTMLSelectElement;
	const selectedVersionId = selectElement.value;

	router.push({ params: { [source]: selectedVersionId } });
}

const displayChanges = ref(false);
</script>

<template>
	<div style="display: flex; flex-direction: column; width: 100%">
		<div
			style="
				height: 64px;
				display: flex;
				align-items: center;
				justify-content: end;
				padding: 11px 16px;
				border-bottom: 1px solid rgba(231, 231, 231, 1);
			"
		>
			<div style="position: relative">
				<button type="button" @click="displayChanges = !displayChanges">
					({{ nodeChanges.length }}) Changes
				</button>
				<ul
					v-if="displayChanges"
					style="
						list-style: none;
						padding: 0px;
						margin: 0px;
						position: absolute;
						z-index: 2;
						background: white;
						right: 0;
						width: 282px;
					"
				>
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
	--canvas-node--border-color: var(--color-node-icon-red);

	--color-node-icon-blue: var(--color-node-icon-red);
	--color-node-icon-gray: var(--color-node-icon-red);
	--color-node-icon-black: var(--color-node-icon-red);
	--color-node-icon-blue: var(--color-node-icon-red);
	--color-node-icon-light-blue: var(--color-node-icon-red);
	--color-node-icon-dark-blue: var(--color-node-icon-red);
	--color-node-icon-orange: var(--color-node-icon-red);
	--color-node-icon-orange-red: var(--color-node-icon-red);
	--color-node-icon-pink-red: var(--color-node-icon-red);
	/* --color-node-icon-red: var(--color-node-icon-red); */
	--color-node-icon-light-green: var(--color-node-icon-red);
	--color-node-icon-green: var(--color-node-icon-red);
	--color-node-icon-dark-green: var(--color-node-icon-red);
	--color-node-icon-azure: var(--color-node-icon-red);
	--color-node-icon-purple: var(--color-node-icon-red);
	--color-node-icon-crimson: var(--color-node-icon-red);
	--color-sticky-border: var(--color-node-icon-red);

	--color-sticky-border: var(--color-node-icon-red);
	--color-sticky-border-1: var(--color-node-icon-red);
	--color-sticky-border-2: var(--color-node-icon-red);
	--color-sticky-border-3: var(--color-node-icon-red);
	--color-sticky-border-4: var(--color-node-icon-red);
	--color-sticky-border-5: var(--color-node-icon-red);
	--color-sticky-border-6: var(--color-node-icon-red);
	--color-sticky-border-7: var(--color-node-icon-red);

	&[data-node-type="n8n-nodes-base.stickyNote"] {
		&::before {
			left: auto;
			right: 0px;
			border-top-right-radius: 0;
			border-top-left-radius: 2px;
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 6px;
			padding: 2px 4px 2px 2px;
		}
	}

	position: relative;
	&::after {
		content: '';
		position: absolute;
		background-image: linear-gradient(
			45deg,
			rgba(234, 31, 48, 1) 10%,
			rgba(234, 31, 48, .15) 10%,
			rgba(234, 31, 48, .15) 50%,
			rgba(234, 31, 48, 1) 50%,
			rgba(234, 31, 48, 1) 60%,
			rgba(234, 31, 48, .15) 60%,
			rgba(234, 31, 48, .15) 100%
		);
		background-color: rgba(234, 31, 48, 1));
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

	&:deep(.canvas-node-handle-main-output > div) {
		background-color: var(--color-node-icon-red);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-red);
	}
}

.added {
	--canvas-node--border-color: var(--color-node-icon-green);
	--canvas-node--background: transparent;

	--color-sticky-border: var(--color-node-icon-green);
	--color-sticky-border-1: var(--color-node-icon-green);
	--color-sticky-border-2: var(--color-node-icon-green);
	--color-sticky-border-3: var(--color-node-icon-green);
	--color-sticky-border-4: var(--color-node-icon-green);
	--color-sticky-border-5: var(--color-node-icon-green);
	--color-sticky-border-6: var(--color-node-icon-green);
	--color-sticky-border-7: var(--color-node-icon-green);

	&[data-node-type="n8n-nodes-base.stickyNote"] {
		&::before {
			left: auto;
			right: 0px;
			border-top-right-radius: 0;
			border-top-left-radius: 2px;
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 6px;
			padding: 2px 4px 2px 2px;
		}
	}

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

	&:deep(.canvas-node-handle-main-output > div) {
		background-color: var(--color-node-icon-green);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-green);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-green);
	}
}

.equal {
	opacity: 0.5;
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
	--color-sticky-border: var(--color-foreground-xdark);
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}

.modified {
	--canvas-node--border-color: var(--color-node-icon-orange);
	--canvas-node--background: transparent;
	--color-sticky-border: var(--color-node-icon-orange);
	--color-sticky-border-1: var(--color-node-icon-orange);
	--color-sticky-border-2: var(--color-node-icon-orange);
	--color-sticky-border-3: var(--color-node-icon-orange);
	--color-sticky-border-4: var(--color-node-icon-orange);
	--color-sticky-border-5: var(--color-node-icon-orange);
	--color-sticky-border-6: var(--color-node-icon-orange);
	--color-sticky-border-7: var(--color-node-icon-orange);

	&[data-node-type="n8n-nodes-base.stickyNote"] {
		&::before {
			left: auto;
			right: 0px;
			border-top-right-radius: 0;
			border-top-left-radius: 2px;
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 6px;
			padding: 2px 4px 2px 2px;
		}
	}
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

	&:deep(.canvas-node-handle-main-output .source) {
		--color-foreground-xdark: var(--color-node-icon-orange);
	}

	&:deep(.canvas-node-handle-main-input .target) {
		background-color: var(--color-node-icon-orange);
	}
}

:deep(.edge-deleted) {
	--color-foreground-xdark: var(--color-node-icon-red);
}

:deep(.edge-added) {
	--color-foreground-xdark: var(--color-node-icon-green);
}
</style>
