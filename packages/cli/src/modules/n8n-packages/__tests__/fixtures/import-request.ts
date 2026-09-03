import type { ImportPackageRequest } from '../../n8n-packages.types';

/**
 * Every import option a request must carry, so a test states only the ones it exercises. Adding an
 * option to `ImportPackageRequest` means editing this once rather than every suite's helper.
 *
 * `variableParentPolicy` and `folderConflictPolicy` are deliberately absent: the first is rejected
 * outright by project packages, and the second defaults to whatever `projectConflictPolicy` is, so
 * pinning it here would hide that inheritance from the suites that exercise it.
 */
const DEFAULTS = {
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	workflowConflictPolicy: 'fail',
	workflowPublishingPolicy: 'preserve-published-state',
	workflowIdPolicy: 'new',
	missingNodeTypeMode: 'fail',
	projectConflictPolicy: 'merge',
	overwriteDeletionPolicy: 'archive',
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
