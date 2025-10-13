<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import InputTriple from '@/components/InputTriple/InputTriple.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@n8n/i18n';
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
	inferOperatorType,
	isEmptyInput,
	operatorTypeToNodeProperty,
	resolveCondition,
} from './utils';
import { useDebounce } from '@/composables/useDebounce';

import { N8nIcon, N8nIconButton, N8nTooltip } from '@n8n/design-system';
interface Props {
	path: string;
	condition: FilterConditionValue;
	options: FilterOptionsValue;
	issues?: string[];
	fixedLeftValue?: boolean;
	canRemove?: boolean;
	readOnly?: boolean;
	index?: number;
	canDrag?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	issues: () => [],
	canRemove: true,
	fixedLeftValue: false,
	readOnly: false,
	index: 0,
	canDrag: true,
});

const emit = defineEmits<{
	update: [value: FilterConditionValue];
	remove: [];
}>();

const i18n = useI18n();
const { debounce } = useDebounce();

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

const suggestedType = computed(() => {
	if (conditionResult.value.status !== 'resolve_error') {
		return inferOperatorType(conditionResult.value.resolved.leftValue);
	}

	return 'any';
});

const allIssues = computed(() => {
	if (conditionResult.value.status === 'validation_error' && !isEmpty.value) {
		return [conditionResult.value.error];
	}

	return props.issues;
});

const now = computed(() => DateTime.now().toISO());

const leftParameter = computed<INodeProperties>(() => ({
	name: 'left',
	displayName: 'Left',
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
		name: 'right',
		displayName: 'Right',
		default: '',
		placeholder:
			type === 'dateTime' ? now.value : i18n.baseText('filter.condition.placeholderRight'),
		...operatorTypeToNodeProperty(type),
	};
});

const debouncedEmitUpdate = debounce(() => emit('update', condition.value), { debounceTime: 500 });

const onLeftValueChange = (update: IUpdateInformation): void => {
	condition.value.leftValue = update.value as NodeParameterValue;
	debouncedEmitUpdate();
};

const onRightValueChange = (update: IUpdateInformation): void => {
	condition.value.rightValue = update.value as NodeParameterValue;
	debouncedEmitUpdate();
};

const onOperatorChange = (value: string): void => {
	const newOperator = getFilterOperator(value);

	condition.value = handleOperatorChange({
		condition: condition.value,
		newOperator,
	});

	debouncedEmitUpdate();
};

const onRemove = (): void => {
	emit('remove');
};

const onBlur = (): void => {
	debouncedEmitUpdate();
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
		<N8nIconButton
			v-if="canDrag && !readOnly"
			type="tertiary"
			text
			size="small"
			icon="grip-vertical"
			:title="i18n.baseText('filter.dragCondition')"
			:class="[$style.iconButton, $style.defaultTopPadding, 'drag-handle']"
		/>
		<N8nIconButton
			v-if="canRemove && !readOnly"
			type="tertiary"
			text
			size="small"
			icon="trash-2"
			data-test-id="filter-remove-condition"
			:title="i18n.baseText('filter.removeCondition')"
			:class="[$style.iconButton, $style.extraTopPadding]"
			@click="onRemove"
		/>
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
					:path="`${path}.leftValue`"
					:class="[$style.input, $style.inputLeft]"
					data-test-id="filter-condition-left"
					@update="onLeftValueChange"
					@blur="onBlur"
				/>
			</template>
			<template #middle>
				<OperatorSelect
					:selected="`${operator.type}:${operator.operation}`"
					:suggested-type="suggestedType"
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
					:path="`${path}.rightValue`"
					:class="[$style.input, $style.inputRight]"
					data-test-id="filter-condition-right"
					@update="onRightValueChange"
					@blur="onBlur"
				/>
			</template>
		</InputTriple>

		<div :class="$style.status">
			<ParameterIssues v-if="allIssues.length > 0" :issues="allIssues" />

			<N8nTooltip
				v-else-if="conditionResult.status === 'success' && conditionResult.result === true"
				:show-after="500"
			>
				<template #content>
					{{ i18n.baseText('filter.condition.resolvedTrue') }}
				</template>
				<N8nIcon icon="circle-check" size="medium" color="text-light" />
			</N8nTooltip>

			<N8nTooltip
				v-else-if="conditionResult.status === 'success' && conditionResult.result === false"
				:show-after="500"
			>
				<template #content>
					{{ i18n.baseText('filter.condition.resolvedFalse') }}
				</template>
				<N8nIcon icon="circle-x" size="medium" color="text-light" />
			</N8nTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--4xs);

	&.hasIssues {
		--input-border-color: var(--color--danger);
	}

	&:hover {
		.iconButton {
			opacity: 1;
		}
	}
}

.status {
	align-self: flex-start;
	padding-top: 28px;
}

.iconButton {
	position: absolute;
	left: 0;
	opacity: 0;
	transition: opacity 100ms ease-in;
	color: var(--icon-base-color);
}

.defaultTopPadding {
	top: var(--spacing--md);
}
.extraTopPadding {
	top: calc(14px + var(--spacing--md));
}
</style>
