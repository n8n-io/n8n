import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { DataTableService } from '@/modules/data-table/data-table.service';

import { addRequirementUsage, type RequirementUsage } from '../requirement-source';

import { DataTableSerializer } from './data-table.serializer';
import type { DataTableExportRequirement } from './data-table.types';
import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';

export interface DataTableExportRequest {
	user: User;
	requirements: DataTableExportRequirement[];
	writer: PackageWriter;
	projectTargetsById?: Map<string, string>;
}

export interface DataTableExportResult {
	entries: ManifestEntry[];
	requirements: PackageDataTableRequirement[];
}

@Service()
export class DataTableExporter {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly dataTableSerializer: DataTableSerializer,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async export(request: DataTableExportRequest): Promise<DataTableExportResult> {
		if (request.requirements.length === 0) {
			return { entries: [], requirements: [] };
		}

		if (!this.moduleRegistry.isActive('data-table')) {
			throw new UserError(
				'The exported workflows use data tables, but the data-table module is disabled on this instance.',
			);
		}

		const usageById = this.groupByDataTableId(request.requirements);
		const requestedIds = [...usageById.keys()];

		const dataTables = await this.dataTableService.findDataTablesByIdsForUser(
			requestedIds,
			request.user,
			['dataTable:read'],
		);

		this.assertAllRequestedDataTablesFound(requestedIds, dataTables);

		const entries: ManifestEntry[] = [];
		const requirements: PackageDataTableRequirement[] = [];

		for (const dataTable of dataTables) {
			entries.push(
				await writeManifestEntry(
					request.writer,
					'dataTables',
					projectScopedDirectory('dataTables', dataTable.projectId, request.projectTargetsById),
					dataTable,
					this.dataTableSerializer.serialize(dataTable),
				),
			);
			requirements.push({
				id: dataTable.id,
				name: dataTable.name,
				...usageById.get(dataTable.id)!,
			});
		}

		return { entries, requirements };
	}

	private groupByDataTableId(
		requirements: DataTableExportRequirement[],
	): Map<string, RequirementUsage> {
		const grouped = new Map<string, RequirementUsage>();
		for (const requirement of requirements) {
			const usage = grouped.get(requirement.dataTableId) ?? { usedByWorkflows: [] };
			addRequirementUsage(usage, requirement);
			grouped.set(requirement.dataTableId, usage);
		}
		return grouped;
	}

	private assertAllRequestedDataTablesFound(
		requestedDataTableIds: string[],
		foundDataTables: Array<{ id: string }>,
	) {
		const foundDataTableIds = new Set(foundDataTables.map(({ id }) => id));
		const missingDataTableIds = requestedDataTableIds.filter((id) => !foundDataTableIds.has(id));

		if (missingDataTableIds.length > 0) {
			const displayedDataTableIds = missingDataTableIds.slice(0, 20);
			const omittedCount = missingDataTableIds.length - displayedDataTableIds.length;

			throw new UserError(
				`${missingDataTableIds.length} data table(s) not found or not accessible. Export aborted.`,
				{
					description: `Missing data table IDs: ${displayedDataTableIds.join(', ')}${
						omittedCount > 0 ? `, and ${omittedCount} more` : ''
					}`,
				},
			);
		}
	}
}
