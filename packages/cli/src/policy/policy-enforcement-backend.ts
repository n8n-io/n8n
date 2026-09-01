import type {
	ContentImportContext,
	CredentialDecryptContext,
	EnforcementPoint,
	PolicyDecision,
	WorkflowPublishContext,
	WorkflowSaveContext,
	WorkflowStartContext,
	WorkflowTransferContext,
} from '@n8n/decorators';

/** Which context each point is called with, mirroring `RegisteredPolicyCheck`. */
type PolicyContexts = {
	workflowSave: WorkflowSaveContext;
	workflowPublish: WorkflowPublishContext;
	workflowStart: WorkflowStartContext;
	workflowTransfer: WorkflowTransferContext;
	credentialDecrypt: CredentialDecryptContext;
	contentImport: ContentImportContext;
};

export type PolicyContext<Point extends EnforcementPoint> = PolicyContexts[Point];

/**
 * What the policy infrastructure module registers into the proxy.
 *
 * Both modes return a decision; the proxy turns a non-empty one into a `PolicyViolationError`.
 * Separate methods because the fail posture differs: `enforce` blocks on a check that breaks,
 * `evaluate` reports it in `checkErrors` and keeps the rest.
 */
export interface PolicyEnforcementBackend {
	enforce<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision>;

	evaluate<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision>;

	/** Whether any check would run at this point. Must agree with `enforce` and `evaluate`. */
	hasChecksFor(point: EnforcementPoint): boolean;
}
