<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import type { InstanceAiMessage, InstanceAiTimelineEntry } from '@n8n/api-types';
import { useThread } from '../instanceAi.store';
import { collectActiveBuilderAgents } from '../builderAgents';
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
const isVisible = computed(
	() =>
		!thread.isAwaitingConfirmation &&
		!hasActiveThinkingTrace(thread.messages) &&
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
</script>

<template>
	<Transition name="status-bar">
		<div v-if="isVisible && activity" :class="$style.bar" data-test-id="instance-ai-status-bar">
			<span :class="$style.label">{{ activity.label }}</span>
			<span v-if="activity.detail">&middot;</span>
			<span v-if="activity.detail">{{ activity.detail }}</span>
			<span>&middot;</span>
			<span :class="$style.elapsed">{{ formattedElapsed }}</span>
		</div>
	</Transition>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

/* Styled to match the thinking block's subline — the bar hands off to it
 * once trace content arrives, so the two must read as the same element. */
.bar {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs) 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtler);
	pointer-events: none;
}

.label {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;
}

.elapsed {
	font-variant-numeric: tabular-nums;
}
</style>

<style lang="scss">
.status-bar-enter-from,
.status-bar-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.status-bar-enter-active {
	transition: all 0.2s ease-out;
}

.status-bar-leave-active {
	transition: all 0.15s ease-in;
}
</style>
