<script lang="ts" setup>
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, VIEWS } from '@/app/constants';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { useFormsLayout } from '../composables/useFormsLayout';
import { FORM_STEP_NON_FORM_NODE_SCALE } from '../constants';
import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';
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
const { layoutReady } = useFormsLayout(containerId);

const FORM_NODE_TYPES = new Set([FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE]);

const formNodeRenderOverrides: Partial<Record<string, CanvasNodeRenderType>> = {
	[FORM_TRIGGER_NODE_TYPE]: CanvasNodeRenderType.FormStep,
	[FORM_NODE_TYPE]: CanvasNodeRenderType.FormStep,
};

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

const nonFormNodeCss = computed(() => {
	if (!nonFormNodeIds.value.length) return '';
	const selectors = nonFormNodeIds.value
		.map((id) => `#${containerId} .vue-flow__node[data-id="${id}"]`)
		.join(', ');
	return `${selectors} { opacity: 0.5; transform: scale(${FORM_STEP_NON_FORM_NODE_SCALE}); transform-origin: center center; }`;
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
		<component :is="'style'">{{ nonFormNodeCss }}</component>
		<N8nLoading v-if="loading" :rows="10" />
		<div v-else :class="[$style.canvasContainer, layoutReady && $style.canvasVisible]">
			<WorkflowCanvas
				:id="containerId"
				:workflow="workflowsStore.workflow"
				:workflow-object="workflowObject"
				:read-only="true"
				:node-type-render-overrides="formNodeRenderOverrides"
				@update:node:activated="onNodeActivated"
			>
				<template #canvas-background="{ viewport }">
					<CanvasBackground
						:viewport="viewport"
						:striped="false"
						variant="lines"
						pattern-color="var(--forms--canvas--grid--color)"
						:gap="DEFAULT_NODE_SIZE[0] / 2"
					/>
				</template>
				<div :class="$style.canvasButtons">
					<N8nButton variant="subtle" size="large" @click="openWorkflow"> Open workflow </N8nButton>
				</div>
			</WorkflowCanvas>
		</div>
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

.canvasContainer {
	flex: 1;
	min-height: 0;
	display: flex;
	opacity: 0;
	transition: opacity 0.15s;
}

.canvasVisible {
	opacity: 1;
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
