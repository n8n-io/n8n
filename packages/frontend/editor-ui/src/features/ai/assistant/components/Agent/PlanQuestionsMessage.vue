<script setup lang="ts">
/**
 * PlanQuestionsMessage.vue
 *
 * Multi-step Q&A wizard for Plan Mode. Renders questions with radio buttons,
 * checkboxes, or text inputs based on question type.
 */
import { ref, computed, watch } from 'vue';

import { N8nButton, N8nCheckbox, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElRadio } from 'element-plus';

import type { PlanMode } from '../../assistant.types';

const OTHER_SENTINEL = '__other__';

interface Props {
	questions: PlanMode.PlannerQuestion[];
	introMessage?: string;
	disabled?: boolean;
	answered?: boolean;
}

const props = defineProps<Props>();
const i18n = useI18n();

const emit = defineEmits<{
	submit: [answers: PlanMode.QuestionResponse[]];
}>();

const currentIndex = ref(0);
const isSubmitted = ref(false);
const answers = ref<Map<string, PlanMode.QuestionResponse>>(new Map());

const currentQuestion = computed(() => props.questions[currentIndex.value]);
const isFirstQuestion = computed(() => currentIndex.value === 0);
const isLastQuestion = computed(() => currentIndex.value === props.questions.length - 1);

// Filter LLM-provided "Other" variants — we render our own "Other" option
const filteredOptions = computed(() => {
	return (currentQuestion.value.options ?? []).filter(
		(opt) => !opt.toLowerCase().trim().startsWith('other'),
	);
});

const currentAnswer = computed(() => {
	const q = currentQuestion.value;
	return q ? answers.value.get(q.id) : undefined;
});

const hasValidAnswer = computed(() => {
	const answer = currentAnswer.value;
	if (!answer) return false;
	if (answer.skipped) return true;

	const hasCustomText = !!answer.customText?.trim();
	const hasSelectedOptions = answer.selectedOptions.length > 0;

	if (currentQuestion.value?.type === 'text') return hasCustomText;
	if (answer.selectedOptions.includes(OTHER_SENTINEL)) return hasCustomText;
	return hasSelectedOptions || hasCustomText;
});

const nextButtonLabel = computed(() => {
	if (!hasValidAnswer.value) {
		return isLastQuestion.value
			? i18n.baseText('aiAssistant.builder.planMode.questions.skipAndSubmit')
			: i18n.baseText('aiAssistant.builder.planMode.questions.skip');
	}
	return isLastQuestion.value
		? i18n.baseText('aiAssistant.builder.planMode.questions.submitButton')
		: i18n.baseText('aiAssistant.builder.planMode.questions.next');
});

// Initialize answer for current question on mount and navigation
watch(
	currentIndex,
	() => {
		const q = currentQuestion.value;
		if (q && !answers.value.has(q.id)) {
			answers.value.set(q.id, {
				questionId: q.id,
				question: q.question,
				selectedOptions: [],
				customText: '',
				skipped: false,
			});
		}
	},
	{ immediate: true },
);

function onSingleSelect(option: string) {
	const answer = currentAnswer.value;
	if (!answer) return;
	answer.selectedOptions = [option];
	if (option !== OTHER_SENTINEL) {
		answer.customText = '';
	}
	answer.skipped = false;
}

function onMultiToggle(option: string, checked: boolean) {
	const answer = currentAnswer.value;
	if (!answer) return;
	const opts = answer.selectedOptions;
	if (checked && !opts.includes(option)) {
		opts.push(option);
	} else if (!checked) {
		const idx = opts.indexOf(option);
		if (idx > -1) opts.splice(idx, 1);
	}
	answer.skipped = false;
}

function onCustomTextChange(text: string) {
	const answer = currentAnswer.value;
	if (!answer) return;
	answer.customText = text;
	answer.skipped = false;
}

function goToPrevious() {
	if (!isFirstQuestion.value) {
		currentIndex.value--;
	}
}

function goToNext() {
	if (!hasValidAnswer.value) {
		const answer = currentAnswer.value;
		if (answer) answer.skipped = true;
	}

	if (isLastQuestion.value) {
		submitAnswers();
	} else {
		currentIndex.value++;
	}
}

function submitAnswers() {
	if (isSubmitted.value) return;
	isSubmitted.value = true;

	const allAnswers = props.questions.map((q) => {
		const answer = answers.value.get(q.id);
		if (!answer) {
			return {
				questionId: q.id,
				question: q.question,
				selectedOptions: [],
				customText: '',
				skipped: true,
			};
		}
		return {
			...answer,
			selectedOptions: answer.selectedOptions.filter((o) => o !== OTHER_SENTINEL),
		};
	});
	emit('submit', allAnswers);
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="plan-mode-questions-message">
		<N8nText v-if="introMessage" :class="$style.intro">
			{{ introMessage }}
		</N8nText>

		<div v-if="!answered && currentQuestion && currentAnswer" :class="$style.container">
			<div :class="$style.question">
				<N8nText tag="p" :bold="true" :class="$style.questionText">
					{{ currentQuestion.question }}
				</N8nText>

				<!-- Single choice (radio) -->
				<div v-if="currentQuestion.type === 'single'" :class="$style.options">
					<ElRadio
						v-for="option in filteredOptions"
						:key="option"
						:model-value="currentAnswer.selectedOptions[0]"
						:label="option"
						:disabled="disabled"
						@update:model-value="() => onSingleSelect(option)"
					>
						{{ option }}
					</ElRadio>
				</div>

				<!-- Multi choice (checkbox) -->
				<div v-else-if="currentQuestion.type === 'multi'" :class="$style.options">
					<label
						v-for="option in filteredOptions"
						:key="option"
						:class="[
							$style.checkboxOption,
							{ [$style.selected]: currentAnswer.selectedOptions.includes(option) },
						]"
					>
						<N8nCheckbox
							:model-value="currentAnswer.selectedOptions.includes(option)"
							:disabled="disabled"
							@update:model-value="(checked: boolean) => onMultiToggle(option, checked)"
						/>
						<span :class="$style.optionLabel">{{ option }}</span>
					</label>
				</div>

				<!-- Text input -->
				<N8nInput
					v-else-if="currentQuestion.type === 'text'"
					:model-value="currentAnswer.customText"
					type="textarea"
					:rows="3"
					:disabled="disabled"
					:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.customPlaceholder')"
					@update:model-value="onCustomTextChange"
				/>

				<!-- "Other" option — single choice -->
				<div v-if="currentQuestion.type === 'single'" :class="$style.otherOption">
					<ElRadio
						:model-value="currentAnswer.selectedOptions[0]"
						:label="OTHER_SENTINEL"
						:disabled="disabled"
						@update:model-value="() => onSingleSelect(OTHER_SENTINEL)"
					>
						<N8nInput
							:model-value="currentAnswer.customText"
							:disabled="disabled"
							:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.other')"
							size="small"
							:class="$style.otherInput"
							@update:model-value="onCustomTextChange"
							@focus="() => onSingleSelect(OTHER_SENTINEL)"
						/>
					</ElRadio>
				</div>

				<!-- "Other" option — multi choice -->
				<div v-else-if="currentQuestion.type === 'multi'" :class="$style.otherOption">
					<N8nCheckbox
						:model-value="!!currentAnswer.customText?.trim()"
						:disabled="disabled"
						@update:model-value="
							(checked: boolean) => {
								if (!checked) onCustomTextChange('');
							}
						"
					/>
					<N8nInput
						:model-value="currentAnswer.customText"
						:disabled="disabled"
						:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.other')"
						size="small"
						:class="$style.otherInput"
						@update:model-value="onCustomTextChange"
					/>
				</div>
			</div>

			<!-- Footer -->
			<div :class="$style.footer">
				<div :class="$style.progress">
					<div
						v-for="(_, i) in questions"
						:key="i"
						:class="[$style.progressDot, { [$style.active]: i <= currentIndex }]"
					/>
				</div>

				<div :class="$style.navigation">
					<N8nButton
						v-if="!isFirstQuestion"
						variant="subtle"
						size="small"
						:disabled="disabled"
						@click="goToPrevious"
					>
						{{ i18n.baseText('aiAssistant.builder.planMode.questions.back') }}
					</N8nButton>
					<div v-else />

					<N8nButton
						:type="isLastQuestion && hasValidAnswer ? 'primary' : 'secondary'"
						size="small"
						:disabled="disabled || isSubmitted"
						data-test-id="plan-mode-questions-next"
						@click="goToNext"
					>
						{{ nextButtonLabel }}
					</N8nButton>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.intro {
	line-height: var(--line-height--xl);
}

.container {
	border: var(--border);
	border-radius: var(--radius);
}

.question {
	padding: var(--spacing--sm) var(--spacing--xs);
}

.questionText {
	margin-bottom: var(--spacing--xs);
}

.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);

	:global(.el-radio) {
		display: flex;
		align-items: center;
		white-space: normal;
		margin-right: 0;
		height: auto;
	}

	:global(.el-radio__label) {
		white-space: normal;
		line-height: var(--line-height--xl);
	}
}

.checkboxOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	padding: var(--spacing--3xs) 0;
	border-radius: var(--radius);
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	&.selected {
		background-color: var(--color--foreground--tint-2);
	}
}

.optionLabel {
	color: var(--color--text);
	font-size: var(--font-size--sm);
}

.otherOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;

	:global(.el-radio) {
		display: flex;
		align-items: center;
		white-space: normal;
		margin-right: 0;
		height: auto;
		width: 100%;
	}

	:global(.el-radio__label) {
		flex: 1;
	}
}

.otherInput {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: var(--border);
	padding: var(--spacing--xs);
}

.progress {
	display: flex;
	gap: var(--spacing--3xs);
}

.progressDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--foreground--tint-1);
	transition: background-color 0.2s ease;

	&.active {
		background-color: var(--color--text);
	}
}

.navigation {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
