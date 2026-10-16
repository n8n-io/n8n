import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PROVIDER_TABLE = 'promotion_provider';
const CONNECTION_TABLE = 'promotion_connection';
const CONNECTION_PROJECT_TABLE = 'promotion_connection_project';
const CONFIG_TABLE = 'promotion_config';

/**
 * Promotions keeps Git credentials on a provider, the remote to talk to on a
 * connection, and the settings for one direction in a config. Code validates the
 * JSON payloads, so a new provider type can reuse these tables.
 */
export class CreatePromotionsTables1788759351166 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createProviderTable(context);
		await this.createConnectionTable(context);
		await this.createConnectionProjectTable(context);
		await this.createConfigTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(CONFIG_TABLE);
		await dropTable(CONNECTION_PROJECT_TABLE);
		await dropTable(CONNECTION_TABLE);
		await dropTable(PROVIDER_TABLE);
	}

	private async createProviderTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(PROVIDER_TABLE).withColumns(
			column('id').varchar(36).primary,
			column('name').varchar(128).notNull,
			column('type')
				.varchar(32)
				.notNull.withEnumCheck(['git'])
				.comment('PromotionProviderType enum: "git"'),
			column('authType')
				.varchar(32)
				.notNull.withEnumCheck(['ssh-key', 'token'])
				.comment(
					'PromotionProviderAuthType enum: "ssh-key", "token". "token" is an HTTP(S) username and password.',
				),
			column('config').json.notNull.comment(
				'Non-secret provider settings, with their own schemaVersion. Validated in code.',
			),
			column('auth').text.notNull.comment('Encrypted credentials. Never sent to a client.'),
		).withTimestamps;
	}

	private async createConnectionTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(CONNECTION_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('providerId')
					.varchar(36)
					.notNull.comment('The provider whose credentials this connection uses.'),
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(['instance', 'projects'])
					.comment(
						'PromotionConnectionScope enum: "instance", "projects". Cannot change after creation.',
					),
				column('target').json.notNull.comment(
					'Where to push and pull, with its own schemaVersion. Plain Git stores the full remote URL.',
				),
			)
			// RESTRICT, not CASCADE: one provider can serve many connections, so deleting
			// it must not take their configuration with it.
			.withTimestamps.withForeignKey('providerId', {
				tableName: PROVIDER_TABLE,
				columnName: 'id',
				onDelete: 'RESTRICT',
				name: `FK_${tablePrefix}promotion_connection_providerId`,
			})
			// Index the foreign key, for listing a provider's connections and for the
			// check on delete.
			.withIndexOn(['providerId']);

		// Only one instance connection is allowed, but any number of project ones.
		// A count check in code would let two slip through at the same time.
		await createIndex(CONNECTION_TABLE, ['scope'], true, undefined, '"scope" = \'instance\'');
	}

	private async createConnectionProjectTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
	}: MigrationContext) {
		// projectId is the primary key, so a project links to one connection at most.
		// A connection can hold many links. Both foreign keys cascade, so a link goes
		// away when either side is deleted.
		await createTable(CONNECTION_PROJECT_TABLE)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('connectionId').varchar(36).notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_connection_project_projectId`,
			})
			.withForeignKey('connectionId', {
				tableName: CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_connection_project_connectionId`,
			})
			// Index the foreign key, for listing a connection's projects and for the
			// cascade delete.
			.withIndexOn(['connectionId']);
	}

	private async createConfigTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(CONFIG_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('Also the name of the local checkout directory.'),
				column('connectionId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(['apply', 'promote'])
					.comment('PromotionDirection enum: "apply", "promote". Cannot change after creation.'),
				column('settings').json.notNull.comment(
					'Branch settings for this direction, with their own schemaVersion. Validated in code.',
				),
			)
			.withTimestamps.withForeignKey('connectionId', {
				tableName: CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_config_connectionId`,
			});

		// One config per direction. This index also covers connectionId lookups and the
		// cascade delete, so connectionId needs no index of its own.
		await createIndex(CONFIG_TABLE, ['connectionId', 'direction'], true);
	}
}
