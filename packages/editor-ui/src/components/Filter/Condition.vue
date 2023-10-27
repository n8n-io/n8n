<script setup lang="ts">
import type { FilterConditionValue, INodeProperties } from 'n8n-workflow';
import { computed } from 'vue';
import { OPERATORS_BY_ID, type FilterOperatorId } from './constants';
import type { FilterOperator } from './types';
import OperatorSelect from './OperatorSelect.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@/composables';
import type { IUpdateInformation } from '@/Interface';

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

const operator = computed<FilterOperator>(() => {
	const { type, operation } = props.condition.operator;
	return OPERATORS_BY_ID[`${type}:${operation}` as FilterOperatorId];
});

const parameter: INodeProperties = { name: '', displayName: '', default: '', type: 'string' };

const onOperatorChange = (value: string): void => {
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
		data-test-id="condition"
	>
		<n8n-icon-button
			v-if="canRemove"
			type="tertiary"
			text
			size="mini"
			icon="trash"
			:title="i18n.baseText('filter.removeCondition')"
			:class="$style.remove"
			@click="onRemove"
		></n8n-icon-button>
		<n8n-resize-observer
			:class="$style.observer"
			:breakpoints="[
				{ bp: 'stacked', width: 340 },
				{ bp: 'medium', width: 480 },
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
						:parameter="parameter"
						:value="condition.leftValue"
						:path="`${path}.left`"
						:class="[$style.input, $style.inputLeft]"
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
						:parameter="parameter"
						:value="condition.rightValue"
						:path="`${path}.right`"
						:class="[$style.input, $style.inputRight]"
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

	&.hasIssues {
		--input-border-color: var(--color-danger);

		input:focus {
			border-color: var(--color-danger);
		}
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
	left: calc(var(--spacing-l) * -1);
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
