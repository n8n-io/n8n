import { POLICY_VIOLATION_KIND, POLICY_VIOLATION_SUBJECT_TYPE } from '@n8n/api-types';
import type { PolicyDecision, PolicyViolation } from '@n8n/decorators';

import type { ComposedTypeVerdict } from './type-availability-policy.service';

/** How one policy kind names what it blocked. */
export type TypeViolationSubject = {
	readonly kind: string;
	readonly subjectType: string;
	readonly label: string;
};

export const NODE_TYPE_SUBJECT: TypeViolationSubject = {
	kind: POLICY_VIOLATION_KIND.nodeTypeUnavailable,
	subjectType: POLICY_VIOLATION_SUBJECT_TYPE.nodeType,
	label: 'Node type',
};

export const CREDENTIAL_TYPE_SUBJECT: TypeViolationSubject = {
	kind: POLICY_VIOLATION_KIND.credentialTypeUnavailable,
	subjectType: POLICY_VIOLATION_SUBJECT_TYPE.credentialType,
	label: 'Credential type',
};

/** The message stays neutral about which project: the client names it from `projectId`. */
export function toTypeViolation(
	checkId: string,
	subject: TypeViolationSubject,
	verdict: ComposedTypeVerdict,
	projectId: string | null,
): PolicyViolation {
	const by = verdict.scope === 'instance' ? 'an instance policy' : 'a project policy';

	return {
		kind: subject.kind,
		checkId,
		message: `${subject.label} "${verdict.name}" is blocked by ${by}`,
		subject: verdict.name,
		subjectType: subject.subjectType,
		scope: verdict.scope,
		// The scope's default action decided when no rule matched, and there is no id to report.
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
		...(projectId !== null && { projectId }),
		// With no project there is nowhere to opt in, whatever the instance delegated.
		optInAvailable: projectId !== null && verdict.optInAvailable,
	};
}

/**
 * The denied node types of a decision, by type name. A violation names the type, never the node
 * that holds it, so a caller attributes it by matching the types its own entry runs as.
 */
export function deniedNodeTypes(decision: PolicyDecision): Map<string, PolicyViolation> {
	const denied = new Map<string, PolicyViolation>();

	for (const violation of decision.violations) {
		if (violation.kind !== NODE_TYPE_SUBJECT.kind) continue;
		if (violation.subjectType !== NODE_TYPE_SUBJECT.subjectType) continue;
		if (!violation.subject) continue;
		if (!denied.has(violation.subject)) denied.set(violation.subject, violation);
	}

	return denied;
}
