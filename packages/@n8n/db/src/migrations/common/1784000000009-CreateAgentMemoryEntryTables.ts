import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const MEMORY_ENTRY_STATUSES = ['active', 'superseded', 'dropped'];
const OBSERVATION_SCOPE_KINDS = ['thread', 'resource'];
const OBSERVATION_LOCKS_TABLE = 'agents_observation_locks';
const OBSERVATION_LOCK_TASK_KIND_COLUMN = 'taskKind';
const LEGACY_OBSERVATION_LOCK_TASK_KINDS = ['observer', 'reflector'];

export class CreateAgentMemoryEntryTables1784000000009 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, dropTable, column },
		queryRunner,
		tablePrefix,
	}: MigrationContext) {
		await this.dropObservationLockTaskKindCheck(queryRunner, tablePrefix);
		await dropTable('agents_memory_entry_cursors');
		await dropTable('agents_memory_entry_sources');
		await dropTable('agents_memory_entries');

		await createTable('agents_memory_entries')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('resourceId')
					.varchar(255)
					.notNull.comment('agents_resources.id partition used for episodic recall scope'),
				column('content').text.notNull,
				column('contentHash').varchar(64).notNull,
				column('status').varchar(16).notNull.withEnumCheck(MEMORY_ENTRY_STATUSES),
				column('supersededBy').varchar(36).comment('Self-reference to replacement memory entry'),
				column('embeddingModel').varchar(128).comment('Embedding model used to produce embedding'),
				column('embedding').json.comment('Embedding vector for episodic recall'),
				column('metadata').json.comment('Optional system metadata for ranking and debugging'),
				column('lastSeenAt')
					.timestampTimezone(3)
					.notNull.comment(
						'Last time equivalent content was observed; updatedAt tracks row mutation time',
					),
			)
			.withIndexOn(['agentId', 'resourceId', 'status', 'createdAt', 'id'])
			.withIndexOn(['agentId', 'resourceId', 'contentHash'], true)
			.withIndexOn('supersededBy')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resourceId', {
				tableName: 'agents_resources',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('supersededBy', {
				tableName: 'agents_memory_entries',
				columnName: 'id',
			}).withTimestamps;

		await createTable('agents_memory_entry_sources')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('memoryEntryId').varchar(36).notNull,
				column('observationId').varchar(36).notNull,
				column('threadId')
					.varchar(255)
					.notNull.comment('Source conversation thread that produced the linked observation'),
				column('evidenceHash')
					.varchar(64)
					.notNull.comment('Bounded hash used to deduplicate exact evidence links'),
				column('evidenceText').text.notNull.comment(
					'Exact source evidence text from the observation, not recall scope',
				),
			)
			.withIndexOn(['memoryEntryId', 'observationId', 'evidenceHash'], true)
			.withIndexOn('observationId')
			.withIndexOn('threadId')
			.withForeignKey('memoryEntryId', {
				tableName: 'agents_memory_entries',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('observationId', {
				tableName: 'agents_observations',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_memory_entry_cursors').withColumns(
			column('scopeKind')
				.varchar(20)
				.notNull.primary.withEnumCheck(OBSERVATION_SCOPE_KINDS)
				.comment('Observation-log scope kind being indexed into episodic memory'),
			column('scopeId')
				.varchar(255)
				.notNull.primary.comment('Observation-log scope ID being indexed into episodic memory'),
			column('lastIndexedObservationId')
				.varchar(36)
				.notNull.comment('Last observation-log row indexed into episodic memory'),
			column('lastIndexedObservationCreatedAt')
				.timestampTimezone(3)
				.notNull.comment('Creation timestamp for the last indexed observation-log row'),
		).withTimestamps;
	}

	async down({
		schemaBuilder: { dropTable },
		queryRunner,
		tablePrefix,
		escape,
		runQuery,
	}: MigrationContext) {
		await dropTable('agents_memory_entry_cursors');
		await dropTable('agents_memory_entry_sources');
		await dropTable('agents_memory_entries');
		await this.restoreObservationLockTaskKindCheck(queryRunner, tablePrefix, escape, runQuery);
	}

	private async dropObservationLockTaskKindCheck(
		queryRunner: MigrationContext['queryRunner'],
		tablePrefix: string,
	) {
		const fullTableName = `${tablePrefix}${OBSERVATION_LOCKS_TABLE}`;
		const table = await queryRunner.getTable(fullTableName);
		const check = table?.checks.find(
			(item) =>
				item.name ===
					`CHK_${tablePrefix}${OBSERVATION_LOCKS_TABLE}_${OBSERVATION_LOCK_TASK_KIND_COLUMN}` ||
				item.expression?.includes(OBSERVATION_LOCK_TASK_KIND_COLUMN),
		);

		if (check) {
			await queryRunner.dropCheckConstraint(fullTableName, check);
		}
	}

	private async restoreObservationLockTaskKindCheck(
		queryRunner: MigrationContext['queryRunner'],
		tablePrefix: string,
		escape: MigrationContext['escape'],
		runQuery: MigrationContext['runQuery'],
	) {
		const fullTableName = `${tablePrefix}${OBSERVATION_LOCKS_TABLE}`;
		const table = await queryRunner.getTable(fullTableName);
		if (!table) return;

		const checkName = `CHK_${tablePrefix}${OBSERVATION_LOCKS_TABLE}_${OBSERVATION_LOCK_TASK_KIND_COLUMN}`;
		if (table.checks.some((check) => check.name === checkName)) return;

		const escapedColumnName = queryRunner.connection.driver.escape(
			OBSERVATION_LOCK_TASK_KIND_COLUMN,
		);
		const escapedValues = LEGACY_OBSERVATION_LOCK_TASK_KINDS.map(
			(value) => `'${value.replace(/'/g, "''")}'`,
		).join(', ');
		await runQuery(
			`DELETE FROM ${escape.tableName(OBSERVATION_LOCKS_TABLE)} WHERE ${escape.columnName(OBSERVATION_LOCK_TASK_KIND_COLUMN)} NOT IN (${escapedValues})`,
		);
		await queryRunner.createCheckConstraint(
			fullTableName,
			new TableCheck({
				name: checkName,
				expression: `${escapedColumnName} IN (${escapedValues})`,
			}),
		);
	}
}
