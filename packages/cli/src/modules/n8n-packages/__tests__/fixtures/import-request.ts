import type { ImportPackageRequest } from '../../n8n-packages.types';

/**
 * Every import option a request must carry, so a test states only the ones it exercises. Adding an
 * option to `ImportPackageRequest` means editing this once rather than every suite's helper.
 *
 * `variableParentPolicy` is deliberately absent: project packages reject it outright, so it has to
 * stay opt-in per suite.
 */
const DEFAULTS = {
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	workflowConflictPolicy: 'fail',
	workflowPublishingPolicy: 'preserve-published-state',
	workflowIdPolicy: 'new',
	missingNodeTypeMode: 'fail',
	projectConflictPolicy: 'merge',
	folderConflictPolicy: 'merge',
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: 'create',
	dataTableSchemaConflictPolicy: 'keep-existing',
	variableMissingMode: 'do-nothing',
	variableConflictPolicy: 'keep-existing',
	tagMissingMode: 'create',
	tagConflictPolicy: 'skip',
} as const satisfies Partial<ImportPackageRequest>;

export function importPackageRequest(
	overrides: Pick<ImportPackageRequest, 'user' | 'packageBuffer'> & Partial<ImportPackageRequest>,
): ImportPackageRequest {
	return { ...DEFAULTS, ...overrides };
}
