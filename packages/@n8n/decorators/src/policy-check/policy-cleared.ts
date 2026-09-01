import { UnexpectedError } from 'n8n-workflow';

import { brand } from './policy-brand';
import type { EnforcementPoint, PolicyDecision, PolicyVersionRef } from './policy-check';

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
 * Only `mintPolicyCleared` (in `./policy-mint`, off the public barrel) can produce one, so
 * receiving one is evidence the checks ran and passed, and it records what was cleared so a
 * value made for another point or workflow can't stand in.
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
 * Verifies a clearance is present, was minted for this exact point, and binds to this subject.
 * Called at the persistence boundary before a policed write.
 *
 * @throws UnexpectedError if the clearance is missing, unbranded (never minted), or bound to a
 * different point or subject — each means a call site failed to thread the right token.
 */
export function assertClearedFor(
	cleared: PolicyCleared<EnforcementPoint> | undefined,
	point: EnforcementPoint,
	subject: PolicySubject,
): void {
	if (!cleared) throw new UnexpectedError(`No policy clearance for ${point}`);
	if (cleared[brand] === undefined || cleared.point !== point)
		throw new UnexpectedError(`Clearance is not valid for ${point}`);
	if (cleared.subject.type !== subject.type || cleared.subject.id !== subject.id)
		throw new UnexpectedError(
			`Clearance is for ${cleared.subject.type} ${cleared.subject.id}, not ${subject.type} ${subject.id}`,
		);
}
