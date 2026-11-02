<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, provide, watch } from 'vue';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';

import { useDraftWorkflowDocument } from '../composables/useDraftWorkflowDocument';
import { useStaggeredList } from '../composables/useStaggeredList';
import { draftNodeKey, withDraftNodes } from '../instanceAi.workflowDraftCanvas';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

const props = defineProps<{
	draft: WorkflowDraft;
	/** The agent is still working, so a save can still replace this draft. */
	building: boolean;
	/** What the agent does now. Replaces the building label while it works. */
	statusText?: string;
	/** The run waits on the user in the chat, for an answer or an approval. */
	waiting?: boolean;
}>();

const i18n = useI18n();
const eventBus = createEventBus<CanvasEventBusEvents>();
// New nodes join one at a time, so the canvas grows with a rhythm.
const visibleNodes = useStaggeredList(() => props.draft.workflow.nodes, { key: draftNodeKey });
const visibleDraft = computed(() => withDraftNodes(props.draft, visibleNodes.value));
const { documentStore } = useDraftWorkflowDocument(() => visibleDraft.value);
// The editor canvas reads its workflow from this key, so it renders the draft.
provide(WorkflowDocumentStoreKey, documentStore);

// Vue Flow keeps one store per id, so each source file gets its own canvas.
const canvasId = computed(() => `instance-ai-draft-${props.draft.filePath}`);

// Fit the view when the agent adds nodes, so the newest one is on screen. A change
// to existing nodes keeps the viewport the user has.
watch(
	() => visibleNodes.value.map((node) => node.name),
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
		<div
			v-if="building"
			:class="[$style.status, { [$style.waiting]: waiting }]"
			role="status"
			aria-live="polite"
			:data-waiting="String(!!waiting)"
			data-test-id="instance-ai-workflow-draft-status"
		>
			<!-- The chat is to the left of the canvas. -->
			<N8nIcon
				v-if="waiting"
				icon="arrow-left"
				size="large"
				:class="$style.waitingArrow"
				data-test-id="instance-ai-workflow-draft-waiting-arrow"
			/>
			<span :class="$style.statusText">
				{{ statusText ?? i18n.baseText('instanceAi.workflowDraft.building') }}
			</span>
		</div>
		<div v-else :class="$style.badge" data-test-id="instance-ai-workflow-draft-badge">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('instanceAi.workflowDraft.unsaved') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.draft {
	position: relative;
	width: 100%;
	height: 100%;
	background: var(--background--surface);
}

.canvas {
	width: 100%;
	height: 100%;

	// A node animates when it mounts. Node ids stay the same between revisions, so
	// only new nodes animate.
	:global(.vue-flow__node) {
		animation: draft-node-enter var(--duration--snappy) var(--easing--ease-out-quart) both;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.vue-flow__node) {
			animation: none;
		}
	}
}

@keyframes draft-node-enter {
	from {
		opacity: 0;
		scale: 0.92;
	}

	to {
		opacity: 1;
		scale: 1;
	}
}

// Over the nodes, so the agent's progress is the first thing the user reads.
.status {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 1;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	max-width: calc(100% - var(--spacing--2xl));
	padding: var(--spacing--sm) var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: color-mix(in srgb, var(--background--surface) 70%, transparent);
	backdrop-filter: blur(4px);
	box-shadow: var(--shadow--md);
	pointer-events: none;
}

// The agent waits on the user, so the status asks for attention and does not shimmer.
.waiting {
	border-color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 15%, transparent);
	color: var(--color--danger);

	.statusText {
		animation: none;
		background: none;
		color: inherit;
		-webkit-text-fill-color: currentColor;
	}
}

.waitingArrow {
	flex-shrink: 0;
	animation: waiting-nudge 1.2s var(--easing--ease-in-out) infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes waiting-nudge {
	50% {
		translate: calc(-1 * var(--spacing--4xs)) 0;
	}
}

// The same shimmer as the loading text in the chat.
.statusText {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color) 35%,
		var(--background--surface) 65%
	);
	--animation--shimmer--foreground: var(--text-color);
	@include motion.shimmer;

	display: block;
	overflow: hidden;
	font-size: var(--font-size--lg);
	line-height: var(--line-height--lg);
	white-space: nowrap;
	text-overflow: ellipsis;
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
