<script lang="ts" setup>
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	FORM_STEP_EDIT_MODAL_KEY,
	VIEWS,
} from '@/app/constants';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { useFormsLayout } from '../composables/useFormsLayout';
import { FORM_STEP_NON_FORM_NODE_SCALE } from '../constants';
import { N8nLoading } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/app/stores/ui.store';

// `workflowId` is optional so this view works both as a route (falls back to the
// active workflow) and embedded in a host that provides its own doc store (e.g.
// the Instance AI preview dock), where nav must target the host's workflow.
const props = defineProps<{
	workflowId?: string;
}>();

const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const uiStore = useUIStore();

const loading = ref(true);

const containerId = `forms-canvas-${Math.random().toString(36).slice(2)}`;
const { layoutReady } = useFormsLayout(containerId);

const FORM_NODE_TYPES = new Set([FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE]);

const formNodeRenderOverrides: Partial<Record<string, CanvasNodeRenderType>> = {
	[FORM_TRIGGER_NODE_TYPE]: CanvasNodeRenderType.FormStep,
	[FORM_NODE_TYPE]: CanvasNodeRenderType.FormStep,
};

// The `workflow` layout keeps the workflow document alive across the tabs
// (Editor / Executions / Evaluations / Forms), so we don't fetch or hydrate
// here — doing so would clobber unsaved edits made in the Editor.
onMounted(() => {
	loading.value = false;
});

const nonFormNodeIds = computed(() =>
	workflowDocumentStore.value.allNodes.filter((n) => !FORM_NODE_TYPES.has(n.type)).map((n) => n.id),
);

const nonFormNodeCss = computed(() => {
	if (!nonFormNodeIds.value.length) return '';
	const selectors = nonFormNodeIds.value
		.map((id) => `#${containerId} .vue-flow__node[data-id="${id}"]`)
		.join(', ');
	return `${selectors} { opacity: 0.5; transform: scale(${FORM_STEP_NON_FORM_NODE_SCALE}); transform-origin: center center; }`;
});

function onNodeActivated(nodeId: string, event?: MouseEvent) {
	if (event?.type === 'dblclick') {
		void router.push({
			name: VIEWS.WORKFLOW,
			params: { workflowId: props.workflowId ?? workflowsStore.workflowId, nodeId },
		});
	} else {
		uiStore.openModalWithData({ name: FORM_STEP_EDIT_MODAL_KEY, data: { nodeId } });
	}
}
</script>

<template>
	<div :class="$style.container">
		<component :is="'style'">{{ nonFormNodeCss }}</component>
		<N8nLoading v-if="loading" :rows="10" />
		<div
			v-else
			:id="containerId"
			:class="[$style.canvasContainer, layoutReady && $style.canvasVisible]"
		>
			<WorkflowCanvas
				:id="containerId"
				:read-only="true"
				:node-type-render-overrides="formNodeRenderOverrides"
				@update:node:activated="onNodeActivated"
			>
				<template #canvas-background="{ viewport }">
					<CanvasBackground
						:viewport="viewport"
						:striped="false"
						variant="lines"
						pattern-color="color-mix(in srgb, var(--canvas--dot--color) 8%, transparent)"
					/>
				</template>
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
</style>
