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
import NodeDiff from './NodeDiff.vue';
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

async function fetchWorkflow(id: string, versionId: string): Promise<IWorkflowDb> {
	const data = await getWorkflowVersion(rootStore.restApiContext, id, versionId);
	return data as unknown as IWorkflowDb;
	// const workflowData = await getWorkflow(rootStore.restApiContext, id);
	// return workflowData;
}

const props = defineProps<{
	sourceWorkflowId: string;
	targetWorkflowId: string;
	workflowId: string;
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
		const workflow = await fetchWorkflow(props.workflowId, props.sourceWorkflowId);
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
		const workflow = await fetchWorkflow(props.workflowId, props.targetWorkflowId);
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
	if (!(sourceWorkflow.value && targetWorkflow.value)) return new Map<string, NodeDiffStatus>();
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

const { syncIsEnabled, selectedDetailId } = useProvideViewportSync();

function handleVersionSelection(source: 'sourceWorkflowId' | 'targetWorkflowId', event: Event) {
	const selectElement = event.target as HTMLSelectElement;
	const selectedVersionId = selectElement.value;

	router.push({ params: { [source]: selectedVersionId } });
}

const displayChanges = ref(false);

const nodeDiffs = computed(() => {
	if (!selectedDetailId.value) {
		return {
			oldString: '',
			newString: '',
		};
	}

	const sourceNode = sourceWorkflow.value?.workflow.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);
	const targetNode = targetWorkflow.value?.workflow.nodes.find(
		(node) => node.id === selectedDetailId.value,
	);

	console.log(sourceNode, targetNode);

	return {
		oldString: JSON.stringify(sourceNode, null, 2) ?? '',
		newString: JSON.stringify(targetNode, null, 2) ?? '',
	};
});

const outputFormat = ref<'side-by-side' | 'line-by-line'>('line-by-line');

const panelWidth = computed(() => {
	return outputFormat.value === 'line-by-line' ? '30%' : '45%';
});
function toggleOutputFormat() {
	outputFormat.value = outputFormat.value === 'line-by-line' ? 'side-by-side' : 'line-by-line';
}

function goToNode(direction: 'next' | 'previous') {
	if (!nodeChanges.value) return;

	const currentIndex = nodeChanges.value.findIndex(
		(change) => change.node.id === selectedDetailId.value,
	);

	if (currentIndex === -1) {
		if (direction === 'next') {
			selectedDetailId.value = nodeChanges.value[0]?.node.id;
		} else {
			selectedDetailId.value = nodeChanges.value.at(-1)?.node.id;
		}
		return;
	}

	if (direction === 'next') {
		if (currentIndex <= nodeChanges.value.length - 1) {
			const next = currentIndex + 1 > nodeChanges.value.length - 1 ? 0 : currentIndex + 1;
			selectedDetailId.value = nodeChanges.value[next]?.node.id;
		}
	} else if (direction === 'previous') {
		if (currentIndex > 0) {
			selectedDetailId.value = nodeChanges.value[currentIndex - 1]?.node.id;
		} else {
			selectedDetailId.value = nodeChanges.value[nodeChanges.value.length - 1]?.node.id;
		}
	}
}
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
			<div style="position: relative; display: flex; gap: 8px">
				<div style="position: relative">
					<button type="button" @click="displayChanges = !displayChanges">
						({{ nodeChanges.length + connectionsDiff.size }}) Changes
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
						<li>Nodes</li>
						<li v-for="change in nodeChanges" :key="change.node.id">
							<span v-if="change.status === 'deleted'"> (Deleted)</span>
							<span v-else-if="change.status === 'added'"> (Added)</span>
							<span v-else-if="change.status === 'modified'"> (Modified)</span>
							<span v-else-if="change.status === 'equal'"> (Equal)</span>
							<span>{{ change.node.name }}</span>
						</li>
						<li>Connections</li>
						<li v-for="[id, status] in connectionsDiff" :key="id">
							<span v-if="status === 'added'"> (Added)</span>
							<span v-else-if="status === 'deleted'"> (Deleted)</span>
							<span>{{ id }}</span>
						</li>
					</ul>
				</div>
				<button type="button" @click="syncIsEnabled = !syncIsEnabled">
					Sync ({{ syncIsEnabled ? 'On' : 'Off' }})
				</button>
				<div>
					<button type="button" @click="goToNode('previous')"><</button>
					<button type="button" @click="goToNode('next')">></button>
				</div>
			</div>
		</div>

		<div style="display: flex; flex: 1; width: 100%; position: relative; overflow: hidden">
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
				<div class="workflow-diff__view" style="border-top: 1px solid black">
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
			<transition name="slide">
				<div v-if="selectedDetailId" class="details-drawer">
					<p>
						<button type="button" @click="selectedDetailId = undefined">close</button>
						<button type="button" @click="toggleOutputFormat">
							{{ outputFormat }}
						</button>
						{{ diff?.get(selectedDetailId)?.node.name }}
					</p>
					<NodeDiff v-bind="nodeDiffs" :output-format />
				</div>
			</transition>
		</div>
	</div>
</template>

<style scoped>

.details-drawer {
	/* position: absolute;
	top: 0;
	right: 0;
	z-index: 1;
	padding: 12px;
	width: 340px;
	height: 100%;;
	background-color: var(--color-background-xlight); */
	height: 100%;
	max-height: 100%;;
  /* position: absolute;
  top: 0;
  right: 0; */
  background: var(--color-background-xlight);
  z-index: 2;
  overflow-y: auto;
  /* min-width: 340px;
	max-width: 50%; */
	width: v-bind(panelWidth);
}


.slide-enter-active {
  transition: all 0.2s ease;
  transform: translateX(90%);
  opacity: 1;
}

.slide-enter-to {
  transition: all 0.2s ease;
  transform: translateX(0%);
}

.slide-leave-active {
  transition: all 0.2s ease;
  transform: translateX(30%);
  opacity: 0;
}

.workflow-diff {
	display: grid;
	grid-template-rows: 1fr 1fr;
	width: 100%;
	flex: 1;
	position: relative;
	overflow: hidden;
	transition: all 0.2s ease;
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

:deep(.edge-equal) {
	opacity: 0.5;
}
</style>
