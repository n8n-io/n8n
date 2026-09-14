import type { User } from '@n8n/db';

import type { PackageWriter } from '../../io/package-writer';
import type { VariableConflictPolicy, VariableMissingMode } from '../../n8n-packages.types';
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
	globalPlacement: boolean;
	/** Value of the variable file the package bundles for this scope, if any. */
	packageValue?: string;
};

export interface VariableImportRequest {
	requirements: PlacedVariableRequirement[] | undefined;
	missingMode: VariableMissingMode;
	conflictPolicy: VariableConflictPolicy;
}

export interface VariableResolutionFailure {
	name: string;
	usedByWorkflows: string[];
}

export interface VariableCreation {
	name: string;
	projectId?: string;
	value?: string;
	usedByWorkflows: string[];
}

export interface VariableConflict {
	name: string;
	projectId?: string;
	usedByWorkflows: string[];
}

export interface VariableOverwrite {
	variableId: string;
	name: string;
	projectId?: string;
	value: string;
	usedByWorkflows: string[];
}

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

/**
 * Scopes resolve independently, so two can land on one row — a global neither shadows — and disagree
 * about its value, where the last write would silently win.
 */
export function divergentOverwrites(overwrites: VariableOverwrite[]): VariableConflict[] {
	const firstValueByRow = new Map<string, string>();
	const divergent = new Set<string>();
	for (const { variableId, value } of overwrites) {
		const seen = firstValueByRow.get(variableId);
		if (seen === undefined) firstValueByRow.set(variableId, value);
		else if (seen !== value) divergent.add(variableId);
	}

	return overwrites
		.filter(({ variableId }) => divergent.has(variableId))
		.map(({ variableId, value, ...conflict }) => conflict);
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
	creations: VariableCreation[];
	conflicts: VariableConflict[];
	overwrites: VariableOverwrite[];
}

export interface VariableApplyResult {
	created: string[];
	stubbed: string[];
	skippedExisting: string[];
	updated: string[];
}
