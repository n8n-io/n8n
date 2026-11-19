import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const fkName = 'FK_agents_identity';
const batchSize = 500;
const columnComment = 'Identity the agent acts as, a service account today. Every agent has one';
const previousColumnComment =
	'Identity the agent acts as, a service account today. Null for an instance agent or an agent without one';

/**
 * Gives every agent without an identity a service account with a personal
 * project, then makes `agents.identityId` required.
 *
 * The backfill is SQL in the migration, not a startup reconcile, because the
 * NOT NULL step runs before any startup code. It writes the same rows as
 * `ServiceAccountRepository.createWithPersonalProject`.
 *
 * The FK changes to RESTRICT. To delete an identity, delete its agent first.
 */
export class BackfillAgentIdentities1795076463179 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addNotNull, addForeignKey, dropForeignKey },
		} = context;

		await this.ensureAgentRole(context);
		await this.backfillIdentities(context);

		await dropForeignKey('agents', 'identityId', ['user', 'id'], fkName);
		await addNotNull('agents', 'identityId', { recreatesOnSqlite: true });
		await addForeignKey('agents', 'identityId', ['user', 'id'], fkName, 'RESTRICT');
		await this.setColumnComment(context, columnComment);
	}

	/** Keeps the service accounts. The agents stay linked to them. */
	async down(context: MigrationContext) {
		const {
			schemaBuilder: { dropNotNull, addForeignKey, dropForeignKey },
		} = context;

		await dropForeignKey('agents', 'identityId', ['user', 'id'], fkName);
		await dropNotNull('agents', 'identityId', { recreatesOnSqlite: true });
		await addForeignKey('agents', 'identityId', ['user', 'id'], fkName, 'SET NULL');
		await this.setColumnComment(context, previousColumnComment);
	}

	/** Roles sync on start, after migrations. `user.roleSlug` has an FK to the role. */
	private async ensureAgentRole({ escape, runQuery }: MigrationContext) {
		const role = escape.tableName('role');
		await runQuery(
			`INSERT INTO ${role} (${escape.columnName('slug')}, ${escape.columnName('roleType')}, ${escape.columnName('systemRole')}) VALUES ('global:agent', 'global', :systemRole) ON CONFLICT DO NOTHING`,
			{ systemRole: true },
		);
	}

	/**
	 * One account for each agent, in batches. Each batch selects agents that still
	 * have no identity, with LIMIT and no OFFSET: the loop removes rows from its
	 * own filter, so OFFSET pages would skip rows.
	 *
	 * Each batch writes with one statement per table, not one per agent, so the
	 * time depends little on the latency to the database.
	 */
	private async backfillIdentities({
		escape,
		runQuery,
		logger,
		migrationName,
		isPostgres,
	}: MigrationContext) {
		const t = {
			agents: escape.tableName('agents'),
			user: escape.tableName('user'),
			details: escape.tableName('service_account_details'),
			project: escape.tableName('project'),
			projectRelation: escape.tableName('project_relation'),
		};
		const c = {
			id: escape.columnName('id'),
			name: escape.columnName('name'),
			type: escape.columnName('type'),
			kind: escape.columnName('kind'),
			role: escape.columnName('role'),
			roleSlug: escape.columnName('roleSlug'),
			userId: escape.columnName('userId'),
			projectId: escape.columnName('projectId'),
			creatorId: escape.columnName('creatorId'),
			identityId: escape.columnName('identityId'),
		};

		let total = 0;
		while (true) {
			const agents = await runQuery<Array<{ id: string; name: string }>>(
				`SELECT ${c.id}, ${c.name} FROM ${t.agents} WHERE ${c.identityId} IS NULL ORDER BY ${c.id} LIMIT ${batchSize}`,
			);
			if (agents.length === 0) break;
			total += agents.length;

			// Row `i` uses the parameters :a<i> (agent), :u<i> (account), :p<i> (project), :n<i> (name).
			const params: Record<string, string> = {};
			agents.forEach((agent, i) => {
				params[`a${i}`] = agent.id;
				params[`u${i}`] = randomUUID();
				params[`p${i}`] = generateNanoId();
				// A service account needs a name. An imported agent can have a blank one.
				params[`n${i}`] = agent.name.trim() === '' ? 'Agent' : agent.name;
			});
			const rows = (row: (i: number) => string) => agents.map((_, i) => `(${row(i)})`).join(', ');
			// An INSERT takes its types from the target columns. A CASE does not, and
			// `identityId` is a uuid on Postgres.
			const asUuid = (param: string) => (isPostgres ? `CAST(:${param} AS uuid)` : `:${param}`);

			await runQuery(
				`INSERT INTO ${t.user} (${c.id}, ${c.kind}, ${c.roleSlug}) VALUES ${rows((i) => `:u${i}, 'service', 'global:agent'`)}`,
				params,
			);
			await runQuery(
				`INSERT INTO ${t.details} (${c.userId}, ${c.name}) VALUES ${rows((i) => `:u${i}, :n${i}`)}`,
				params,
			);
			await runQuery(
				`INSERT INTO ${t.project} (${c.id}, ${c.name}, ${c.type}, ${c.creatorId}) VALUES ${rows((i) => `:p${i}, :n${i}, 'personal', :u${i}`)}`,
				params,
			);
			await runQuery(
				`INSERT INTO ${t.projectRelation} (${c.projectId}, ${c.userId}, ${c.role}) VALUES ${rows((i) => `:p${i}, :u${i}, 'project:personalOwner'`)}`,
				params,
			);
			const cases = agents.map((_, i) => `WHEN :a${i} THEN ${asUuid(`u${i}`)}`).join(' ');
			const ids = agents.map((_, i) => `:a${i}`).join(', ');
			await runQuery(
				`UPDATE ${t.agents} SET ${c.identityId} = CASE ${c.id} ${cases} END WHERE ${c.id} IN (${ids})`,
				params,
			);
		}

		if (total > 0) {
			logger.info(`[${migrationName}] Created a service account for ${total} agent(s)`);
		}
	}

	private async setColumnComment({ escape, runQuery, isPostgres }: MigrationContext, text: string) {
		if (!isPostgres) return;
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName('agents')}.${escape.columnName('identityId')} IS '${text}'`,
		);
	}
}
