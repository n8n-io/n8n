import type { QueryRunner } from '@n8n/typeorm';
import { TableIndex, TypeORMError } from '@n8n/typeorm';
import LazyPromise from 'p-lazy';

abstract class IndexOperation extends LazyPromise<void> {
	abstract execute(queryRunner: QueryRunner): Promise<void>;

	get fullTableName() {
		return [this.tablePrefix, this.tableName].join('');
	}

	get fullIndexName() {
		return ['IDX', `${this.tablePrefix}${this.tableName}`, ...this.columnNames].join('_');
	}

	constructor(
		protected tableName: string,
		protected columnNames: string[],
		protected tablePrefix: string,
		queryRunner: QueryRunner,
		protected customIndexName?: string,
	) {
		super((resolve) => {
			void this.execute(queryRunner).then(resolve);
		});
	}
}

export class CreateIndex extends IndexOperation {
	constructor(
		tableName: string,
		columnNames: string[],
		protected isUnique: boolean,
		tablePrefix: string,
		queryRunner: QueryRunner,
		customIndexName?: string,
	) {
		super(tableName, columnNames, tablePrefix, queryRunner, customIndexName);
	}

	async execute(queryRunner: QueryRunner) {
		const { columnNames, isUnique } = this;
		return await queryRunner.createIndex(
			this.fullTableName,
			new TableIndex({ name: this.customIndexName ?? this.fullIndexName, columnNames, isUnique }),
		);
	}
}

export class DropIndex extends IndexOperation {
	constructor(
		tableName: string,
		columnNames: string[],
		tablePrefix: string,
		queryRunner: QueryRunner,
		customIndexName?: string,
		protected skipIfMissing = false,
	) {
		super(tableName, columnNames, tablePrefix, queryRunner, customIndexName);
	}

	async execute(queryRunner: QueryRunner) {
		return await queryRunner
			.dropIndex(this.fullTableName, this.customIndexName ?? this.fullIndexName)
			.catch((error) => {
				if (
					error instanceof TypeORMError &&
					error.message.includes('not found') &&
					this.skipIfMissing
				) {
					return;
				}
				throw error;
			});
	}
}
