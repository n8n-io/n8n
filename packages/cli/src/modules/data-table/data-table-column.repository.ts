import { DataTableCreateColumnSchema } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, In } from '@n8n/typeorm';
import {
	DATA_TABLE_SYSTEM_COLUMNS,
	DATA_TABLE_SYSTEM_TESTING_COLUMN,
	UnexpectedError,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableDDLService } from './data-table-ddl.service';
import { DataTable } from './data-table.entity';
import { DataTableColumnNameConflictError } from './errors/data-table-column-name-conflict.error';
import { DataTableColumnNotFoundError } from './errors/data-table-column-not-found.error';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';
import { DataTableSystemColumnNameConflictError } from './errors/data-table-system-column-name-conflict.error';
import { DataTableValidationError } from './errors/data-table-validation.error';
import { orderColumnRenames, pairDataTableColumns } from './utils/pair-columns';

@Service()
export class DataTableColumnRepository extends BaseRepository<DataTableColumn> {
	constructor(
		dataSource: DataSource,
		private ddlService: DataTableDDLService,
		transactionRunner: TransactionRunner,
	) {
		super(DataTableColumn, dataSource.manager, transactionRunner);
	}

	/**
	 * Validates that a column name is not reserved as a system column
	 */
	private validateNotSystemColumn(columnName: string): void {
		const lowerName = columnName.toLowerCase();
		if (DATA_TABLE_SYSTEM_COLUMNS.some((sc) => sc.toLowerCase() === lowerName)) {
			throw new DataTableSystemColumnNameConflictError(columnName);
		}
		if (lowerName === DATA_TABLE_SYSTEM_TESTING_COLUMN.toLowerCase()) {
			throw new DataTableSystemColumnNameConflictError(columnName, 'testing');
		}
	}

	/**
	 * Validates that a column name is unique within a data table
	 */
	private async validateUniqueColumnName(
		columnName: string,
		dataTableId: string,
		em: EntityManager,
	): Promise<void> {
		const existingColumnMatch = await em.existsBy(DataTableColumn, {
			name: columnName,
			dataTableId,
		});

		if (existingColumnMatch) {
			const dataTable = await em.findOneBy(DataTable, { id: dataTableId });
			if (!dataTable) {
				throw new UnexpectedError('Data table not found');
			}
			throw new DataTableColumnNameConflictError(columnName, dataTable.name);
		}
	}

	async getColumns(dataTableId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		const columns = await em
			.createQueryBuilder(DataTableColumn, 'dsc')
			.where('dsc.dataTableId = :dataTableId', { dataTableId })
			.getMany();

		// Ensure columns are always returned in the correct order by index,
		// since the database does not guarantee ordering and TypeORM does not preserve
		// join order in @OneToMany relations.
		columns.sort((a, b) => a.index - b.index);
		return columns;
	}

	async findTableIdsByColumnIds(
		columnIds: string[],
	): Promise<Array<Pick<DataTableColumn, 'id' | 'dataTableId'>>> {
		return await this.find({ select: ['id', 'dataTableId'], where: { id: In(columnIds) } });
	}

	async getColumnByIdOrFail(dataTableId: string, columnId: string) {
		const column = await this.findOneBy({ id: columnId, dataTableId });
		if (!column) {
			throw new DataTableColumnNotFoundError(dataTableId, columnId);
		}
		return column;
	}

	/**
	 * Insertion index must be in [0, currentColumnCount] (append == currentColumnCount).
	 * Values above that would create empty columns in between.
	 */
	private normalizeAddColumnIndex(index: number | undefined, currentColumnCount: number): number {
		if (index === undefined || index > currentColumnCount) {
			return currentColumnCount;
		}
		if (index < 0) {
			throw new DataTableValidationError('tried to add column at a negative index');
		}
		return index;
	}

	async addColumn(
		dataTableId: string,
		schema: DataTableCreateColumnSchema,
		trx?: EntityManager,
		explicitId?: string,
	) {
		// oxlint-disable-next-line typescript/no-deprecated
		return await withTransaction(this.manager, trx, async (em) => {
			this.validateNotSystemColumn(schema.name);
			await this.validateUniqueColumnName(schema.name, dataTableId, em);

			const columns = await this.getColumns(dataTableId, em);
			const columnCount = columns.length;
			schema.index = this.normalizeAddColumnIndex(schema.index, columnCount);

			if (schema.index < columnCount) {
				await this.shiftColumns(dataTableId, schema.index, 1, em);
			}

			const column = em.create(DataTableColumn, {
				id: explicitId,
				name: schema.name,
				type: schema.type,
				index: schema.index,
				dataTableId,
			});

			await em.insert(DataTableColumn, column);

			await this.ddlService.addColumn(dataTableId, column, em.connection.options.type, em);

			return column;
		});
	}

	async deleteColumn(dataTableId: string, column: DataTableColumn, trx?: EntityManager) {
		// oxlint-disable-next-line typescript/no-deprecated
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

	/**
	 * Pairs columns by id, then by name. Drops changed columns before it renames
	 * or adds columns, so a rename or an added column can take a freed name.
	 * SQLite column names are case-insensitive, so `foo` must go before `Foo` is added.
	 */
	async replaceSchema(
		dataTableId: string,
		projectId: string,
		schema: {
			name: string;
			columns: Array<Pick<DataTableColumn, 'name' | 'type'> & { id?: string }>;
		},
		ctx: OperationContext = {},
	) {
		await this.runInTransaction(ctx, async (em) => {
			if (!(await em.existsBy(DataTable, { id: dataTableId, projectId }))) {
				throw new DataTableNotFoundError(dataTableId);
			}

			const targetColumns = await this.getColumns(dataTableId, em);
			const { pairs } = pairDataTableColumns(schema.columns, targetColumns);
			const keptPairs = pairs.filter(({ source, target }) => source.type === target.type);
			const renames = orderColumnRenames(pairs);
			if (renames.blocked.length > 0) {
				throw new UnexpectedError(
					'Column name swaps and cycles must be rejected before this point',
				);
			}

			const keptTargets = new Set(keptPairs.map(({ target }) => target));
			for (const column of targetColumns) {
				if (!keptTargets.has(column)) await this.deleteColumn(dataTableId, column, em);
			}

			for (const { source, target } of renames.ordered) {
				await this.renameColumn(dataTableId, target, source.name, em);
			}

			const keptSources = new Set(keptPairs.map(({ source }) => source));
			for (const column of schema.columns) {
				if (keptSources.has(column)) continue;
				await this.addColumn(dataTableId, { name: column.name, type: column.type }, em, column.id);
			}

			for (const { source, target } of keptPairs) {
				if (source.id !== undefined && source.id !== target.id) {
					await em.update(DataTableColumn, { id: target.id, dataTableId }, { id: source.id });
				}
			}

			for (const [index, { name }] of schema.columns.entries()) {
				await em.update(DataTableColumn, { dataTableId, name }, { index });
			}

			await em.update(
				DataTable,
				{ id: dataTableId, projectId },
				{ name: schema.name, updatedAt: new Date() },
			);
		});
	}

	async moveColumn(
		dataTableId: string,
		column: DataTableColumn,
		targetIndex: number,
		trx?: EntityManager,
	) {
		// oxlint-disable-next-line typescript/no-deprecated
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

	async renameColumn(
		dataTableId: string,
		column: DataTableColumn,
		newName: string,
		trx?: EntityManager,
	) {
		// oxlint-disable-next-line typescript/no-deprecated
		return await withTransaction(this.manager, trx, async (em) => {
			this.validateNotSystemColumn(newName);
			await this.validateUniqueColumnName(newName, dataTableId, em);

			const oldName = column.name;

			await em.update(DataTableColumn, { id: column.id }, { name: newName });

			await this.ddlService.renameColumn(
				dataTableId,
				oldName,
				newName,
				em.connection.options.type,
				em,
			);

			return { ...column, name: newName };
		});
	}

	async shiftColumns(dataTableId: string, lowestIndex: number, delta: -1 | 1, trx?: EntityManager) {
		// oxlint-disable-next-line typescript/no-deprecated
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
