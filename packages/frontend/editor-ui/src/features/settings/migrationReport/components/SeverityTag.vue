<script setup lang="ts">
import { N8nTag } from '@n8n/design-system';
import { computed, useCssModule } from 'vue';

const $style = useCssModule();

defineOptions({ name: 'N8nTag' });

defineProps<{
	severity: 'low' | 'medium' | 'high' | 'critical';
}>();

const tagsI18n = computed(
	() =>
		({
			critical: 'Critical',
			high: 'High',
			medium: 'Medium',
			low: 'Low',
		}) as const,
);

const tagClasses = {
	critical: $style.TagCritical,
	high: $style.TagHigh,
	medium: $style.TagMedium,
	low: $style.TagLow,
} as const;
</script>

<template>
	<N8nTag :text="tagsI18n[severity]" :clickable="false" :class="tagClasses[severity]" />
</template>

<style module>
.TagCritical {
	color: var(--color--danger);
	background-color: var(--color--primary--tint-3);
	border: 0;
}

.TagMedium {
	color: var(--color--warning);
	background-color: var(--color--warning--tint-2);
	border: 0;
}

.TagHigh {
	/**
	 * High severity tag styles
	 */
}

.TagLow {
	border: 0;
}
</style>
