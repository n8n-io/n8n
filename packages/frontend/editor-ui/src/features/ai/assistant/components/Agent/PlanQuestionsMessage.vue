<script setup lang="ts">
/**
 * PlanQuestionsMessage.vue
 *
 * Multi-step Q&A wizard for Plan Mode. Renders questions with number badge rows
 * (single-select), checkboxes (multi-select), or text inputs based on question type.
 * Supports full keyboard navigation.
 */
import { ref, computed, watch, nextTick } from 'vue';

import { N8nButton, N8nCheckbox, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

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
	telemetry: [event: string, properties: Record<string, unknown>];
}>();

const currentIndex = ref(0);
const isSubmitted = ref(false);
const answers = ref<Map<string, PlanMode.QuestionResponse>>(new Map());
const highlightedIndex = ref(-1);
const selectedIndex = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const currentQuestion = computed(() => props.questions[currentIndex.value]);
const isFirstQuestion = computed(() => currentIndex.value === 0);
const isLastQuestion = computed(() => currentIndex.value === props.questions.length - 1);

// Filter LLM-provided "Other" variants — we render our own "Something else" option
const filteredOptions = computed(() => {
	return (currentQuestion.value.options ?? []).filter(
		(opt) => !opt.toLowerCase().trim().startsWith('other'),
	);
});

const currentAnswer = computed(() => {
	const q = currentQuestion.value;
	return q ? answers.value.get(q.id) : undefined;
});

const hasCustomText = computed(() => !!currentAnswer.value?.customText?.trim());

const hasValidAnswer = computed(() => {
	const answer = currentAnswer.value;
	if (!answer) return false;
	if (answer.skipped) return true;

	const customText = !!answer.customText?.trim();
	const hasSelectedOptions = answer.selectedOptions.length > 0;

	if (currentQuestion.value?.type === 'text') return customText;
	if (answer.selectedOptions.includes(OTHER_SENTINEL)) return customText;
	return hasSelectedOptions || customText;
});

// Button visibility logic per question type
const showSkipButton = computed(() => {
	if (isLastQuestion.value) return false;
	if (currentQuestion.value?.type === 'single' && hasCustomText.value) return false;
	return true;
});

const showNextButton = computed(() => {
	if (currentQuestion.value?.type === 'single') return hasCustomText.value;
	return true;
});

const isNextEnabled = computed(() => {
	const q = currentQuestion.value;
	if (!q) return false;
	if (q.type === 'single') return hasCustomText.value;
	if (q.type === 'multi') {
		const answer = currentAnswer.value;
		return (answer?.selectedOptions.length ?? 0) > 0 || hasCustomText.value;
	}
	if (q.type === 'text') return hasCustomText.value;
	return false;
});

const nextButtonLabel = computed(() => {
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
		// Reset selection state and highlight first option
		selectedIndex.value = null;
		highlightedIndex.value = currentQuestion.value?.type === 'text' ? -1 : 0;

		// Auto-focus the container so keyboard navigation works right away
		void nextTick(() => {
			if (currentQuestion.value?.type === 'text') {
				const textarea = containerRef.value?.querySelector('textarea');
				if (textarea) {
					textarea.focus();
				} else {
					// Textarea may not be in DOM yet due to fade transition — retry
					requestAnimationFrame(() => {
						containerRef.value?.querySelector('textarea')?.focus();
					});
				}
			} else {
				containerRef.value?.focus();
			}
		});
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

function onSingleSelectAndAdvance(
	option: string,
	inputMethod: 'click' | 'keyboard_number' | 'keyboard_enter' = 'click',
) {
	onSingleSelect(option);
	const idx = filteredOptions.value.indexOf(option);
	selectedIndex.value = idx >= 0 ? idx : null;
	emitQuestionTelemetry('qa_question_answered', inputMethod);

	// Brief delay so the user sees the active selection before advancing
	setTimeout(() => {
		selectedIndex.value = null;
		goToNextInternal();
	}, 250);
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

	// For multi-select: auto-toggle the OTHER_SENTINEL checkbox
	if (currentQuestion.value?.type === 'multi') {
		if (text.trim()) {
			if (!answer.selectedOptions.includes(OTHER_SENTINEL)) {
				answer.selectedOptions.push(OTHER_SENTINEL);
			}
		} else {
			const idx = answer.selectedOptions.indexOf(OTHER_SENTINEL);
			if (idx > -1) answer.selectedOptions.splice(idx, 1);
		}
	}

	// For single-select: auto-select OTHER_SENTINEL when typing
	if (currentQuestion.value?.type === 'single') {
		if (text.trim()) {
			answer.selectedOptions = [OTHER_SENTINEL];
		} else {
			answer.selectedOptions = [];
		}
	}
}

function goToPrevious() {
	if (!isFirstQuestion.value) {
		currentIndex.value--;
	}
}

function goToNextInternal() {
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

function goToNext() {
	if (!hasValidAnswer.value) {
		emitQuestionTelemetry('qa_question_skipped', 'click');
	} else {
		emitQuestionTelemetry('qa_question_answered', 'click');
	}
	goToNextInternal();
}

function skipQuestion() {
	const answer = currentAnswer.value;
	if (answer) answer.skipped = true;
	emitQuestionTelemetry('qa_question_skipped', 'click');
	goToNextInternal();
}

function goToNextWithoutAnswer() {
	// Forward chevron navigation — skip without answering
	const answer = currentAnswer.value;
	if (answer && !hasValidAnswer.value) {
		answer.skipped = true;
	}
	if (!isLastQuestion.value) {
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
	emit('telemetry', 'qa_answers_submitted', {
		total_questions: props.questions.length,
	});
}

function emitQuestionTelemetry(event: string, inputMethod: string) {
	emit('telemetry', event, {
		question_type: currentQuestion.value?.type,
		question_index: currentIndex.value,
		total_questions: props.questions.length,
		input_method: inputMethod,
		custom_answer_used: hasCustomText.value,
	});
}

// Keyboard navigation — input-focused handlers

function handleInputEnter(event: KeyboardEvent, type: string) {
	if (event.key !== 'Enter' || event.shiftKey) return false;
	if (type === 'multi' && !event.metaKey && !event.ctrlKey) return true; // consumed but no action
	event.preventDefault();
	if (hasCustomText.value || isNextEnabled.value) {
		emitQuestionTelemetry('qa_question_answered', 'keyboard_enter');
		goToNextInternal();
	}
	return true;
}

function handleInputArrow(event: KeyboardEvent) {
	if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;
	event.preventDefault();
	containerRef.value?.focus();
	if (event.key === 'ArrowUp') {
		highlightedIndex.value = Math.max(0, highlightedIndex.value - 1);
	}
	return true;
}

// Keyboard navigation — container handlers

function handleArrowNavigation(event: KeyboardEvent, type: string, optionCount: number) {
	if (event.key === 'ArrowUp') {
		event.preventDefault();
		highlightedIndex.value = Math.max(0, highlightedIndex.value - 1);
		scrollHighlightedIntoView();
		return true;
	}
	if (event.key === 'ArrowDown') {
		event.preventDefault();
		const maxIdx = type === 'text' ? 0 : optionCount;
		highlightedIndex.value = Math.min(maxIdx, highlightedIndex.value + 1);
		scrollHighlightedIntoView();
		return true;
	}
	return false;
}

function handleEnterKey(event: KeyboardEvent, type: string, optionCount: number) {
	if (event.key !== 'Enter') return false;
	event.preventDefault();

	if (type === 'single') {
		if (highlightedIndex.value >= 0 && highlightedIndex.value < optionCount) {
			onSingleSelectAndAdvance(filteredOptions.value[highlightedIndex.value], 'keyboard_enter');
		}
	} else if (type === 'multi') {
		if (event.metaKey || event.ctrlKey) {
			if (isNextEnabled.value) {
				emitQuestionTelemetry('qa_question_answered', 'keyboard_enter');
				goToNextInternal();
			}
		} else if (highlightedIndex.value >= 0 && highlightedIndex.value < optionCount) {
			const option = filteredOptions.value[highlightedIndex.value];
			const answer = currentAnswer.value;
			if (answer) {
				onMultiToggle(option, !answer.selectedOptions.includes(option));
			}
		}
	} else if (type === 'text' && hasCustomText.value) {
		emitQuestionTelemetry('qa_question_answered', 'keyboard_enter');
		goToNextInternal();
	}
	return true;
}

function handleNumberShortcut(event: KeyboardEvent, type: string, optionCount: number) {
	if (type !== 'single') return false;
	const num = parseInt(event.key, 10);
	if (num >= 1 && num <= optionCount) {
		event.preventDefault();
		onSingleSelectAndAdvance(filteredOptions.value[num - 1], 'keyboard_number');
		return true;
	}
	return false;
}

function onKeydown(event: KeyboardEvent) {
	const q = currentQuestion.value;
	if (!q || props.disabled) return;

	const target = event.target as HTMLElement;
	const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

	if (isInputFocused) {
		handleInputEnter(event, q.type) || handleInputArrow(event);
		return;
	}

	const optionCount = filteredOptions.value.length;
	handleArrowNavigation(event, q.type, optionCount) ||
		handleEnterKey(event, q.type, optionCount) ||
		handleNumberShortcut(event, q.type, optionCount);
}

function scrollHighlightedIntoView() {
	void nextTick(() => {
		const el = containerRef.value?.querySelector(`[data-option-index="${highlightedIndex.value}"]`);
		el?.scrollIntoView({ block: 'nearest' });

		// Auto-focus the "Something else" input when highlighted
		const isSomethingElse = highlightedIndex.value === filteredOptions.value.length;
		if (isSomethingElse) {
			const input = el?.querySelector('input');
			input?.focus();
		}
	});
}

function onOptionMouseEnter(idx: number) {
	highlightedIndex.value = idx;
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="plan-mode-questions-message">
		<N8nText v-if="introMessage" :class="$style.intro">
			{{ introMessage }}
		</N8nText>

		<div
			v-if="!answered && currentQuestion && currentAnswer"
			ref="containerRef"
			:class="$style.container"
			tabindex="0"
			@keydown="onKeydown"
		>
			<Transition :name="$style.questionFade" mode="out-in">
				<div :key="currentQuestion.id" :class="$style.question">
					<N8nText tag="p" :bold="true" :class="$style.questionText">
						{{ currentQuestion.question }}
					</N8nText>

					<!-- Single choice (number badge rows) -->
					<div v-if="currentQuestion.type === 'single'" :class="$style.options">
						<button
							v-for="(option, idx) in filteredOptions"
							:key="option"
							:class="[
								$style.optionRow,
								{ [$style.highlighted]: highlightedIndex === idx },
								{
									[$style.activeSelected]: selectedIndex === idx,
								},
							]"
							:data-option-index="idx"
							:disabled="disabled"
							type="button"
							tabindex="-1"
							@click="onSingleSelectAndAdvance(option)"
							@mouseenter="onOptionMouseEnter(idx)"
						>
							<span :class="$style.numberBadge">{{ idx + 1 }}</span>
							<span :class="$style.optionLabel">{{ option }}</span>
							<N8nIcon :class="$style.arrowIndicator" icon="arrow-right" :size="16" />
						</button>

						<!-- "Something else" row for single-select -->
						<div
							:class="[
								$style.somethingElseRow,
								{ [$style.highlighted]: highlightedIndex === filteredOptions.length },
							]"
							:data-option-index="filteredOptions.length"
							@mouseenter="onOptionMouseEnter(filteredOptions.length)"
						>
							<div :class="$style.pencilIconContainer">
								<N8nIcon :class="$style.pencilIcon" icon="pen" size="medium" />
							</div>
							<N8nInput
								:model-value="currentAnswer.customText"
								:disabled="disabled"
								:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.somethingElse')"
								size="small"
								:class="$style.somethingElseInput"
								data-test-id="plan-mode-something-else-input"
								@update:model-value="onCustomTextChange"
							/>
						</div>
					</div>

					<!-- Multi choice (checkbox rows) -->
					<div v-else-if="currentQuestion.type === 'multi'" :class="$style.options">
						<label
							v-for="(option, idx) in filteredOptions"
							:key="option"
							:class="[
								$style.checkboxRow,
								{ [$style.highlighted]: highlightedIndex === idx },
								{ [$style.selected]: currentAnswer.selectedOptions.includes(option) },
							]"
							:data-option-index="idx"
							@mouseenter="onOptionMouseEnter(idx)"
						>
							<N8nCheckbox
								:model-value="currentAnswer.selectedOptions.includes(option)"
								:disabled="disabled"
								@update:model-value="(checked: boolean) => onMultiToggle(option, checked)"
							/>
							<span :class="$style.optionLabel">{{ option }}</span>
						</label>

						<!-- "Something else" row for multi-select -->
						<div
							:class="[
								$style.somethingElseRowMulti,
								{ [$style.highlighted]: highlightedIndex === filteredOptions.length },
							]"
							:data-option-index="filteredOptions.length"
							@mouseenter="onOptionMouseEnter(filteredOptions.length)"
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
								:placeholder="i18n.baseText('aiAssistant.builder.planMode.questions.somethingElse')"
								size="small"
								:class="$style.somethingElseInput"
								data-test-id="plan-mode-something-else-input"
								@update:model-value="onCustomTextChange"
							/>
						</div>
					</div>

					<!-- Text input -->
					<N8nInput
						v-else-if="currentQuestion.type === 'text'"
						:class="$style.textareaInput"
						:model-value="currentAnswer.customText"
						type="textarea"
						:rows="3"
						:disabled="disabled"
						:placeholder="
							i18n.baseText('aiAssistant.builder.planMode.questions.clarifyPlaceholder')
						"
						@update:model-value="onCustomTextChange"
					/>
				</div>
			</Transition>

			<!-- Footer -->
			<div :class="$style.footer">
				<div :class="$style.pagination">
					<N8nButton
						variant="ghost"
						size="xsmall"
						icon-only
						:disabled="isFirstQuestion"
						data-test-id="plan-mode-pagination-back"
						aria-label="Previous question"
						@click="goToPrevious"
					>
						<N8nIcon icon="chevron-left" size="xsmall" />
					</N8nButton>
					<N8nText :class="$style.paginationText" size="small">
						{{ currentIndex + 1 }}
						{{ i18n.baseText('aiAssistant.builder.planMode.questions.paginationOf') }}
						{{ questions.length }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="xsmall"
						icon-only
						:disabled="isLastQuestion"
						data-test-id="plan-mode-pagination-forward"
						aria-label="Next question"
						@click="goToNextWithoutAnswer"
					>
						<N8nIcon icon="chevron-right" size="xsmall" />
					</N8nButton>
				</div>

				<div :class="$style.navigation">
					<N8nButton
						v-if="showSkipButton"
						variant="outline"
						size="small"
						:disabled="disabled"
						data-test-id="plan-mode-questions-skip"
						@click="skipQuestion"
					>
						{{ i18n.baseText('aiAssistant.builder.planMode.questions.skip') }}
					</N8nButton>

					<N8nButton
						v-if="showNextButton"
						:type="isNextEnabled ? 'primary' : 'secondary'"
						size="small"
						:disabled="disabled || isSubmitted || !isNextEnabled"
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
	outline: none;
	border: var(--border);
	border-radius: var(--radius--lg);
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
}

.optionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--lg);
	background: none;
	cursor: pointer;
	transition: background-color 0.15s ease;
	text-align: left;

	&:hover,
	&.highlighted {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-800));
	}

	&:hover .arrowIndicator,
	&.highlighted .arrowIndicator {
		opacity: 1;
	}

	&.activeSelected {
		background-color: var(--color--primary);

		.numberBadge {
			background-color: var(--color--orange-400);
			color: white;
		}

		.optionLabel {
			color: white;
		}

		.arrowIndicator {
			opacity: 1;
			color: white;
		}
	}

	&:disabled {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.numberBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.arrowIndicator {
	margin-left: auto;
	opacity: 0;
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	transition: opacity 0.15s ease;
}

.optionLabel {
	color: var(--color--text);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--xl);
}

.checkboxRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	transition: background-color 0.15s ease;

	&:hover,
	&.highlighted {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-800));
	}
}

.somethingElseRow {
	display: flex;
	align-items: center;
	justify-items: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	transition: background-color 0.15s ease;
	outline: none;
	border: 0;

	&:hover,
	&.highlighted {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-800));
	}

	.somethingElseInput {
		> * {
			box-shadow: none;
			outline: none;
			background-color: transparent;
		}
		input {
			font-size: var(--font-size--sm);

			&::placeholder {
				color: var(--color--text);
			}
		}
	}
}

.somethingElseRowMulti {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	transition: background-color 0.15s ease;
	outline: none;
	border: 0;

	&:hover,
	&.highlighted {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-800));
	}
}

.pencilIconContainer {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--lg);
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-1);
}

.pencilIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.pagination {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.paginationText {
	color: var(--color--text--tint-1);
	user-select: none;
}

.navigation {
	display: flex;
	gap: var(--spacing--2xs);
	min-height: 28px;
}

.textareaInput {
	textarea {
		height: 5lh;
		resize: none;
		overflow-y: auto;
	}
}

/* Question fade transition */
.questionFade-enter-active,
.questionFade-leave-active {
	transition: opacity 0.15s ease;
}

.questionFade-enter-from,
.questionFade-leave-to {
	opacity: 0;
}
</style>
