<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { ref, computed, watch, onUnmounted } from 'vue';
import type { InstanceAiMessage, InstanceAiTimelineEntry } from '@n8n/api-types';
import { useThread } from '../instanceAi.store';
import { collectActiveBuilderAgents, isAwaitingFirstOutput } from '../builderAgents';
import { useSteadyRunActivity } from '../composables/useRunActivity';

const thread = useThread();

const elapsed = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const activity = useSteadyRunActivity(() => thread.messages);

/**
 * True while the streaming orchestrator is rendering an active thinking
 * block — its streamed status line (and tool subline) already shows the live
 * activity, so the bar would say the same thing twice. The bar still covers
 * the moments the block can't: run start before any trace exists, and
 * background builders working after the orchestrator finished (root no
 * longer active).
 */
function hasActiveThinkingTrace(messages: InstanceAiMessage[]): boolean {
	// ANY streaming message counts — follow-up chains and mid-run replay can
	// briefly append a stub streaming message after the one that renders the
	// active block, and checking only the last would re-show the bar next to it.
	return messages.some((m) => {
		if (m.role !== 'assistant' || !m.isStreaming) return false;
		const root = m.agentTree;
		if (!root || root.status !== 'active') return false;
		return root.timeline.some(
			(entry: InstanceAiTimelineEntry) => entry.type === 'reasoning' || entry.type === 'tool-call',
		);
	});
}

// Stay visible while the orchestrator streams, and also while a builder runs in
// the background after the orchestrator run has ended (isStreaming === false).
// Hidden while a confirmation is pending — the thinking-block header reads
// "Waiting for your input" then, and the pending card itself is the prompt —
// and while an active thinking block is the live activity surface.
// The typing dots of the message cover the wait for its first output.
const isVisible = computed(
	() =>
		!thread.isAwaitingConfirmation &&
		!hasActiveThinkingTrace(thread.messages) &&
		!thread.messages.some(isAwaitingFirstOutput) &&
		(thread.isStreaming || collectActiveBuilderAgents(thread.messages).length > 0),
);

const formattedElapsed = computed(() => {
	const s = elapsed.value;
	if (s < 60) return `${String(s)}s`;
	const m = Math.floor(s / 60);
	const remaining = s % 60;
	return `${String(m)}m ${String(remaining).padStart(2, '0')}s`;
});

watch(
	isVisible,
	(visible) => {
		if (visible) {
			elapsed.value = 0;
			timer = setInterval(() => {
				elapsed.value++;
			}, 1000);
		} else if (timer) {
			clearInterval(timer);
			timer = null;
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (timer) {
		clearInterval(timer);
	}
});

const label = computed(() => {
	const current = activity.value;
	if (!current) return '';
	return current.detail ? `${current.label} · ${current.detail}` : current.label;
});
</script>

<template>
	<div v-if="isVisible && activity" :class="$style.row">
		<N8nAiActivityStep
			:label="label"
			:meta="elapsed >= 1 ? formattedElapsed : undefined"
			:loading="!activity.waiting"
			:has-content="false"
			data-test-id="instance-ai-run-activity"
		/>
	</div>
</template>

<style lang="scss" module>
/** Matches the inline padding of assistant content, so the row lines up with the trace. */
.row {
	padding-inline: var(--spacing--sm);
	padding-block-end: var(--spacing--lg);
}
</style>
