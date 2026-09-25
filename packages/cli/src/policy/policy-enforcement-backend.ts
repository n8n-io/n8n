import type {
	ContentImportContext,
	CredentialDecryptContext,
	CredentialSaveContext,
	EnforcementPoint,
	PolicyDecision,
	WorkflowPublishContext,
	WorkflowSaveContext,
	WorkflowStartContext,
	WorkflowTransferContext,
} from '@n8n/decorators';

import type { UserLike } from '@/types/user-like.types';

/** Which context each point is called with, mirroring `RegisteredPolicyCheck`. */
type PolicyContexts = {
	workflowSave: WorkflowSaveContext;
	workflowPublish: WorkflowPublishContext;
	workflowStart: WorkflowStartContext;
	workflowTransfer: WorkflowTransferContext;
	credentialSave: CredentialSaveContext;
	credentialDecrypt: CredentialDecryptContext;
	contentImport: ContentImportContext;
};

export type PolicyContext<Point extends EnforcementPoint> = PolicyContexts[Point];

/** Why the actor is not a user. */
export type PolicySystemReason =
	/** Inside a run. Runs are not attributed to the user who started them. */
	| 'execution'
	| 'cli-import'
	/** Trigger registration at startup or on a leadership change. */
	| 'activation'
	/** The publication outbox. The publish request itself was checked with its user. */
	| 'publication'
	/** An integration that refreshes its own credential. */
	| 'integration';

/**
 * Who asked for the policed action, named on the block audit event and never shown to checks.
 * An agent lands later as an additive `{ kind: 'agent'; agentId: string; onBehalfOf: UserLike |
 * null }`, with `onBehalfOf` as the audited user, so `userId` keeps meaning the accountable human.
 */
export type PolicyActor =
	| { kind: 'user'; user: UserLike }
	| { kind: 'system'; reason: PolicySystemReason; executionId?: string };

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
		actor: PolicyActor,
	): Promise<PolicyDecision>;

	evaluate<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision>;

	/** Whether any check would run at this point. Must agree with `enforce` and `evaluate`. */
	hasChecksFor(point: EnforcementPoint): boolean;
}
