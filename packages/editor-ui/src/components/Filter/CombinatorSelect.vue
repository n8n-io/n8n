<script setup lang="ts">
import { useI18n } from '@/composables';
import type { FilterTypeCombinator } from 'n8n-workflow';

interface Props {
	options: FilterTypeCombinator[];
	selected: FilterTypeCombinator;
	readOnly: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	(event: 'combinatorChanged', value: FilterTypeCombinator): void;
}>();

const i18n = useI18n();

const onCombinatorChange = (combinator: FilterTypeCombinator): void => {
	emit('combinatorChanged', combinator);
};
</script>

<template>
	<div data-test-id="combinator-select">
		<n8n-select :modelValue="selected" @update:modelValue="onCombinatorChange">
			<n8n-option
				v-for="option in options"
				:key="option"
				:value="option"
				:label="i18n.baseText(`filter.combinator.${option}`)"
			>
			</n8n-option>
		</n8n-select>
	</div>
</template>

<style lang="scss" module></style>
