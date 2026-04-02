<script lang="ts" setup>
/**
 * AnsweredQuestions.vue
 *
 * Read-only display of answered questions. Shown inline in the timeline
 * after the user submits answers via the questions wizard.
 * Styled to match the AI builder's UserAnswersMessage.
 */
import { N8nText } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
}>();

interface DisplayAnswer {
	question: string;
	answer: string;
	skipped: boolean;
}

function getAnswers(): DisplayAnswer[] {
	const questions = props.toolCall.confirmation?.questions ?? [];
	const result = props.toolCall.result as
		| { answered?: boolean; answers?: Array<Record<string, unknown>> }
		| undefined;
	const rawAnswers = result?.answers ?? [];

	return questions.map((q) => {
		const a = rawAnswers.find((ans) => ans.questionId === q.id);
		if (!a || a.skipped) {
			return { question: q.question, answer: '', skipped: true };
		}
		const parts: string[] = [];
		if (Array.isArray(a.selectedOptions) && a.selectedOptions.length > 0) {
			parts.push((a.selectedOptions as string[]).join(', '));
		}
		if (typeof a.customText === 'string' && a.customText.trim()) {
			parts.push(a.customText.trim());
		}
		return {
			question: q.question,
			answer: parts.join(' — ') || '',
			skipped: parts.length === 0,
		};
	});
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-answered-questions">
		<div v-for="(item, idx) in getAnswers()" :key="idx" :class="$style.answerItem">
			<N8nText :bold="true" :class="$style.question">
				{{ item.question }}
			</N8nText>
			<N8nText v-if="item.skipped" :class="$style.skipped">Skipped</N8nText>
			<N8nText v-else>{{ item.answer }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--background);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin: var(--spacing--2xs) 0;
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

.skipped {
	color: var(--color--text--tint-2);
	font-style: italic;
}
</style>
