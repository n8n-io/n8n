import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';

import { DataTableSerializer } from './data-table.serializer';
import type { WorkflowDataTableRequirement } from './data-table.types';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
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
	) {}

	async export(request: DataTableExportRequest): Promise<DataTableExportResult> {
		if (request.requirements.length === 0) {
			return { entries: [], requirements: [] };
		}

		const usedByWorkflowsById = this.groupByDataTableId(request.requirements);
		const requestedIds = [...usedByWorkflowsById.keys()];

		const dataTables = await this.dataTableService.findDataTablesByIdsForUser(
			requestedIds,
			request.user,
			['dataTable:read'],
		);

		this.assertAllRequestedDataTablesFound(requestedIds, dataTables);

		// One allocator per base directory: `data-tables/` and each
		// `projects/<slug>/data-tables/` suffix collisions independently.
		const allocators = new Map<string, UniqueFilenameAllocator>();
		const allocatorFor = (baseDir: string) => {
			const existing = allocators.get(baseDir);
			if (existing) return existing;
			const created = new UniqueFilenameAllocator(baseDir, 'data-table');
			allocators.set(baseDir, created);
			return created;
		};

		const entries: ManifestEntry[] = [];
		const requirements: PackageDataTableRequirement[] = [];

		for (const dataTable of dataTables) {
			const usedByWorkflows = usedByWorkflowsById.get(dataTable.id) ?? [];
			const baseDir = this.resolveBaseDir(dataTable, request.projectTargetsById);
			const target = allocatorFor(baseDir).allocate(dataTable.name);

			request.writer.writeDirectory(target);
			request.writer.writeFile(
				`${target}/data-table.json`,
				JSON.stringify(this.dataTableSerializer.serialize(dataTable), null, '\t'),
			);

			entries.push({ id: dataTable.id, name: dataTable.name, target });
			requirements.push({
				id: dataTable.id,
				name: dataTable.name,
				sourceProjectId: dataTable.projectId,
				usedByWorkflows,
			});
		}

		return { entries, requirements };
	}

	private resolveBaseDir(dataTable: DataTable, projectTargetsById?: Map<string, string>): string {
		if (!projectTargetsById || projectTargetsById.size === 0) return 'data-tables';
		const prefix = projectTargetsById.get(dataTable.projectId);
		return prefix ? `${prefix}/data-tables` : 'data-tables';
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
