<script setup lang="ts">
/**
 * UserAnswersMessage.vue
 *
 * Displays the user's submitted answers to plan mode clarifying questions.
 * Used as a custom user message type for better visual presentation
 * compared to raw JSON text.
 */
import { computed } from 'vue';

import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { PlanMode } from '../../assistant.types';

interface Props {
	answers: PlanMode.QuestionResponse[];
}

const props = defineProps<Props>();
const i18n = useI18n();

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

	return parts.join(', ') || i18n.baseText('aiAssistant.builder.planMode.answers.noAnswer');
}
</script>

<template>
	<div
		v-if="displayedAnswers.length > 0"
		:class="$style.container"
		data-test-id="plan-mode-user-answers"
	>
		<div v-for="answer in displayedAnswers" :key="answer.questionId" :class="$style.answerItem">
			<N8nText :bold="true" :class="$style.question">
				{{ answer.question }}
			</N8nText>
			<N8nText color="text-light">{{ formatAnswer(answer) }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--assistant--color--background--user-bubble);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
}

.answerItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);

	&:not(:last-child) {
		margin-bottom: var(--spacing--xs);
	}
}

.question {
	line-height: var(--line-height--md);
}
</style>
