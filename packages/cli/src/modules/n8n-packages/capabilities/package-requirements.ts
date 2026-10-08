import type { WorkflowEntity } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';

import { PackageExportBlockedError } from '../entities/package-export.errors';
import { getStaticSubworkflowId } from '../entities/workflow/references/sub-workflow-node.reference';
import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import type {
	PackageNodeTypeRequirement,
	PackageRequirements,
	PackageVariableRequirement,
	PackageWorkflowRequirement,
} from '../spec/requirements.schema';

export type CredentialSummary = { name: string; type: string };

/** What another instance must have, so that the exported workflow runs there. */
export type WorkflowPackageRequirements = {
	nodeTypes: string[];
	credentials: CredentialSummary[];
};

export type NodeTypeVersion = Pick<PackageNodeTypeRequirement, 'type' | 'typeVersion'>;

/** A node type and version as one string, for example "n8n-nodes-base.slack@2.3". */
export function nodeTypeLabel({ type, typeVersion }: NodeTypeVersion): string {
	return `${type}@${typeVersion}`;
}

/** The values once each, in sort order. */
export function uniqueSorted(values: readonly string[]): string[] {
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

/** A workflow as the tool texts name it, for example "Alert the team" (wf-1). */
export function workflowLabel({ id, name }: Pick<PackageWorkflowRequirement, 'id' | 'name'>): string {
	return name === undefined ? `"${id}"` : `"${name}" (${id})`;
}

/**
 * What the package does not copy: the workflows that it refers to but does not hold. After
 * {@link assertNoSubWorkflowCalls}, such a reference is the error workflow of the workflow.
 */
export function notCopiedWorkflowWarnings(
	references: readonly Pick<PackageWorkflowRequirement, 'id' | 'name'>[] = [],
	errorWorkflowId: string | undefined,
): string[] {
	return references.map((reference) => {
		const label = workflowLabel(reference);
		return reference.id === errorWorkflowId
			? `The package does not hold the error workflow ${label}. A new copy keeps the link only if the user who imports it can use that workflow there. Otherwise, choose an error workflow in the settings of the copy.`
			: `The package refers to workflow ${label}, but does not hold it.`;
	});
}

/**
 * The variables that the workflow uses. The package holds their names only, so the instance that
 * imports it must have them.
 */
export function notCopiedVariablesWarning(
	variables: readonly Pick<PackageVariableRequirement, 'name'>[] = [],
): string | undefined {
	const names = uniqueSorted(variables.map(({ name }) => name));
	if (names.length === 0) return undefined;
	return `The workflow uses ${names.length} variable(s): ${names.join(', ')}. The package holds their names, but not their values. Make sure that the instance that imports the package has them.`;
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
