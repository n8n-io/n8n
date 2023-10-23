<script setup lang="ts">
import type { FilterConditionValue, INodeProperties } from 'n8n-workflow';
import { computed } from 'vue';
import { OPERATORS_BY_ID, type FilterOperatorId } from './constants';
import type { FilterOperator } from './types';
import OperatorSelect from './OperatorSelect.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import type { IUpdateInformation } from '@/Interface';

interface Props {
	path: string;
	fixedLeftValue: boolean;
	condition: FilterConditionValue;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'operatorChanged', value: string): void;
	(event: 'leftValueChanged', value: string): void;
	(event: 'rightValueChanged', value: string): void;
}>();

const operator = computed<FilterOperator>(
	() => OPERATORS_BY_ID[props.condition.operator as FilterOperatorId],
);

const parameter: INodeProperties = { name: '', displayName: '', default: '', type: 'string' };

const onOperatorChange = (value: string): void => {
	emit('operatorChanged', value);
};

const onLeftValueChange = (update: IUpdateInformation): void => {
	emit('leftValueChanged', update.value);
};

const onRightValueChange = (update: IUpdateInformation): void => {
	emit('rightValueChanged', update.value);
};
</script>

<template>
	<div
		:class="{ [$style.condition]: true, [$style.hideRightInput]: operator.singleValue }"
		data-test-id="condition"
	>
		<parameter-input-full
			v-if="!fixedLeftValue"
			:displayOptions="true"
			:parameter="parameter"
			:value="condition.leftValue"
			:path="`${path}.left`"
			:class="[$style.input, $style.inputLeft]"
			:hideLabel="true"
			@update="onLeftValueChange"
		/>
		<operator-select
			:class="$style.select"
			:selected="condition.operator"
			@operatorChanged="onOperatorChange"
		></operator-select>
		<parameter-input-full
			v-if="!operator.singleValue"
			displayOptions
			optionsPosition="bottom"
			:parameter="parameter"
			:value="condition.rightValue"
			:path="`${path}.right`"
			:class="[$style.input, $style.inputRight]"
			:hideLabel="true"
			@update="onRightValueChange"
		/>
	</div>
</template>

<style lang="scss" module>
.condition {
	--condition-select-width: 160px;
	--condition-input-width: 160px;
	container: condition / inline-size;
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
}

.select {
	flex-basis: var(--condition-select-width);
	flex-shrink: 0;
	flex-grow: 1;
	--input-border-radius: 0;
	--input-border-right-color: transparent;
}

.hideRightInput .select {
	--input-border-top-right-radius: var(--border-radius-base);
	--input-border-bottom-right-radius: var(--border-radius-base);
	--input-border-right-color: var(--input-border-color-base);
}

.input {
	flex-grow: 10;
	flex-basis: var(--condition-input-width);
}

.inputLeft {
	--input-border-top-right-radius: 0;
	--input-border-bottom-right-radius: 0;
	--input-border-right-color: transparent;
}

.inputRight {
	--input-border-top-left-radius: 0;
	--input-border-bottom-left-radius: 0;
}

@container condition (min-width: 700px) {
}
</style>
