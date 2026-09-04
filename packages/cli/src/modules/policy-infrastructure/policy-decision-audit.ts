import type {
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
 * What was policed, read off the context.
 *
 * Deliberately not the `PolicyCleared` subject: that one hashes a create's content, and it is
 * the enforcement point's to compute — mirroring it here would let the two drift.
 */
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
		workflowId: context.workflow.id,
		// A create has no id, so this is all that identifies it.
		workflowName: context.workflow.name,
		projectId: 'targetProjectId' in context ? context.targetProjectId : context.projectId,
	};
}

export function violationAudit(
	point: EnforcementPoint,
	context: AnyPolicyContext,
	decision: PolicyDecision,
	durationMs: number,
	checkIds: string[],
): PolicyDecisionAudit {
	return {
		point,
		outcome: 'violation',
		durationMs,
		checkIds,
		violations: decision.violations.map(auditedViolation),
		policyVersions: decision.policyVersions,
		...targetOf(context),
	};
}

export function checkFailureAudit(
	point: EnforcementPoint,
	context: AnyPolicyContext,
	failures: PolicyCheckFailure[],
	durationMs: number,
	checkIds: string[],
): PolicyDecisionAudit {
	return {
		point,
		outcome: 'checkFailure',
		durationMs,
		checkIds,
		violations: [],
		correlationIds: failures.map((failure) => failure.correlationId),
		...targetOf(context),
	};
}
