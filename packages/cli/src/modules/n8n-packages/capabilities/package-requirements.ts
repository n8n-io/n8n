import type { WorkflowEntity } from '@n8n/db';
import { BadRequestError, UnexpectedError } from '@n8n/errors';

import { PackageExportBlockedError } from '../entities/package-export.errors';
import { getStaticSubworkflowId } from '../entities/workflow/references/sub-workflow-node.reference';
import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';
import type { ImportResult } from '../n8n-packages.types';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import type {
	PackageNodeTypeRequirement,
	PackageRequirements,
	PackageWorkflowRequirement,
} from '../spec/requirements.schema';

export type CredentialSummary = { name: string; type: string };

export type CredentialNeedingSetup = CredentialSummary & { id: string };

/** What another instance must have, so that the exported workflow runs there. */
export type WorkflowPackageRequirements = {
	nodeTypes: string[];
	credentials: CredentialSummary[];
};

export type ImportedWorkflowPackage = {
	workflowId: string;
	workflowName: string;
	created: boolean;
	credentialsNeedingSetup: CredentialNeedingSetup[];
	missingNodeTypes: string[];
	warnings: string[];
};

type NodeTypeVersion = Pick<PackageNodeTypeRequirement, 'type' | 'typeVersion'>;

/** A node type and version as one string, for example "n8n-nodes-base.slack@2.3". */
export function nodeTypeLabel({ type, typeVersion }: NodeTypeVersion): string {
	return `${type}@${typeVersion}`;
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort();
}

function countOf(entries: readonly unknown[] | undefined): number {
	return entries?.length ?? 0;
}

function compareCredentials(a: CredentialSummary, b: CredentialSummary): number {
	return a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
}

/** Node types as sorted unique "type@version" labels. */
export function nodeTypeLabels(nodeTypes: readonly NodeTypeVersion[] = []): string[] {
	return uniqueSorted(nodeTypes.map(nodeTypeLabel));
}

/**
 * The requirements in the manifest of an exported package. Credentials with the same name and
 * type show once, because the import matches credentials by name and type.
 */
export function summariseRequirements(
	requirements: PackageRequirements | undefined,
): WorkflowPackageRequirements {
	const credentials = new Map<string, CredentialSummary>();
	for (const { name, type } of requirements?.credentials ?? []) {
		credentials.set(JSON.stringify([name, type]), { name, type });
	}
	return {
		nodeTypes: nodeTypeLabels(requirements?.nodeTypes),
		credentials: [...credentials.values()].sort(compareCredentials),
	};
}

/** The other workflows that a workflow calls by a fixed ID, sorted and unique. */
export function staticSubWorkflowIds(workflow: Pick<WorkflowEntity, 'id' | 'nodes'>): string[] {
	const ids = (workflow.nodes ?? []).flatMap((node) => {
		const id = getStaticSubworkflowId(node);
		return id === undefined || id === workflow.id ? [] : [id];
	});
	return uniqueSorted(ids);
}

/**
 * Stops the export of a workflow that calls a sub-workflow by a fixed ID. A package holds one
 * workflow only, so the copy would call a workflow that the other instance does not have.
 */
export function assertNoSubWorkflowCalls(workflow: Pick<WorkflowEntity, 'id' | 'nodes'>): void {
	const ids = staticSubWorkflowIds(workflow);
	if (ids.length === 0) return;
	throw new PackageExportBlockedError(
		`The workflow calls ${ids.length} sub-workflow(s) by a fixed ID, and a package holds one workflow only. Export aborted.`,
		{ description: `Sub-workflow IDs: ${ids.join(', ')}` },
	);
}

/**
 * What the package does not copy: the workflows that it refers to but does not hold. After
 * {@link assertNoSubWorkflowCalls}, such a reference is the error workflow of the workflow.
 */
export function notCopiedWorkflowWarnings(
	references: readonly Pick<PackageWorkflowRequirement, 'id' | 'name'>[] = [],
	errorWorkflowId: string | undefined,
): string[] {
	return references.map(({ id, name }) => {
		const label = name === undefined ? `"${id}"` : `"${name}" (${id})`;
		return id === errorWorkflowId
			? `The error workflow ${label} is not in the package. Choose an error workflow for the copy in its workflow settings.`
			: `The package refers to workflow ${label}, but does not hold it.`;
	});
}

/**
 * The one workflow of a package that the import tool accepts. A project package or a package
 * with more than one workflow would make `workflowId` and `created` ambiguous, and the export
 * tool never puts folders in a package.
 */
export function singleWorkflowEntry(
	manifest: Pick<PackageManifest, 'workflows' | 'folders' | 'projects'>,
	expectedSourceWorkflowId?: string,
): ManifestEntry {
	const [entry, ...otherWorkflows] = manifest.workflows ?? [];
	const folderCount = countOf(manifest.folders);
	const projectCount = countOf(manifest.projects);
	if (entry === undefined || otherWorkflows.length > 0 || folderCount + projectCount > 0) {
		throw new BadRequestError(
			`The package must contain exactly one workflow and no folders or projects, but it contains ${countOf(manifest.workflows)} workflow(s), ${folderCount} folder(s) and ${projectCount} project(s). Use a package from export_workflow_package.`,
		);
	}
	if (expectedSourceWorkflowId !== undefined && entry.id !== expectedSourceWorkflowId) {
		throw new BadRequestError(
			`The package contains workflow "${entry.id}", not workflow "${expectedSourceWorkflowId}".`,
		);
	}
	return entry;
}

/**
 * Stops the import of an archived workflow. The export tools never put one in a package, and an
 * update with it would archive the workflow on this instance.
 */
export function assertNoArchivedWorkflow(
	workflows: readonly Pick<PreparedWorkflow, 'sourceArchived'>[],
): void {
	if (workflows.some(({ sourceArchived }) => sourceArchived)) {
		throw new BadRequestError(
			'The package holds an archived workflow. Restore the workflow, then export it again.',
		);
	}
}

/**
 * The stub credentials that this import created, with their new ids. A stub has no data, so the
 * user must set it up before the workflow can run.
 */
export function credentialsNeedingSetup(
	result: Pick<ImportResult, 'credentials' | 'bindings'>,
	requirements: PackageRequirements | undefined,
): CredentialNeedingSetup[] {
	const bySourceId = new Map((requirements?.credentials ?? []).map((c) => [c.id, c]));
	return result.credentials.stubbed.flatMap((sourceId) => {
		const requirement = bySourceId.get(sourceId);
		const id = result.bindings.credentials[sourceId];
		if (requirement === undefined || id === undefined) return [];
		return [{ name: requirement.name, type: requirement.type, id }];
	});
}

type DataTableOutcome = Pick<ImportResult, 'dataTables'>['dataTables'];

/** The data tables that the workflow uses but that the import neither found nor created. */
function missingDataTablesWarning(
	outcome: DataTableOutcome,
	requirements: PackageRequirements | undefined,
): string | undefined {
	const required = requirements?.dataTables ?? [];
	const missing = required.length - outcome.matched - outcome.created;
	if (missing <= 0) return undefined;
	const names = uniqueSorted(required.map(({ name }) => name)).join(', ');
	return `${missing} of the ${required.length} data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: ${names}. Create the missing tables, then select them in the workflow.`;
}

/** What the import left out or created empty, so that the user can complete the copy. */
export function importWarnings(
	result: Pick<ImportResult, 'tags' | 'dataTables'>,
	requirements: PackageRequirements | undefined,
): string[] {
	const warnings: string[] = [];
	const skippedTags = uniqueSorted(result.tags.skipped);
	if (skippedTags.length > 0) {
		warnings.push(
			`The import did not add ${skippedTags.length} tag(s), because this instance does not have them: ${skippedTags.join(', ')}.`,
		);
	}
	if (result.dataTables.created > 0) {
		warnings.push(
			`The import created ${result.dataTables.created} empty data table(s) for the workflow. The package holds no rows.`,
		);
	}
	const missingDataTables = missingDataTablesWarning(result.dataTables, requirements);
	if (missingDataTables !== undefined) warnings.push(missingDataTables);
	return warnings;
}

type ImportSummaryInput = {
	result: Pick<ImportResult, 'workflows' | 'credentials' | 'bindings' | 'tags' | 'dataTables'>;
	sourceWorkflowId: string;
	requirements: PackageRequirements | undefined;
	missingNodeTypes: readonly NodeTypeVersion[];
};

/** The outcome of importing a one-workflow package, as the import tool reports it. */
export function summariseImport(input: ImportSummaryInput): ImportedWorkflowPackage {
	const { result, sourceWorkflowId, requirements, missingNodeTypes } = input;
	const workflow = result.workflows.find((w) => w.sourceWorkflowId === sourceWorkflowId);
	if (workflow === undefined) {
		throw new UnexpectedError('The import result does not include the workflow of the package', {
			extra: { sourceWorkflowId },
		});
	}
	return {
		workflowId: workflow.localId,
		workflowName: workflow.name,
		created: workflow.status === 'created',
		credentialsNeedingSetup: credentialsNeedingSetup(result, requirements),
		missingNodeTypes: nodeTypeLabels(missingNodeTypes),
		warnings: importWarnings(result, requirements),
	};
}
