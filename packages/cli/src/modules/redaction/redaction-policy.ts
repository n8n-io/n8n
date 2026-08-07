import type { RedactionFloor } from '@n8n/api-types';
import type { WorkflowSettings } from 'n8n-workflow';

type RedactionPolicy = WorkflowSettings.RedactionPolicy;
type RedactionScope = { production: boolean; manual: boolean };

/** What each workflow redaction policy actually redacts. */
const POLICY_SCOPE: Record<RedactionPolicy, RedactionScope> = {
	none: { production: false, manual: false },
	'manual-only': { production: false, manual: true },
	'non-manual': { production: true, manual: false },
	all: { production: true, manual: true },
};

/** What each instance floor requires be redacted. */
const FLOOR_REQUIREMENTS: Record<RedactionFloor, RedactionScope> = {
	off: { production: false, manual: false },
	production: { production: true, manual: false },
	all: { production: true, manual: true },
};

/** Minimum policy that satisfies a floor — used to seed new workflows. */
const FLOOR_SEED_POLICY: Record<RedactionFloor, RedactionPolicy | undefined> = {
	off: undefined,
	production: 'non-manual',
	all: 'all',
};

/** Canonical 422 message. Single source of truth — do not inline elsewhere. */
export const REDACTION_FLOOR_VIOLATION_MESSAGE =
	'Workflow redaction policy cannot be weaker than the instance floor.';

/**
 * True when `policy` redacts at least everything `floor` requires.
 * Progressive-restriction model: equal-or-stricter passes, weaker fails.
 */
export function policyMeetsFloor(policy: RedactionPolicy, floor: RedactionFloor): boolean {
	const required = FLOOR_REQUIREMENTS[floor];
	const scope = POLICY_SCOPE[policy];
	return (!required.production || scope.production) && (!required.manual || scope.manual);
}

/**
 * Minimum policy a new workflow should be seeded with for `floor`,
 * or `undefined` when the floor requires nothing (no seed).
 * Invariant: the returned policy always satisfies `policyMeetsFloor(_, floor)`.
 */
export function policyForFloor(floor: RedactionFloor): RedactionPolicy | undefined {
	return FLOOR_SEED_POLICY[floor];
}
