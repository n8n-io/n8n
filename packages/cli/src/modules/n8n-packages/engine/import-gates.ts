import type { LicenseState } from '@n8n/backend-common';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { TagImportPlan } from '../entities/tag/tag.types';
import type { WorkflowImportPlan } from '../entities/workflow/workflow-import.types';

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
 * Gated on what the import will write, not on what the package requires: a package whose variables
 * all resolve writes nothing, so it needs neither the licence nor a scope. Mirrors the variables UI.
 */
export function assertVariableWritesAllowed(options: {
	licenseState: LicenseState;
	apiKeyScopes: string[] | undefined;
	hasCreations: boolean;
	hasOverwrites: boolean;
}): void {
	const { licenseState, apiKeyScopes, hasCreations, hasOverwrites } = options;
	if (!hasCreations && !hasOverwrites) return;

	if (!licenseState.isVariablesLicensed()) {
		throw new ForbiddenError(
			'Your license does not allow variables. Importing a package that writes variables requires a license that supports variables.',
		);
	}
	if (hasCreations) assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:create']);
	if (hasOverwrites) assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:update']);
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

/**
 * Archiving or unarchiving a matched workflow needs the same scope as deleting one. Checked
 * against the plan, so a package that changes no archived state needs no extra scope.
 */
export function assertArchiveTransitionsAllowed(
	apiKeyScopes: string[] | undefined,
	workflowPlans: WorkflowImportPlan[],
): void {
	const hasTransitions = workflowPlans.some((plan) =>
		plan.items.some((item) => item.action === 'update' && item.archiveTransition !== null),
	);
	if (hasTransitions) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['workflow:delete']);
	}
}
