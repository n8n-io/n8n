import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { DataTableService } from '@/modules/data-table/data-table.service';

import { DataTableSerializer } from './data-table.serializer';
import type { WorkflowDataTableRequirement } from './data-table.types';
import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';

export interface DataTableExportRequest {
	user: User;
	requirements: WorkflowDataTableRequirement[];
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

		const usedByWorkflowsById = this.groupByDataTableId(request.requirements);
		const requestedIds = [...usedByWorkflowsById.keys()];

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
				usedByWorkflows: usedByWorkflowsById.get(dataTable.id) ?? [],
			});
		}

		return { entries, requirements };
	}

	private groupByDataTableId(requirements: WorkflowDataTableRequirement[]): Map<string, string[]> {
		const grouped = new Map<string, string[]>();
		for (const requirement of requirements) {
			const usedByWorkflows = grouped.get(requirement.dataTableId);
			if (usedByWorkflows) {
				if (!usedByWorkflows.includes(requirement.workflowId)) {
					usedByWorkflows.push(requirement.workflowId);
				}
			} else {
				grouped.set(requirement.dataTableId, [requirement.workflowId]);
			}
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
