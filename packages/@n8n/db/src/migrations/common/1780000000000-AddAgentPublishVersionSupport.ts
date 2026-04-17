import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds publishing support for agents:
 *  - creates `agent_published_version` to hold the single published snapshot per agent
 *  - adds `versionId` to `agents` for draft-version tracking
 *
 * "Is published?" = existence of an `agent_published_version` row for the agent.
 * "Draft dirty?" = `agents.versionId !== agent_published_version.publishedFromVersionId`.
 */
export class AddAgentPublishVersionSupport1780000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, addColumns, column } }: MigrationContext) {
		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary.notNull,
				column('schema').text,
				column('publishedFromVersionId').varchar(36).notNull,
				column('model').varchar(128),
				column('provider').varchar(128),
				column('credentialId').varchar(36),
				column('publishedById').varchar(36),
				column('createdAt').timestamp().notNull,
				column('updatedAt').timestamp().notNull,
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
			});

		await addColumns('agents', [column('versionId').varchar(36)]);
	}

	async down({ schemaBuilder: { dropTable, dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['versionId']);
		await dropTable('agent_published_version');
	}
}
