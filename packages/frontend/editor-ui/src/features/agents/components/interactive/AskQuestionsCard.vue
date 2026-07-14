<script setup lang="ts">
/**
 * Card for the `ask_questions` builder tool. Reuses `InstanceAiQuestions.vue`
 * (the AI assistant's own Q&A wizard) verbatim for the interactive part — the
 * two surfaces share the exact same suspend payload shape
 * (`questionsSuspendPayloadSchema`), so there is no reason to re-implement
 * the wizard here. Only the submit transport differs: this card posts to
 * `POST /build/resume` (via the `submit` emit) instead of instance AI's own
 * confirm endpoint.
 */
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InteractionQuestion, QuestionAnswer, QuestionsResumeData } from '@n8n/api-types';
import InstanceAiQuestions, {
	type QuestionAnswer as WizardAnswer,
} from '@/features/ai/instanceAi/components/InstanceAiQuestions.vue';
import type { QuestionsResolvedValue } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	questions: InteractionQuestion[];
	introMessage?: string;
	disabled?: boolean;
	resolvedValue?: QuestionsResolvedValue;
}>();

const emit = defineEmits<{
	submit: [resumeData: QuestionsResumeData];
}>();

const i18n = useI18n();

function onSubmit(answers: WizardAnswer[]) {
	emit('submit', {
		approved: true,
		answers: answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
			questionId,
			selectedOptions,
			...(customText ? { customText } : {}),
			...(skipped ? { skipped } : {}),
		})),
	});
}

// ---------------------------------------------------------------------------
// Resolved (disabled) state
// ---------------------------------------------------------------------------

const resolvedAnswers = computed<QuestionAnswer[] | undefined>(() => {
	const value = props.resolvedValue;
	if (!value || !('answers' in value)) return undefined;
	return value.answers;
});

const isAnswered = computed(() => {
	const value = props.resolvedValue;
	if (!value) return false;
	if ('answered' in value) return value.answered;
	if ('approved' in value && value.approved === false) return false;
	return resolvedAnswers.value !== undefined;
});

interface ResolvedAnswerRow {
	question: string;
	label: string;
	skipped: boolean;
}

const resolvedRows = computed<ResolvedAnswerRow[]>(() => {
	const answers = resolvedAnswers.value;
	if (!answers) return [];
	return props.questions.map((question) => {
		const answer = answers.find((a) => a.questionId === question.id);
		if (!answer || answer.skipped) {
			return { question: question.question, label: '', skipped: true };
		}
		const parts = [...answer.selectedOptions, ...(answer.customText ? [answer.customText] : [])];
		return { question: question.question, label: parts.join(', '), skipped: parts.length === 0 };
	});
});
</script>

<template>
	<div data-testid="ask-questions-card">
		<InstanceAiQuestions
			v-if="!disabled"
			:questions="questions"
			:intro-message="introMessage"
			@submit="onSubmit"
		/>
		<div v-else :class="$style.resolved">
			<template v-if="isAnswered && resolvedRows.length > 0">
				<div v-for="row in resolvedRows" :key="row.question" :class="$style.row">
					<N8nIcon icon="circle-check" size="small" color="success" />
					<N8nText size="small">
						<strong>{{ row.question }}:</strong>
						{{ row.skipped ? i18n.baseText('agents.chat.askQuestions.skipped') : row.label }}
					</N8nText>
				</div>
			</template>
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('agents.chat.askQuestions.skipped') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.resolved {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 90%;
	max-width: 90%;
}

.row {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}
</style>
