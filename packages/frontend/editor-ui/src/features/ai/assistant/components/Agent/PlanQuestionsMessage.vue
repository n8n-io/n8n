<script setup lang="ts">
/**
 * PlanQuestionsMessage.vue
 *
 * Multi-step Q&A wizard for Plan Mode. Renders questions with radio buttons,
 * checkboxes, or text inputs based on question type.
 */
import { ref, computed } from 'vue';
import { N8nButton, N8nCheckbox, N8nInput, N8nText } from '@n8n/design-system';
import type { PlanMode } from '../../assistant.types';

interface Props {
	questions: PlanMode.PlannerQuestion[];
	introMessage?: string;
	disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	submit: [answers: PlanMode.QuestionResponse[]];
}>();

// Current question index (0-based)
const currentIndex = ref(0);

// Store answers for each question
const answers = ref<Map<string, PlanMode.QuestionResponse>>(new Map());

const currentQuestion = computed(() => props.questions[currentIndex.value]);
const isFirstQuestion = computed(() => currentIndex.value === 0);
const isLastQuestion = computed(() => currentIndex.value === props.questions.length - 1);
const totalQuestions = computed(() => props.questions.length);

// Get or initialize answer for current question
const currentAnswer = computed(() => {
	const q = currentQuestion.value;
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
});

// Check if current question has a valid answer
const hasValidAnswer = computed(() => {
	const answer = currentAnswer.value;
	if (answer.skipped) return true;
	if (currentQuestion.value.type === 'text') {
		return !!answer.customText?.trim();
	}
	return answer.selectedOptions.length > 0 || !!answer.customText?.trim();
});

function onSingleSelect(option: string) {
	currentAnswer.value.selectedOptions = [option];
	currentAnswer.value.skipped = false;
}

function onMultiSelect(option: string, checked: boolean) {
	const options = currentAnswer.value.selectedOptions;
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
	currentAnswer.value.skipped = false;
}

function onCustomTextChange(text: string) {
	currentAnswer.value.customText = text;
	currentAnswer.value.skipped = false;
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

function submitAnswers() {
	const allAnswers = props.questions.map((q) => {
		const answer = answers.value.get(q.id);
		return (
			answer ?? {
				questionId: q.id,
				question: q.question,
				selectedOptions: [],
				customText: '',
				skipped: true,
			}
		);
	});
	emit('submit', allAnswers);
}
</script>

<template>
	<div :class="$style.wrapper">
		<!-- Intro message (outside the card) -->
		<N8nText v-if="introMessage && currentIndex === 0" :class="$style.intro">
			{{ introMessage }}
		</N8nText>

		<div :class="$style.container">
			<!-- Question -->
			<div :class="$style.question">
				<N8nText tag="p" :bold="true" :class="$style.questionText">
					{{ currentQuestion.question }}
				</N8nText>

				<!-- Single choice (radio-like using checkboxes with exclusive selection) -->
				<div v-if="currentQuestion.type === 'single'" :class="$style.options">
					<label
						v-for="option in currentQuestion.options"
						:key="option"
						:class="[
							$style.radioOption,
							{ [$style.selected]: currentAnswer.selectedOptions.includes(option) },
						]"
					>
						<input
							type="radio"
							:name="`question-${currentQuestion.id}`"
							:checked="currentAnswer.selectedOptions.includes(option)"
							:disabled="disabled"
							:class="$style.radioInput"
							@change="() => onSingleSelect(option)"
						/>
						<span :class="$style.optionLabel">{{ option }}</span>
					</label>
				</div>

				<!-- Multi choice (checkbox) -->
				<div v-else-if="currentQuestion.type === 'multi'" :class="$style.options">
					<label
						v-for="option in currentQuestion.options"
						:key="option"
						:class="$style.checkboxOption"
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
						placeholder="Enter your answer..."
						@update:model-value="onCustomTextChange"
					/>
				</div>

				<!-- "Other" option for single/multi - inline with input -->
				<div
					v-if="currentQuestion.type !== 'text' && currentQuestion.allowCustom !== false"
					:class="$style.otherOption"
				>
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
						placeholder="Other"
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
						Back
					</N8nButton>
					<div v-else />

					<N8nButton
						type="primary"
						size="small"
						:disabled="disabled || !hasValidAnswer"
						@click="goToNext"
					>
						{{ isLastQuestion ? 'Submit' : 'Next' }}
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
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
}

.question {
	margin-bottom: var(--spacing--sm);
}

.questionText {
	margin-bottom: var(--spacing--xs);
}

.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.radioOption,
.checkboxOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	&.selected {
		background-color: var(--color--foreground--tint-2);
	}
}

.radioInput {
	width: 16px;
	height: 16px;
	accent-color: var(--color--primary);
	cursor: pointer;
	margin: 0;
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
	padding: var(--spacing--3xs) var(--spacing--2xs);
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
	margin-top: var(--spacing--xs);
}

.progress {
	display: flex;
	gap: var(--spacing--3xs);
}

.progressDot {
	width: 8px;
	height: 8px;
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
