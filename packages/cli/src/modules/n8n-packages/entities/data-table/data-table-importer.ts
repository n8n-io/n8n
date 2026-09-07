import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { matchTargetTable } from './data-table-matching-mode';
import { decideAbsentTable } from './data-table-missing-mode';
import type { TableEffect } from './data-table-missing-mode';
import { findSchemaConflict } from './data-table-schema-conflict-policy';
import { createFailure } from './data-table.types';
import type {
	DataTableImportPlan,
	DataTableImportRequest,
	DataTableResolutionFailure,
} from './data-table.types';
import type {
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
	ImportContext,
} from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';

interface PlannedCreation {
	table: SerializedDataTable;
	requirement: PackageDataTableRequirement;
}

@Service()
export class DataTableImporter {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/**
	 * Resolves the package's data table references against the target project.
	 * Read-only: matched tables are compat-checked and otherwise used as-is
	 * (never renamed or altered); absent tables become planned creations,
	 * failures, or skips per missing mode. Mirrors the credential side's `plan`.
	 */
	async plan(
		context: ImportContext,
		request: DataTableImportRequest,
	): Promise<DataTableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) return { creations: [], failures: [], matchedCount: 0 };

		if (!this.moduleRegistry.isActive('data-table')) {
			return {
				creations: [],
				failures: [{ kind: 'module-disabled', usedByWorkflows: workflowsUsing(requirements) }],
				matchedCount: 0,
			};
		}

		const packageTablesById = new Map(request.packageDataTables.map((table) => [table.id, table]));
		const targets = await this.dataTableService.findDataTablesByIds(
			requirements.map(({ id }) => id),
		);
		const targetsById = new Map(targets.map((table) => [table.id, table]));
		const candidates = { projectId: context.projectId, targetsById };

		const creations: PlannedCreation[] = [];
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
			else if (effect.action === 'fail') failures.push(effect.failure);
			else if (matchedTargetTable) matchedCount++;
		}

		failures.push(...(await this.creationFailures(context, creations)));

		return { creations: creations.map(({ table }) => table), failures, matchedCount };
	}

	/**
	 * Creates the planned tables with their package (source) ids. Matched tables
	 * need no action: ids are preserved, so node references already resolve.
	 */
	async apply(context: ImportContext, plan: DataTableImportPlan): Promise<void> {
		if (plan.creations.length === 0) return;

		// Defense in depth: the plan phase already reports a missing scope as a
		// blocking issue, but apply re-checks before writing anything.
		if (
			!(await userHasScopes(context.user, ['dataTable:create'], false, {
				projectId: context.projectId,
			}))
		) {
			throw new ForbiddenError('User is missing a scope required to create a data table');
		}

		for (const table of plan.creations) {
			await this.dataTableService.createDataTable(
				context.projectId,
				{ name: table.name, columns: table.columns },
				table.id,
			);
		}
	}

	/** Guards that only apply to tables about to be created: permission, and name uniqueness inside the target project. */
	private async creationFailures(
		context: ImportContext,
		creations: PlannedCreation[],
	): Promise<DataTableResolutionFailure[]> {
		if (creations.length === 0) return [];

		const failures: DataTableResolutionFailure[] = [];

		const canCreate = await userHasScopes(context.user, ['dataTable:create'], false, {
			projectId: context.projectId,
		});
		if (!canCreate) {
			failures.push({
				kind: 'permission-denied',
				usedByWorkflows: workflowsUsing(creations.map(({ requirement }) => requirement)),
			});
		}

		const existingByName = new Map(
			(
				await this.dataTableService.findDataTablesByNamesInProject(
					context.projectId,
					creations.map(({ table }) => table.name),
				)
			).map((table) => [table.name, table]),
		);
		const packageTablesPerName = new Map<string, number>();
		for (const { table } of creations) {
			packageTablesPerName.set(table.name, (packageTablesPerName.get(table.name) ?? 0) + 1);
		}

		for (const { table, requirement } of creations) {
			// A same-named target table here is never the match candidate (matching is
			// by id), and two package tables of one name cannot both land in one project.
			if (existingByName.has(table.name) || packageTablesPerName.get(table.name)! > 1) {
				failures.push(createFailure(requirement, 'name-conflict'));
			}
		}

		return failures;
	}
}

/**
 * Decides the fate of one package table reference, independent of how the
 * target was matched: matched tables are compat-checked and otherwise used
 * as-is; absent tables follow the missing mode, with globally unique ids
 * guarding planned creations. `existingWithSameId` is the instance-wide (any
 * project) occupant of the requirement's id, only consulted for creations.
 */
function resolveRequirement(
	requirement: PackageDataTableRequirement,
	packageTable: SerializedDataTable,
	matchedTargetTable: DataTable | undefined,
	existingTableWithSameId: DataTable | undefined,
	missingMode: DataTableMissingMode,
	schemaConflictPolicy: DataTableSchemaConflictPolicy,
): TableEffect {
	if (matchedTargetTable) {
		const incompatibility = findSchemaConflict(
			schemaConflictPolicy,
			packageTable.columns,
			matchedTargetTable.columns,
		);
		if (incompatibility) {
			return {
				action: 'fail',
				failure: createFailure(requirement, 'schema-incompatible', incompatibility),
			};
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

/** Sorted unique workflow ids referencing the given requirements. */
function workflowsUsing(requirements: PackageDataTableRequirement[]): string[] {
	return [...new Set(requirements.flatMap(({ usedByWorkflows }) => usedByWorkflows))].sort();
}
