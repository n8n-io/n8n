import type {
	CredentialDecryptContext,
	EnforcementPoint,
	PolicyCheckFailure,
	PolicyDecision,
	PolicyViolation,
	PolicyVersionRef,
} from '@n8n/decorators';

import type { PolicyContext } from '@/policy/policy-enforcement-backend';

/** Every context, as one union — a generic `PolicyContext<Point>` narrows against none. */
type AnyPolicyContext = PolicyContext<EnforcementPoint>;

/** The violation as the audit line records it. No `message`: free text saying what the fields say. */
type AuditedViolation = Pick<
	PolicyViolation,
	'checkId' | 'kind' | 'subject' | 'subjectType' | 'scope' | 'matchedRuleId'
>;

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
	credentialId?: string;
	credentialType?: string;
	consumerNodeType?: string;
	projectId: string | null;
};

const auditedViolation = ({
	checkId,
	kind,
	subject,
	subjectType,
	scope,
	matchedRuleId,
}: PolicyViolation): AuditedViolation => ({
	checkId,
	kind,
	subject,
	subjectType,
	scope,
	matchedRuleId,
});

/**
 * The id of the row that was policed, or `null` when there is none yet.
 *
 * A save with no stored row is a create, and any id on its payload is the client's claim rather
 * than a committed row — the seal discards it for the same reason. `workflowName` is what
 * identifies a create.
 */
const policedWorkflowId = (context: Exclude<AnyPolicyContext, CredentialDecryptContext>) =>
	'storedWorkflow' in context ? (context.storedWorkflow?.id ?? null) : context.workflow.id;

/** What was policed, read off the context. */
function targetOf(context: AnyPolicyContext) {
	if ('credentialId' in context) {
		return {
			credentialId: context.credentialId,
			credentialType: context.credentialType,
			consumerNodeType: context.consumer?.nodeType,
			projectId: context.projectId,
		};
	}

	return {
		workflowId: policedWorkflowId(context),
		workflowName: context.workflow.name,
		projectId: 'targetProjectId' in context ? context.targetProjectId : context.projectId,
	};
}

export type DecisionAuditInput = {
	point: EnforcementPoint;
	context: AnyPolicyContext;
	/** Built from the checks that answered, so a partial run stays diagnosable. */
	decision: PolicyDecision;
	durationMs: number;
	checkIds: string[];
	/** Non-empty when a check did not answer, which blocks whatever the others said. */
	failures?: PolicyCheckFailure[];
};

export function decisionAudit({
	point,
	context,
	decision,
	durationMs,
	checkIds,
	failures = [],
}: DecisionAuditInput): PolicyDecisionAudit {
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
		...targetOf(context),
	};
}
