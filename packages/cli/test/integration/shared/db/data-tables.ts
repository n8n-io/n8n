import type { CreateDataTableColumnDto } from '@n8n/api-types';
import { randomName } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataTableRows } from 'n8n-workflow';

import { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';
import { DataTableRowsRepository } from '@/modules/data-table/data-table-rows.repository';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';

export const createDataTable = async (
	project: Project,
	options: {
		name?: string;
		columns?: CreateDataTableColumnDto[];
		data?: DataTableRows;
		updatedAt?: Date;
	} = {},
) => {
	const dataTableRepository = Container.get(DataTableRepository);
	const dataTable = await dataTableRepository.createDataTable(
		project.id,
		options.name ?? randomName(),
		options.columns ?? [],
	);

	if (options.updatedAt) {
		await dataTableRepository.update(dataTable.id, {
			updatedAt: options.updatedAt,
		});
		dataTable.updatedAt = options.updatedAt;
	}

	if (options.data) {
		const dataTableColumnRepository = Container.get(DataTableColumnRepository);
		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		const dataTableRowsRepository = Container.get(DataTableRowsRepository);
		await dataTableRowsRepository.insertRows(dataTable.id, options.data, columns, 'count');
	}

	return dataTable;
};
