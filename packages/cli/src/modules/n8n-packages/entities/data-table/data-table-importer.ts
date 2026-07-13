import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { findSchemaIncompatibility } from './data-table-compat';
import { decideAbsentTable } from './data-table-missing-mode';
import type {
	DataTableImportPlan,
	DataTableImportRequest,
	DataTableResolutionFailure,
} from './data-table.types';
import type { DataTableMatchingMode, ImportContext } from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';

/**
 * How a package table resolves to a target-project table. A single-value RFC
 * seam until `by-name` matching lands. `by-id` never falls back to names —
 * names are only checked for uniqueness when a table is about to be created.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API data table matching mode keys */
const MATCH_TARGET_TABLE: Record<
	DataTableMatchingMode,
	(
		requirement: PackageDataTableRequirement,
		targetsById: Map<string, DataTable>,
		projectId: string,
	) => DataTable | undefined
> = {
	'by-id': ({ id }, targetsById, projectId) => {
		const table = targetsById.get(id);
		return table && table.projectId === projectId ? table : undefined;
	},
};
/* eslint-enable @typescript-eslint/naming-convention */

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
	 * (never renamed or altered); absent tables become planned creations or
	 * failures per missing mode. Mirrors the credential side's `plan`.
	 */
	async plan(
		context: ImportContext,
		request: DataTableImportRequest,
	): Promise<DataTableImportPlan> {
		const requirements = request.requirements ?? [];
		if (requirements.length === 0) return { creations: [], failures: [] };

		if (!this.moduleRegistry.isActive('data-table')) {
			return {
				creations: [],
				failures: [{ kind: 'module-disabled', usedByWorkflows: workflowsUsing(requirements) }],
			};
		}

		const packageTablesById = new Map(request.packageDataTables.map((table) => [table.id, table]));
		const targets = await this.dataTableService.findDataTablesByIds(
			requirements.map(({ id }) => id),
		);
		const targetsById = new Map(targets.map((table) => [table.id, table]));

		const creations: PlannedCreation[] = [];
		const failures: DataTableResolutionFailure[] = [];

		for (const requirement of requirements) {
			const packageTable = packageTablesById.get(requirement.id);
			if (!packageTable) {
				throw new UserError(
					`Package is missing the data table schema for "${requirement.name}" (${requirement.id}).`,
				);
			}

			const target = MATCH_TARGET_TABLE[request.matchingMode](
				requirement,
				targetsById,
				context.projectId,
			);

			if (target) {
				const incompatibility = findSchemaIncompatibility(packageTable.columns, target.columns);
				if (incompatibility) {
					failures.push({
						kind: 'schema-incompatible',
						sourceId: requirement.id,
						name: requirement.name,
						...incompatibility,
						usedByWorkflows: workflowsUsing([requirement]),
					});
				}
				// Matched: used as-is. Ids are preserved on import, so the workflow
				// node references already point at the matched table.
				continue;
			}

			const effect = decideAbsentTable(request.missingMode, requirement);
			if (effect.action === 'fail') {
				failures.push(effect.failure);
				continue;
			}
			if (effect.action === 'skip') continue;

			// Ids are globally unique, so a same-id table in another project blocks creation.
			const existingElsewhere = targetsById.get(requirement.id);
			if (existingElsewhere) {
				failures.push({
					kind: 'id-conflict',
					sourceId: requirement.id,
					name: requirement.name,
					existingProjectId: existingElsewhere.projectId,
					usedByWorkflows: workflowsUsing([requirement]),
				});
				continue;
			}

			creations.push({ table: packageTable, requirement });
		}

		failures.push(...(await this.creationFailures(context, creations)));

		return { creations: creations.map(({ table }) => table), failures };
	}

	/**
	 * Creates the planned tables with their package (source) ids. Matched tables
	 * need no action: ids are preserved, so node references already resolve.
	 */
	async apply(context: ImportContext, plan: DataTableImportPlan): Promise<void> {
		for (const table of plan.creations) {
			await this.dataTableService.createDataTableFromImport(context.user, context.projectId, {
				id: table.id,
				name: table.name,
				columns: table.columns,
			});
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
				failures.push({
					kind: 'name-conflict',
					sourceId: requirement.id,
					name: requirement.name,
					usedByWorkflows: workflowsUsing([requirement]),
				});
			}
		}

		return failures;
	}
}

/** Sorted unique workflow ids referencing the given requirements. */
function workflowsUsing(requirements: PackageDataTableRequirement[]): string[] {
	return [...new Set(requirements.flatMap(({ usedByWorkflows }) => usedByWorkflows))].sort();
}
