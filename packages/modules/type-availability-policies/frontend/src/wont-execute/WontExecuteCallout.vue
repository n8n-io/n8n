<script setup lang="ts">
import type { WorkflowExecutionBlockCause } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { EXECUTION_BLOCK_CAUSE_COPY } from './wontExecute';

const { count, causes } = defineProps<{
	count: number;
	causes: WorkflowExecutionBlockCause[];
}>();

const emit = defineEmits<{ clear: [] }>();

const i18n = useI18n();

const title = computed(() =>
	i18n.baseText('typeAvailabilityPolicies.wontExecute.callout.title', {
		adjustToNumber: count,
		interpolate: {
			count: String(count),
			reasons: causes
				.map((cause) => i18n.baseText(EXECUTION_BLOCK_CAUSE_COPY[cause].reason))
				.join(', '),
		},
	}),
);
</script>

<template>
	<N8nCallout theme="warning" data-test-id="wont-execute-callout">
		<div :class="$style.text">
			<strong>{{ title }}</strong>
			<span v-for="cause in causes" :key="cause">
				{{ i18n.baseText(EXECUTION_BLOCK_CAUSE_COPY[cause].fix) }}
			</span>
		</div>
		<template #trailingContent>
			<N8nButton
				variant="ghost"
				size="small"
				data-test-id="wont-execute-callout-clear"
				@click="emit('clear')"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.wontExecute.callout.clear') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>

<style module lang="scss">
.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
