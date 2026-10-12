import type { DataTableColumnType } from 'n8n-workflow';

import type {
	DataTableMatchingMode,
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
} from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';
import type { RequirementSource } from '../requirement-source';

export type DataTableRequirement = RequirementSource & { dataTableId: string };

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
	/** For `schema-incompatible` under the `fail` and `overwrite-non-destructive` policies: target columns not in the package schema. */
	extraColumns?: string[];
	/** For `schema-incompatible`: the changes `overwrite` would make to the target table. */
	overwriteChanges?: DataTableSchemaOperation[];
	/** For `permission-denied`: the project scope the user lacks. */
	missingScope?: 'dataTable:create' | 'dataTable:update';
	/** For `name-conflict`: the other table that holds or claims the name. */
	conflictingTableId?: string;
	/** For a rename `name-conflict`: the matched table's current name. */
	currentName?: string;
};

export function createFailure(
	requirement: PackageDataTableRequirement,
	kind: DataTableResolutionFailureKind,
	details: Partial<
		Pick<
			DataTableResolutionFailure,
			| 'name'
			| 'existingProjectId'
			| 'missingColumns'
			| 'typeMismatches'
			| 'extraColumns'
			| 'overwriteChanges'
			| 'conflictingTableId'
			| 'currentName'
		>
	> = {},
): DataTableResolutionFailure {
	return {
		kind,
		sourceId: requirement.id,
		name: requirement.name,
		...details,
	};
}

/** `destructive` operations delete the data in a column. */
export type DataTableSchemaOperation =
	| { kind: 'add-column'; column: string; type: DataTableColumnType; destructive: false }
	| { kind: 'remove-column'; column: string; type: DataTableColumnType; destructive: true }
	| {
			kind: 'change-column-type';
			column: string;
			from: DataTableColumnType;
			to: DataTableColumnType;
			destructive: true;
	  }
	| { kind: 'reorder-columns'; destructive: false }
	| { kind: 'rename-table'; from: string; to: string; destructive: false };

export interface DataTableUpdate {
	table: SerializedDataTable;
	operations: DataTableSchemaOperation[];
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
	/** Matched tables to change to the package schema under the `overwrite` and `overwrite-non-destructive` policies. */
	updates: DataTableUpdate[];
	failures: DataTableResolutionFailure[];
	/** Requirements resolved to an existing compatible table, used as-is. Carried for telemetry. */
	matchedCount: number;
}
