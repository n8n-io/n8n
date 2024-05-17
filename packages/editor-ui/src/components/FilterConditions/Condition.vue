<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import InputTriple from '@/components/InputTriple/InputTriple.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@/composables/useI18n';
import { DateTime } from 'luxon';
import type {
	FilterConditionValue,
	FilterOptionsValue,
	INodeProperties,
	NodeParameterValue,
} from 'n8n-workflow';
import { computed, ref } from 'vue';
import OperatorSelect from './OperatorSelect.vue';
import { type FilterOperatorId } from './constants';
import {
	getFilterOperator,
	handleOperatorChange,
	isEmptyInput,
	operatorTypeToNodeProperty,
	resolveCondition,
} from './utils';

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
	index: 0,
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
const operator = computed(() => getFilterOperator(operatorId.value));

const isEmpty = computed(() => {
	if (operator.value.singleValue) {
		return isEmptyInput(condition.value.leftValue);
	}

	return isEmptyInput(condition.value.leftValue) && isEmptyInput(condition.value.rightValue);
});

const conditionResult = computed(() =>
	resolveCondition({ condition: condition.value, options: props.options }),
);

const allIssues = computed(() => {
	if (conditionResult.value.status === 'validation_error' && !isEmpty.value) {
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

const rightParameter = computed<INodeProperties>(() => {
	const type = operator.value.rightType ?? operator.value.type;
	return {
		name: '',
		displayName: '',
		default: '',
		placeholder:
			type === 'dateTime' ? now.value : i18n.baseText('filter.condition.placeholderRight'),
		...operatorTypeToNodeProperty(type),
	};
});

const onLeftValueChange = (update: IUpdateInformation<NodeParameterValue>): void => {
	condition.value.leftValue = update.value;
};

const onRightValueChange = (update: IUpdateInformation<NodeParameterValue>): void => {
	condition.value.rightValue = update.value;
};

const onOperatorChange = (value: string): void => {
	const newOperator = getFilterOperator(value);

	condition.value = handleOperatorChange({
		condition: condition.value,
		newOperator,
	});

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
					@operator-change="onOperatorChange"
				></OperatorSelect>
			</template>
			<template v-if="!operator.singleValue" #right="{ breakpoint }">
				<ParameterInputFull
					:key="rightParameter.type"
					display-options
					hide-label
					hide-hint
					hide-issues
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
