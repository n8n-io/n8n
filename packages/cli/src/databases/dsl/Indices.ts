import { QueryRunner, TableIndex } from 'typeorm';
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
		protected tablePrefix: string,
		protected tableName: string,
		protected columnNames: string[],
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
		tablePrefix: string,
		tableName: string,
		columnNames: string[],
		protected isUnique: boolean,
		queryRunner: QueryRunner,
		customIndexName?: string,
	) {
		super(tablePrefix, tableName, columnNames, queryRunner, customIndexName);
	}

	async execute(queryRunner: QueryRunner) {
		const { columnNames, isUnique } = this;
		return queryRunner.createIndex(
			this.fullTableName,
			new TableIndex({ name: this.customIndexName ?? this.fullIndexName, columnNames, isUnique }),
		);
	}
}

export class DropIndex extends IndexOperation {
	async execute(queryRunner: QueryRunner) {
		return queryRunner.dropIndex(this.fullTableName, this.customIndexName ?? this.fullIndexName);
	}
}
