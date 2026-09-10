import { DataTableCreateColumnSchema } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import {
	DATA_TABLE_SYSTEM_COLUMNS,
	DATA_TABLE_SYSTEM_TESTING_COLUMN,
	DATA_TABLE_VIRTUAL_COLUMNS,
	UnexpectedError,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableDDLService } from './data-table-ddl.service';
import { normalizeColumn } from './data-table-enum.utils';
import { DataTable } from './data-table.entity';
import { DataTableColumnNameConflictError } from './errors/data-table-column-name-conflict.error';
import { DataTableColumnNotFoundError } from './errors/data-table-column-not-found.error';
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
		if (DATA_TABLE_VIRTUAL_COLUMNS.some((vc) => vc.toLowerCase() === lowerName)) {
			throw new DataTableSystemColumnNameConflictError(columnName);
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

	async addColumn(dataTableId: string, schema: DataTableCreateColumnSchema, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const normalizedSchema = normalizeColumn(schema);
			this.validateNotSystemColumn(normalizedSchema.name);
			await this.validateUniqueColumnName(normalizedSchema.name, dataTableId, em);

			const columns = await this.getColumns(dataTableId, em);
			const columnCount = columns.length;
			normalizedSchema.index = this.normalizeAddColumnIndex(normalizedSchema.index, columnCount);

			if (normalizedSchema.index < columnCount) {
				await this.shiftColumns(dataTableId, normalizedSchema.index, 1, em);
			}

			const column = em.create(DataTableColumn, {
				dataTableId,
				name: normalizedSchema.name,
				type: normalizedSchema.type,
				index: normalizedSchema.index,
				options: normalizedSchema.options ?? null,
				defaultValue: normalizedSchema.defaultValue ?? null,
			});

			await em.insert(DataTableColumn, column);

			await this.ddlService.addColumn(dataTableId, column, em.connection.options.type, em);
			if (column.type === 'enum' && column.defaultValue !== null) {
				await this.ddlService.fillColumn(dataTableId, column.name, column.defaultValue, em);
			}
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

	async updateEnumOptionColor(
		dataTableId: string,
		columnId: string,
		optionId: string,
		color: string,
		trx?: EntityManager,
	): Promise<DataTableColumn> {
		return await withTransaction(this.manager, trx, async (em) => {
			const column = await em.findOneBy(DataTableColumn, { id: columnId, dataTableId });
			if (column?.type !== 'enum' || !column.options) {
				throw new DataTableValidationError('Select an enum column from this table');
			}
			if (!column.options.some((option) => option.id === optionId)) {
				throw new DataTableValidationError('Select an enum option from this column');
			}
			column.options = column.options.map((option) =>
				option.id === optionId ? { ...option, color } : option,
			);
			await em.update(DataTableColumn, { id: columnId, dataTableId }, { options: column.options });
			return column;
		});
	}

	async renameColumn(
		dataTableId: string,
		column: DataTableColumn,
		newName: string,
		trx?: EntityManager,
	) {
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
