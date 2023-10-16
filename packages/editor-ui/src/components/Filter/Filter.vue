<script setup lang="ts">
import type { FilterConditionValue, FilterValue, INodeProperties } from 'n8n-workflow';
import { reactive } from 'vue';
import { DEFAULT_MAX_CONDITIONS, DEFAULT_OPERATOR } from './constants';
import { useI18n } from '@/composables';

interface Props {
	parameter: INodeProperties;
	value: FilterValue;
}

const props = defineProps<Props>();

const state = reactive({ paramValue: props.value });

const maxConditions = props.parameter.typeOptions?.filter?.maxConditions ?? DEFAULT_MAX_CONDITIONS;
const maxConditionsReached = maxConditions <= state.paramValue.conditions.length;

const emit = defineEmits<{
	(event: 'valueChanged', value: FilterValue): void;
}>();

function createCondition(): FilterConditionValue {
	return { leftValue: '', rightValue: '', operator: DEFAULT_OPERATOR };
}

function addCondition(): void {
	state.paramValue.conditions.push(createCondition());
}

const i18n = useI18n();
</script>

<template>
	<div data-test-id="filter">
		<n8n-input-label
			:label="parameter.displayName"
			:underline="true"
			:showOptions="true"
			:showExpressionSelector="false"
			color="text-dark"
		>
		</n8n-input-label>
		<div>
			<condition v-for="condition of state.paramValue.conditions" :key="condition.id"></condition>
		</div>
		<n8n-button
			type="tertiary"
			block
			@click="addCondition"
			:label="i18n.baseText('filter.addCondition')"
			:disabled=""
		/>
	</div>
</template>

<style lang="scss" module></style>
