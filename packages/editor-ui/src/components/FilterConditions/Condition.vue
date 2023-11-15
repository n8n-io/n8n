<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@/composables';
import type {
	FilterConditionValue,
	FilterOperatorType,
	INodeProperties,
	NodePropertyTypes,
} from 'n8n-workflow';
import { computed } from 'vue';
import OperatorSelect from './OperatorSelect.vue';
import { OPERATORS_BY_ID, type FilterOperatorId } from './constants';
import type { FilterOperator } from './types';

interface Props {
	path: string;
	condition: FilterConditionValue;
	issues?: string[];
	fixedLeftValue?: boolean;
	canRemove?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	issues: () => [],
	canRemove: true,
	fixedLeftValue: false,
});

const emit = defineEmits<{
	(event: 'operatorChange', value: string): void;
	(event: 'leftValueChange', value: string): void;
	(event: 'rightValueChange', value: string): void;
	(event: 'remove'): void;
}>();

function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith('=');
}

const operatorId = computed<FilterOperatorId>(() => {
	const { type, operation } = props.condition.operator;
	return `${type}:${operation}` as FilterOperatorId;
});
const operator = computed<FilterOperator>(() => OPERATORS_BY_ID[operatorId.value]);
const isLeftExpression = computed(() => isExpression(props.condition.leftValue));
const isRightExpression = computed(() => isExpression(props.condition.rightValue));

const operatorTypeToNodePropType = (operatorType: FilterOperatorType): NodePropertyTypes => {
	switch (operatorType) {
		case 'array':
		case 'object':
		case 'boolean':
		case 'any':
			return 'string';
		default:
			return operatorType;
	}
};

const leftParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder: i18n.baseText(
		operator.value.type === 'dateTime'
			? 'filter.condition.placeholderDate'
			: 'filter.condition.placeholderLeft',
	),
	type: operatorTypeToNodePropType(operator.value.type),
}));

const rightParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder: i18n.baseText(
		operator.value.type === 'dateTime'
			? 'filter.condition.placeholderDate'
			: 'filter.condition.placeholderRight',
	),
	type: operatorTypeToNodePropType(operator.value.rightType ?? operator.value.type),
}));

const onOperatorChange = (value: string): void => {
	const { operator } = props.condition;
	const newOperator: FilterOperator = OPERATORS_BY_ID[value as FilterOperatorId];
	const typeChanged = operator.type !== newOperator.type;

	if (typeChanged && !isLeftExpression.value) {
		emit('leftValueChange', '');
	}

	const rightTypeChanged =
		(operator.rightType ?? operator.type) !== (newOperator.rightType ?? newOperator.type);
	if ((rightTypeChanged && !isRightExpression.value) || newOperator.singleValue) {
		emit('rightValueChange', '');
	}

	emit('operatorChange', value);
};

const onLeftValueChange = (update: IUpdateInformation): void => {
	emit('leftValueChange', update.value as string);
};

const onRightValueChange = (update: IUpdateInformation): void => {
	emit('rightValueChange', update.value as string);
};

const onRemove = (): void => {
	emit('remove');
};

const i18n = useI18n();
</script>

<template>
	<div
		:class="{
			[$style.wrapper]: true,
			[$style.hasIssues]: issues.length > 0,
		}"
		data-test-id="filter-condition"
	>
		<n8n-icon-button
			v-if="canRemove"
			type="tertiary"
			text
			size="mini"
			icon="trash"
			data-test-id="filter-remove-condition"
			:title="i18n.baseText('filter.removeCondition')"
			:class="$style.remove"
			@click="onRemove"
		></n8n-icon-button>
		<n8n-resize-observer
			:class="$style.observer"
			:breakpoints="[
				{ bp: 'stacked', width: 340 },
				{ bp: 'medium', width: 520 },
			]"
		>
			<template #default="{ bp }">
				<div
					:class="{
						[$style.condition]: true,
						[$style.hideRightInput]: operator.singleValue,
						[$style.stacked]: bp === 'stacked',
						[$style.medium]: bp === 'medium',
					}"
				>
					<parameter-input-full
						v-if="!fixedLeftValue"
						displayOptions
						hideLabel
						hideHint
						isSingleLine
						:parameter="leftParameter"
						:value="condition.leftValue"
						:path="`${path}.left`"
						:class="[$style.input, $style.inputLeft]"
						data-test-id="filter-condition-left"
						@update="onLeftValueChange"
					/>
					<operator-select
						:class="$style.select"
						:selected="`${operator.type}:${operator.operation}`"
						@operatorChange="onOperatorChange"
					></operator-select>
					<parameter-input-full
						v-if="!operator.singleValue"
						displayOptions
						hideLabel
						hideHint
						isSingleLine
						:optionsPosition="bp === 'default' ? 'top' : 'bottom'"
						:parameter="rightParameter"
						:value="condition.rightValue"
						:path="`${path}.right`"
						:class="[$style.input, $style.inputRight]"
						data-test-id="filter-condition-right"
						@update="onRightValueChange"
					/>
				</div>
			</template>
		</n8n-resize-observer>

		<parameter-issues v-if="issues.length > 0" :issues="issues" :class="$style.issues" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: var(--spacing-4xs);
	padding-left: var(--spacing-l);

	&.hasIssues {
		--input-border-color: var(--color-danger);
	}

	&:hover {
		.remove {
			opacity: 1;
		}
	}
}

.condition {
	display: flex;
	flex-wrap: nowrap;
	align-items: flex-end;
}

.observer {
	width: 100%;
}

.issues {
	align-self: flex-start;
	padding-top: var(--spacing-xl);
}

.select {
	flex-shrink: 0;
	flex-grow: 0;
	flex-basis: 160px;
	--input-border-radius: 0;
	--input-border-right-color: transparent;
}

.input {
	flex-shrink: 0;
	flex-basis: 160px;
	flex-grow: 1;
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

.hideRightInput {
	.select {
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
		--input-border-right-color: var(--input-border-color-base);
	}
}

.remove {
	position: absolute;
	left: 0;
	top: var(--spacing-l);
	opacity: 0;
	transition: opacity 100ms ease-in;
}

.medium {
	flex-wrap: wrap;

	.select {
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: 0;
		--input-border-bottom-color: transparent;
		--input-border-right-color: var(--input-border-color-base);
	}

	.inputLeft {
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: 0;
		--input-border-right-color: transparent;
		--input-border-bottom-color: transparent;
	}

	.inputRight {
		flex-basis: 340px;
		flex-shrink: 1;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
	}

	&.hideRightInput {
		.select {
			--input-border-bottom-color: var(--input-border-color-base);
			--input-border-top-left-radius: 0;
			--input-border-bottom-left-radius: 0;
			--input-border-top-right-radius: var(--border-radius-base);
			--input-border-bottom-right-radius: var(--border-radius-base);
		}

		.inputLeft {
			--input-border-top-right-radius: 0;
			--input-border-bottom-left-radius: var(--border-radius-base);
			--input-border-bottom-right-radius: 0;
			--input-border-bottom-color: var(--input-border-color-base);
		}
	}
}

.stacked {
	display: block;

	.select {
		width: 100%;
		--input-border-right-color: var(--input-border-color-base);
		--input-border-bottom-color: transparent;
		--input-border-radius: 0;
	}

	.inputLeft {
		--input-border-right-color: var(--input-border-color-base);
		--input-border-bottom-color: transparent;
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-left-radius: 0;
		--input-border-bottom-right-radius: 0;
	}

	.inputRight {
		--input-border-top-left-radius: 0;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
	}

	&.hideRightInput {
		.select {
			--input-border-bottom-color: var(--input-border-color-base);
			--input-border-top-left-radius: 0;
			--input-border-top-right-radius: 0;
			--input-border-bottom-left-radius: var(--border-radius-base);
			--input-border-bottom-right-radius: var(--border-radius-base);
		}

		.inputLeft {
			--input-border-top-left-radius: var(--border-radius-base);
			--input-border-top-right-radius: var(--border-radius-base);
			--input-border-bottom-left-radius: 0;
			--input-border-bottom-right-radius: 0;
			--input-border-bottom-color: transparent;
		}
	}
}
</style>
