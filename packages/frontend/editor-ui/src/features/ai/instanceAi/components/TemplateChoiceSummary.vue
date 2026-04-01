<script setup lang="ts">
import { computed } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const props = defineProps<{ toolCall: InstanceAiToolCallState }>();
const i18n = useI18n();

const summary = computed(() => {
	const result = props.toolCall.result as
		| { selected?: boolean; action?: 'adapt_with_agent' | 'use_now'; templateName?: string }
		| undefined;

	if (!result?.selected || !result.templateName) return '';

	return result.action === 'use_now'
		? i18n.baseText('instanceAi.templateChoice.summary.useNow' as BaseTextKey, {
				interpolate: { name: result.templateName },
			})
		: i18n.baseText('instanceAi.templateChoice.summary.adapt' as BaseTextKey, {
				interpolate: { name: result.templateName },
			});
});
</script>

<template>
	<div v-if="summary" :class="$style.summary" data-test-id="template-choice-summary">
		{{ summary }}
	</div>
</template>

<style lang="scss" module>
.summary {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) 0;
	font-style: italic;
}
</style>
