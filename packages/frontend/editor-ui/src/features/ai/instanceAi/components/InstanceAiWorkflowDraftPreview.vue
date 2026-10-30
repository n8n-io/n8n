<script setup lang="ts">
import { N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, provide, watch } from 'vue';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';

import { useDraftWorkflowDocument } from '../composables/useDraftWorkflowDocument';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

const props = defineProps<{
	draft: WorkflowDraft;
	/** The agent is still working, so a save can still replace this draft. */
	building: boolean;
}>();

const i18n = useI18n();
const eventBus = createEventBus<CanvasEventBusEvents>();
const { documentStore } = useDraftWorkflowDocument(() => props.draft);
// The editor canvas reads its workflow from this key, so it renders the draft.
provide(WorkflowDocumentStoreKey, documentStore);

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
		<WorkflowCanvas
			:id="canvasId"
			:event-bus="eventBus"
			:read-only="true"
			:striped-background="false"
			:class="$style.canvas"
		/>
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
