import type { EnforcementPoint, PolicyDecision, PolicyVersionRef } from '@n8n/decorators';
import { UnexpectedError } from 'n8n-workflow';

/** Unexported, so nothing outside this file can build a `PolicyCleared`. */
const brand = Symbol('policyCleared');

/**
 * What kind of thing was policed. Closed, so a typo is a compile error rather than a binding
 * that silently never matches — but not keyed off the point: `contentImport` is generic over
 * artifact kind, so a point-to-kind map would fix a correspondence that only holds today.
 * Widening this union touches no signature.
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
 * @throws UnexpectedError if the decision has violations, which would make the value a lie.
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
	if (decision.violations.length > 0) {
		throw new UnexpectedError(
			`Refusing to clear ${point} for ${subject.type} ${subject.id}: decision has ${decision.violations.length} violation(s)`,
		);
	}

	return {
		[brand]: 'Use the policy enforcement service — a cleared action cannot be forged',
		point,
		subject,
		decision,
		policyVersions: decision.policyVersions ?? [],
	};
}
