import { Service } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { Importer } from '../importer';
import type { ProjectImportContext } from '../import-export.types';
import type { ManifestDataTableEntry, SerializedDataTable } from './data-table.types';

@Service()
export class DataTableImporter implements Importer<ManifestDataTableEntry> {
	constructor(private readonly dataTableRepository: DataTableRepository) {}

	async importForProject(ctx: ProjectImportContext, entries: ManifestDataTableEntry[]) {
		for (const entry of entries) {
			const content = ctx.reader.readFile(`${entry.target}/data-table.json`);
			const dataTable = JSON.parse(content) as SerializedDataTable;

			await this.dataTableRepository.createDataTable(
				ctx.projectId,
				dataTable.name,
				dataTable.columns,
			);
		}
	}
}
