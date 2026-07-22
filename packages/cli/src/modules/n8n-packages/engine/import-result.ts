import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type {
	PreparedWorkflow,
	WorkflowImportOutcome,
} from '../entities/workflow/workflow-import.types';
import { serializeBindings } from '../n8n-packages.types';
import type {
	ImportBindingMap,
	ImportCredentialSummary,
	ImportedFolderSummary,
	ImportedProjectSummary,
	ImportedWorkflowSummary,
	ImportPackageSummary,
	ImportResult,
	ImportVariableSummary,
	PackageImportBindings,
} from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../spec/requirements.schema';

export function toPackageSummary(manifest: PackageManifest): ImportPackageSummary {
	return {
		sourceN8nVersion: manifest.sourceN8nVersion,
		sourceId: manifest.sourceId,
		exportedAt: manifest.exportedAt,
	};
}

export function toImportedWorkflowSummaries(
	outcomes: WorkflowImportOutcome[],
	projectId: string,
): ImportedWorkflowSummary[] {
	return outcomes.map(({ workflow, sourceWorkflowId, status, publishing }) => ({
		sourceWorkflowId,
		localId: workflow.id,
		name: workflow.name,
		projectId,
		parentFolderId: workflow.parentFolder?.id ?? null,
		activeVersionId: workflow.activeVersionId ?? null,
		publishing,
		status,
	}));
}

export function buildImportResult(input: {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	folders: ImportedFolderSummary[];
	projects: ImportedProjectSummary[];
	bindings: PackageImportBindings;
	credentials: ImportCredentialSummary;
	variables: ImportVariableSummary;
}): ImportResult {
	return {
		package: input.package,
		workflows: input.workflows,
		folders: input.folders,
		projects: input.projects,
		bindings: serializeBindings(input.bindings),
		credentials: input.credentials,
		variables: input.variables,
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

/** Keeps only the requirements used by the imported workflows, trimming `usedByWorkflows` to match. */
export function identifyRequirements<T extends { usedByWorkflows: string[] }>(
	requirements: T[] | undefined,
	workflows: PreparedWorkflow[],
): T[] | undefined {
	if (!requirements) return undefined;

	const importedIds = new Set(workflows.map((workflow) => workflow.sourceWorkflowId));
	return requirements
		.map((requirement) => ({
			...requirement,
			usedByWorkflows: requirement.usedByWorkflows.filter((id) => importedIds.has(id)),
		}))
		.filter((requirement) => requirement.usedByWorkflows.length > 0);
}

/**
 * Restricts explicit credential bindings to those a scope's requirements declare. A project package
 * shares one binding map across every project, but each project only sees its own requirements — without
 * this, a binding for a credential used solely in another project looks orphaned and blocks the import.
 */
export function scopeCredentialBindingsToRequirements(
	bindings: ImportBindingMap | undefined,
	requirements: PackageCredentialRequirement[] | undefined,
): ImportBindingMap | undefined {
	if (!bindings) return undefined;

	const requirementIds = new Set((requirements ?? []).map((requirement) => requirement.id));
	return new Map([...bindings].filter(([sourceId]) => requirementIds.has(sourceId)));
}
