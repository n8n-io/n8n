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

export const remediationCategorySchema = z.enum(['code_fixable', 'needs_setup', 'blocked']);

export const remediationMetadataSchema = z.object({
	category: remediationCategorySchema,
	shouldEdit: z.boolean(),
	guidance: z.string(),
	reason: z.string().optional(),
	remainingSubmitFixes: z.number().int().min(0).optional(),
	attemptCount: z.number().int().min(0).optional(),
});

export type RemediationCategory = z.infer<typeof remediationCategorySchema>;
export type RemediationMetadata = z.infer<typeof remediationMetadataSchema>;

// ── WorkflowBuildOwner ──────────────────────────────────────────────────────

export const workflowBuildOwnerSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('direct') }),
	z.object({ type: z.literal('planned'), taskId: z.string() }),
]);

export type WorkflowBuildOwner = z.infer<typeof workflowBuildOwnerSchema>;

type WorkflowBuildOwnerSource = {
	owner?: WorkflowBuildOwner;
	plannedTaskId?: string;
};

export function resolveWorkflowBuildOwner(
	...sources: Array<WorkflowBuildOwnerSource | undefined>
): WorkflowBuildOwner {
	for (const source of sources) {
		if (source?.owner) return source.owner;
		if (source?.plannedTaskId) return { type: 'planned', taskId: source.plannedTaskId };
	}
	return { type: 'direct' };
}

export function plannedTaskIdFromWorkflowBuildOwner(
	owner: WorkflowBuildOwner | undefined,
): string | undefined {
	return owner?.type === 'planned' ? owner.taskId : undefined;
}

export function isPlannedWorkflowBuildOwner(owner: WorkflowBuildOwner | undefined): boolean {
	return owner?.type === 'planned';
}

// ── WorkflowLoopState ───────────────────────────────────────────────────────

export const workflowLoopStateSchema = z.object({
	workItemId: z.string(),
	threadId: z.string(),
	runId: z.string().optional(),
	workflowId: z.string().optional(),
	phase: workflowLoopPhaseSchema,
	status: workflowLoopStatusSchema,
	source: workflowLoopSourceSchema,
	/** Canonical owner of this workflow build. Defaults to direct for legacy records. */
	owner: workflowBuildOwnerSchema.optional(),
	/** Planned task that owns this workflow build, when the build came from an approved plan. */
	plannedTaskId: z.string().optional(),
	lastTaskId: z.string().optional(),
	lastExecutionId: z.string().optional(),
	lastFailureSignature: z.string().optional(),
	lastWorkflowInspection: z.string().optional(),
	rebuildAttempts: z.number().int().min(0),
	/** Credential types that were mocked during build (persisted across phases). */
	mockedCredentialTypes: z.array(z.string()).optional(),
	/** Whether the submitted workflow contains unresolved placeholder values (persisted across phases). */
	hasUnresolvedPlaceholders: z.boolean().optional(),
	successfulSubmitSeen: z.boolean().optional(),
	preSaveSubmitFailures: z.number().int().min(0).optional(),
	postSubmitRemediationSubmitsUsed: z.number().int().min(0).optional(),
	lastRemediation: remediationMetadataSchema.optional(),
	/**
	 * Set once the service has routed this work item to post-verification setup.
	 * Guards the deterministic setup follow-up so it fires at most once per build.
	 */
	setupRoutedAt: z.string().optional(),
	/**
	 * Short-lived service claim while a setup follow-up run is being started.
	 * Prevents concurrent scheduler re-entries from opening duplicate setup runs.
	 */
	setupRoutingClaimId: z.string().optional(),
	setupRoutingClaimedAt: z.string().optional(),
	setupRoutingClaimExpiresAt: z.string().optional(),
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
	workflowInspection: z.string().optional(),
	diagnosis: z.string().optional(),
	fixApplied: z.string().optional(),
	remediationCategory: remediationCategorySchema.optional(),
	remediationShouldEdit: z.boolean().optional(),
	remediationGuidance: z.string().optional(),
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

export const workflowVerificationReadinessSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('ready') }),
	z.object({ status: z.literal('already_verified') }),
	z.object({
		status: z.literal('needs_setup'),
		reason: z.enum([
			'unresolved-placeholders',
			'missing-mocked-credential-pin-data',
			'workflow-needs-setup',
		]),
		guidance: z.string(),
	}),
	z.object({
		status: z.literal('not_verifiable'),
		reason: z.enum(['not-submitted', 'missing-workflow-id', 'non-mockable-trigger']),
		guidance: z.string(),
	}),
]);

export type WorkflowVerificationReadiness = z.infer<typeof workflowVerificationReadinessSchema>;

export const workflowSetupRequirementSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('not_required') }),
	z.object({
		status: z.literal('required'),
		reason: z.enum(['mocked-credentials', 'unresolved-placeholders', 'workflow-needs-setup']),
		guidance: z.string(),
	}),
]);

export type WorkflowSetupRequirement = z.infer<typeof workflowSetupRequirementSchema>;

/**
 * Structured trigger descriptor for each trigger node in the submitted workflow.
 * The orchestrator uses `nodeType` only to shape verification input data.
 * Whether verification is allowed is exposed through `verificationReadiness`.
 */
export const triggerNodeDescriptorSchema = z.object({
	nodeName: z.string(),
	nodeType: z.string(),
});

export type TriggerNodeDescriptor = z.infer<typeof triggerNodeDescriptorSchema>;

export const workflowBuildOutcomeSchema = z.object({
	workItemId: z.string(),
	runId: z.string().optional(),
	taskId: z.string(),
	/** Canonical owner of this workflow build. Defaults to direct for legacy outcomes. */
	owner: workflowBuildOwnerSchema.optional(),
	/** Planned task that owns this build outcome, when the build came from an approved plan. */
	plannedTaskId: z.string().optional(),
	workflowId: z.string().optional(),
	submitted: z.boolean(),
	triggerType: triggerTypeSchema,
	/**
	 * Trigger nodes in the submitted workflow. Populated on successful submits;
	 * absent on failed or pre-submit outcomes. The orchestrator reads `nodeType`
	 * to pick a `verify-built-workflow` `inputData` shape for direct builds.
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
	/** True when mocked credentials can be verified with saved workflow-level pin data. */
	usesWorkflowPinDataForVerification: z.boolean().optional(),
	/** Draft sub-workflows created by the builder that must publish before the main workflow. */
	supportingWorkflowIds: z.array(z.string()).optional(),
	/** Whether any node parameters contain unresolved placeholder values. */
	hasUnresolvedPlaceholders: z.boolean().optional(),
	/**
	 * Deterministic post-build routing verdict. The orchestrator should use this
	 * instead of reasoning over pin-data internals or trigger allow-lists.
	 */
	verificationReadiness: workflowVerificationReadinessSchema.optional(),
	/** Deterministic setup handoff verdict for post-verification workflow setup. */
	setupRequirement: workflowSetupRequirementSchema.optional(),
	remediation: remediationMetadataSchema.optional(),
	/**
	 * Structured verification record from the most recent `verify-built-workflow`
	 * tool call. This is tool evidence, not builder prose, so downstream checks may
	 * reuse a successful record instead of re-running verification.
	 */
	verification: workflowVerificationEvidenceSchema.optional(),
	summary: z.string(),
});

export type TriggerType = z.infer<typeof triggerTypeSchema>;
export type WorkflowBuildOutcome = z.infer<typeof workflowBuildOutcomeSchema>;

// ── WorkflowVerificationObligation ─────────────────────────────────────────

export const workflowVerificationObligationStatusSchema = z.enum([
	'pending_build',
	'ready_to_verify',
	'verifying',
	'verified',
	'needs_setup',
	'not_verifiable',
	'blocked',
]);

export const workflowVerificationObligationPolicySchema = z.enum([
	'required',
	'best_effort',
	'manual',
]);

export const workflowVerificationObligationSourceSchema = z.enum(['direct', 'planned']);

export const workflowVerificationObligationSchema = z.object({
	workItemId: z.string(),
	threadId: z.string(),
	runId: z.string().optional(),
	taskId: z.string().optional(),
	owner: workflowBuildOwnerSchema.optional(),
	plannedTaskId: z.string().optional(),
	workflowId: z.string().optional(),
	source: workflowVerificationObligationSourceSchema,
	policy: workflowVerificationObligationPolicySchema,
	status: workflowVerificationObligationStatusSchema,
	readiness: workflowVerificationReadinessSchema.optional(),
	setupRequirement: workflowSetupRequirementSchema.optional(),
	evidence: workflowVerificationEvidenceSchema.optional(),
	blockingReason: z.string().optional(),
	updatedAt: z.string(),
});

export type WorkflowVerificationObligationStatus = z.infer<
	typeof workflowVerificationObligationStatusSchema
>;
export type WorkflowVerificationObligationPolicy = z.infer<
	typeof workflowVerificationObligationPolicySchema
>;
export type WorkflowVerificationObligationSource = z.infer<
	typeof workflowVerificationObligationSourceSchema
>;
export type WorkflowVerificationObligation = z.infer<typeof workflowVerificationObligationSchema>;

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
	runId: z.string().optional(),
	workflowId: z.string(),
	executionId: z.string().optional(),
	verdict: verificationVerdictSchema,
	workflowInspection: z.string().optional(),
	failureSignature: z.string().optional(),
	failedNodeName: z.string().optional(),
	diagnosis: z.string().optional(),
	patch: z.record(z.unknown()).optional(),
	remediation: remediationMetadataSchema.optional(),
	summary: z.string(),
});

export type VerificationVerdict = z.infer<typeof verificationVerdictSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;

// ── WorkflowLoopAction ──────────────────────────────────────────────────────

export type WorkflowLoopAction =
	| { type: 'ignored'; reason: string }
	| { type: 'continue_building'; reason: string }
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
