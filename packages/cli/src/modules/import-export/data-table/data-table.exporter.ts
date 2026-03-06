import { Service } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { EntityExporter } from '../entity-exporter';
import { writeEntityFiles } from '../entity-exporter';
import type { EntityKey, ExportScope, ManifestEntry } from '../import-export.types';

import { DataTableSerializer } from './data-table.serializer';

@Service()
export class DataTableExporter implements EntityExporter {
	readonly entityKey: EntityKey = 'dataTables';

	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableSerializer: DataTableSerializer,
	) {}

	async export(scope: ExportScope): Promise<ManifestEntry[]> {
		if (!scope.projectId) return [];

		const dataTables = await this.dataTableRepository.find({
			where: { projectId: scope.projectId },
			relations: ['columns'],
		});

		if (dataTables.length === 0) return [];

		return writeEntityFiles(dataTables, scope, {
			resourceDir: 'data-tables',
			filename: 'data-table.json',
			getId: (dt) => dt.id,
			getName: (dt) => dt.name,
			serialize: (dt) => this.dataTableSerializer.serialize(dt),
		});
	}
}
