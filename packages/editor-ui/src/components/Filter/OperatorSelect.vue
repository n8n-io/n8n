<script setup lang="ts">
import { useI18n } from '@/composables';
import type { FilterTypeCombinator } from 'n8n-workflow';
import { FilterOperator, OPERATORS } from './constants';

interface Props {
	selected: string;
}

defineProps<Props>();

const emit = defineEmits<{
	(event: 'operatorChanged', value: string): void;
}>();

const i18n = useI18n();

// TODO: Make select nested
const operators = OPERATORS.map((group) => group.children as FilterOperator[]).flat();

const onOperatorChange = (operator: string): void => {
	emit('operatorChanged', operator);
};
</script>

<template>
	<div data-test-id="operator-select">
		<n8n-select :modelValue="selected" @update:modelValue="onOperatorChange">
			<n8n-option
				v-for="operator in operators"
				:key="operator.id"
				:value="operator.id"
				:label="i18n.baseText(operator.name)"
			>
			</n8n-option>
		</n8n-select>
	</div>
</template>

<style lang="scss" module></style>
