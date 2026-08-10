import { Service } from '@n8n/di';

import {
	serializedDataTableSchema,
	type SerializedDataTable,
} from '@/modules/n8n-packages/spec/serialized/data-table.schema';

import type { DataTable } from '../data-table.entity';

@Service()
export class DataTableSerializer {
	serialize(dataTable: DataTable): SerializedDataTable {
		return serializedDataTableSchema.parse({
			id: dataTable.id,
			name: dataTable.name,
			columns: [...dataTable.columns]
				.sort((a, b) => a.index - b.index)
				.map((column) => ({
					name: column.name,
					type: column.type,
					index: column.index,
				})),
		});
	}
}
