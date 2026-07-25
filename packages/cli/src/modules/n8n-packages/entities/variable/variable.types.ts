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

export interface VariableImportRequest {
	requirements: PackageVariableRequirement[] | undefined;
	missingMode: VariableMissingMode;
}

export interface VariableResolutionFailure {
	name: string;
	usedByWorkflows: string[];
}

export function createFailure(requirement: PackageVariableRequirement): VariableResolutionFailure {
	return {
		name: requirement.name,
		usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
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
}
