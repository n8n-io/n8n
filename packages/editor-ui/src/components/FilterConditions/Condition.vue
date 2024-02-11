<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import InputTriple from '@/components/InputTriple/InputTriple.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@/composables/useI18n';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { DateTime } from 'luxon';
import {
	FilterError,
	executeFilterCondition,
	validateFieldType,
	type FilterConditionValue,
	type FilterOperatorType,
	type FilterOptionsValue,
	type INodeProperties,
	type NodeParameterValue,
} from 'n8n-workflow';
import { computed, ref } from 'vue';
import OperatorSelect from './OperatorSelect.vue';
import { OPERATORS_BY_ID, type FilterOperatorId } from './constants';
import type { FilterOperator } from './types';
type ConditionResult =
	| { status: 'resolve_error' }
	| { status: 'validation_error'; error: string }
	| { status: 'success'; result: boolean };

interface Props {
	path: string;
	condition: FilterConditionValue;
	options: FilterOptionsValue;
	issues?: string[];
	fixedLeftValue?: boolean;
	canRemove?: boolean;
	readOnly?: boolean;
	index?: number;
}

const props = withDefaults(defineProps<Props>(), {
	issues: () => [],
	canRemove: true,
	fixedLeftValue: false,
	readOnly: false,
});

const emit = defineEmits<{
	(event: 'update', value: FilterConditionValue): void;
	(event: 'remove'): void;
}>();

const i18n = useI18n();

const condition = ref<FilterConditionValue>(props.condition);

const operatorId = computed<FilterOperatorId>(() => {
	const { type, operation } = props.condition.operator;
	return `${type}:${operation}` as FilterOperatorId;
});
const operator = computed(() => OPERATORS_BY_ID[operatorId.value] as FilterOperator);

const operatorTypeToNodeProperty = (
	operatorType: FilterOperatorType,
): Pick<INodeProperties, 'type' | 'options'> => {
	switch (operatorType) {
		case 'boolean':
			return {
				type: 'options',
				options: [
					{ name: 'true', value: true },
					{ name: 'false', value: false },
				],
			};
		case 'array':
		case 'object':
		case 'any':
			return { type: 'string' };
		default:
			return { type: operatorType };
	}
};

const conditionResult = computed<ConditionResult>(() => {
	try {
		const resolved = resolveParameter(
			condition.value as unknown as NodeParameterValue,
		) as FilterConditionValue;

		if (resolved.leftValue === undefined || resolved.rightValue === undefined) {
			return { status: 'resolve_error' };
		}
		try {
			const result = executeFilterCondition(resolved, props.options, {
				index: props.index ?? 0,
				errorFormat: 'inline',
			});
			return { status: 'success', result };
		} catch (error) {
			let errorMessage = i18n.baseText('parameterInput.error');

			if (error instanceof FilterError) {
				errorMessage = `${error.message}.\n${error.description}`;
			}
			return {
				status: 'validation_error',
				error: errorMessage,
			};
		}
	} catch (error) {
		return { status: 'resolve_error' };
	}
});

const allIssues = computed(() => {
	if (conditionResult.value.status === 'validation_error') {
		return [conditionResult.value.error];
	}

	return props.issues;
});

const now = computed(() => DateTime.now().toISO());

const leftParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder:
		operator.value.type === 'dateTime'
			? now.value
			: i18n.baseText('filter.condition.placeholderLeft'),
	...operatorTypeToNodeProperty(operator.value.type),
}));

const rightParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder:
		operator.value.type === 'dateTime'
			? now.value
			: i18n.baseText('filter.condition.placeholderRight'),
	...operatorTypeToNodeProperty(operator.value.type),
}));

const onLeftValueChange = (update: IUpdateInformation): void => {
	condition.value.leftValue = update.value;
};

const onRightValueChange = (update: IUpdateInformation): void => {
	condition.value.rightValue = update.value;
};

const convertToType = (value: unknown, type: FilterOperatorType): unknown => {
	if (type === 'any') return value;

	const fallback = type === 'boolean' ? false : value;

	return (
		validateFieldType('filter', condition.value.leftValue, type, { parseStrings: true }).newValue ??
		fallback
	);
};

const onOperatorChange = (value: string): void => {
	const newOperator = OPERATORS_BY_ID[value as FilterOperatorId] as FilterOperator;
	const rightType = operator.value.rightType ?? operator.value.type;
	const newRightType = newOperator.rightType ?? newOperator.type;
	const leftTypeChanged = operator.value.type !== newOperator.type;
	const rightTypeChanged = rightType !== newRightType;

	// Try to convert left & right values to operator type
	if (leftTypeChanged) {
		condition.value.leftValue = convertToType(condition.value.leftValue, newOperator.type);
	}
	if (rightTypeChanged && !newOperator.singleValue) {
		condition.value.rightValue = convertToType(condition.value.rightValue, newRightType);
	}

	condition.value.operator = {
		type: newOperator.type,
		operation: newOperator.operation,
		rightType: newOperator.rightType,
		singleValue: newOperator.singleValue,
	};
	emit('update', condition.value);
};

const onRemove = (): void => {
	emit('remove');
};

const onBlur = (): void => {
	emit('update', condition.value);
};
</script>

<template>
	<div
		:class="{
			[$style.wrapper]: true,
			[$style.hasIssues]: allIssues.length > 0,
		}"
		data-test-id="filter-condition"
	>
		<n8n-icon-button
			v-if="canRemove && !readOnly"
			type="tertiary"
			text
			size="mini"
			icon="trash"
			data-test-id="filter-remove-condition"
			:title="i18n.baseText('filter.removeCondition')"
			:class="$style.remove"
			@click="onRemove"
		></n8n-icon-button>
		<InputTriple>
			<template #left>
				<ParameterInputFull
					v-if="!fixedLeftValue"
					:key="leftParameter.type"
					display-options
					hide-label
					hide-hint
					hide-issues
					:rows="3"
					:is-read-only="readOnly"
					:parameter="leftParameter"
					:value="condition.leftValue"
					:path="`${path}.left`"
					:class="[$style.input, $style.inputLeft]"
					data-test-id="filter-condition-left"
					@update="onLeftValueChange"
					@blur="onBlur"
				/>
			</template>
			<template #middle>
				<OperatorSelect
					:selected="`${operator.type}:${operator.operation}`"
					:read-only="readOnly"
					@operatorChange="onOperatorChange"
				></OperatorSelect>
			</template>
			<template #right="{ breakpoint }" v-if="!operator.singleValue">
				<ParameterInputFull
					:key="rightParameter.type"
					display-options
					hide-label
					hide-hint
					hide-issues
					:rows="3"
					:is-read-only="readOnly"
					:options-position="breakpoint === 'default' ? 'top' : 'bottom'"
					:parameter="rightParameter"
					:value="condition.rightValue"
					:path="`${path}.right`"
					:class="[$style.input, $style.inputRight]"
					data-test-id="filter-condition-right"
					@update="onRightValueChange"
					@blur="onBlur"
				/>
			</template>
		</InputTriple>

		<div :class="$style.status">
			<ParameterIssues v-if="allIssues.length > 0" :issues="allIssues" />

			<n8n-tooltip
				v-else-if="conditionResult.status === 'success' && conditionResult.result === true"
				:show-after="500"
			>
				<template #content>
					{{ i18n.baseText('filter.condition.resolvedTrue') }}
				</template>
				<n8n-icon :class="$style.statusIcon" icon="check-circle" size="medium" color="text-light" />
			</n8n-tooltip>

			<n8n-tooltip
				v-else-if="conditionResult.status === 'success' && conditionResult.result === false"
				:show-after="500"
			>
				<template #content>
					{{ i18n.baseText('filter.condition.resolvedFalse') }}
				</template>
				<n8n-icon :class="$style.statusIcon" icon="times-circle" size="medium" color="text-light" />
			</n8n-tooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: var(--spacing-4xs);

	&.hasIssues {
		--input-border-color: var(--color-danger);
	}

	&:hover {
		.remove {
			opacity: 1;
		}
	}
}

.status {
	align-self: flex-start;
	padding-top: 28px;
}

.statusIcon {
	padding-left: var(--spacing-4xs);
}

.remove {
	position: absolute;
	left: 0;
	top: var(--spacing-l);
	opacity: 0;
	transition: opacity 100ms ease-in;
}
</style>
