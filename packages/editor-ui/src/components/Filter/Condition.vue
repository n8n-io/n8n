<script setup lang="ts">
import type { INodeProperties } from 'n8n-workflow';
import { reactive } from 'vue';
import { type FilterOperatorId, OPERATORS_BY_ID } from './constants';
import type { FilterOperator } from './types';

interface Props {
	path: string;
	fixedLeftValue: boolean;
	initialLeftValue: string;
	initialRightValue: string;
	initialOperator: FilterOperatorId;
}

const props = defineProps<Props>();

const state = reactive({
	operator: OPERATORS_BY_ID[props.initialOperator] as FilterOperator,
	leftValue: props.initialLeftValue,
	rightValue: props.initialRightValue,
});

const emit = defineEmits<{
	(event: 'operatorChanged', value: string): void;
	(event: 'leftValueChanged', value: string): void;
	(event: 'rightValueChanged', value: string): void;
}>();

const parameter: INodeProperties = { name: '', displayName: '', default: '', type: 'string' };

const onOperatorChange = (operator: FilterOperator): void => {
	state.operator = operator;
	emit('operatorChanged', operator.id);
};

const onLeftValueChange = (value: string): void => {
	emit('leftValueChanged', value);
};

const onRightValueChange = (value: string): void => {
	emit('rightValueChanged', value);
};
</script>

<template>
	<div class="$style.condition" data-test-id="condition">
		<parameter-input-full
			v-if="!fixedLeftValue"
			:parameter="parameter"
			:value="state.leftValue"
			:path="`${path}.left`"
			:hideLabel="true"
			@update="onLeftValueChange"
		/>
		<operator-select @operatorChanged="onOperatorChange"></operator-select>
		<parameter-input-full
			v-if="!state.operator.singleValue"
			:parameter="parameter"
			:value="state.rightValue"
			:path="`${path}.right`"
			:hideLabel="true"
			@update="onRightValueChange"
		/>
	</div>
</template>

<style lang="scss" module>
.condition {
	display: flex;
}
</style>
