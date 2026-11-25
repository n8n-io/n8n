import type { QuestionAnswer } from '@/features/ai/instanceAi/components/InstanceAiQuestions.vue';

/** What the user did on a questions card that is still open. */
export interface QuestionsDraft {
	currentIndex: number;
	answers: Map<string, QuestionAnswer>;
}

/**
 * The drafts of open questions cards, by request id. A chat can replace an open
 * card with a new instance of it. The new instance continues from the draft.
 */
export const questionDrafts = new Map<string, QuestionsDraft>();
