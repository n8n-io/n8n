<script lang="ts" setup>
/**
 * AnsweredQuestions.vue
 *
 * Read-only display of answered questions. Shown inline in the timeline
 * after the user submits answers via the questions wizard.
 * Styled to match the AI builder's UserAnswersMessage.
 */
import { useI18n } from '@n8n/i18n';

import { getAskedQuestions } from '@/features/ai/instanceAi/assistantAgent/assistantAnsweredQuestions';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	toolCall: ToolCall;
}>();

const i18n = useI18n();

interface DisplayAnswer {
	question: string;
	answer: string;
	skipped: boolean;
}

function getAnswers(): DisplayAnswer[] {
	const questions = getAskedQuestions(props.toolCall) ?? [];
	const result = props.toolCall.output as
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
			// The first line of an option is its title; a description line stays in the card.
			parts.push((a.selectedOptions as string[]).map((o) => o.split('\n')[0]).join(', '));
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
				<span :class="$style.question">{{ item.question }}</span>
				<span v-if="item.skipped" :class="$style.skipped">{{
					i18n.baseText('aiAssistant.builder.planMode.answers.skipped')
				}}</span>
				<span v-else>{{ item.answer }}</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: flex-end;
	margin-block: var(--spacing--lg);
}

.userBubble {
	// The text size of the chat message, which follows its width. The bubble can render
	// in the message content or in its after-actions slot, and both provide this size.
	font-size: var(--n8n-chat-message--font-size, var(--font-size--sm));
	line-height: var(--line-height--xl);
	color: var(--assistant--color--text--user-bubble, var(--text-color));
	background: var(--assistant--color--background--user-bubble);
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
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.skipped {
	color: var(--text-color);
	font-style: italic;
}
</style>
