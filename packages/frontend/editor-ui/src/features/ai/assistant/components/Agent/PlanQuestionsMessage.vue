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

interface Props {
	questions: PlanMode.PlannerQuestion[];
	introMessage?: string;
	disabled?: boolean;
}

const props = defineProps<Props>();
const i18n = useI18n();

const emit = defineEmits<{
	submit: [answers: PlanMode.QuestionResponse[]];
}>();

// Current question index (0-based)
const currentIndex = ref(0);

// Prevent double-submit
const isSubmitted = ref(false);

// Store answers for each question
const answers = ref<Map<string, PlanMode.QuestionResponse>>(new Map());

const currentQuestion = computed(() => props.questions[currentIndex.value]);
const isFirstQuestion = computed(() => currentIndex.value === 0);
const isLastQuestion = computed(() => currentIndex.value === props.questions.length - 1);

// Filter out "Other" variants from LLM-provided options since we render our own "Other" option.
// Catches "Other", "Other source", "Other service", etc.
const filteredOptions = computed(() => {
	const options = currentQuestion.value.options ?? [];
	return options.filter((opt) => !opt.toLowerCase().trim().startsWith('other'));
});

// Eagerly initialize answer for the current question when the index changes
function ensureAnswer(q: PlanMode.PlannerQuestion): PlanMode.QuestionResponse {
	if (!answers.value.has(q.id)) {
		answers.value.set(q.id, {
			questionId: q.id,
			question: q.question,
			selectedOptions: [],
			customText: '',
			skipped: false,
		});
	}
	return answers.value.get(q.id)!;
}

// Initialize first question's answer immediately (guard against empty questions)
if (currentQuestion.value) {
	ensureAnswer(currentQuestion.value);
}

// Initialize answer when navigating to a new question
watch(currentIndex, () => {
	if (currentQuestion.value) {
		ensureAnswer(currentQuestion.value);
	}
});

const currentAnswer = computed(() => {
	const q = currentQuestion.value;
	if (!q) return undefined;
	return answers.value.get(q.id);
});

function getCurrentAnswer(): PlanMode.QuestionResponse | undefined {
	const q = currentQuestion.value;
	if (!q) return undefined;
	return answers.value.get(q.id);
}

// Check if current question has a valid answer
const hasValidAnswer = computed(() => {
	const answer = currentAnswer.value;
	if (!answer) return false;
	if (answer.skipped) return true;
	if (currentQuestion.value?.type === 'text') {
		return !!answer.customText?.trim();
	}
	// If "Other" radio is selected, require custom text
	if (answer.selectedOptions.includes('__other__')) {
		return !!answer.customText?.trim();
	}
	return answer.selectedOptions.length > 0 || !!answer.customText?.trim();
});

function onSingleSelect(option: string) {
	const answer = getCurrentAnswer();
	if (!answer) return;
	answer.selectedOptions = [option];
	// Clear custom text when selecting a regular option (not "Other")
	if (option !== '__other__') {
		answer.customText = '';
	}
	answer.skipped = false;
}

function onMultiSelect(option: string, checked: boolean) {
	const answer = getCurrentAnswer();
	if (!answer) return;
	const options = answer.selectedOptions;
	if (checked) {
		if (!options.includes(option)) {
			options.push(option);
		}
	} else {
		const idx = options.indexOf(option);
		if (idx > -1) {
			options.splice(idx, 1);
		}
	}
	answer.skipped = false;
}

function onCustomTextChange(text: string) {
	const answer = getCurrentAnswer();
	if (!answer) return;
	answer.customText = text;
	answer.skipped = false;
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
		// Replace __other__ sentinel with the custom text value
		return {
			...answer,
			selectedOptions: answer.selectedOptions.filter((o) => o !== '__other__'),
		};
	});
	emit('submit', allAnswers);
}

function goToPrevious() {
	if (!isFirstQuestion.value) {
		currentIndex.value--;
	}
}

function goToNext() {
	if (isLastQuestion.value) {
		submitAnswers();
	} else {
		currentIndex.value++;
	}
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="plan-mode-questions-message">
		<!-- Intro message (outside the card) -->
		<N8nText v-if="introMessage" :class="$style.intro">
			{{ introMessage }}
		</N8nText>

		<div v-if="currentQuestion && currentAnswer" :class="$style.container">
			<!-- Question -->
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
							@update:model-value="(checked: boolean) => onMultiSelect(option, checked)"
						/>
						<span :class="$style.optionLabel">{{ option }}</span>
					</label>
				</div>

				<!-- Text input -->
				<div v-else-if="currentQuestion.type === 'text'" :class="$style.textInput">
					<N8nInput
						:model-value="currentAnswer.customText"
						type="textarea"
						:rows="3"
						:disabled="disabled"
						:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.customPlaceholder')"
						@update:model-value="onCustomTextChange"
					/>
				</div>

				<!-- "Other" option for single/multi — always shown, matches question type -->
				<div v-if="currentQuestion.type === 'single'" :class="$style.otherOption">
					<ElRadio
						:model-value="currentAnswer.selectedOptions[0]"
						label="__other__"
						:disabled="disabled"
						@update:model-value="() => onSingleSelect('__other__')"
					>
						<N8nInput
							:model-value="currentAnswer.customText"
							:disabled="disabled"
							:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.other')"
							size="small"
							:class="$style.otherInput"
							@update:model-value="onCustomTextChange"
							@focus="() => onSingleSelect('__other__')"
						/>
					</ElRadio>
				</div>

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

			<!-- Footer: Progress + Buttons -->
			<div :class="$style.footer">
				<!-- Progress dots -->
				<div :class="$style.progress">
					<div
						v-for="(_, i) in questions"
						:key="i"
						:class="[$style.progressDot, { [$style.active]: i <= currentIndex }]"
					/>
				</div>

				<!-- Navigation buttons -->
				<div :class="$style.navigation">
					<N8nButton
						v-if="!isFirstQuestion"
						type="secondary"
						size="small"
						:disabled="disabled"
						@click="goToPrevious"
					>
						{{ i18n.baseText('aiAssistant.builder.planMode.questions.back') }}
					</N8nButton>
					<div v-else />

					<N8nButton
						type="secondary"
						size="small"
						:disabled="disabled || !hasValidAnswer || isSubmitted"
						data-test-id="plan-mode-questions-next"
						@click="goToNext"
					>
						{{
							isLastQuestion
								? i18n.baseText('aiAssistant.builder.planMode.questions.submitButton')
								: i18n.baseText('aiAssistant.builder.planMode.questions.next')
						}}
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
	color: var(--color--text);
	line-height: var(--line-height--xl);
}

.container {
	border: var(--border);
	border-radius: var(--radius--s);
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

	// Override ElRadio defaults: display block, allow text wrapping, remove inline margin
	:global(.el-radio) {
		display: flex;
		align-items: flex-start;
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

.textInput {
	margin-top: var(--spacing--2xs);
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
	}
}

.otherInput {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--xs);
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
