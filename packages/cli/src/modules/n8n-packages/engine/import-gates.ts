import type { LicenseState } from '@n8n/backend-common';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { TagImportPlan } from '../entities/tag/tag.types';

export function assertPackageImportApiKeyScopes(
	apiKeyScopes: string[] | undefined,
	required: string[],
): void {
	if (apiKeyScopes === undefined) return;
	for (const scope of required) {
		if (!apiKeyScopes.includes(scope)) {
			throw new ForbiddenError('Forbidden');
		}
	}
}

/**
 * Gated on what the import will create, not on what the package requires: a package whose variables
 * all resolve creates nothing, so it needs neither the licence nor the scope. Mirrors the variables UI.
 */
export function assertVariableCreationAllowed(options: {
	licenseState: LicenseState;
	apiKeyScopes: string[] | undefined;
	hasCreations: boolean;
}): void {
	const { licenseState, apiKeyScopes, hasCreations } = options;
	if (!hasCreations) return;

	if (!licenseState.isVariablesLicensed()) {
		throw new ForbiddenError(
			'Your license does not allow variables. Importing a package that creates variables requires a license that supports variables.',
		);
	}
	assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:create']);
}

/**
 * Plan-derived, unlike the pre-plan data-table gate: a tag must
 * never block an import that would not write it (skipped consumers, disabled
 * tags, dropped conflicts), so the assert looks at what the plans actually
 * create, rename, or reconcile.
 */
export function assertTagWritesAllowed(
	apiKeyScopes: string[] | undefined,
	tagPlans: TagImportPlan[],
): void {
	if (tagPlans.some((plan) => plan.creations.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:create']);
	}
	if (tagPlans.some((plan) => plan.renames.length > 0 || plan.reconciles.length > 0)) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:update']);
	}
}
