import type { TableForeignKeyOptions, TableIndexOptions } from '@n8n/typeorm';
import { Table, QueryRunner, TableColumn } from '@n8n/typeorm';
import LazyPromise from 'p-lazy';
import { Column } from './Column';

abstract class TableOperation<R = void> extends LazyPromise<R> {
	abstract execute(queryRunner: QueryRunner): Promise<R>;

	constructor(
		protected tableName: string,
		protected prefix: string,
		queryRunner: QueryRunner,
	) {
		super((resolve, reject) => {
			void this.execute(queryRunner).then(resolve).catch(reject);
		});
	}
}

export class CreateTable extends TableOperation {
	private columns: Column[] = [];

	private indices = new Set<TableIndexOptions>();

	private foreignKeys = new Set<TableForeignKeyOptions>();

	withColumns(...columns: Column[]) {
		this.columns.push(...columns);
		return this;
	}

	get withTimestamps() {
		this.columns.push(
			new Column('createdAt').timestamp().notNull.default('NOW()'),
			new Column('updatedAt').timestamp().notNull.default('NOW()'),
		);
		return this;
	}

	withIndexOn(columnName: string | string[], isUnique = false) {
		const columnNames = Array.isArray(columnName) ? columnName : [columnName];
		this.indices.add({ columnNames, isUnique });
		return this;
	}

	withForeignKey(
		columnName: string,
		ref: { tableName: string; columnName: string; onDelete?: 'CASCADE'; onUpdate?: 'CASCADE' },
	) {
		const foreignKey: TableForeignKeyOptions = {
			columnNames: [columnName],
			referencedTableName: `${this.prefix}${ref.tableName}`,
			referencedColumnNames: [ref.columnName],
		};
		if (ref.onDelete) foreignKey.onDelete = ref.onDelete;
		if (ref.onUpdate) foreignKey.onUpdate = ref.onUpdate;
		this.foreignKeys.add(foreignKey);
		return this;
	}

	async execute(queryRunner: QueryRunner) {
		const { driver } = queryRunner.connection;
		const { columns, tableName: name, prefix, indices, foreignKeys } = this;
		return queryRunner.createTable(
			new Table({
				name: `${prefix}${name}`,
				columns: columns.map((c) => c.toOptions(driver)),
				...(indices.size ? { indices: [...indices] } : {}),
				...(foreignKeys.size ? { foreignKeys: [...foreignKeys] } : {}),
				...('mysql' in driver ? { engine: 'InnoDB' } : {}),
			}),
			true,
		);
	}
}

export class DropTable extends TableOperation {
	async execute(queryRunner: QueryRunner) {
		const { tableName: name, prefix } = this;
		return queryRunner.dropTable(`${prefix}${name}`, true);
	}
}

export class AddColumns extends TableOperation {
	constructor(
		tableName: string,
		protected columns: Column[],
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { driver } = queryRunner.connection;
		const { tableName, prefix, columns } = this;
		return queryRunner.addColumns(
			`${prefix}${tableName}`,
			columns.map((c) => new TableColumn(c.toOptions(driver))),
		);
	}
}

export class DropColumns extends TableOperation {
	constructor(
		tableName: string,
		protected columnNames: string[],
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { tableName, prefix, columnNames } = this;
		return queryRunner.dropColumns(`${prefix}${tableName}`, columnNames);
	}
}

class ModifyNotNull extends TableOperation {
	constructor(
		tableName: string,
		protected columnName: string,
		protected isNullable: boolean,
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { tableName, prefix, columnName, isNullable } = this;
		const table = await queryRunner.getTable(`${prefix}${tableName}`);
		if (!table) throw new Error(`No table found with the name ${tableName}`);
		const oldColumn = table.findColumnByName(columnName)!;
		const newColumn = oldColumn.clone();
		newColumn.isNullable = isNullable;
		return queryRunner.changeColumn(table, oldColumn, newColumn);
	}
}

export class AddNotNull extends ModifyNotNull {
	constructor(
		tableName: string,
		protected columnName: string,
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, columnName, false, prefix, queryRunner);
	}
}

export class DropNotNull extends ModifyNotNull {
	constructor(
		tableName: string,
		protected columnName: string,
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(tableName, columnName, true, prefix, queryRunner);
	}
}
