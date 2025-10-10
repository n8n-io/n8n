<script setup lang="ts">
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';

import {
	type FilterConditionValue,
	type FilterValue,
	type INodeProperties,
	type FilterTypeCombinator,
	type INode,
	type NodeParameterValue,
	type FilterOptionsValue,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import {
	DEFAULT_FILTER_OPTIONS,
	DEFAULT_MAX_CONDITIONS,
	DEFAULT_OPERATOR_VALUE,
} from './constants';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/composables/useDebounce';
import Condition from './Condition.vue';
import CombinatorSelect from './CombinatorSelect.vue';
import { resolveParameter } from '@/composables/useWorkflowHelpers';
import Draggable from 'vuedraggable';

import { N8nButton, N8nInputLabel } from '@n8n/design-system';
interface Props {
	parameter: INodeProperties;
	value: FilterValue;
	path: string;
	node: INode | null;
	readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), { readOnly: false });

const emit = defineEmits<{
	valueChanged: [
		value: {
			name: string;
			node: string;
			value: FilterValue;
		},
	];
}>();

const i18n = useI18n();
const ndvStore = useNDVStore();
const { debounce } = useDebounce();

const debouncedEmitChange = debounce(emitChange, { debounceTime: 1000 });

function createCondition(): FilterConditionValue {
	return {
		id: crypto.randomUUID(),
		leftValue: '',
		rightValue: '',
		operator: DEFAULT_OPERATOR_VALUE,
	};
}

const allowedCombinators = computed<FilterTypeCombinator[]>(
	() => props.parameter.typeOptions?.filter?.allowedCombinators ?? ['and', 'or'],
);

const state = reactive<{ paramValue: FilterValue }>({
	paramValue: {
		options: props.value?.options ?? DEFAULT_FILTER_OPTIONS,
		conditions: props.value?.conditions?.map((condition) => {
			if (!condition.id) condition.id = crypto.randomUUID();
			return condition;
		}) ?? [createCondition()],
		combinator: props.value?.combinator ?? allowedCombinators.value[0],
	},
});

const maxConditions = computed(
	() => props.parameter.typeOptions?.filter?.maxConditions ?? DEFAULT_MAX_CONDITIONS,
);

const singleCondition = computed(() => props.parameter.typeOptions?.multipleValues === false);

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
				...resolveParameter(typeOptions as unknown as NodeParameterValue),
			};
		} catch (error) {}

		if (!isEqual(state.paramValue.options, newOptions)) {
			state.paramValue.options = newOptions;
			debouncedEmitChange();
		}
	},
	{ immediate: true },
);

watch(
	() => props.value,
	(value) => {
		if (isEmpty(value) || isEqual(state.paramValue, value)) return;

		state.paramValue.conditions = value.conditions;
		state.paramValue.combinator = value.combinator;
		state.paramValue.options = value.options;
	},
);

watch(
	() => state.paramValue,
	() => {
		debouncedEmitChange();
	},
	{ deep: true },
);

function emitChange() {
	emit('valueChanged', {
		name: props.path,
		value: state.paramValue,
		node: props.node?.name as string,
	});
}

function addCondition(): void {
	state.paramValue.conditions.push(createCondition());
}

function onConditionUpdate(index: number, value: FilterConditionValue): void {
	state.paramValue.conditions[index] = value;
}

function onCombinatorChange(combinator: FilterTypeCombinator): void {
	state.paramValue.combinator = combinator;
}

function onConditionRemove(index: number): void {
	state.paramValue.conditions.splice(index, 1);
}

function getIssues(index: number): string[] {
	return issues.value[`${props.parameter.name}.${index}`] ?? [];
}
</script>

<template>
	<div
		:class="{ [$style.filter]: true, [$style.single]: singleCondition }"
		:data-test-id="`filter-${parameter.name}`"
	>
		<N8nInputLabel
			v-if="!singleCondition"
			:label="parameter.displayName"
			:underline="true"
			:show-options="true"
			:show-expression-selector="false"
			size="small"
			color="text-dark"
		>
		</N8nInputLabel>
		<div :class="$style.content">
			<div :class="$style.conditions">
				<Draggable
					v-model="state.paramValue.conditions"
					item-key="id"
					handle=".drag-handle"
					:drag-class="$style.dragging"
					:ghost-class="$style.ghost"
				>
					<template #item="{ index, element: condition }">
						<div>
							<CombinatorSelect
								v-if="index !== 0"
								:read-only="index !== 1 || readOnly"
								:options="allowedCombinators"
								:selected="state.paramValue.combinator"
								:class="$style.combinator"
								@combinator-change="onCombinatorChange"
							/>

							<Condition
								:condition="condition"
								:index="index"
								:options="state.paramValue.options"
								:fixed-left-value="!!parameter.typeOptions?.filter?.leftValue"
								:read-only="readOnly"
								:can-remove="index !== 0 || state.paramValue.conditions.length > 1"
								:can-drag="index !== 0 || state.paramValue.conditions.length > 1"
								:path="`${path}.conditions.${index}`"
								:issues="getIssues(index)"
								:class="$style.condition"
								@update="(value) => onConditionUpdate(index, value)"
								@remove="() => onConditionRemove(index)"
							></Condition>
						</div>
					</template>
				</Draggable>
			</div>
			<div v-if="!singleCondition && !readOnly" :class="$style.addConditionWrapper">
				<N8nButton
					type="tertiary"
					block
					:class="$style.addCondition"
					:label="i18n.baseText('filter.addCondition')"
					:title="maxConditionsReached ? i18n.baseText('filter.maxConditions') : ''"
					:disabled="maxConditionsReached"
					data-test-id="filter-add-condition"
					@click="addCondition"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.filter {
	display: flex;
	flex-direction: column;
	margin: var(--spacing--xs) 0;
}

.conditions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
.combinator {
	position: relative;
	z-index: 1;
	margin-top: var(--spacing--2xs);
	margin-bottom: calc(var(--spacing--2xs) * -1);
	margin-left: var(--spacing--lg);
}

.condition {
	padding-left: var(--spacing--lg);
	padding-bottom: var(--spacing--xs);
}

.single {
	.condition {
		padding-left: 0;
	}

	.content {
		margin-top: calc(var(--spacing--xs) * -1);
	}
}

.addConditionWrapper {
	margin-top: var(--spacing--lg);
	margin-left: var(--spacing--lg);
}

.addCondition {
	// Styling to match collection button (should move to standard button in future)
	font-weight: var(--font-weight-normal);
	--button-font-color: var(--color--text--shade-1);
	--button-border-color: var(--color--foreground);
	--button-background-color: var(--color--background);

	--button-hover-font-color: var(--color--text--shade-1);
	--button-hover-border-color: var(--color--foreground);
	--button-hover-background-color: var(--color--background);

	--button-active-font-color: var(--color--text--shade-1);
	--button-active-border-color: var(--color--foreground);
	--button-active-background-color: var(--color--background);

	--button-focus-font-color: var(--color--text--shade-1);
	--button-focus-border-color: var(--color--foreground);
	--button-focus-background-color: var(--color--background);

	&:hover,
	&:focus,
	&:active {
		outline: none;
	}
}
.ghost,
.dragging {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
}
.ghost {
	background-color: var(--color--background);
	opacity: 0.5;
}
.dragging {
	background-color: var(--color--background--light-3);
	opacity: 0.7;
}
.dragging > .combinator {
	display: none;
}
</style>
