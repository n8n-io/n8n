<script setup lang="ts">
import type { FilterConditionValue, FilterValue, INodeProperties } from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { DEFAULT_MAX_CONDITIONS, DEFAULT_OPERATOR } from './constants';
import { useI18n } from '@/composables';
import Condition from './Condition.vue';

interface Props {
	parameter: INodeProperties;
	value: FilterValue;
	path: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'valueChanged', value: FilterValue): void;
}>();

function createCondition(): FilterConditionValue {
	return { leftValue: '', rightValue: '', operator: DEFAULT_OPERATOR };
}

const allowedCombinators = computed(
	() => props.parameter.typeOptions?.filter?.allowedCombinators ?? ['and', 'or'],
);

const state = reactive<{ paramValue: FilterValue }>({
	paramValue: {
		conditions: props.value.conditions ?? [createCondition()],
		combinator: props.value.combinator ?? allowedCombinators.value[0],
		value: props.value.value,
	},
});

const maxConditions = computed(
	() => props.parameter.typeOptions?.filter?.maxConditions ?? DEFAULT_MAX_CONDITIONS,
);
const maxConditionsReached = computed(
	() => maxConditions.value <= state.paramValue.conditions.length,
);

watch(
	() => state.paramValue,
	(value) => emit('valueChanged', value),
);

function addCondition(): void {
	state.paramValue.conditions.push(createCondition());
}

function onOperatorChanged(index: number, value: string): void {
	state.paramValue.conditions[index].operator = value;
}

function onLeftValueChanged(index: number, value: string): void {
	state.paramValue.conditions[index].leftValue = value;
}

function onRightValueChanged(index: number, value: string): void {
	state.paramValue.conditions[index].rightValue = value;
}

function onCombinatorChange(combinator: FilterTypeCombinator): void {
	state.paramValue.combinator = combinator;
}

const i18n = useI18n();
</script>

<template>
	<div :class="$style.filter" data-test-id="filter">
		<n8n-input-label
			:label="parameter.displayName"
			:underline="true"
			:showOptions="true"
			:showExpressionSelector="false"
			color="text-dark"
		>
		</n8n-input-label>
		<div :class="$style.conditions">
			<div v-for="(condition, index) of state.paramValue.conditions" :key="index">
				<condition
					:condition="condition"
					:fixed-left-value="!!parameter.typeOptions?.filter?.leftValue"
					:path="path"
					@operator-changed="(value) => onOperatorChanged(index, value)"
					@left-value-changed="(value) => onLeftValueChanged(index, value)"
					@right-value-changed="(value) => onRightValueChanged(index, value)"
				></condition>

				<combinator-select
					:options="allowedCombinators"
					:selected="state.paramValue.combinator"
					@combinator-change="onCombinatorChange"
				/>
			</div>
		</div>
		<n8n-button
			type="tertiary"
			block
			@click="addCondition"
			:class="$style.addCondition"
			:label="i18n.baseText('filter.addCondition')"
			:disabled="maxConditionsReached"
		/>
	</div>
</template>

<style lang="scss" module>
.filter {
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing-4xs);
}

.conditions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
}

.addCondition {
	margin-top: var(--spacing-2xs);
}
</style>
