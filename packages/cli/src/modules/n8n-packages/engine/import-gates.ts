import type { LicenseState } from '@n8n/backend-common';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { variableMissingModeCreates } from '../entities/variable/variable-missing-mode';
import { TagConflictPolicy, TagMissingMode } from '../n8n-packages.types';
import type { VariableMissingMode } from '../n8n-packages.types';

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
 * Callers decide `hasRequirements`, because each package shape looks at a different set: the
 * workflow path narrows the manifest's requirement list to the workflows it is importing, while a
 * project package takes that list whole, since it imports every project the package holds.
 */
export function assertVariableCreationAllowed(options: {
	licenseState: LicenseState;
	apiKeyScopes: string[] | undefined;
	missingMode: VariableMissingMode;
	hasRequirements: boolean;
}): void {
	const { licenseState, apiKeyScopes, missingMode, hasRequirements } = options;
	if (!hasRequirements || !variableMissingModeCreates(missingMode)) return;

	if (!licenseState.isVariablesLicensed()) {
		throw new ForbiddenError(
			'Your license does not allow variables. Importing a package that creates variables requires a license that supports variables.',
		);
	}
	assertPackageImportApiKeyScopes(apiKeyScopes, ['variable:create']);
}

export function assertTagWritesAllowed(options: {
	apiKeyScopes: string[] | undefined;
	missingMode: TagMissingMode;
	conflictPolicy: TagConflictPolicy;
	hasRequirements: boolean;
	tagsDisabled: boolean;
}): void {
	const { apiKeyScopes, missingMode, conflictPolicy, hasRequirements, tagsDisabled } = options;
	// A tags-disabled instance imports tag-bearing packages as a silent tag
	// no-op, so no tag write ever happens and no tag scope is required.
	if (tagsDisabled || !hasRequirements) return;

	if (missingMode === TagMissingMode.Create) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:create']);
	}
	if (conflictPolicy === TagConflictPolicy.Rename) {
		assertPackageImportApiKeyScopes(apiKeyScopes, ['tag:update']);
	}
}
