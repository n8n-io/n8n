import type { PolicyViolation } from '@n8n/decorators';

import type { ComposedTypeVerdict } from './type-availability-policy.service';

/** How one policy kind names what it blocked. */
export type TypeViolationSubject = {
	readonly kind: string;
	readonly subjectType: string;
	readonly label: string;
};

export const NODE_TYPE_SUBJECT: TypeViolationSubject = {
	kind: 'node-type-unavailable',
	subjectType: 'nodeType',
	label: 'Node type',
};

export const CREDENTIAL_TYPE_SUBJECT: TypeViolationSubject = {
	kind: 'credential-type-unavailable',
	subjectType: 'credentialType',
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
