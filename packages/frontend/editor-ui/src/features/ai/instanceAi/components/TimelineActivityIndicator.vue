<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onUnmounted, ref, watch } from 'vue';
import { ACTIVITY_INDICATOR_DELAY_MS } from '../agentTimeline.utils';

const props = defineProps<{
	/**
	 * Changes whenever the run visibly advances. Wall clock is the only signal
	 * available — coalesced text carries no timestamp (INS-1257) — so the caller
	 * tells us when to start over.
	 */
	progressToken: string;
}>();

const i18n = useI18n();

/**
 * Time since the run last showed any sign of life, not since this component
 * mounted: the tail entry keeps growing while text streams, and counting that
 * as dead time overstates the stall.
 *
 * Reset rather than remount. Progress arrives one delta at a time, so keying
 * the component on it would rebuild it once per token.
 */
let since = Date.now();
const elapsedSec = ref(0);

watch(
	() => props.progressToken,
	() => {
		since = Date.now();
		elapsedSec.value = 0;
	},
);

const ticker = setInterval(() => {
	elapsedSec.value = Math.floor((Date.now() - since) / 1000);
}, 1000);

onUnmounted(() => clearInterval(ticker));

function formatDuration(totalSec: number): string {
	if (totalSec < 60) return `${totalSec}s`;
	return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

/** Held back until the silence is long enough to be worth reporting. */
const visible = computed(() => elapsedSec.value * 1000 >= ACTIVITY_INDICATOR_DELAY_MS);

const label = computed(
	() => `${i18n.baseText('ai.thinking.active')} · ${formatDuration(elapsedSec.value)}`,
);
</script>

<template>
	<N8nAiActivityStep
		v-if="visible"
		:label="label"
		loading
		:has-content="false"
		data-test-id="timeline-activity-indicator"
	/>
</template>
