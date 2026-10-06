import { z } from 'zod';

import type { WorkflowSuggestionProposalDetail } from './workflow-suggestions';

export const selfHealingResultOutcomeSchema = z.enum(['fix_ready', 'needs_you', 'could_not_fix']);
export type SelfHealingResultOutcome = z.infer<typeof selfHealingResultOutcomeSchema>;

export const selfHealingResultUsageSchema = z
	.object({
		credits: z.number().finite().nonnegative().nullable(),
		turns: z.number().int().nonnegative().nullable(),
		durationSeconds: z.number().finite().nonnegative().nullable(),
	})
	.strict();
export type SelfHealingResultUsage = z.infer<typeof selfHealingResultUsageSchema>;

export const selfHealingResultContentSchema = z
	.object({
		outcome: selfHealingResultOutcomeSchema,
		summary: z.string().trim().min(1).max(2000),
		report: z.string().trim().min(1).max(50_000),
		usage: selfHealingResultUsageSchema,
	})
	.strict();
export type SelfHealingResultContent = z.infer<typeof selfHealingResultContentSchema>;

export type SelfHealingExecutionReference =
	| { status: 'available'; id: string }
	| { status: 'unavailable' };

export type SelfHealingReviewState = 'open' | 'applied' | 'discarded' | 'outdated' | 'dismissed';

export type SelfHealingResultDetail = SelfHealingResultContent & {
	resultId: string;
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	completedAt: string;
	createdAt: string;
	updatedAt: string;
	dismissedAt: string | null;
	dismissedById: string | null;
	reviewState: SelfHealingReviewState;
	suggestion: WorkflowSuggestionProposalDetail | null;
	execution: SelfHealingExecutionReference;
};

export type SelfHealingResultActionResponse = SelfHealingResultDetail & {
	/** This request error does not establish whether the saved version is live. */
	publishError?: string;
};
