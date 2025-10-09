import { DataTableCreateColumnSchema } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import {
	DATA_TABLE_SYSTEM_COLUMNS,
	DATA_TABLE_SYSTEM_TESTING_COLUMN,
	UnexpectedError,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableDDLService } from './data-table-ddl.service';
import { DataTable } from './data-table.entity';
import { DataTableColumnNameConflictError } from './errors/data-table-column-name-conflict.error';
import { DataTableSystemColumnNameConflictError } from './errors/data-table-system-column-name-conflict.error';
import { DataTableValidationError } from './errors/data-table-validation.error';

@Service()
export class DataTableColumnRepository extends Repository<DataTableColumn> {
	constructor(
		dataSource: DataSource,
		private ddlService: DataTableDDLService,
	) {
		super(DataTableColumn, dataSource.manager);
	}

	async getColumns(dataTableId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				const columns = await em
					.createQueryBuilder(DataTableColumn, 'dsc')
					.where('dsc.dataTableId = :dataTableId', { dataTableId })
					.getMany();

				// Ensure columns are always returned in the correct order by index,
				// since the database does not guarantee ordering and TypeORM does not preserve
				// join order in @OneToMany relations.
				columns.sort((a, b) => a.index - b.index);
				return columns;
			},
			false,
		);
	}

	async addColumn(dataTableId: string, schema: DataTableCreateColumnSchema, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			if (DATA_TABLE_SYSTEM_COLUMNS.includes(schema.name)) {
				throw new DataTableSystemColumnNameConflictError(schema.name);
			}
			if (schema.name === DATA_TABLE_SYSTEM_TESTING_COLUMN) {
				throw new DataTableSystemColumnNameConflictError(schema.name, 'testing');
			}

			const existingColumnMatch = await em.existsBy(DataTableColumn, {
				name: schema.name,
				dataTableId,
			});

			if (existingColumnMatch) {
				const dataTable = await em.findOneBy(DataTable, { id: dataTableId });
				if (!dataTable) {
					throw new UnexpectedError('Data table not found');
				}
				throw new DataTableColumnNameConflictError(schema.name, dataTable.name);
			}

			if (schema.index === undefined) {
				const columns = await this.getColumns(dataTableId, em);
				schema.index = columns.length;
			} else {
				await this.shiftColumns(dataTableId, schema.index, 1, em);
			}

			const column = em.create(DataTableColumn, {
				...schema,
				dataTableId,
			});

			// @ts-ignore Workaround for intermittent typecheck issue with _QueryDeepPartialEntity
			await em.insert(DataTableColumn, column);

			await this.ddlService.addColumn(dataTableId, column, em.connection.options.type, em);

			return column;
		});
	}

	async deleteColumn(dataTableId: string, column: DataTableColumn, trx?: EntityManager) {
		await withTransaction(this.manager, trx, async (em) => {
			await em.remove(DataTableColumn, column);

			await this.ddlService.dropColumnFromTable(
				dataTableId,
				column.name,
				em.connection.options.type,
				em,
			);
			await this.shiftColumns(dataTableId, column.index, -1, em);
		});
	}

	async moveColumn(
		dataTableId: string,
		column: DataTableColumn,
		targetIndex: number,
		trx?: EntityManager,
	) {
		await withTransaction(this.manager, trx, async (em) => {
			const columnCount = await em.countBy(DataTableColumn, { dataTableId });

			if (targetIndex < 0) {
				throw new DataTableValidationError('tried to move column to negative index');
			}

			if (targetIndex >= columnCount) {
				throw new DataTableValidationError(
					'tried to move column to an index larger than column count',
				);
			}

			await this.shiftColumns(dataTableId, column.index, -1, em);
			await this.shiftColumns(dataTableId, targetIndex, 1, em);
			await em.update(DataTableColumn, { id: column.id }, { index: targetIndex });
		});
	}

	async shiftColumns(dataTableId: string, lowestIndex: number, delta: -1 | 1, trx?: EntityManager) {
		await withTransaction(this.manager, trx, async (em) => {
			await em
				.createQueryBuilder()
				.update(DataTableColumn)
				.set({
					index: () => `index + ${delta}`,
				})
				.where('dataTableId = :dataTableId AND index >= :thresholdValue', {
					dataTableId,
					thresholdValue: lowestIndex,
				})
				.execute();
		});
	}
}
