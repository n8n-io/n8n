<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import type { TestRunRecord } from '../../evaluation.api';

type RunStatus = TestRunRecord['status'];

const props = defineProps<{
	status: RunStatus;
}>();

const locale = useI18n();

const tone = computed<'running' | 'done' | 'failed' | 'cancelled'>(() => {
	switch (props.status) {
		case 'new':
		case 'running':
			return 'running';
		case 'completed':
		case 'success':
			return 'done';
		case 'error':
		case 'warning':
			return 'failed';
		case 'cancelled':
			return 'cancelled';
		default:
			// All known statuses are handled above. Surface anything new as
			// "failed" rather than as "running" — a never-resolving spinner
			// is a worse UX failure than a noisy badge.
			return 'failed';
	}
});

const labelKey = computed(() => {
	switch (tone.value) {
		case 'running':
			return 'evaluation.runDetail.runStatus.running';
		case 'done':
			return 'evaluation.runDetail.runStatus.done';
		case 'failed':
			return 'evaluation.runDetail.runStatus.failed';
		case 'cancelled':
			return 'evaluation.runDetail.runStatus.cancelled';
	}
});
</script>

<template>
	<span :class="[$style.pill, $style[tone]]" data-test-id="run-status-pill">
		<N8nSpinner v-if="tone === 'running'" size="small" />
		<N8nIcon v-else-if="tone === 'done'" icon="circle-check" size="small" />
		<N8nIcon v-else-if="tone === 'failed'" icon="triangle-alert" size="small" />
		<N8nIcon v-else-if="tone === 'cancelled'" icon="status-canceled" size="small" />
		<N8nText size="small" bold>{{ locale.baseText(labelKey) }}</N8nText>
	</span>
</template>

<style module lang="scss">
.pill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--full);
	border: var(--border);
	background-color: var(--background--subtle);
	line-height: 1;
}

.running {
	color: var(--color--text);
}

.done {
	color: var(--text-color--success);
	border-color: var(--text-color--success);
}

.failed {
	color: var(--text-color--danger);
	border-color: var(--text-color--danger);
}

.cancelled {
	color: var(--color--text--tint-1);
}
</style>
