import { UnexpectedError } from 'n8n-workflow';

import { brand } from './policy-brand';
import type { EnforcementPoint, PolicyDecision } from './policy-check';
import type { PolicyCleared, PolicySubject } from './policy-cleared';

/**
 * The only way to produce a `PolicyCleared`. Kept off the public barrel and
 * reachable only through the `@n8n/decorators/policy-internal` subpath, so the
 * enforcement service is the single caller that can mint one.
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
