import type { User } from '@n8n/db';

import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageVariableRequirement } from '../../spec/requirements.schema';
import type { VariableMissingMode } from '../../n8n-packages.types';

export interface WorkflowVariableRequirement {
	workflowId: string;
	variableName: string;
}

export interface VariableExportRequest {
	user: User;
	requirements: WorkflowVariableRequirement[];
	writer: PackageWriter;
	includeVariableValues: boolean;
	projectTargetsById?: Map<string, string>;
}

export interface VariableExportResult {
	entries: ManifestEntry[];
	requirements: PackageVariableRequirement[];
}

/**
 * A package variable requirement annotated with its resolved creation scope.
 * `globalPlacement` is precomputed by the package importers (the caller's parent
 * policy for workflow/folder packages, the package layout for project packages),
 * so the importer never inspects policies or manifests itself.
 */
export type PlacedVariableRequirement = PackageVariableRequirement & {
	/** When true a created stub lands at global scope; otherwise in the context's project. */
	globalPlacement: boolean;
};

/**
 * Decodes the package layout the exporter wrote (see `resolveBaseDir` in variable.exporter.ts)
 * back into a placement for one project scope: the scope's own bundled entry
 * (`<projectTarget>/variables/…`) wins, else a top-level entry (`variables/…`) means global,
 * else (name-only, or bundled under a different project) fall back to the consuming project.
 */
export function isRequirementAGlobalVariable(
	manifestVariables: ManifestEntry[] | undefined,
	projectTarget: string,
	name: string,
): boolean {
	const entries = (manifestVariables ?? []).filter((entry) => entry.name === name);
	if (entries.some((entry) => entry.target.startsWith(`${projectTarget}/variables/`))) return false;
	if (entries.some((entry) => entry.target.startsWith('variables/'))) return true;
	return false;
}

export interface VariableImportRequest {
	requirements: PlacedVariableRequirement[] | undefined;
	missingMode: VariableMissingMode;
}

export interface VariableResolutionFailure {
	name: string;
	usedByWorkflows: string[];
}

/** A variable the import would create as an empty stub, with its resolved destination. */
export interface VariableCreation {
	name: string;
	projectId?: string;
	usedByWorkflows: string[];
}

/** Reports that creating the planned stubs would exceed the instance variable quota. */
export interface VariableLimitFailure {
	limit: number;
	requested: number;
	names: string[];
}

export function createFailure(requirement: PackageVariableRequirement): VariableResolutionFailure {
	return {
		name: requirement.name,
		usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
	};
}

/** Deduplicates planned creations by their exact destination (`global:<name>` / `project:<id>:<name>`). */
export function dedupeCreationsByDestination(creations: VariableCreation[]): VariableCreation[] {
	const byDestination = new Map<string, VariableCreation>();
	for (const creation of creations) {
		const key = creation.projectId
			? `project:${creation.projectId}:${creation.name}`
			: `global:${creation.name}`;
		if (!byDestination.has(key)) byDestination.set(key, creation);
	}
	return [...byDestination.values()];
}

/**
 * Returns a limit failure when creating `creations` would exceed the instance
 * variable quota, else `undefined`. Shared by the workflow-package per-scope
 * check and the project-package aggregate check so the two cannot drift.
 * A `cap` of -1 means unlimited.
 */
export function computeVariableLimitFailure(
	creations: VariableCreation[],
	cachedCount: number,
	cap: number,
): VariableLimitFailure | undefined {
	if (cap < 0 || creations.length === 0) return undefined;
	if (cachedCount + creations.length <= cap) return undefined;
	return {
		limit: cap,
		requested: creations.length,
		names: [...new Set(creations.map((creation) => creation.name))].sort(),
	};
}

export interface VariableImportPlan {
	/** Requirement names that resolve in the target project or at the global level. */
	matched: string[];
	/**
	 * Unresolved requirements. Named `missing` (not `failures`) because they are
	 * only warnings under `do-nothing`; they block the import under `must-preexist`.
	 */
	missing: VariableResolutionFailure[];
	/** Stubs to create under `create-stub`; empty for every other missing mode. */
	creations: VariableCreation[];
	/** Set when the planned creations would exceed the instance variable quota. */
	limitFailure?: VariableLimitFailure;
}

export interface VariableApplyResult {
	/** Names created by this import (one entry per name, even if created in several projects). */
	stubbed: string[];
	/** Planned creations skipped because the exact destination was already occupied. */
	skippedExisting: string[];
	/** Rows actually created (skips excluded) — feeds telemetry. */
	createdCount: number;
}
