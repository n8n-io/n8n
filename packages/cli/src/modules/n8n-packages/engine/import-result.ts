import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { WorkflowImportOutcome } from '../entities/workflow/workflow-import.types';
import { serializeBindings } from '../n8n-packages.types';
import type {
	ImportCredentialSummary,
	ImportedFolderSummary,
	ImportPackageSummary,
	ImportResult,
	PackageImportBindings,
} from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';

export function toPackageSummary(manifest: PackageManifest): ImportPackageSummary {
	return {
		sourceN8nVersion: manifest.sourceN8nVersion,
		sourceId: manifest.sourceId,
		exportedAt: manifest.exportedAt,
	};
}

/** Assembles the wire {@link ImportResult} from each entity importer's outcome. */
export function buildImportResult(input: {
	package: ImportPackageSummary;
	projectId: string | null;
	workflows: WorkflowImportOutcome[];
	folders: ImportedFolderSummary[];
	bindings: PackageImportBindings;
	credentials?: ImportCredentialSummary;
}): ImportResult {
	return {
		package: input.package,
		workflows: input.workflows.map(({ workflow, sourceWorkflowId, status, publishing }) => ({
			sourceWorkflowId,
			localId: workflow.id,
			name: workflow.name,
			projectId: input.projectId ?? '',
			parentFolderId: workflow.parentFolder?.id ?? null,
			activeVersionId: workflow.activeVersionId ?? null,
			publishing,
			status,
		})),
		folders: input.folders,
		bindings: serializeBindings(input.bindings),
		credentials: input.credentials ?? { matched: [], stubbed: [] },
	};
}

/**
 * Asserts the caller's API key carries the scopes the package's contents require (public API only).
 * Internal callers omit `apiKeyScopes` and are authorized by user RBAC alone.
 */
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
