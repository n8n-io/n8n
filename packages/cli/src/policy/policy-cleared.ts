import type { EnforcementPoint, PolicyDecision, PolicyVersionRef } from '@n8n/decorators';
import { UnexpectedError } from 'n8n-workflow';

/** Unexported, so nothing outside this file can build a `PolicyCleared`. */
const brand = Symbol('policyCleared');

/**
 * What kind of thing was policed. Closed, so a typo is a compile error rather than a binding
 * that silently never matches. Open to widening: `contentImport` in particular is generic over
 * artifact kind, and adding a kind here touches no signature.
 */
export type PolicySubjectType = 'workflow' | 'credential';

/** What a decision was about. */
export type PolicySubject = {
	readonly type: PolicySubjectType;

	/** Stable id, or a content hash where there is none yet — a workflow being created. */
	readonly id: string;
};

/**
 * Proof that policy enforcement cleared one specific action, returned by every `enforce*`
 * method. `evaluate*` never returns one: an advisory answer must not unlock anything.
 *
 * Only `mintPolicyCleared` can produce one, so receiving one is evidence the checks ran and
 * passed, and it records what was cleared so a value made for another point or workflow can't
 * stand in. Nothing takes one as an argument yet — a return type today, versus six signature
 * changes later.
 */
export type PolicyCleared<Point extends EnforcementPoint> = {
	readonly [brand]: 'Use the policy enforcement service — a cleared action cannot be forged';

	readonly point: Point;

	readonly subject: PolicySubject;

	/** Cleared, so `violations` is empty. Carries whatever else the envelope grows. */
	readonly decision: PolicyDecision;

	/** `decision.policyVersions`, always present. */
	readonly policyVersions: readonly PolicyVersionRef[];
};

/**
 * The only way to produce a `PolicyCleared`. Internal to `@/policy` — the enforcement service
 * being its only caller is what makes the type mean anything.
 *
 * @throws UnexpectedError if the decision has violations, or records a check that never ran.
 * Either would make the value a lie — something objected, or something never got to look.
 */
export function mintPolicyCleared<Point extends EnforcementPoint>({
	point,
	subject,
	decision,
}: {
	point: Point;
	subject: PolicySubject;
	decision: PolicyDecision;
}): PolicyCleared<Point> {
	const refusal = `Refusing to clear ${point} for ${subject.type} ${subject.id}`;

	if (decision.violations.length > 0) {
		throw new UnexpectedError(
			`${refusal}: decision has ${decision.violations.length} violation(s)`,
		);
	}

	// `checkErrors` is `evaluate`-only by contract — under `enforce` a check that breaks blocks —
	// so one here means the backend has a bug, and clearing would hide that a check never ran.
	if (decision.checkErrors && decision.checkErrors.length > 0) {
		throw new UnexpectedError(`${refusal}: ${decision.checkErrors.length} check(s) failed to run`);
	}

	return {
		[brand]: 'Use the policy enforcement service — a cleared action cannot be forged',
		point,
		subject,
		decision,
		policyVersions: decision.policyVersions ?? [],
	};
}
