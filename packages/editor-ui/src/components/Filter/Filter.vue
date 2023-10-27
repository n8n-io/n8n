<script setup lang="ts">
import { isEqual } from 'lodash-es';

import type {
	FilterConditionValue,
	FilterValue,
	INodeProperties,
	FilterTypeCombinator,
	INode,
	NodeParameterValue,
	FilterOptionsValue,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import {
	DEFAULT_FILTER_OPTIONS,
	DEFAULT_MAX_CONDITIONS,
	DEFAULT_OPERATOR_VALUE,
	type FilterOperatorId,
	OPERATORS_BY_ID,
} from './constants';
import { useI18n, useDebounceHelper } from '@/composables';
import Condition from './Condition.vue';
import CombinatorSelect from './CombinatorSelect.vue';
import { resolveParameter } from '@/mixins/workflowHelpers';
import type { FilterOperator } from './types';

interface Props {
	parameter: INodeProperties;
	value: FilterValue;
	path: string;
	node: INode | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'valueChanged', value: { name: string; node: string; value: FilterValue }): void;
}>();

const i18n = useI18n();
const ndvStore = useNDVStore();
const { callDebounced } = useDebounceHelper();

function createCondition(): FilterConditionValue {
	return { leftValue: '', rightValue: '', operator: DEFAULT_OPERATOR_VALUE };
}

const allowedCombinators = computed<FilterTypeCombinator[]>(
	() => props.parameter.typeOptions?.filter?.allowedCombinators ?? ['and', 'or'],
);

const state = reactive<{ paramValue: FilterValue }>({
	paramValue: {
		options: props.value?.options ?? DEFAULT_FILTER_OPTIONS,
		conditions: props.value?.conditions ?? [createCondition()],
		combinator: props.value?.combinator ?? allowedCombinators.value[0],
	},
});

const maxConditions = computed(
	() => props.parameter.typeOptions?.filter?.maxConditions ?? DEFAULT_MAX_CONDITIONS,
);

const maxConditionsReached = computed(
	() => maxConditions.value <= state.paramValue.conditions.length,
);

const issues = computed(() => {
	if (!ndvStore.activeNode) return {};
	return ndvStore.activeNode?.issues?.parameters ?? {};
});

watch(
	() => props.node?.parameters,
	() => {
		const typeOptions = props.parameter.typeOptions?.filter;

		if (!typeOptions) {
			return;
		}

		let newOptions: FilterOptionsValue = DEFAULT_FILTER_OPTIONS;
		try {
			newOptions = {
				...DEFAULT_FILTER_OPTIONS,
				...resolveParameter(typeOptions as NodeParameterValue),
			};
		} catch (error) {}

		if (!isEqual(state.paramValue.options, newOptions)) {
			state.paramValue.options = newOptions;
		}
	},
	{ immediate: true },
);

watch(state.paramValue, (value) => {
	void callDebounced(
		() => {
			emit('valueChanged', { name: props.path, value, node: props.node?.name as string });
		},
		{ debounceTime: 1000 },
	);
});

function addCondition(): void {
	state.paramValue.conditions.push(createCondition());
}

function onOperatorChanged(index: number, operatorId: string): void {
	const operator = OPERATORS_BY_ID[operatorId as FilterOperatorId] as FilterOperator;

	state.paramValue.conditions[index].operator = {
		type: operator.type,
		operation: operator.operation,
		rightType: operator.rightType,
		singleValue: operator.singleValue,
	};
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

function onConditionRemoved(index: number): void {
	state.paramValue.conditions.splice(index, 1);
}

function getIssues(index: number): string[] {
	return issues.value[`${props.parameter.name}.${index}`] ?? [];
}
</script>

<template>
	<div :class="$style.filter" :data-test-id="`filter-${parameter.name}`">
		<n8n-input-label
			:label="parameter.displayName"
			:underline="true"
			:showOptions="true"
			:showExpressionSelector="false"
			color="text-dark"
		>
		</n8n-input-label>
		<div :class="$style.content">
			<div :class="$style.conditions">
				<div v-for="(condition, index) of state.paramValue.conditions" :key="index">
					<combinator-select
						v-if="index !== 0"
						:readOnly="index !== 1"
						:options="allowedCombinators"
						:selected="state.paramValue.combinator"
						:class="$style.combinator"
						@combinatorChange="onCombinatorChange"
					/>

					<condition
						:condition="condition"
						:fixedLeftValue="!!parameter.typeOptions?.filter?.leftValue"
						:canRemove="index !== 0 || state.paramValue.conditions.length > 1"
						:path="`${path}.${index}`"
						:issues="getIssues(index)"
						@operatorChange="(value) => onOperatorChanged(index, value)"
						@leftValueChange="(value) => onLeftValueChanged(index, value)"
						@rightValueChange="(value) => onRightValueChanged(index, value)"
						@remove="() => onConditionRemoved(index)"
					></condition>
				</div>
			</div>
			<n8n-button
				type="secondary"
				block
				@click="addCondition"
				:class="$style.addCondition"
				:label="i18n.baseText('filter.addCondition')"
				:title="maxConditionsReached ? i18n.baseText('filter.maxConditions') : ''"
				:disabled="maxConditionsReached"
				data-test-id="filter-add-condition"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.filter {
	display: flex;
	flex-direction: column;
	margin: var(--spacing-xs) 0;
}

.conditions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
}
.content {
	padding-left: var(--spacing-l);
}
.combinator {
	position: relative;
	z-index: 1;
	margin-top: var(--spacing-2xs);
	margin-bottom: calc(var(--spacing-2xs) * -1);
}

.addCondition {
	margin-top: var(--spacing-l);
}
</style>
