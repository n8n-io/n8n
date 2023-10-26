<script setup lang="ts">
import type {
	FilterConditionValue,
	FilterValue,
	INodeProperties,
	FilterTypeCombinator,
	INode,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import { DEFAULT_MAX_CONDITIONS, DEFAULT_OPERATOR_VALUE } from './constants';
import { useI18n, useDebounceHelper } from '@/composables';
import Condition from './Condition.vue';
import CombinatorSelect from './CombinatorSelect.vue';

interface Props {
	parameter: INodeProperties;
	value: FilterValue;
	path: string;
	node: INode | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'valueChanged', value: FilterValue): void;
}>();

function createCondition(): FilterConditionValue {
	return { leftValue: '', rightValue: '', operator: DEFAULT_OPERATOR_VALUE };
}

const allowedCombinators = computed(
	() => props.parameter.typeOptions?.filter?.allowedCombinators ?? ['and', 'or'],
);

const state = reactive<{ paramValue: FilterValue }>({
	paramValue: {
		conditions: props.value.conditions ?? [createCondition()],
		combinator: props.value.combinator ?? allowedCombinators.value[0],
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
	const [type, operation] = value.split(':');
	state.paramValue.conditions[index].operator = { type, operation };
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

const { callDebounced } = useDebounceHelper();

watch(state.paramValue, (value) => {
	void callDebounced(
		() => {
			emit('valueChanged', { name: props.path, value, node: props.node?.name });
		},
		{ debounceTime: 500 },
	);
});

const i18n = useI18n();
const ndvStore = useNDVStore();

const issues = computed(() => {
	if (!ndvStore.activeNode) return {};
	return ndvStore.activeNode?.issues?.parameters ?? {};
});

function getIssues(index: number): string[] {
	return issues.value[`${props.parameter.name}.${index}`] ?? [];
}
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
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.filter {
	display: flex;
	flex-direction: column;
	margin: var(--spacing-xs) 0;
	container: filter / inline-size;
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
