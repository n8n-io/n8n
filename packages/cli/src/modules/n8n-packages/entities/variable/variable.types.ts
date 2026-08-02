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

export type PlacedVariableRequirement = PackageVariableRequirement & {
	/** When true a created stub lands at global scope; otherwise in the context's project. */
	globalPlacement: boolean;
};

export interface VariableImportRequest {
	requirements: PlacedVariableRequirement[] | undefined;
	missingMode: VariableMissingMode;
}

export interface VariableResolutionFailure {
	name: string;
	usedByWorkflows: string[];
}

export interface VariableCreation {
	name: string;
	projectId?: string;
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
}

export interface VariableApplyResult {
	stubbed: string[];
	skippedExisting: string[];
	createdCount: number;
}
