import { z } from 'zod';

import type { WorkflowSuggestionProposalDetail } from './workflow-suggestions';
import { Z } from './zod-class';

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
 * `dismissed` marks a result that a reviewer dismissed, including its discarded suggestions.
 */
export type SelfHealingReviewState = 'open' | 'applied' | 'outdated' | 'dismissed' | 'closed';

export type SelfHealingResultWorkflow = {
	workflowId: string;
	name: string;
	change: 'modified' | 'unchanged';
	/** `null` for an unchanged workflow. */
	suggestionId: string | null;
};

export type SelfHealingResultWorkflowCall = {
	callerWorkflowId: string;
	calledWorkflowId: string;
};

export type SelfHealingResultDetail = SelfHealingResultContent & {
	resultId: string;
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	completedAt: string;
	createdAt: string;
	updatedAt: string;
	reviewState: SelfHealingReviewState;
	/** One suggestion for each changed workflow. The triggering workflow comes first. */
	suggestions: WorkflowSuggestionProposalDetail[];
	/**
	 * The triggering workflow, each changed workflow, and the unchanged workflows on the current
	 * call paths between them. The triggering workflow comes first, then the nearest workflows.
	 * A changed workflow without such a path has no caller in `calls`.
	 */
	workflows: SelfHealingResultWorkflow[];
	/** Current static sub-workflow calls between the listed workflows. Can contain cycles. */
	calls: SelfHealingResultWorkflowCall[];
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

export const selfHealingOriginalActionSchema = z.enum([
	'publish',
	'continue',
	'open_editor',
	'dismiss',
]);
export type SelfHealingOriginalAction = z.infer<typeof selfHealingOriginalActionSchema>;

export class SelfHealingResultActionDto extends Z.class({
	/** The button that the user selected. Telemetry only. */
	originalAction: selfHealingOriginalActionSchema.optional(),
}) {}
