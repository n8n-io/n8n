import type { PolicyDecision, PolicyViolation } from '@n8n/decorators';

import { PolicyViolationError } from '@/policy/policy-violation.error';

import type { ImportPlanMode } from '../n8n-packages.types';

/**
 * The violations of one policy check. In `check` mode a check that broke sets `failed`. In
 * `enforce` mode it fails the import, because it is not scoped to one item.
 */
export async function verdict(
	mode: ImportPlanMode,
	enforce: () => Promise<unknown>,
	evaluate: () => Promise<PolicyDecision>,
): Promise<{ violations: PolicyViolation[]; failed: boolean }> {
	if (mode === 'check') {
		const { violations, checkErrors = [] } = await evaluate();
		return { violations, failed: checkErrors.length > 0 };
	}
	try {
		await enforce();
		return { violations: [], failed: false };
	} catch (error) {
		if (!(error instanceof PolicyViolationError)) throw error;
		return { violations: error.violations, failed: false };
	}
}
