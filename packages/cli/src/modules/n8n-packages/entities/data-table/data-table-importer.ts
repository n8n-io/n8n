import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@n8n/errors';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { diffDataTableSchema } from './data-table-compat';
import { matchTargetTable } from './data-table-matching-mode';
import { decideAbsentTable } from './data-table-missing-mode';
import type { TableEffect } from './data-table-missing-mode';
import { findSchemaConflict } from './data-table-schema-conflict-policy';
import { createFailure } from './data-table.types';
import type {
	DataTableImportPlan,
	DataTableImportRequest,
	DataTableResolutionFailure,
	DataTableSchemaOperation,
	DataTableUpdate,
} from './data-table.types';
import { DataTableSchemaConflictPolicy } from '../../n8n-packages.types';
import type { DataTableMissingMode, ImportContext } from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';

interface PlannedCreation {
	table: SerializedDataTable;
	requirement: PackageDataTableRequirement;
}

interface PlannedUpdate extends DataTableUpdate {
	requirement: PackageDataTableRequirement;
}

type RequirementEffect = TableEffect | { action: 'update'; operations: DataTableSchemaOperation[] };

@Service()
export class DataTableImporter {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/**
	 * Resolves the package's data table references against the target project.
	 * Read-only: matched tables are compat-checked, then planned as updates under
	 * `overwrite` or `overwrite-non-destructive` or used as-is otherwise; absent
	 * tables become planned creations, failures, or skips per missing mode.
	 * Mirrors the credential side's `plan`.
	 */
	async plan(
		context: ImportContext,
		request: DataTableImportRequest,
	): Promise<DataTableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) {
			return { creations: [], updates: [], failures: [], matchedCount: 0 };
		}

		if (!this.moduleRegistry.isActive('data-table')) {
			return {
				creations: [],
				updates: [],
				failures: [{ kind: 'module-disabled', usedByWorkflows: workflowsUsing(requirements) }],
				matchedCount: 0,
			};
		}

		const packageTablesById = new Map(
			request.packageDataTables.map((table) => [table.id, normalizeColumnIndexes(table)]),
		);
		const targets = await this.dataTableService.findDataTablesByIds(
			requirements.map(({ id }) => id),
		);
		const targetsById = new Map(targets.map((table) => [table.id, table]));
		const candidates = { projectId: context.projectId, targetsById };

		const creations: PlannedCreation[] = [];
		const updates: PlannedUpdate[] = [];
		const failures: DataTableResolutionFailure[] = [];
		let matchedCount = 0;

		for (const requirement of requirements) {
			const packageTable = packageTablesById.get(requirement.id);
			if (!packageTable) {
				throw new UserError(
					`Package is missing the data table schema for "${requirement.name}" (${requirement.id}).`,
				);
			}

			const matchedTargetTable = matchTargetTable(request.matchingMode, requirement, candidates);

			const effect = resolveRequirement(
				requirement,
				packageTable,
				matchedTargetTable,
				targetsById.get(requirement.id),
				request.missingMode,
				request.schemaConflictPolicy,
			);
			if (effect.action === 'create') creations.push({ table: packageTable, requirement });
			else if (effect.action === 'update') {
				updates.push({ table: packageTable, operations: effect.operations, requirement });
			} else if (effect.action === 'fail') failures.push(effect.failure);
			else if (matchedTargetTable) matchedCount++;
		}

		failures.push(...(await this.writeFailures(context, creations, updates)));

		return {
			creations: creations.map(({ table }) => table),
			updates: updates.map(({ table, operations }) => ({ table, operations })),
			failures,
			matchedCount,
		};
	}

	/**
	 * Creates the planned tables with their package (source) ids, and changes
	 * the planned updates to the package schema. Ids are preserved, so node
	 * references already resolve.
	 */
	async apply(context: ImportContext, plan: DataTableImportPlan): Promise<void> {
		// Defense in depth: the plan phase already reports a missing scope as a
		// blocking issue, but apply re-checks before writing anything.
		if (plan.creations.length > 0 && !(await hasProjectScope(context, 'dataTable:create'))) {
			throw new ForbiddenError('User is missing a scope required to create a data table');
		}
		if (plan.updates.length > 0 && !(await hasProjectScope(context, 'dataTable:update'))) {
			throw new ForbiddenError('User is missing a scope required to update a data table');
		}

		for (const table of plan.creations) {
			await this.dataTableService.createDataTable(
				context.projectId,
				{ name: table.name, columns: table.columns },
				table.id,
			);
		}

		for (const { table, operations } of plan.updates) {
			await this.dataTableService.replaceSchema(
				table.id,
				context.projectId,
				{ name: table.name, columns: table.columns },
				{
					droppableColumns: operations.flatMap((operation) =>
						operation.destructive ? [operation.column] : [],
					),
				},
			);
		}
	}

	/** Guards that only apply to tables about to be written: permission, and name uniqueness inside the target project. */
	private async writeFailures(
		context: ImportContext,
		creations: PlannedCreation[],
		updates: PlannedUpdate[],
	): Promise<DataTableResolutionFailure[]> {
		const failures: DataTableResolutionFailure[] = [];

		if (creations.length > 0 && !(await hasProjectScope(context, 'dataTable:create'))) {
			failures.push({
				kind: 'permission-denied',
				missingScope: 'dataTable:create',
				usedByWorkflows: workflowsUsing(creations.map(({ requirement }) => requirement)),
			});
		}

		if (updates.length > 0 && !(await hasProjectScope(context, 'dataTable:update'))) {
			failures.push({
				kind: 'permission-denied',
				missingScope: 'dataTable:update',
				usedByWorkflows: workflowsUsing(updates.map(({ requirement }) => requirement)),
			});
		}

		const nameClaims: Array<PlannedCreation & { currentName?: string }> = [
			...creations,
			...updates.flatMap(({ table, requirement, operations }) => {
				const rename = operations.find((operation) => operation.kind === 'rename-table');
				return rename ? [{ table, requirement, currentName: rename.from }] : [];
			}),
		];
		if (nameClaims.length === 0) return failures;

		const existingByName = new Map(
			(
				await this.dataTableService.findDataTablesByNamesInProject(
					context.projectId,
					nameClaims.map(({ table }) => table.name),
				)
			).map((table) => [table.name, table]),
		);

		for (const claim of nameClaims) {
			// A same-named target table here is never the match candidate (matching is
			// by id), and two package tables of one name cannot both land in one project.
			const conflictingTableId =
				existingByName.get(claim.table.name)?.id ??
				nameClaims.find((other) => other !== claim && other.table.name === claim.table.name)?.table
					.id;
			if (conflictingTableId) {
				failures.push(
					createFailure(claim.requirement, 'name-conflict', {
						name: claim.table.name,
						conflictingTableId,
						currentName: claim.currentName,
					}),
				);
			}
		}

		return failures;
	}
}

/**
 * Decides the fate of one package table reference, independent of how the
 * target was matched: matched tables are compat-checked, then diffed against
 * the package under `overwrite` or `overwrite-non-destructive` or used as-is
 * otherwise; absent tables follow the missing mode, with globally unique ids
 * guarding planned creations.
 * `existingWithSameId` is the instance-wide (any project) occupant of the
 * requirement's id, only consulted for creations.
 */
function resolveRequirement(
	requirement: PackageDataTableRequirement,
	packageTable: SerializedDataTable,
	matchedTargetTable: DataTable | undefined,
	existingTableWithSameId: DataTable | undefined,
	missingMode: DataTableMissingMode,
	schemaConflictPolicy: DataTableSchemaConflictPolicy,
): RequirementEffect {
	if (matchedTargetTable) {
		const incompatibility = findSchemaConflict(
			schemaConflictPolicy,
			packageTable.columns,
			matchedTargetTable.columns,
		);
		if (incompatibility) {
			return {
				action: 'fail',
				failure: createFailure(requirement, 'schema-incompatible', {
					...incompatibility,
					overwriteChanges: diffDataTableSchema(packageTable, matchedTargetTable),
				}),
			};
		}
		if (
			schemaConflictPolicy === DataTableSchemaConflictPolicy.Overwrite ||
			schemaConflictPolicy === DataTableSchemaConflictPolicy.OverwriteNonDestructive
		) {
			const operations = diffDataTableSchema(packageTable, matchedTargetTable);
			if (operations.length > 0) return { action: 'update', operations };
		}
		// Matched: used as-is. Ids are preserved on import, so the workflow
		// node references already point at the matched table.
		return { action: 'skip' };
	}

	const effect = decideAbsentTable(missingMode, requirement);
	if (effect.action !== 'create') return effect;

	// Ids are globally unique, so a same-id table in another project blocks creation.
	if (existingTableWithSameId) {
		return {
			action: 'fail',
			failure: createFailure(requirement, 'id-conflict', {
				existingProjectId: existingTableWithSameId.projectId,
			}),
		};
	}
	return effect;
}

function normalizeColumnIndexes(table: SerializedDataTable): SerializedDataTable {
	const columns = [...table.columns]
		.sort((a, b) => a.index - b.index || (a.name < b.name ? -1 : 1))
		.map((column, index) => ({ ...column, index }));
	return { ...table, columns };
}

async function hasProjectScope(
	context: ImportContext,
	scope: 'dataTable:create' | 'dataTable:update',
): Promise<boolean> {
	return await userHasScopes(context.user, [scope], false, { projectId: context.projectId });
}

/** Sorted unique workflow ids referencing the given requirements. */
function workflowsUsing(requirements: PackageDataTableRequirement[]): string[] {
	return [...new Set(requirements.flatMap(({ usedByWorkflows }) => usedByWorkflows))].sort();
}
