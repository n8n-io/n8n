import { Service } from '@n8n/di';

import type { DataTable } from '@/modules/data-table/data-table.entity';

import {
	serializedDataTableSchema,
	type SerializedDataTable,
} from '../../spec/serialized/data-table.schema';

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
