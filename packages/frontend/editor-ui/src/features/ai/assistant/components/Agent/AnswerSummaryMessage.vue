<script setup lang="ts">
/**
 * AnswerSummaryMessage.vue
 *
 * Displays a summary of user's answers to the clarifying questions.
 * Skipped questions are omitted from the display.
 */
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import type { PlanMode } from '../../assistant.types';

interface Props {
	answers: PlanMode.QuestionResponse[];
}

const props = defineProps<Props>();

// Filter out skipped questions
const displayedAnswers = computed(() => props.answers.filter((answer) => !answer.skipped));

function formatAnswer(answer: PlanMode.QuestionResponse): string {
	const parts: string[] = [];

	if (answer.selectedOptions.length > 0) {
		parts.push(answer.selectedOptions.join(', '));
	}

	if (answer.customText?.trim()) {
		parts.push(answer.customText.trim());
	}

	return parts.join(' - ') || 'No answer provided';
}
</script>

<template>
	<div v-if="displayedAnswers.length > 0" :class="$style.container">
		<N8nText tag="h4" :class="$style.title">Your Answers</N8nText>

		<div :class="$style.answersList">
			<div v-for="answer in displayedAnswers" :key="answer.questionId" :class="$style.answerItem">
				<N8nText size="small" color="text-light" :class="$style.question">
					{{ answer.question }}
				</N8nText>
				<N8nText :class="$style.answer">{{ formatAnswer(answer) }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin: var(--spacing--xs) 0;
}

.title {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--sm);
	margin-bottom: var(--spacing--xs);
}

.answersList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.answerItem {
	padding-bottom: var(--spacing--xs);
	border-bottom: 1px solid var(--color--foreground--tint-2);

	&:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}
}

.question {
	display: block;
	margin-bottom: var(--spacing--4xs);
}

.answer {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}
</style>
