import { z } from 'zod';

import type { WorkflowSuggestionProposalDetail } from './workflow-suggestions';

export const selfHealingResultOutcomeSchema = z.enum(['fix_ready', 'needs_you', 'could_not_fix']);
export type SelfHealingResultOutcome = z.infer<typeof selfHealingResultOutcomeSchema>;

const selfHealingResultTimingSchema = z
	.object({
		turns: z.number().int().nonnegative().nullable(),
		durationSeconds: z.number().finite().nonnegative().nullable(),
	})
	.strict();

export const selfHealingResultUsageSchema = z.union([
	selfHealingResultTimingSchema.extend({
		credits: z.number().finite().nonnegative().nullable(),
	}),
	selfHealingResultTimingSchema.extend({
		promptTokens: z.number().int().nonnegative().nullable(),
		completionTokens: z.number().int().nonnegative().nullable(),
		totalTokens: z.number().int().nonnegative().nullable(),
	}),
]);
export type SelfHealingResultUsage = z.infer<typeof selfHealingResultUsageSchema>;

export const selfHealingResultContentSchema = z
	.object({
		outcome: selfHealingResultOutcomeSchema,
		summary: z.string().trim().min(1),
		report: z.string().trim().min(1).max(50_000),
		usage: selfHealingResultUsageSchema,
	})
	.strict();
export type SelfHealingResultContent = z.infer<typeof selfHealingResultContentSchema>;

export type SelfHealingExecutionReference =
	| { status: 'available'; id: string }
	| { status: 'unavailable' };

/**
 * `closed` marks a Could not fix result that closed automatically.
 * Only a user dismissal returns `dismissed`.
 */
export type SelfHealingReviewState =
	| 'open'
	| 'applied'
	| 'discarded'
	| 'outdated'
	| 'dismissed'
	| 'closed';

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
