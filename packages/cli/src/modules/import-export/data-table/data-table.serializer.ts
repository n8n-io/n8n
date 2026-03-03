import { Service } from '@n8n/di';

import type { DataTable } from '@/modules/data-table/data-table.entity';

import type { Serializer } from '../serializer';
import type { SerializedDataTable } from './data-table.types';

@Service()
export class DataTableSerializer implements Serializer<DataTable, SerializedDataTable> {
	serialize(dataTable: DataTable): SerializedDataTable {
		return {
			id: dataTable.id,
			name: dataTable.name,
			columns: (dataTable.columns ?? []).map((col) => ({
				name: col.name,
				type: col.type,
				index: col.index,
			})),
		};
	}
}
