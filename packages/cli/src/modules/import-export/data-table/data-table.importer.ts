import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { EntityImporter } from '../entity-importer';
import type { EntityKey, ImportScope, ManifestEntry } from '../import-export.types';
import type { SerializedDataTable } from './data-table.types';

@Service()
export class DataTableImporter implements EntityImporter {
	readonly entityKey: EntityKey = 'dataTables';

	constructor(private readonly dataTableRepository: DataTableRepository) {}

	async import(scope: ImportScope, entries: ManifestEntry[]) {
		for (const entry of entries) {
			const content = scope.reader.readFile(`${entry.target}/data-table.json`);
			const dataTable: SerializedDataTable = jsonParse(content);

			// Skip if a data table with the same name already exists in this project
			const existing = await this.dataTableRepository.findOne({
				where: { name: dataTable.name, projectId: scope.targetProjectId },
			});

			if (!existing) {
				await this.dataTableRepository.createDataTable(
					scope.targetProjectId,
					dataTable.name,
					dataTable.columns,
					scope.entityManager,
				);
			}
		}
	}
}
