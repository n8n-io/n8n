import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentSkillDefinitionTable1784000000038 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { createTable, column },
		} = ctx;

		await createTable('agent_skill_definition')
			.withColumns(
				column('id')
					.varchar(32)
					.primary.comment('Application-generated skill ID referenced from agent JSON config'),
				column('agentId')
					.varchar(36)
					.notNull.comment('Owning agent; skill definitions are deleted with the agent'),
				column('name').varchar(128).notNull,
				column('description').varchar(512).notNull,
				column('instructions').text.notNull.comment('Markdown body from SKILL.md'),
				column('allowedTools').json.comment('Tool allowlist declared by the skill'),
				column('recommendedTools').json.comment('Tool recommendations declared by the skill'),
				column('interface').json.comment('Optional SDK interface metadata'),
				column('policy').json.comment('Optional SDK invocation policy metadata'),
				column('dependencies').json.comment('Optional SDK dependency metadata'),
				column('version').varchar(128),
				column('license').varchar(128),
				column('compatibility').text,
				column('platforms').json.comment('Runtime platforms supported by the skill'),
				column('metadata').json.comment('Additional structured skill metadata'),
				column('linkedFiles').json.comment(
					'Linked skill files stored as part of the skill aggregate',
				),
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agent_skill_snapshot')
			.withColumns(
				column('versionId')
					.varchar(36)
					.primary.comment('Published agent_history version this skill snapshot belongs to'),
				column('skillId')
					.varchar(32)
					.primary.comment('Stable skill ID referenced from the published agent JSON config'),
				column('name').varchar(128).notNull,
				column('description').varchar(512).notNull,
				column('instructions').text.notNull.comment('Published markdown body from SKILL.md'),
				column('allowedTools').json.comment('Published tool allowlist declared by the skill'),
				column('recommendedTools').json.comment(
					'Published tool recommendations declared by the skill',
				),
				column('interface').json.comment('Published SDK interface metadata'),
				column('policy').json.comment('Published SDK invocation policy metadata'),
				column('dependencies').json.comment('Published SDK dependency metadata'),
				column('version').varchar(128),
				column('license').varchar(128),
				column('compatibility').text,
				column('platforms').json.comment('Published runtime platforms supported by the skill'),
				column('metadata').json.comment('Published additional structured skill metadata'),
				column('linkedFiles').json.comment(
					'Published linked skill files stored as part of the skill aggregate',
				),
			)
			.withForeignKey('versionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await this.backfillDraftSkills(ctx);
		await this.backfillPublishedSkillSnapshots(ctx);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_skill_snapshot');
		await dropTable('agent_skill_definition');
	}

	private async backfillDraftSkills(ctx: MigrationContext) {
		if (ctx.isPostgres) {
			await this.backfillDraftSkillsPostgres(ctx);
		} else {
			await this.backfillDraftSkillsSqlite(ctx);
		}
	}

	private async backfillPublishedSkillSnapshots(ctx: MigrationContext) {
		if (ctx.isPostgres) {
			await this.backfillPublishedSkillSnapshotsPostgres(ctx);
		} else {
			await this.backfillPublishedSkillSnapshotsSqlite(ctx);
		}
	}

	private async backfillDraftSkillsPostgres({ escape, runQuery }: MigrationContext) {
		const definitions = escape.tableName('agent_skill_definition');
		const agents = escape.tableName('agents');

		await runQuery(`
			INSERT INTO ${definitions}
				("id", "agentId", "name", "description", "instructions", "allowedTools", "recommendedTools", "interface", "policy", "dependencies", "version", "license", "compatibility", "platforms", "metadata", "linkedFiles", "createdAt", "updatedAt")
			SELECT
				entry.key,
				a."id",
				entry.value ->> 'name',
				entry.value ->> 'description',
				entry.value ->> 'instructions',
				entry.value -> 'allowedTools',
				entry.value -> 'recommendedTools',
				entry.value -> 'interface',
				entry.value -> 'policy',
				entry.value -> 'dependencies',
				entry.value ->> 'version',
				entry.value ->> 'license',
				entry.value ->> 'compatibility',
				entry.value -> 'platforms',
				entry.value -> 'metadata',
				'{"references":[]}'::json,
				a."createdAt",
				a."updatedAt"
			FROM ${agents} a
			CROSS JOIN LATERAL jsonb_each(COALESCE(a."skills"::jsonb, '{}'::jsonb)) AS entry(key, value)
			WHERE entry.value ? 'name'
				AND entry.value ? 'description'
				AND entry.value ? 'instructions'
			ON CONFLICT DO NOTHING
		`);
	}

	private async backfillDraftSkillsSqlite({ escape, runQuery }: MigrationContext) {
		const definitions = escape.tableName('agent_skill_definition');
		const agents = escape.tableName('agents');

		await runQuery(`
			INSERT OR IGNORE INTO ${definitions}
				("id", "agentId", "name", "description", "instructions", "allowedTools", "recommendedTools", "interface", "policy", "dependencies", "version", "license", "compatibility", "platforms", "metadata", "linkedFiles", "createdAt", "updatedAt")
			SELECT
				entry.key,
				a."id",
				json_extract(entry.value, '$.name'),
				json_extract(entry.value, '$.description'),
				json_extract(entry.value, '$.instructions'),
				json_extract(entry.value, '$.allowedTools'),
				json_extract(entry.value, '$.recommendedTools'),
				json_extract(entry.value, '$.interface'),
				json_extract(entry.value, '$.policy'),
				json_extract(entry.value, '$.dependencies'),
				json_extract(entry.value, '$.version'),
				json_extract(entry.value, '$.license'),
				json_extract(entry.value, '$.compatibility'),
				json_extract(entry.value, '$.platforms'),
				json_extract(entry.value, '$.metadata'),
				'{"references":[]}',
				a."createdAt",
				a."updatedAt"
			FROM ${agents} a, json_each(COALESCE(a."skills", '{}')) entry
			WHERE json_extract(entry.value, '$.name') IS NOT NULL
				AND json_extract(entry.value, '$.description') IS NOT NULL
				AND json_extract(entry.value, '$.instructions') IS NOT NULL
		`);
	}

	private async backfillPublishedSkillSnapshotsPostgres({ escape, runQuery }: MigrationContext) {
		const snapshots = escape.tableName('agent_skill_snapshot');
		const history = escape.tableName('agent_history');

		await runQuery(`
			INSERT INTO ${snapshots}
				("versionId", "skillId", "name", "description", "instructions", "allowedTools", "recommendedTools", "interface", "policy", "dependencies", "version", "license", "compatibility", "platforms", "metadata", "linkedFiles", "createdAt", "updatedAt")
			SELECT
				h."versionId",
				entry.key,
				entry.value ->> 'name',
				entry.value ->> 'description',
				entry.value ->> 'instructions',
				entry.value -> 'allowedTools',
				entry.value -> 'recommendedTools',
				entry.value -> 'interface',
				entry.value -> 'policy',
				entry.value -> 'dependencies',
				entry.value ->> 'version',
				entry.value ->> 'license',
				entry.value ->> 'compatibility',
				entry.value -> 'platforms',
				entry.value -> 'metadata',
				'{"references":[]}'::json,
				h."createdAt",
				h."updatedAt"
			FROM ${history} h
			CROSS JOIN LATERAL jsonb_each(COALESCE(h."skills"::jsonb, '{}'::jsonb)) AS entry(key, value)
			WHERE entry.value ? 'name'
				AND entry.value ? 'description'
				AND entry.value ? 'instructions'
			ON CONFLICT DO NOTHING
		`);
	}

	private async backfillPublishedSkillSnapshotsSqlite({ escape, runQuery }: MigrationContext) {
		const snapshots = escape.tableName('agent_skill_snapshot');
		const history = escape.tableName('agent_history');

		await runQuery(`
			INSERT OR IGNORE INTO ${snapshots}
				("versionId", "skillId", "name", "description", "instructions", "allowedTools", "recommendedTools", "interface", "policy", "dependencies", "version", "license", "compatibility", "platforms", "metadata", "linkedFiles", "createdAt", "updatedAt")
			SELECT
				h."versionId",
				entry.key,
				json_extract(entry.value, '$.name'),
				json_extract(entry.value, '$.description'),
				json_extract(entry.value, '$.instructions'),
				json_extract(entry.value, '$.allowedTools'),
				json_extract(entry.value, '$.recommendedTools'),
				json_extract(entry.value, '$.interface'),
				json_extract(entry.value, '$.policy'),
				json_extract(entry.value, '$.dependencies'),
				json_extract(entry.value, '$.version'),
				json_extract(entry.value, '$.license'),
				json_extract(entry.value, '$.compatibility'),
				json_extract(entry.value, '$.platforms'),
				json_extract(entry.value, '$.metadata'),
				'{"references":[]}',
				h."createdAt",
				h."updatedAt"
			FROM ${history} h, json_each(COALESCE(h."skills", '{}')) entry
			WHERE json_extract(entry.value, '$.name') IS NOT NULL
				AND json_extract(entry.value, '$.description') IS NOT NULL
				AND json_extract(entry.value, '$.instructions') IS NOT NULL
		`);
	}
}
