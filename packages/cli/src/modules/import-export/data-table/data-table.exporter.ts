import { Service } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { ProjectExportContext } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { DataTableSerializer } from './data-table.serializer';
import type { ManifestDataTableEntry } from './data-table.types';

@Service()
export class DataTableExporter {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableSerializer: DataTableSerializer,
	) {}

	async exportForProject(ctx: ProjectExportContext): Promise<ManifestDataTableEntry[]> {
		const dataTables = await this.dataTableRepository.find({
			where: { projectId: ctx.projectId },
			relations: ['columns'],
		});

		if (dataTables.length === 0) return [];

		const entries: ManifestDataTableEntry[] = [];

		for (const dataTable of dataTables) {
			const slug = generateSlug(dataTable.name, dataTable.id);
			const target = `${ctx.projectTarget}/data-tables/${slug}`;

			const serialized = this.dataTableSerializer.serialize(dataTable);

			ctx.writer.writeDirectory(target);
			ctx.writer.writeFile(`${target}/data-table.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: dataTable.id,
				name: dataTable.name,
				target,
			});
		}

		return entries;
	}
}
