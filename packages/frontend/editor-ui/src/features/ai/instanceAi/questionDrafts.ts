import type { QuestionAnswer } from '@/features/ai/instanceAi/components/InstanceAiQuestions.vue';

/** What the user did on a questions card that is still open. */
export interface QuestionsDraft {
	currentIndex: number;
	answers: Map<string, QuestionAnswer>;
}

/** A card that the user leaves open keeps its draft, so only the newest drafts stay. */
const MAX_DRAFTS = 20;

/**
 * The drafts of open questions cards, by request id. A chat can replace an open
 * card with a new instance of it. The new instance continues from the draft.
 */
export const questionDrafts = new Map<string, QuestionsDraft>();

export function saveQuestionsDraft(key: string, draft: QuestionsDraft) {
	// A map keeps insertion order, so the first key is the oldest draft.
	questionDrafts.delete(key);
	questionDrafts.set(key, draft);
	if (questionDrafts.size <= MAX_DRAFTS) return;
	for (const oldest of questionDrafts.keys()) {
		questionDrafts.delete(oldest);
		break;
	}
}
