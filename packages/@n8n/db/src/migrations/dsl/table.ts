import type { TableForeignKeyOptions, TableIndexOptions, QueryRunner } from '@n8n/typeorm';
import { Table, TableColumn, TableForeignKey } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import LazyPromise from 'p-lazy';

import { Column } from './column';

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
		ref: {
			tableName: string;
			columnName: string;
			onDelete?: 'RESTRICT' | 'CASCADE' | 'NO ACTION' | 'SET NULL';
			onUpdate?: 'RESTRICT' | 'CASCADE' | 'NO ACTION' | 'SET NULL';
			name?: string;
		},
	) {
		const foreignKey: TableForeignKeyOptions = {
			columnNames: [columnName],
			referencedTableName: `${this.prefix}${ref.tableName}`,
			referencedColumnNames: [ref.columnName],
		};
		if (ref.onDelete) foreignKey.onDelete = ref.onDelete;
		if (ref.onUpdate) foreignKey.onUpdate = ref.onUpdate;
		if (ref.name) foreignKey.name = ref.name;
		this.foreignKeys.add(foreignKey);
		return this;
	}

	async execute(queryRunner: QueryRunner) {
		const { driver } = queryRunner.connection;
		const { columns, tableName: name, prefix, indices, foreignKeys } = this;
		return await queryRunner.createTable(
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
		return await queryRunner.dropTable(`${prefix}${name}`, true);
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
		return await queryRunner.addColumns(
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
		return await queryRunner.dropColumns(`${prefix}${tableName}`, columnNames);
	}
}

abstract class ForeignKeyOperation extends TableOperation {
	protected foreignKey: TableForeignKey;

	constructor(
		tableName: string,
		columnName: string,
		[referencedTableName, referencedColumnName]: [string, string],
		prefix: string,
		queryRunner: QueryRunner,
		customConstraintName?: string,
	) {
		super(tableName, prefix, queryRunner);

		this.foreignKey = new TableForeignKey({
			name: customConstraintName,
			columnNames: [columnName],
			referencedTableName: `${prefix}${referencedTableName}`,
			referencedColumnNames: [referencedColumnName],
		});
	}
}

export class AddForeignKey extends ForeignKeyOperation {
	async execute(queryRunner: QueryRunner) {
		const { tableName, prefix } = this;
		return await queryRunner.createForeignKey(`${prefix}${tableName}`, this.foreignKey);
	}
}

export class DropForeignKey extends ForeignKeyOperation {
	async execute(queryRunner: QueryRunner) {
		const { tableName, prefix } = this;
		return await queryRunner.dropForeignKey(`${prefix}${tableName}`, this.foreignKey);
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
		if (!table) throw new UnexpectedError('No table found', { extra: { tableName } });
		const oldColumn = table.findColumnByName(columnName)!;
		const newColumn = oldColumn.clone();
		newColumn.isNullable = isNullable;
		return await queryRunner.changeColumn(table, oldColumn, newColumn);
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
