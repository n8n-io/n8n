import { Service } from '@n8n/di';

import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import type { DataTable } from '@/modules/data-table/data-table.entity';

import {
	serializedDataTableSchema,
	type SerializedDataTableColumn,
	type SerializedDataTable,
} from '../../spec/serialized/data-table.schema';
import {
	definePackageSerializationPayload,
	type PackageEntityKeyHandling,
} from '../package-serialization.types';

const dataTablePackageKeyHandling = {
	id: 'copy',
	createdAt: 'exclude',
	updatedAt: 'exclude',
	name: 'copy',
	columns: 'transform',
	project: 'transform',
	projectId: 'transform',
} as const satisfies PackageEntityKeyHandling<DataTable>;

const dataTableColumnPackageKeyHandling = {
	id: 'exclude',
	createdAt: 'exclude',
	updatedAt: 'exclude',
	dataTableId: 'exclude',
	name: 'copy',
	type: 'copy',
	index: 'copy',
	dataTable: 'exclude',
} as const satisfies PackageEntityKeyHandling<DataTableColumn>;

const serializeDataTablePayload = definePackageSerializationPayload<
	DataTable,
	SerializedDataTable,
	typeof dataTablePackageKeyHandling
>();

const serializeColumnPayload = definePackageSerializationPayload<
	DataTableColumn,
	SerializedDataTableColumn,
	typeof dataTableColumnPackageKeyHandling
>();

@Service()
export class DataTableSerializer {
	serialize(dataTable: DataTable): SerializedDataTable {
		const columns = [...dataTable.columns]
			.sort((a, b) => a.index - b.index)
			.map((column) =>
				serializeColumnPayload({
					name: column.name,
					type: column.type,
					index: column.index,
				}),
			);

		return serializedDataTableSchema.parse(
			serializeDataTablePayload({
				id: dataTable.id,
				name: dataTable.name,
				columns,
			}),
		);
	}
}
