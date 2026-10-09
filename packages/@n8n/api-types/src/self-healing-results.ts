import { z } from 'zod';
import type { Scope } from '@n8n/permissions';

import type { WorkflowSuggestionProposalDetail } from './workflow-suggestions';

export const selfHealingResultOutcomeSchema = z.enum(['fix_ready', 'needs_you', 'could_not_fix']);
export type SelfHealingResultOutcome = z.infer<typeof selfHealingResultOutcomeSchema>;

export const selfHealingResultUsageSchema = z
	.object({
		credits: z.number().finite().nonnegative().nullable(),
		turns: z.number().int().nonnegative().nullable(),
		durationSeconds: z.number().finite().nonnegative().nullable(),
		promptTokens: z.number().int().nonnegative().nullable(),
		completionTokens: z.number().int().nonnegative().nullable(),
		totalTokens: z.number().int().nonnegative().nullable(),
	})
	.strict();
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

export const selfHealingContinuationDestinationSchema = z.enum(['editor', 'chat']);
export type SelfHealingContinuationDestination = z.infer<
	typeof selfHealingContinuationDestinationSchema
>;

export const selfHealingContinueRequestSchema = z
	.object({ destination: selfHealingContinuationDestinationSchema })
	.strict();

export type SelfHealingReviewState =
	| 'open'
	| 'applied'
	| 'discarded'
	| 'outdated'
	| 'dismissed'
	| 'continued';

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
	continuedAt: string | null;
	continuedById: string | null;
	continuationDestination: SelfHealingContinuationDestination | null;
	/** The first continuation's private chat, when the caller can access it. */
	continuationThreadId: string | null;
	reviewState: SelfHealingReviewState;
	suggestion: WorkflowSuggestionProposalDetail | null;
	execution: SelfHealingExecutionReference;
};

export type SelfHealingResultActionResponse = SelfHealingResultDetail & {
	/** This request error does not establish whether the saved version is live. */
	publishError?: string;
};

export type SelfHealingResultContinuationResponse = SelfHealingResultDetail & {
	/** The caller's private chat. It can differ from the first continuation's chat. */
	chatThreadId: string | null;
	/** The chat was saved, but its initial Assistant run could not start. */
	chatStartError?: string;
};

/** Fields the result view reads from the normal workflow endpoint. */
export type SelfHealingResultWorkflowMetadata = {
	name: string;
	scopes: Scope[];
};
