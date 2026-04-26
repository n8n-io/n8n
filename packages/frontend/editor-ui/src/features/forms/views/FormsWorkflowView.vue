<script lang="ts" setup>
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, VIEWS } from '@/app/constants';
import type { Workflow } from 'n8n-workflow';
import { N8nButton, N8nLoading } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const workflowsListStore = useWorkflowsListStore();
const workflowsStore = useWorkflowsStore();

const loading = ref(true);

const containerId = `forms-canvas-${Math.random().toString(36).slice(2)}`;

const FORM_NODE_TYPES = new Set([FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE]);

onMounted(async () => {
	const workflowId = route.params.workflowId as string;
	const workflowData = await workflowsListStore.fetchWorkflow(workflowId);
	workflowsStore.setWorkflow(workflowData);
	loading.value = false;
});

const workflowObject = computed(() => workflowsStore.workflowObject as unknown as Workflow);

const nonFormNodeIds = computed(() =>
	workflowsStore.workflow.nodes.filter((n) => !FORM_NODE_TYPES.has(n.type)).map((n) => n.id),
);

const dimCss = computed(() => {
	if (!nonFormNodeIds.value.length) return '';
	const selectors = nonFormNodeIds.value
		.map((id) => `#${containerId} .vue-flow__node[data-id="${id}"]`)
		.join(', ');
	return `${selectors} { opacity: 0.25; }`;
});

function openWorkflow() {
	void router.push({
		name: VIEWS.WORKFLOW,
		params: { name: workflowsStore.workflow.id },
	});
}

function onNodeActivated(nodeId: string) {
	void router.push({
		name: VIEWS.WORKFLOW,
		params: { name: workflowsStore.workflow.id, nodeId },
	});
}
</script>

<template>
	<div :id="containerId" :class="$style.container">
		<component is="style">{{ dimCss }}</component>
		<N8nLoading v-if="loading" :rows="10" />
		<WorkflowCanvas
			v-else
			:workflow="workflowsStore.workflow"
			:workflow-object="workflowObject"
			:read-only="true"
			@update:node:activated="onNodeActivated"
		>
			<template #canvas-background="{ viewport }">
				<CanvasBackground
					:viewport="viewport"
					:striped="false"
					variant="lines"
					pattern-color="var(--forms--canvas--grid--color)"
				/>
			</template>
			<div :class="$style.canvasButtons">
				<N8nButton variant="subtle" size="large" @click="openWorkflow"> Open workflow </N8nButton>
			</div>
		</WorkflowCanvas>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	--forms--canvas--grid--color: color-mix(in srgb, var(--color--primary) 12%, transparent);
}

.canvasButtons {
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--xs);
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing--sm);
	width: auto;
	pointer-events: all;
}
</style>
