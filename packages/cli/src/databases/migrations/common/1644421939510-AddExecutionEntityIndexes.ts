import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddExecutionEntityIndexes1644421939510 implements ReversibleMigration {
	async up({ schemaBuilder: { dropIndex, createIndex } }: MigrationContext) {
		await dropIndex('execution_entity', [], 'c4d999a5e90784e8caccf5589d');
		await dropIndex('execution_entity', [], 'ca4a71b47f28ac6ea88293a8e2');

		await createIndex(
			'execution_entity',
			['workflowId', 'waitTill', 'id'],
			false,
			'06da892aaf92a48e7d3e400003',
		);

		await createIndex(
			'execution_entity',
			['workflowId', 'finished', 'id'],
			false,
			'78d62b89dc1433192b86dce18a',
		);

		await createIndex('execution_entity', ['finished', 'id'], false, '1688846335d274033e15c846a4');
		await createIndex('execution_entity', ['waitTill', 'id'], false, 'b94b45ce2c73ce46c54f20b5f9');
		await createIndex(
			'execution_entity',
			['workflowId', 'id'],
			false,
			'81fc04c8a17de15835713505e4',
		);
	}

	async down({ schemaBuilder: { dropIndex, createIndex } }: MigrationContext) {
		await dropIndex('execution_entity', [], '81fc04c8a17de15835713505e4');
		await dropIndex('execution_entity', [], 'b94b45ce2c73ce46c54f20b5f9');
		await dropIndex('execution_entity', [], '1688846335d274033e15c846a4');
		await dropIndex('execution_entity', [], '78d62b89dc1433192b86dce18a');
		await dropIndex('execution_entity', [], '06da892aaf92a48e7d3e400003');
		await createIndex('execution_entity', ['waitTill'], false, 'ca4a71b47f28ac6ea88293a8e2');
		await createIndex('execution_entity', ['workflowId'], false, 'c4d999a5e90784e8caccf5589d');
	}
}
