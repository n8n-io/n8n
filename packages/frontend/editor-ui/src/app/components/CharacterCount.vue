<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	value: string;
	max: number;
}>();

const i18n = useI18n();
</script>

<template>
	<N8nText v-if="value" size="xsmall" color="text-light" :class="$style.characterCount">
		{{
			i18n.baseText('generic.characterCount', {
				interpolate: { count: String(value.length), max: String(max) },
			})
		}}
	</N8nText>
</template>

<style lang="scss" module>
.characterCount {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--2xs);
}
</style>
