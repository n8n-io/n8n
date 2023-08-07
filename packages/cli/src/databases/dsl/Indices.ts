import { QueryRunner, TableIndex } from 'typeorm';
import LazyPromise from 'p-lazy';

abstract class IndexOperation extends LazyPromise<void> {
	abstract execute(queryRunner: QueryRunner): Promise<void>;

	constructor(
		protected name: string,
		protected tableName: string,
		protected prefix: string,
		queryRunner: QueryRunner,
	) {
		super((resolve) => {
			void this.execute(queryRunner).then(resolve);
		});
	}
}

export class CreateIndex extends IndexOperation {
	constructor(
		name: string,
		tableName: string,
		protected columnNames: string[],
		protected isUnique: boolean,
		prefix: string,
		queryRunner: QueryRunner,
	) {
		super(name, tableName, prefix, queryRunner);
	}

	async execute(queryRunner: QueryRunner) {
		const { tableName, name, columnNames, prefix, isUnique } = this;
		return queryRunner.createIndex(
			`${prefix}${tableName}`,
			new TableIndex({ name: `IDX_${prefix}${name}`, columnNames, isUnique }),
		);
	}
}

export class DropIndex extends IndexOperation {
	async execute(queryRunner: QueryRunner) {
		const { tableName, name, prefix } = this;
		return queryRunner.dropIndex(`${prefix}${tableName}`, `IDX_${prefix}${name}`);
	}
}
