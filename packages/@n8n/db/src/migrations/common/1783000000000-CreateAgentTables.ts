import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Consolidated migration for agent tables. Replaces the unreleased
 * branch migrations 1776..1782 that introduced the agents feature.
 *
 * Idempotent: existing DBs that already ran the older migrations
 * will detect existing tables/columns and no-op.
 */
export class CreateAgentTables1783000000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, dropColumns, createIndex, column },
		queryRunner,
		escape,
		runQuery,
		isPostgres,
	}: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');

		const columnExists = async (tableName: string, columnName: string) => {
			const t = await queryRunner.getTable(`${tablePrefix}${tableName}`);
			return t?.findColumnByName(columnName) !== undefined;
		};

		const findIndexByExactColumns = async (tableName: string, columnNames: string[]) => {
			const t = await queryRunner.getTable(`${tablePrefix}${tableName}`);
			return (
				t?.indices.find(
					(index) =>
						index.columnNames.length === columnNames.length &&
						columnNames.every(
							(columnName, indexInList) => index.columnNames[indexInList] === columnName,
						),
				) ?? null
			);
		};

		const hasIndexStartingWithColumns = async (tableName: string, columnNames: string[]) => {
			const t = await queryRunner.getTable(`${tablePrefix}${tableName}`);
			return (
				t?.indices.some((index) =>
					columnNames.every(
						(columnName, indexInList) => index.columnNames[indexInList] === columnName,
					),
				) ?? false
			);
		};

		await createTable('agents')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').varchar(512),
				column('projectId').varchar(255).notNull,
				column('credentialId').varchar(255),
				column('provider').varchar(128),
				column('model').varchar(128),
				column('integrations').json.notNull.default("'[]'"),
				column('schema').json,
				column('tools').json.notNull.default("'{}'"),
				column('skills').json.notNull.default("'{}'"),
				column('versionId').varchar(36),
			)
			.withIndexOn('projectId')
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		if (!(await hasIndexStartingWithColumns('agents', ['projectId']))) {
			await createIndex('agents', ['projectId']);
		}

		// Backfill missing columns for DBs that ran the older migrations
		// before tools/skills/versionId existed.
		if (!(await columnExists('agents', 'tools'))) {
			await addColumns('agents', [column('tools').json.notNull.default("'{}'")]);
		}
		if (!(await columnExists('agents', 'skills'))) {
			await addColumns('agents', [column('skills').json.notNull.default("'{}'")]);
		}
		if (!(await columnExists('agents', 'versionId'))) {
			await addColumns('agents', [column('versionId').varchar(36)]);
		}
		// `code` was created in the original 1776 and dropped in 1779. Drop it
		// here for any DB still on a pre-1779 state.
		if (await columnExists('agents', 'code')) {
			await dropColumns('agents', ['code']);
		}

		await createTable('agent_checkpoints')
			.withColumns(
				column('runId').varchar(255).primary.notNull,
				column('agentId').varchar(255),
				column('state').text,
				column('expired').bool.default(false).notNull,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agents_resources').withColumns(
			column('id').varchar(255).primary.notNull,
			column('metadata').text,
		).withTimestamps;

		await createTable('agents_threads')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('resourceId').varchar(255).notNull,
				column('title').varchar(255),
				column('metadata').text,
			)
			.withIndexOn('resourceId').withTimestamps;

		await createTable('agents_messages')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('threadId').varchar(255).notNull,
				column('resourceId').varchar(255).notNull,
				column('role').varchar(36).notNull,
				column('type').varchar(36),
				column('content').json.notNull,
			)
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		if (!(await hasIndexStartingWithColumns('agents_messages', ['threadId', 'createdAt']))) {
			await createIndex('agents_messages', ['threadId', 'createdAt']);
		}

		const redundantThreadIdIndex = await findIndexByExactColumns('agents_messages', ['threadId']);
		if (redundantThreadIdIndex) {
			await queryRunner.dropIndex(`${tablePrefix}agents_messages`, redundantThreadIdIndex);
		}

		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary.notNull,
				column('schema').json,
				column('publishedFromVersionId').varchar(36).notNull,
				column('model').varchar(128),
				column('provider').varchar(128),
				column('credentialId').varchar(36),
				column('publishedById').uuid,
				column('tools').json,
				column('skills').json,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		if (isPostgres) {
			const tableName = escape.tableName('agent_published_version');
			await runQuery(
				`ALTER TABLE ${tableName} ALTER COLUMN ${escape.columnName('createdAt')} SET DEFAULT CURRENT_TIMESTAMP(3)`,
			);
			await runQuery(
				`ALTER TABLE ${tableName} ALTER COLUMN ${escape.columnName('updatedAt')} SET DEFAULT CURRENT_TIMESTAMP(3)`,
			);
		}

		// Backfill missing columns for DBs that created agent_published_version
		// before tools/skills were added.
		if (!(await columnExists('agent_published_version', 'tools'))) {
			await addColumns('agent_published_version', [column('tools').json]);
		}
		if (!(await columnExists('agent_published_version', 'skills'))) {
			await addColumns('agent_published_version', [column('skills').json]);
			const tableName = escape.tableName('agent_published_version');
			const skillsColumn = escape.columnName('skills');
			await runQuery(
				`UPDATE ${tableName} SET ${skillsColumn} = '{}' WHERE ${skillsColumn} IS NULL`,
			);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_published_version');
		await dropTable('agents_messages');
		await dropTable('agents_threads');
		await dropTable('agents_resources');
		await dropTable('agent_checkpoints');
		await dropTable('agents');
	}
}
