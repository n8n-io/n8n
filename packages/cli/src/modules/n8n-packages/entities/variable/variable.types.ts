import { variableValueSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';

import type { PackageWriter } from '../../io/package-writer';
import type { VariableMissingMode } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageVariableRequirement } from '../../spec/requirements.schema';

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

export type PlacedVariableRequirement = PackageVariableRequirement & {
	/** When true a created variable lands at global scope; otherwise in the context's project. */
	globalPlacement: boolean;
};

/**
 * Chooses the manifest entry for one scope from the package layout written by
 * `VariableExporter`: the scope's own entry wins, then a top-level entry.
 * Multiple entries at the winning tier are ambiguous and reject the import.
 */
export function pickManifestVariableEntry(
	manifestVariables: ManifestEntry[] | undefined,
	projectTarget: string | undefined,
	name: string,
): ManifestEntry | undefined {
	const entries = (manifestVariables ?? []).filter((entry) => entry.name === name);
	const projectEntries = projectTarget
		? entries.filter((entry) => entry.target.startsWith(`${projectTarget}/variables/`))
		: [];
	const topLevelEntries = entries.filter((entry) => entry.target.startsWith('variables/'));
	const winningEntries = projectEntries.length > 0 ? projectEntries : topLevelEntries;

	if (winningEntries.length > 1) {
		throw new UserError(`Package contains ambiguous variable entries for "${name}".`);
	}

	return winningEntries[0];
}

export function validateVariableRequirementValue(
	value: string | undefined,
	name: string,
): string | undefined {
	if (value === undefined) return undefined;
	const result = variableValueSchema.safeParse(value);
	if (!result.success) {
		throw new UserError(`Package variable requirement "${name}" has an invalid value.`, {
			cause: result.error,
		});
	}
	return result.data;
}

export interface VariableImportRequest {
	requirements: PlacedVariableRequirement[] | undefined;
	missingMode: VariableMissingMode;
}

export interface VariableResolutionFailure {
	name: string;
	usedByWorkflows: string[];
}

/** A variable the import would create, with its resolved destination and optional package value. */
export interface VariableCreation {
	name: string;
	projectId?: string;
	value?: string;
	usedByWorkflows: string[];
}

/** Reports that creating the planned variables would exceed the instance variable quota. */
export interface VariableLimitFailure {
	limit: number;
	remaining: number;
	requested: number;
	names: string[];
	usedByWorkflows: string[];
}

export function createFailure(requirement: PackageVariableRequirement): VariableResolutionFailure {
	return {
		name: requirement.name,
		usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
	};
}

export function destinationKey(destination: { name: string; projectId?: string }): string {
	return destination.projectId
		? `project:${destination.projectId}:${destination.name}`
		: `global:${destination.name}`;
}

export function dedupeCreationsByDestination(creations: VariableCreation[]): VariableCreation[] {
	const byDestination = new Map<string, VariableCreation>();
	for (const creation of creations) {
		const key = destinationKey(creation);
		const existing = byDestination.get(key);
		if (!existing) {
			// Copied because the caller goes on to apply these creations.
			byDestination.set(key, { ...creation, usedByWorkflows: [...creation.usedByWorkflows] });
			continue;
		}
		existing.usedByWorkflows = [
			...new Set([...existing.usedByWorkflows, ...creation.usedByWorkflows]),
		].sort();
	}
	return [...byDestination.values()];
}

/** Reports the planned creations that do not fit the remaining quota. `quota` of `null` means unlimited. */
export function computeVariableLimitFailure(
	creations: VariableCreation[],
	quota: { limit: number; remaining: number } | null,
): VariableLimitFailure | undefined {
	if (quota === null || creations.length === 0) return undefined;
	if (creations.length <= quota.remaining) return undefined;
	return {
		limit: quota.limit,
		remaining: quota.remaining,
		requested: creations.length,
		names: [...new Set(creations.map((creation) => creation.name))].sort(),
		usedByWorkflows: [...new Set(creations.flatMap((creation) => creation.usedByWorkflows))].sort(),
	};
}

export interface VariableImportPlan {
	matched: string[];
	missing: VariableResolutionFailure[];
	/** Variables to create under a creation-capable missing mode. */
	creations: VariableCreation[];
}

export interface VariableApplyResult {
	/** Names created with a package value (one entry per name, even across projects). */
	created: string[];
	/** Names created without a package value. */
	stubbed: string[];
	skippedExisting: string[];
	/** All rows actually created, valued and stubbed (skips excluded) — feeds telemetry. */
	createdCount: number;
}
