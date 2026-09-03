import type { TagImportPlan } from '../entities/tag/tag.types';
import type { VariableApplyResult, VariableImportPlan } from '../entities/variable/variable.types';
import type {
	PersistedWorkflowOutcome,
	PreparedWorkflow,
} from '../entities/workflow/workflow-import.types';
import type { PackagePublishingResults } from '../entities/workflow/workflow-publisher';
import { serializeBindings } from '../n8n-packages.types';
import type {
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	ImportBindingMap,
	ImportCredentialSummary,
	ImportDataTableSummary,
	ImportedAgentSummary,
	ImportedFolderSummary,
	ImportedProjectSummary,
	ImportedWorkflowSummary,
	ImportPackageSummary,
	ImportResult,
	ImportTagSummary,
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

/**
 * One row per imported workflow, folding in what the publish phase decided for it. Ordered as the
 * workflows were written, not as they were published (dependencies first), which is an
 * implementation detail. Publishing reloads the workflow, so its copy wins where it has one; a
 * workflow the phase never acted on — a skip — keeps the state it had and reports `unchanged`.
 */
export function toImportedWorkflowSummaries(
	outcomes: PersistedWorkflowOutcome[],
	projectId: string,
	published: PackagePublishingResults,
): ImportedWorkflowSummary[] {
	return outcomes.map(({ workflow, sourceWorkflowId, status }) => {
		const result = published.get(sourceWorkflowId);
		const current = result?.workflow ?? workflow;

		return {
			sourceWorkflowId,
			localId: current.id,
			name: current.name,
			projectId,
			parentFolderId: current.parentFolder?.id ?? null,
			activeVersionId: current.activeVersionId ?? null,
			publishing: result?.publishing ?? { state: 'unchanged' },
			status,
		};
	});
}

export function buildImportResult(input: {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	removedWorkflows: RemovedWorkflowSummary[];
	removedFolders: RemovedFolderSummary[];
	folders: ImportedFolderSummary[];
	projects: ImportedProjectSummary[];
	agents: ImportedAgentSummary[];
	bindings: PackageImportBindings;
	credentials: ImportCredentialSummary;
	dataTables: ImportDataTableSummary;
	variables: ImportVariableSummary;
	tags: ImportTagSummary;
}): ImportResult {
	return {
		package: input.package,
		workflows: input.workflows,
		removedWorkflows: input.removedWorkflows,
		removedFolders: input.removedFolders,
		folders: input.folders,
		projects: input.projects,
		agents: input.agents,
		bindings: serializeBindings(input.bindings),
		credentials: input.credentials,
		dataTables: input.dataTables,
		variables: input.variables,
		tags: input.tags,
	};
}

export function reconcileVariableSummary(input: {
	matched: Iterable<string>;
	missing: Iterable<string>;
	created: Iterable<string>;
	stubbed: Iterable<string>;
	skipped: Iterable<string>;
	updated: Iterable<string>;
}): ImportVariableSummary {
	const matched = new Set(input.matched);
	const created = new Set(input.created);
	const stubbed = new Set(input.stubbed);
	const skipped = new Set(input.skipped);
	const updated = new Set(input.updated);

	// A skipped name that no scope of this import created genuinely pre-existed, so it counts as matched.
	for (const name of skipped) {
		if (!created.has(name) && !stubbed.has(name)) matched.add(name);
	}

	// An overwritten name matched first, but the import rewrote it, so `updated` wins.
	for (const name of updated) {
		matched.delete(name);
	}

	return {
		matched: [...matched],
		created: [...created],
		stubbed: [...stubbed],
		updated: [...updated],
		missing: [...new Set(input.missing)].filter(
			(name) => !created.has(name) && !stubbed.has(name) && !skipped.has(name),
		),
	};
}

export function toVariableSummary(
	plan: VariableImportPlan,
	result: VariableApplyResult,
): ImportVariableSummary {
	return reconcileVariableSummary({
		matched: plan.matched,
		missing: plan.missing.map(({ name }) => name),
		created: result.created,
		stubbed: result.stubbed,
		skipped: result.skippedExisting,
		updated: result.updated,
	});
}

/** Tag names (renames report the post-rename name). */
export function toTagSummary(plan: TagImportPlan): ImportTagSummary {
	return {
		matched: plan.matched.map(({ name }) => name),
		created: plan.creations.map(({ name }) => name),
		renamed: plan.renames.map(({ to }) => to),
		reconciled: plan.reconciles.map(({ name }) => name),
		skipped: plan.dropped.map(({ name }) => name),
	};
}

/** Set-unions per-scope tag summaries: one global tag planned by several scopes reports once. */
export function unionTagSummaries(summaries: ImportTagSummary[]): ImportTagSummary {
	return {
		matched: [...new Set(summaries.flatMap(({ matched }) => matched))],
		created: [...new Set(summaries.flatMap(({ created }) => created))],
		renamed: [...new Set(summaries.flatMap(({ renamed }) => renamed))],
		reconciled: [...new Set(summaries.flatMap(({ reconciled }) => reconciled))],
		skipped: [...new Set(summaries.flatMap(({ skipped }) => skipped))],
	};
}

/**
 * Keeps only the requirements used by the imported workflows, trimming `usedByWorkflows` to match.
 */
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
