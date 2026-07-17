import type { User } from '@n8n/db';

import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageVariableRequirement } from '../../spec/requirements.schema';
import type { VariableMissingPolicy } from '../../n8n-packages.types';

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
	missingPolicy: VariableMissingPolicy;
}

export interface VariableImportPlan {
	/** Requirement names that resolve in the target project or at the global level. */
	matched: string[];
	/** Requirement names with no match in the lookup scope. Reported as warnings under `do-nothing`. */
	missing: string[];
}
