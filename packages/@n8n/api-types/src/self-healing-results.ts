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
	/** One suggestion for each changed workflow. The triggering workflow comes first. */
	suggestions: WorkflowSuggestionProposalDetail[];
	execution: SelfHealingExecutionReference;
};

export type SelfHealingResultActionResponse = SelfHealingResultDetail & {
	/**
	 * The first publication request error. Request errors do not establish which versions are live.
	 */
	publishError?: string;
	/**
	 * The first restoration request error. After `publishError`, for a result with more than one
	 * workflow, n8n requested the previous published version of each workflow with an active applied
	 * version, and stopped at the first restoration request error.
	 */
	restorationError?: { workflowId: string; error: string };
};
