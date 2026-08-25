<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onUnmounted, ref } from 'vue';

const i18n = useI18n();

/**
 * Wall clock since the indicator mounted, mirroring how AiThinkingBlock counts:
 * event timestamps can't be used here because the whole point of this block is
 * that no event has arrived. What matters is that something visibly advances
 * while the model is quiet.
 */
const mountedAt = Date.now();
const elapsedSec = ref(0);
const ticker = setInterval(() => {
	elapsedSec.value = Math.floor((Date.now() - mountedAt) / 1000);
}, 1000);

onUnmounted(() => clearInterval(ticker));

function formatDuration(totalSec: number): string {
	if (totalSec < 60) return `${totalSec}s`;
	return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

const label = computed(() => {
	const active = i18n.baseText('ai.thinking.active');
	return elapsedSec.value >= 1 ? `${active} · ${formatDuration(elapsedSec.value)}` : active;
});
</script>

<template>
	<N8nAiActivityStep
		:label="label"
		loading
		:has-content="false"
		data-test-id="timeline-activity-indicator"
	/>
</template>
