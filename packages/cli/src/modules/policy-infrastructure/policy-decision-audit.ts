import type {
	EnforcementPoint,
	PolicedWorkflow,
	PolicyCheckFailure,
	PolicyDecision,
	PolicyViolation,
	PolicyVersionRef,
} from '@n8n/decorators';

import type { UserLike } from '@/types/user-like.types';
import type {
	PolicyActor,
	PolicyContext,
	PolicySystemReason,
} from '@/policy/policy-enforcement-backend';

type OptionalAuditedKey = 'subject' | 'subjectType' | 'scope' | 'matchedRuleId';

/**
 * The violation as the audit line records it. Every key is present, `null` when the check left
 * it out, so a SIEM can map fixed fields. No `message`: free text saying what the fields say.
 */
type AuditedViolation = Pick<PolicyViolation, 'checkId' | 'kind'> & {
	[Key in OptionalAuditedKey]-?: Exclude<PolicyViolation[Key], undefined> | null;
};

/**
 * One decision-audit line.
 *
 * A `type`, not an `interface`: an interface has no implicit index signature, so it would not
 * assign to the logger's `LogMetadata`.
 */
export type PolicyDecisionAudit = {
	point: EnforcementPoint;

	/** `violation` — a check objected. `checkFailure` — a check did not answer, so nothing said yes. */
	outcome: 'violation' | 'checkFailure';

	durationMs: number;

	/** Every check consulted at this point, whether it answered or not. */
	checkIds: string[];

	/** On a `checkFailure` these two hold what the checks that *did* answer said. */
	violations: AuditedViolation[];

	policyVersions?: PolicyVersionRef[];

	/** `checkFailure` only. Ties this line to the per-check error lines holding the real errors. */
	correlationIds?: string[];

	/** `null` for a create, which has no id yet — read `workflowName` instead. */
	workflowId?: string | null;
	workflowName?: string;
	/** Same rule as `workflowId`: `null` for a create. */
	agentId?: string | null;
	agentName?: string;
	/** `null` for a credential create, which has no id yet — read `credentialType` instead. */
	credentialId?: string | null;
	credentialType?: string;
	consumerNodeType?: string;
	projectId: string | null;
};

const auditedViolation = (violation: PolicyViolation): AuditedViolation => ({
	checkId: violation.checkId,
	kind: violation.kind,
	subject: violation.subject ?? null,
	subjectType: violation.subjectType ?? null,
	scope: violation.scope ?? null,
	matchedRuleId: violation.matchedRuleId ?? null,
});

type AuditTarget = Pick<
	PolicyDecisionAudit,
	| 'workflowId'
	| 'workflowName'
	| 'agentId'
	| 'agentName'
	| 'credentialId'
	| 'credentialType'
	| 'consumerNodeType'
	| 'projectId'
>;

const workflowTarget = (
	id: string | null,
	workflow: PolicedWorkflow,
	projectId: string | null,
): AuditTarget =>
	workflow.artifactKind === 'agent'
		? { agentId: id, agentName: workflow.name, projectId }
		: { workflowId: id, workflowName: workflow.name, projectId };

const credentialTarget = (
	id: string | null,
	type: string,
	projectId: string | null,
): AuditTarget => ({
	credentialId: id,
	credentialType: type,
	projectId,
});

/**
 * What each point polices, as the audit line names it. A save names its stored row: a create has
 * no committed id, whatever the payload claims, and the seal discards that id too.
 */
const AUDIT_TARGETS: {
	readonly [Point in EnforcementPoint]: (context: PolicyContext<Point>) => AuditTarget;
} = {
	workflowSave: (ctx) =>
		workflowTarget(ctx.storedWorkflow?.id ?? null, ctx.workflow, ctx.projectId),
	workflowPublish: (ctx) => workflowTarget(ctx.workflow.id, ctx.workflow, ctx.projectId),
	workflowStart: (ctx) => workflowTarget(ctx.workflow.id, ctx.workflow, ctx.projectId),
	workflowTransfer: (ctx) => workflowTarget(ctx.workflow.id, ctx.workflow, ctx.targetProjectId),
	credentialSave: (ctx) =>
		credentialTarget(ctx.storedCredential?.id ?? null, ctx.credential.type, ctx.projectId),
	credentialTransfer: (ctx) =>
		credentialTarget(ctx.credential.id, ctx.credential.type, ctx.targetProjectId),
	credentialDecrypt: (ctx) => ({
		credentialId: ctx.credentialId,
		credentialType: ctx.credentialType,
		consumerNodeType: ctx.consumer?.nodeType,
		projectId: ctx.projectId,
	}),
	// A reference has no stored version, so its id is always the committed one.
	executionAdmission: ({ artifact, projectId }) =>
		artifact.kind === 'agent'
			? { agentId: artifact.id, agentName: artifact.name, projectId }
			: { workflowId: artifact.id, workflowName: artifact.name, projectId },
	contentImport: (ctx) =>
		'workflow' in ctx
			? workflowTarget(ctx.workflow.id, ctx.workflow, ctx.projectId)
			: credentialTarget(ctx.credential.id, ctx.credential.type, ctx.projectId),
};

export type DecisionAuditInput<Point extends EnforcementPoint> = {
	point: Point;
	context: PolicyContext<Point>;
	/** Built from the checks that answered, so a partial run stays diagnosable. */
	decision: PolicyDecision;
	durationMs: number;
	checkIds: string[];
	/** Non-empty when a check did not answer, which blocks whatever the others said. */
	failures?: PolicyCheckFailure[];
};

export function decisionAudit<Point extends EnforcementPoint>({
	point,
	context,
	decision,
	durationMs,
	checkIds,
	failures = [],
}: DecisionAuditInput<Point>): PolicyDecisionAudit {
	return {
		point,
		outcome: failures.length > 0 ? 'checkFailure' : 'violation',
		durationMs,
		checkIds,
		violations: decision.violations.map(auditedViolation),
		policyVersions: decision.policyVersions,
		...(failures.length > 0 && {
			correlationIds: failures.map((failure) => failure.correlationId),
		}),
		...AUDIT_TARGETS[point](context),
	};
}

/**
 * The actor as the log streaming event records it. `user` is always the accountable human, or
 * `null` when there is none, and stays a field of its own so the relay can redact it.
 */
export type AuditedActor =
	| { actorType: 'user'; user: UserLike }
	| { actorType: 'system'; user: null; systemReason: PolicySystemReason; executionId?: string };

export function auditedActor(actor: PolicyActor): AuditedActor {
	if (actor.kind === 'user') return { actorType: 'user', user: actor.user };

	return {
		actorType: 'system',
		user: null,
		systemReason: actor.reason,
		...(actor.executionId !== undefined && { executionId: actor.executionId }),
	};
}
