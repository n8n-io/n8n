import { z } from 'zod';

// ── Phase / status enums ────────────────────────────────────────────────────

export const workflowLoopPhaseSchema = z.enum([
	'building',
	'verifying',
	'repairing',
	'done',
	'blocked',
]);

export const workflowLoopStatusSchema = z.enum(['active', 'completed', 'blocked']);

export const workflowLoopSourceSchema = z.enum(['create', 'modify']);

// ── WorkflowLoopState ───────────────────────────────────────────────────────

export const workflowLoopStateSchema = z.object({
	workItemId: z.string(),
	threadId: z.string(),
	workflowId: z.string().optional(),
	phase: workflowLoopPhaseSchema,
	status: workflowLoopStatusSchema,
	source: workflowLoopSourceSchema,
	lastTaskId: z.string().optional(),
	lastExecutionId: z.string().optional(),
	lastFailureSignature: z.string().optional(),
	rebuildAttempts: z.number().int().min(0),
	/** Credential types that were mocked during build (persisted across phases). */
	mockedCredentialTypes: z.array(z.string()).optional(),
	/** Whether the submitted workflow contains unresolved placeholder values (persisted across phases). */
	hasUnresolvedPlaceholders: z.boolean().optional(),
});

export type WorkflowLoopPhase = z.infer<typeof workflowLoopPhaseSchema>;
export type WorkflowLoopStatus = z.infer<typeof workflowLoopStatusSchema>;
export type WorkflowLoopSource = z.infer<typeof workflowLoopSourceSchema>;
export type WorkflowLoopState = z.infer<typeof workflowLoopStateSchema>;

// ── AttemptRecord ───────────────────────────────────────────────────────────

export const attemptActionSchema = z.enum(['build', 'verify', 'rebuild', 'patch']);
export const attemptResultSchema = z.enum(['success', 'failure', 'blocked']);

export const attemptRecordSchema = z.object({
	workItemId: z.string(),
	phase: workflowLoopPhaseSchema,
	attempt: z.number().int().min(1),
	action: attemptActionSchema,
	result: attemptResultSchema,
	workflowId: z.string().optional(),
	executionId: z.string().optional(),
	failureSignature: z.string().optional(),
	diagnosis: z.string().optional(),
	fixApplied: z.string().optional(),
	createdAt: z.string(),
});

export type AttemptAction = z.infer<typeof attemptActionSchema>;
export type AttemptResult = z.infer<typeof attemptResultSchema>;
export type AttemptRecord = z.infer<typeof attemptRecordSchema>;

// ── WorkflowBuildOutcome ────────────────────────────────────────────────────

export const triggerTypeSchema = z.enum(['manual_or_testable', 'trigger_only']);

/**
 * Structured verification evidence the builder captures when it runs
 * `verify-built-workflow`. Downstream checkpoint runs read this and skip
 * running verify again when `success === true`.
 */
export const workflowVerificationEvidenceSchema = z.object({
	attempted: z.boolean(),
	success: z.boolean(),
	executionId: z.string().optional(),
	status: z.enum(['success', 'error', 'waiting', 'running', 'unknown']).optional(),
	failureSignature: z.string().optional(),
	evidence: z
		.object({
			nodesExecuted: z.array(z.string()).optional(),
			producedOutputRows: z.number().optional(),
			errorNodeName: z.string().optional(),
			errorMessage: z.string().optional(),
		})
		.optional(),
	verifiedAt: z.string().datetime().optional(),
});

export type WorkflowVerificationEvidence = z.infer<typeof workflowVerificationEvidenceSchema>;

/**
 * Structured trigger descriptor for each trigger node in the submitted workflow.
 * The orchestrator uses `nodeType` to decide whether the bypassPlan post-build
 * flow can invoke `verify-built-workflow` (mockable types) or must defer to a
 * manual user test (polling / OAuth-bound triggers).
 */
export const triggerNodeDescriptorSchema = z.object({
	nodeName: z.string(),
	nodeType: z.string(),
});

export type TriggerNodeDescriptor = z.infer<typeof triggerNodeDescriptorSchema>;

export const workflowBuildOutcomeSchema = z.object({
	workItemId: z.string(),
	taskId: z.string(),
	workflowId: z.string().optional(),
	submitted: z.boolean(),
	triggerType: triggerTypeSchema,
	/**
	 * Trigger nodes in the submitted workflow. Populated on successful submits;
	 * absent on failed or pre-submit outcomes. The orchestrator reads `nodeType`
	 * to pick a `verify-built-workflow` `inputData` shape for bypassPlan builds.
	 */
	triggerNodes: z.array(triggerNodeDescriptorSchema).optional(),
	needsUserInput: z.boolean(),
	blockingReason: z.string().optional(),
	failureSignature: z.string().optional(),
	/** Node names whose credentials were mocked via pinned data. */
	mockedNodeNames: z.array(z.string()).optional(),
	/** Credential types that were mocked (not resolved to real credentials). */
	mockedCredentialTypes: z.array(z.string()).optional(),
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
	/** Verification-only pin data — scoped to this build, never persisted to workflow. */
	verificationPinData: z.record(z.array(z.record(z.unknown()))).optional(),
	/** Whether any node parameters contain unresolved placeholder values. */
	hasUnresolvedPlaceholders: z.boolean().optional(),
	/**
	 * Structured verification record from the most recent `verify-built-workflow` call
	 * that executed inside the builder. Observability metadata only: checkpoints must
	 * still run independent verification before completing — the builder's self-report
	 * is a claim, not proof.
	 */
	verification: workflowVerificationEvidenceSchema.optional(),
	summary: z.string(),
});

export type TriggerType = z.infer<typeof triggerTypeSchema>;
export type WorkflowBuildOutcome = z.infer<typeof workflowBuildOutcomeSchema>;

// ── VerificationResult ──────────────────────────────────────────────────────

export const verificationVerdictSchema = z.enum([
	'verified',
	'needs_patch',
	'needs_rebuild',
	'trigger_only',
	'needs_user_input',
	'failed_terminal',
]);

export const verificationResultSchema = z.object({
	workItemId: z.string(),
	workflowId: z.string(),
	executionId: z.string().optional(),
	verdict: verificationVerdictSchema,
	failureSignature: z.string().optional(),
	failedNodeName: z.string().optional(),
	diagnosis: z.string().optional(),
	patch: z.record(z.unknown()).optional(),
	summary: z.string(),
});

export type VerificationVerdict = z.infer<typeof verificationVerdictSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;

// ── WorkflowLoopAction ──────────────────────────────────────────────────────

export type WorkflowLoopAction =
	| { type: 'verify'; workflowId: string }
	| { type: 'rebuild'; workflowId: string; failureDetails: string }
	| {
			type: 'patch';
			workflowId: string;
			failedNodeName: string;
			diagnosis: string;
			patch?: Record<string, unknown>;
	  }
	| {
			type: 'done';
			workflowId?: string;
			summary: string;
			mockedCredentialTypes?: string[];
			hasUnresolvedPlaceholders?: boolean;
	  }
	| { type: 'blocked'; reason: string };
