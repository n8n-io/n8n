<script lang="ts" setup>
/**
 * AnsweredQuestions.vue
 *
 * Read-only display of answered questions. Shown inline in the timeline
 * after the user submits answers via the questions wizard.
 * Styled to match the AI builder's UserAnswersMessage.
 */
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';

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
	<div :class="$style.wrapper">
		<div :class="$style.userBubble" data-test-id="instance-ai-answered-questions">
			<div v-for="(item, idx) in getAnswers()" :key="idx" :class="$style.answerItem">
				<N8nText :bold="true" size="large" :class="$style.question">
					{{ item.question }}
				</N8nText>
				<N8nText v-if="item.skipped" :class="$style.skipped" size="large">Skipped</N8nText>
				<N8nText v-else size="large">{{ item.answer }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--xs);
}

.userBubble {
	background: var(--color--background);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-radius: var(--radius--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-width: 90%;
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
