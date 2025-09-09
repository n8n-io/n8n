<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'; // cSpell:ignore reka
import { ref, computed } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

interface StringFilterCondition {
	id: string;
	label: string;
}

interface FilterItem {
	name: string;
	id: string;
	value: string;
	condition?: {
		id: string;
		label: string;
	};
}

const props = withDefaults(
	defineProps<{
		placeholder?: string;
		initialValue?: FilterItem | null;
		conditions?: StringFilterCondition[];
	}>(),
	{
		placeholder: 'Enter text...',
		conditions: () => [
			{ id: 'contains', label: 'Contains' },
			{ id: 'exact', label: 'Exact match' },
		],
	},
);

// ! TODO use a dropdown for conditions above the string

const emit = defineEmits<{
	'update:modelValue': [value: FilterItem | null];
}>();

const inputValue = ref('');
const selectedConditionId = ref<string>(props.conditions[0].id);

// Parse initial value
if (props.initialValue) {
	inputValue.value = props.initialValue.value;
	if (props.initialValue.condition) {
		selectedConditionId.value = props.initialValue.condition.id;
	}
}

const selectedCondition = computed(() => {
	return props.conditions.find((c) => c.id === selectedConditionId.value) || props.conditions[0];
});

function emitValue() {
	if (!inputValue.value.trim()) {
		emit('update:modelValue', null);
		return;
	}

	emit('update:modelValue', {
		id: `${selectedCondition.value.id}:${inputValue.value.trim()}`,
		name: inputValue.value.trim(),
		value: inputValue.value.trim(),
		condition: {
			id: selectedCondition.value.id,
			label: selectedCondition.value.label,
		},
	});
}

function handleInputChange(event: Event) {
	const target = event.target as HTMLInputElement;
	inputValue.value = target.value;
	emitValue();
}

function handleConditionChange(conditionId: string) {
	selectedConditionId.value = conditionId;
	emitValue();
}
</script>

<template>
	<div class="stringFilterContainer">
		<div class="stringFilterInputWrapper">
			<input
				:placeholder="placeholder"
				:value="inputValue"
				class="stringFilterInput"
				@input="handleInputChange"
			/>
		</div>
		<div class="stringFilterConditions">
			<RadioGroupRoot
				:model-value="selectedConditionId"
				@update:model-value="handleConditionChange"
				class="stringFilterRadioGroup"
			>
				<template v-for="condition in conditions" :key="condition.id">
					<RadioGroupItem :value="condition.id" class="stringFilterRadioItem">
						<div class="stringFilterRadioIndicator" />
						<RadioGroupIndicator class="stringFilterRadioIndicator">
							<N8nIcon icon="check" size="small" />
						</RadioGroupIndicator>
						<N8nText size="small" class="stringFilterRadioLabel">
							{{ condition.label }}
						</N8nText>
					</RadioGroupItem>
				</template>
			</RadioGroupRoot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';

.stringFilterContainer {
	width: 200px;
	background-color: var(--color-foreground-xlight); /* cSpell:ignore xlight */
	border-radius: var(--border-radius-base);
	overflow: hidden;
}

.stringFilterInputWrapper {
	padding: var(--spacing-2xs) var(--spacing-xs);
	border-bottom: var(--border-base);
	border-color: var(--color-foreground-light);
}

.stringFilterInput {
	width: 100%;
	padding: 0;
	font-size: var(--font-size-xs);
	color: var(--color-text-base);
	background: transparent;
	border: none;
	outline: none;
}

.stringFilterInput::placeholder {
	color: var(--color-text-light);
}

.stringFilterConditions {
	padding: var(--spacing-2xs) var(--spacing-xs);
}

.stringFilterConditionsLabel {
	display: block;
	margin-bottom: var(--spacing-2xs);
}

.stringFilterRadioGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.stringFilterRadioItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	padding: var(--spacing-4xs) 0;
	padding-left: 22px;
	border-radius: var(--border-radius-base);
	position: relative;
	cursor: pointer;
	background: transparent;
	border: none;
	outline: none;
}

.stringFilterRadioIndicator {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	width: 16px;
	height: 16px;
	left: 0;
	border-radius: 50%;
	border: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-xlight); /* cSpell:ignore xlight */
}

.stringFilterRadioItem[data-state='checked'] .stringFilterRadioIndicator {
	border-color: var(--color-secondary);
}

.stringFilterRadioLabel {
	flex: 1;
	text-align: left;
}
</style>
