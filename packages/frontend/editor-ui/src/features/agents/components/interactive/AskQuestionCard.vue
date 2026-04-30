<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { N8nButton, N8nCard, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import type { AskQuestionResume } from '@n8n/api-types';

interface Option {
	label: string;
	value: string;
	description?: string;
}

const props = defineProps<{
	question: string;
	options: Option[];
	allowMultiple?: boolean;
	disabled?: boolean;
	resolvedValue?: AskQuestionResume;
}>();

const emit = defineEmits<{
	submit: [resumeData: { values: string[] }];
}>();

const SINGLE_CHOICE_SUBMIT_DELAY_MS = 250;
const selected = ref<string[]>([]);
let singleChoiceSubmitTimer: number | undefined;

/** Labels of the persisted selected values, for the resolved state. */
const resolvedLabels = computed(() => {
	if (!props.resolvedValue) return [];
	return props.resolvedValue.values.map(
		(v) => props.options.find((o) => o.value === v)?.label ?? v,
	);
});

function selectSingle(value: string) {
	if (props.disabled) return;
	selected.value = [value];
	clearSingleChoiceSubmitTimer();
	singleChoiceSubmitTimer = window.setTimeout(() => {
		singleChoiceSubmitTimer = undefined;
		if (props.disabled || selected.value[0] !== value) return;
		emit('submit', { values: [value] });
	}, SINGLE_CHOICE_SUBMIT_DELAY_MS);
}

function clearSingleChoiceSubmitTimer() {
	if (singleChoiceSubmitTimer === undefined) return;
	window.clearTimeout(singleChoiceSubmitTimer);
	singleChoiceSubmitTimer = undefined;
}

function toggleMultiple(value: string, checked: boolean) {
	if (props.disabled) return;
	const idx = selected.value.indexOf(value);
	if (checked && idx < 0) {
		selected.value.push(value);
	} else if (!checked && idx >= 0) {
		selected.value.splice(idx, 1);
	}
}

function onSubmit() {
	if (selected.value.length === 0 || props.disabled) return;
	emit('submit', { values: [...selected.value] });
}

onBeforeUnmount(clearSingleChoiceSubmitTimer);
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="ask-question-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.question">{{ question }}</N8nText>

			<!-- Resolved state: show selected labels instead of interactive buttons -->
			<div v-if="disabled && resolvedValue" :class="$style.resolved">
				<N8nIcon icon="circle-check" size="small" color="success" />
				<N8nText size="small">{{ resolvedLabels.join(', ') }}</N8nText>
			</div>

			<!-- Live state: interactive option buttons -->
			<template v-else>
				<div :class="$style.options">
					<template v-if="!allowMultiple">
						<button
							v-for="(opt, index) in options"
							:key="opt.value"
							:class="[
								$style.option,
								selected.includes(opt.value) && $style.activeSelected,
								disabled && $style.optionDisabled,
							]"
							:disabled="disabled"
							:aria-pressed="selected.includes(opt.value)"
							data-testid="ask-question-option"
							@click="selectSingle(opt.value)"
						>
							<span :class="$style.numberBadge">{{ index + 1 }}</span>
							<div :class="$style.optionContent">
								<div :class="$style.optionLabel">{{ opt.label }}</div>
								<div v-if="opt.description" :class="$style.optionDescription">
									{{ opt.description }}
								</div>
							</div>
						</button>
					</template>

					<template v-else>
						<label
							v-for="opt in options"
							:key="opt.value"
							:class="$style.checkboxRow"
							data-testid="ask-question-option"
						>
							<N8nCheckbox
								:model-value="selected.includes(opt.value)"
								:disabled="disabled"
								data-testid="ask-question-checkbox"
								@update:model-value="(checked: boolean) => toggleMultiple(opt.value, checked)"
							/>
							<div :class="$style.optionContent">
								<div :class="$style.optionLabel">{{ opt.label }}</div>
								<div v-if="opt.description" :class="$style.optionDescription">
									{{ opt.description }}
								</div>
							</div>
						</label>
					</template>
				</div>

				<div v-if="allowMultiple" :class="$style.actions">
					<N8nButton
						:disabled="selected.length === 0 || disabled"
						size="medium"
						data-testid="ask-question-submit"
						@click="onSubmit"
					>
						Submit
					</N8nButton>
				</div>
			</template>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
@use '../../../ai/shared/styles/question-option-rows' as questionOptions;

.card {
	--card--padding: var(--spacing--sm);

	gap: var(--spacing--xs);
	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.question {
	margin: 0;
	font-size: var(--font-size--sm);
}

.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}

.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.option {
	@include questionOptions.option-button-row;
	@include questionOptions.active-selected;
}

.checkboxRow {
	@include questionOptions.checkbox-row;
}

.optionDisabled {
	cursor: default;
}

.optionLabel {
	@include questionOptions.option-label;
}

.optionContent {
	min-width: 0;
}

.numberBadge {
	@include questionOptions.number-badge;
}

.optionDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-top: var(--spacing--5xs);
}

.activeSelected {
	.optionDescription {
		color: var(--color--neutral-white);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	padding-top: var(--spacing--2xs);
}
</style>
