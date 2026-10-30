<script setup lang="ts">
import { N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, watch } from 'vue';

import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';
import Canvas from '@/features/workflows/canvas/components/Canvas.vue';
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import CanvasNode from '@/features/workflows/canvas/components/elements/nodes/CanvasNode.vue';

import { useDraftWorkflowCanvas } from '../composables/useDraftWorkflowCanvas';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

const props = defineProps<{
	draft: WorkflowDraft;
	/** The agent is still working, so a save can still replace this draft. */
	building: boolean;
}>();

const i18n = useI18n();
const eventBus = createEventBus<CanvasEventBusEvents>();
const { nodes, connections, renderData } = useDraftWorkflowCanvas(() => props.draft);

// Vue Flow keeps one store per id, so each source file gets its own canvas.
const canvasId = computed(() => `instance-ai-draft-${props.draft.filePath}`);

// Fit the view when the agent adds nodes, so the newest one is on screen. A change
// to existing nodes keeps the viewport the user has.
watch(
	() => props.draft.workflow.nodes.map((node) => node.name),
	(names, previous) => {
		if (names.some((name) => !previous.includes(name))) eventBus.emit('fitView');
	},
);
</script>

<template>
	<div
		:class="$style.draft"
		role="region"
		:aria-label="i18n.baseText('instanceAi.workflowDraft.ariaLabel')"
		data-test-id="instance-ai-workflow-draft-preview"
	>
		<Canvas
			:id="canvasId"
			:nodes="nodes"
			:connections="connections"
			:render-data="renderData"
			:read-only="true"
			:event-bus="eventBus"
			:show-node-groups="false"
			:class="$style.canvas"
		>
			<template #node="{ nodeProps }">
				<CanvasNode v-bind="nodeProps" :read-only="true">
					<template #toolbar />
				</CanvasNode>
			</template>
			<template #canvas-background="{ viewport }">
				<CanvasBackground :striped="false" :viewport="viewport" />
			</template>
		</Canvas>
		<div :class="$style.badge" data-test-id="instance-ai-workflow-draft-badge">
			<N8nSpinner v-if="building" size="small" />
			<N8nText size="small" color="text-base">
				{{
					building
						? i18n.baseText('instanceAi.workflowDraft.building')
						: i18n.baseText('instanceAi.workflowDraft.unsaved')
				}}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.draft {
	position: relative;
	width: 100%;
	height: 100%;
	background: var(--background--surface);
}

.canvas {
	width: 100%;
	height: 100%;
}

.badge {
	position: absolute;
	top: var(--spacing--sm);
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	pointer-events: none;
}
</style>
