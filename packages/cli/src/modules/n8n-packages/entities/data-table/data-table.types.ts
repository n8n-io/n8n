import type {
	DataTableMatchingMode,
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
} from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';

export interface WorkflowDataTableRequirement {
	workflowId: string;
	dataTableId: string;
}

export type DataTableResolutionFailureKind =
	| 'missing'
	| 'id-conflict'
	| 'name-conflict'
	| 'schema-incompatible'
	| 'module-disabled'
	| 'permission-denied';

export type DataTableColumnTypeMismatch = {
	column: string;
	expectedType: string;
	actualType: string;
};

export type DataTableResolutionFailure = {
	kind: DataTableResolutionFailureKind;
	/** Absent for import-wide failures (`module-disabled`, `permission-denied`). */
	sourceId?: string;
	name?: string;
	/** For `id-conflict`: the project owning the conflicting target table. */
	existingProjectId?: string;
	/** For `schema-incompatible`: package columns absent from the target table. */
	missingColumns?: string[];
	/** For `schema-incompatible`: package columns whose target type differs. */
	typeMismatches?: DataTableColumnTypeMismatch[];
	/** For `schema-incompatible` under the `fail` policy: target columns not in the package schema. */
	extraColumns?: string[];
	usedByWorkflows: string[];
};

export function createFailure(
	requirement: PackageDataTableRequirement,
	kind: DataTableResolutionFailureKind,
	details: Partial<
		Pick<
			DataTableResolutionFailure,
			'existingProjectId' | 'missingColumns' | 'typeMismatches' | 'extraColumns'
		>
	> = {},
): DataTableResolutionFailure {
	return {
		kind,
		sourceId: requirement.id,
		name: requirement.name,
		usedByWorkflows: [...new Set(requirement.usedByWorkflows)].sort(),
		...details,
	};
}

export interface DataTableImportRequest {
	requirements: PackageDataTableRequirement[] | undefined;
	/** The package's `data-table.json` contents, keyed off the manifest entries. */
	packageDataTables: SerializedDataTable[];
	matchingMode: DataTableMatchingMode;
	missingMode: DataTableMissingMode;
	schemaConflictPolicy: DataTableSchemaConflictPolicy;
}

export interface DataTableImportPlan {
	/** Tables to create in the target project, keeping their package (source) id. */
	creations: SerializedDataTable[];
	failures: DataTableResolutionFailure[];
	/** Requirements resolved to an existing compatible table, used as-is. Carried for telemetry. */
	matchedCount: number;
}
