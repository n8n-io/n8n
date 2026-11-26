<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { ref, computed, watch, onUnmounted } from 'vue';
import type { InstanceAiMessage } from '@n8n/api-types';
import { useThread } from '@/features/ai/instanceAi/instanceAi.store';
import { useSteadyRunActivity } from '@/features/ai/instanceAi/composables/useRunActivity';

const thread = useThread();

const elapsed = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const activity = useSteadyRunActivity(() => thread.messages);

/**
 * True when the orchestrator has stopped but one of its child agents still runs.
 */
function hasDetachedWork(messages: InstanceAiMessage[]): boolean {
	return messages.some((message) => {
		const root = message.role === 'assistant' ? message.agentTree : undefined;
		if (!root || root.status === 'active') return false;
		return root.children.some((child) => child.status === 'active');
	});
}

/**
 * The bar shows only for work that continues after the orchestrator stops.
 * While the orchestrator runs, the thinking trace, its tool rows and the
 * typing dots of the message show the live activity. The bar then repeated
 * them, for example as a second "Thinking" row.
 * A pending confirmation hides the bar, because the card is the prompt.
 */
const isVisible = computed(
	() =>
		!thread.isAwaitingConfirmation &&
		!thread.messages.some((message) => message.role === 'assistant' && message.isStreaming) &&
		hasDetachedWork(thread.messages),
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
