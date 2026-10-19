/**
 * Timing harness for the three ways to give service accounts an identity row.
 *
 * Each path starts from a fresh schema at the state before
 * `AddTypeToUserTable`, filled with synthetic rows in the tables that grow
 * with usage. The harness runs the path as raw SQL steps, times each step,
 * checks the foreign keys afterwards, and prints one table per database.
 *
 * Paths:
 * - C: add a `type` column to `user`. The committed migration does this.
 * - B: rename `user` to `actor`, create a new `user` table for the human
 *   columns, and drop them from `actor`.
 * - A: create `actor`, backfill it, and move every foreign key that points at
 *   `user` so that it points at `actor`.
 *
 * Environment:
 * - `ACTOR_BENCH_USERS`: number of users. The other tables scale from it.
 * - `ACTOR_BENCH_PATHS`: comma list of paths to run, default `C,B,A`.
 * - `ACTOR_BENCH_OUT`: file path for the JSON result, optional.
 */
import {
	createTestMigrationContext,
	initDbUpToMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const MIGRATION_NAME = 'AddTypeToUserTable1791986966630';
const USERS = Number(process.env.ACTOR_BENCH_USERS ?? 1000);
const PATHS = (process.env.ACTOR_BENCH_PATHS ?? 'C,B,A').split(',').map((p) => p.trim());
const OUT = process.env.ACTOR_BENCH_OUT;

/** Rows for each user. The ratios are guesses for a busy instance. */
const RATIO = {
	teamProjects: 0.1,
	teamMembers: 5,
	workflows: 2,
	publishHistory: 10,
	activityEvents: 40,
	oauthTokens: 10,
	chatSessions: 4,
	favorites: 2,
	idempotencyKeys: 2,
};

const HUMAN_COLUMNS = [
	'email',
	'firstName',
	'lastName',
	'password',
	'personalizationAnswers',
	'settings',
	'mfaEnabled',
	'mfaSecret',
	'mfaRecoveryCodes',
	'lastActiveAt',
];

/** Tables whose row count must not change under any path. */
const VERIFIED_TABLES = ['project_relation', 'activity_event', 'oauth_access_tokens'];

type Step = { step: string; ms: number };
type PathResult = { path: string; steps: Step[]; totalMs: number };
type Counts = Record<string, number>;

const results: Array<PathResult & { db: string; users: number; fillMs: number; counts: Counts }> =
	[];

describe('actor migration bench', () => {
	let dataSource: DataSource;
	let ctx: TestMigrationContext;
	let dbType: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		dbType = Container.get(GlobalConfig).database.type;
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
		report();
	});

	const t = (name: string) => ctx.escape.tableName(name);
	const q = async <T = unknown>(sql: string, params?: Record<string, unknown>) =>
		await ctx.runQuery<T>(sql, params);

	async function timed(step: string, fn: () => Promise<unknown>, steps: Step[]) {
		const start = performance.now();
		await fn();
		const ms = Math.round(performance.now() - start);
		steps.push({ step, ms });
		console.log(`    ${step}: ${ms} ms`);
	}

	async function resetSchema() {
		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.connect();
	}

	// ---------------------------------------------------------------- fill

	async function insertRows(table: string, columns: string[], rows: unknown[][]) {
		const cols = columns.map((c) => ctx.escape.columnName(c)).join(', ');
		const chunk = 500;
		for (let i = 0; i < rows.length; i += chunk) {
			const slice = rows.slice(i, i + chunk);
			const params: Record<string, unknown> = {};
			const values = slice
				.map((row, r) => {
					const names = row.map((value, c) => {
						const key = `p${r}_${c}`;
						params[key] = value;
						return `:${key}`;
					});
					return `(${names.join(', ')})`;
				})
				.join(', ');
			await q(`INSERT INTO ${t(table)} (${cols}) VALUES ${values}`, params);
		}
	}

	const now = () => new Date().toISOString();
	const pick = <T>(list: T[], i: number) => list[i % list.length];

	async function fill(): Promise<Counts> {
		const counts: Counts = {};
		const userIds = Array.from({ length: USERS }, () => randomUUID());
		await ctx.queryRunner.startTransaction();

		await insertRows(
			'user',
			['id', 'email', 'firstName', 'lastName', 'password', 'roleSlug'],
			userIds.map((id, i) => [
				id,
				`user${i}@example.com`,
				'First',
				'Last',
				'hash',
				'global:member',
			]),
		);
		counts.user = USERS;

		const personalProjectIds = userIds.map(() => randomUUID());
		const teamProjectIds = Array.from({ length: Math.ceil(USERS * RATIO.teamProjects) }, () =>
			randomUUID(),
		);
		await insertRows(
			'project',
			['id', 'name', 'type', 'creatorId'],
			[
				...personalProjectIds.map((id, i) => [id, `Personal ${i}`, 'personal', null]),
				...teamProjectIds.map((id, i) => [id, `Team ${i}`, 'team', pick(userIds, i)]),
			],
		);
		counts.project = personalProjectIds.length + teamProjectIds.length;

		const relations: unknown[][] = personalProjectIds.map((projectId, i) => [
			projectId,
			userIds[i],
			'project:personalOwner',
		]);
		teamProjectIds.forEach((projectId, i) => {
			for (let m = 0; m < RATIO.teamMembers; m++) {
				relations.push([projectId, pick(userIds, i * RATIO.teamMembers + m), 'project:editor']);
			}
		});
		await insertRows('project_relation', ['projectId', 'userId', 'role'], relations);
		counts.project_relation = relations.length;

		const workflowIds = Array.from({ length: USERS * RATIO.workflows }, () => randomUUID());
		await insertRows(
			'workflow_entity',
			['id', 'name', 'active', 'versionId', 'nodes', 'connections'],
			workflowIds.map((id, i) => [id, `Workflow ${i}`, false, randomUUID(), '[]', '{}']),
		);
		counts.workflow_entity = workflowIds.length;

		await insertRows(
			'workflow_publish_history',
			['workflowId', 'event', 'userId'],
			Array.from({ length: USERS * RATIO.publishHistory }, (_, i) => [
				pick(workflowIds, i),
				'activated',
				pick(userIds, i),
			]),
		);
		counts.workflow_publish_history = USERS * RATIO.publishHistory;

		await insertRows(
			'activity_event',
			['category', 'action', 'userId', 'projectId', 'resourceType', 'resourceId'],
			Array.from({ length: USERS * RATIO.activityEvents }, (_, i) => [
				'workflow',
				'updated',
				pick(userIds, i),
				pick(personalProjectIds, i),
				'workflow',
				pick(workflowIds, i),
			]),
		);
		counts.activity_event = USERS * RATIO.activityEvents;

		const clientId = randomUUID();
		await insertRows(
			'oauth_clients',
			['id', 'name', 'redirectUris', 'grantTypes'],
			[[clientId, 'Bench client', '["https://example.com/cb"]', '["authorization_code"]']],
		);
		await insertRows(
			'oauth_access_tokens',
			['token', 'clientId', 'userId'],
			Array.from({ length: USERS * RATIO.oauthTokens }, (_, i) => [
				randomUUID(),
				clientId,
				pick(userIds, i),
			]),
		);
		counts.oauth_access_tokens = USERS * RATIO.oauthTokens;

		await insertRows(
			'chat_hub_sessions',
			['id', 'title', 'ownerId', 'lastMessageAt'],
			Array.from({ length: USERS * RATIO.chatSessions }, (_, i) => [
				randomUUID(),
				`Session ${i}`,
				pick(userIds, i),
				now(),
			]),
		);
		counts.chat_hub_sessions = USERS * RATIO.chatSessions;

		await insertRows(
			'user_api_keys',
			['id', 'userId', 'label', 'apiKey'],
			userIds.map((userId) => [randomUUID(), userId, 'bench', randomUUID()]),
		);
		counts.user_api_keys = USERS;

		await insertRows(
			'user_favorites',
			['userId', 'resourceId', 'resourceType'],
			Array.from({ length: USERS * RATIO.favorites }, (_, i) => [
				pick(userIds, i),
				pick(workflowIds, i * 7),
				'workflow',
			]),
		);
		counts.user_favorites = USERS * RATIO.favorites;

		await insertRows(
			'idempotency_key',
			['id', 'userId', 'idempotencyKey', 'fingerprint'],
			Array.from({ length: USERS * RATIO.idempotencyKeys }, (_, i) => [
				randomUUID().slice(0, 16),
				pick(userIds, i),
				randomUUID(),
				'fp',
			]),
		);
		counts.idempotency_key = USERS * RATIO.idempotencyKeys;

		await insertRows(
			'workflow_builder_session',
			['id', 'workflowId', 'userId'],
			workflowIds.map((workflowId, i) => [randomUUID(), workflowId, pick(userIds, i)]),
		);
		counts.workflow_builder_session = workflowIds.length;

		await insertRows(
			'ai_preference',
			['id', 'content', 'userId', 'source'],
			userIds.map((userId) => [randomUUID(), 'Prefer short answers', userId, 'ui']),
		);
		counts.ai_preference = USERS;

		await ctx.queryRunner.commitTransaction();
		return counts;
	}

	// ------------------------------------------------------- catalog helpers

	/** Tables with a foreign key that points at `user`, from the catalog. */
	async function tablesReferencing(target: string): Promise<string[]> {
		if (ctx.isPostgres) {
			const rows = await q<Array<{ tbl: string }>>(
				`SELECT DISTINCT conrelid::regclass::text AS tbl FROM pg_constraint
				 WHERE contype = 'f' AND confrelid = '${pgQualified(target)}'::regclass`,
			);
			return rows.map((r) => r.tbl);
		}
		const tables = await q<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
		);
		const out: string[] = [];
		for (const { name } of tables) {
			const fks = await q<Array<{ table: string }>>(`PRAGMA foreign_key_list("${name}")`);
			if (fks.some((fk) => fk.table === `${ctx.tablePrefix}${target}`)) out.push(name);
		}
		return out;
	}

	async function countForeignKeysTo(target: string): Promise<number> {
		if (ctx.isPostgres) {
			const [{ n }] = await q<Array<{ n: string }>>(
				`SELECT COUNT(*)::int AS n FROM pg_constraint
				 WHERE contype = 'f' AND confrelid = '${pgQualified(target)}'::regclass`,
			);
			return Number(n);
		}
		let n = 0;
		for (const name of await tablesReferencing(target)) {
			const fks = await q<Array<{ table: string }>>(`PRAGMA foreign_key_list("${name}")`);
			n += fks.filter((fk) => fk.table === `${ctx.tablePrefix}${target}`).length;
		}
		return n;
	}

	function pgQualified(name: string) {
		const schema = Container.get(GlobalConfig).database.postgresdb.schema;
		return `${schema}."${ctx.tablePrefix}${name}"`;
	}

	async function count(table: string): Promise<number> {
		const [{ n }] = await q<Array<{ n: string | number }>>(`SELECT COUNT(*) AS n FROM ${t(table)}`);
		return Number(n);
	}

	// ---------------------------------------------------------------- paths

	const typeColumnSql = () =>
		`${ctx.escape.columnName('type')} VARCHAR(32) NOT NULL DEFAULT 'human' ` +
		`CONSTRAINT "CHK_${ctx.tablePrefix}user_type" CHECK (${ctx.escape.columnName('type')} IN ('human', 'service'))`;

	async function pathC(steps: Step[]) {
		await timed(
			'add type column to user',
			async () => await q(`ALTER TABLE ${t('user')} ADD COLUMN ${typeColumnSql()}`),
			steps,
		);
	}

	/** The columns `actor` keeps under paths A and B. */
	const actorColumns = ['id', 'type', 'roleSlug', 'disabled', 'createdAt', 'updatedAt'];

	/** `user.id` is `uuid` on PostgreSQL and `varchar` on SQLite. A foreign key needs the same type. */
	const idType = () => (ctx.isPostgres ? 'uuid' : 'varchar');

	async function pathB(steps: Step[]) {
		const user = t('user');
		const actor = t('actor');
		const humanCols = HUMAN_COLUMNS.map((c) => ctx.escape.columnName(c));

		if (ctx.isSqlite) {
			await q('PRAGMA foreign_keys=OFF');
			await q('PRAGMA legacy_alter_table=OFF');
			await ctx.queryRunner.startTransaction();
		}

		await timed(
			'rename user to actor',
			async () => await q(`ALTER TABLE ${user} RENAME TO ${actor}`),
			steps,
		);
		await timed(
			'add type column to actor',
			async () => await q(`ALTER TABLE ${actor} ADD COLUMN ${typeColumnSql()}`),
			steps,
		);
		await timed(
			'create new user table',
			async () =>
				await q(
					`CREATE TABLE ${user} (
						"id" ${idType()} PRIMARY KEY NOT NULL,
						"email" varchar(255), "firstName" varchar(32), "lastName" varchar(32),
						"password" varchar, "personalizationAnswers" text, "settings" text,
						"mfaEnabled" boolean NOT NULL DEFAULT FALSE, "mfaSecret" text, "mfaRecoveryCodes" text,
						"lastActiveAt" date,
						CONSTRAINT "UQ_${ctx.tablePrefix}user_email_v2" UNIQUE ("email"),
						CONSTRAINT "FK_${ctx.tablePrefix}user_actor" FOREIGN KEY ("id") REFERENCES ${actor} ("id") ON DELETE CASCADE
					)`,
				),
			steps,
		);
		await timed(
			'copy human columns into user',
			async () =>
				await q(
					`INSERT INTO ${user} ("id", ${humanCols.join(', ')}) SELECT "id", ${humanCols.join(', ')} FROM ${actor}`,
				),
			steps,
		);
		await timed(
			'drop human columns from actor',
			async () => {
				if (ctx.isPostgres) {
					await q(`ALTER TABLE ${actor} ${humanCols.map((c) => `DROP COLUMN ${c}`).join(', ')}`);
					return;
				}
				// SQLite cannot drop a UNIQUE column, so recreate the table with the kept columns.
				const kept = actorColumns.map((c) => ctx.escape.columnName(c)).join(', ');
				const tmp = `"${ctx.tablePrefix}actor_new"`;
				await q(
					`CREATE TABLE ${tmp} (
						"id" ${idType()} PRIMARY KEY NOT NULL,
						${typeColumnSql()},
						"roleSlug" varchar(128) NOT NULL DEFAULT 'global:member' REFERENCES ${t('role')} ("slug"),
						"disabled" boolean NOT NULL DEFAULT FALSE,
						"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
						"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
					)`,
				);
				await q(`INSERT INTO ${tmp} (${kept}) SELECT ${kept} FROM ${actor}`);
				await q(`DROP TABLE ${actor}`);
				await q(`ALTER TABLE ${tmp} RENAME TO ${actor}`);
			},
			steps,
		);

		if (ctx.isSqlite) {
			await ctx.queryRunner.commitTransaction();
			await q('PRAGMA foreign_keys=ON');
		}
	}

	async function pathA(steps: Step[]) {
		const user = t('user');
		const actor = t('actor');
		const userTableName = `${ctx.tablePrefix}user`;
		const actorTableName = `${ctx.tablePrefix}actor`;

		if (ctx.isSqlite) {
			await q('PRAGMA foreign_keys=OFF');
			await q('PRAGMA legacy_alter_table=OFF');
			await ctx.queryRunner.startTransaction();
		}

		await timed(
			'create actor',
			async () =>
				await q(
					`CREATE TABLE ${actor} (
						"id" ${idType()} PRIMARY KEY NOT NULL,
						${typeColumnSql()},
						"roleSlug" varchar(128) NOT NULL DEFAULT 'global:member' REFERENCES ${t('role')} ("slug"),
						"disabled" boolean NOT NULL DEFAULT FALSE,
						"createdAt" ${ctx.isPostgres ? 'timestamptz(3) NOT NULL DEFAULT now()' : "datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))"},
						"updatedAt" ${ctx.isPostgres ? 'timestamptz(3) NOT NULL DEFAULT now()' : "datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))"}
					)`,
				),
			steps,
		);
		await timed(
			'backfill actor from user',
			async () =>
				await q(
					`INSERT INTO ${actor} ("id", "type", "roleSlug", "disabled", "createdAt", "updatedAt")
					 SELECT "id", 'human', "roleSlug", "disabled", "createdAt", "updatedAt" FROM ${user}`,
				),
			steps,
		);

		const fkName = `FK_${ctx.tablePrefix}user_actor`;
		await timed(
			'add FK user.id -> actor.id',
			async () => {
				if (ctx.isPostgres) {
					await q(
						`ALTER TABLE ${user} ADD CONSTRAINT "${fkName}" FOREIGN KEY ("id") REFERENCES ${actor} ("id") ON DELETE CASCADE NOT VALID`,
					);
					await q(`ALTER TABLE ${user} VALIDATE CONSTRAINT "${fkName}"`);
					return;
				}
				await recreateSqliteTable(userTableName, (sql) =>
					sql.replace(
						/\)\s*$/,
						`, CONSTRAINT "${fkName}" FOREIGN KEY ("id") REFERENCES "${actorTableName}" ("id") ON DELETE CASCADE)`,
					),
				);
			},
			steps,
		);

		if (ctx.isPostgres) {
			const fks = await q<Array<{ conname: string; tbl: string; def: string }>>(
				`SELECT conname, conrelid::regclass::text AS tbl, pg_get_constraintdef(oid) AS def
				 FROM pg_constraint WHERE contype = 'f' AND confrelid = '${pgQualified('user')}'::regclass
				 ORDER BY tbl, conname`,
			);
			for (const fk of fks) {
				const def = fk.def.replace(/REFERENCES\s+[^(]+\(/, `REFERENCES ${actor}(`);
				await timed(
					`move FK ${fk.tbl}.${fk.conname}`,
					async () => {
						await q(`ALTER TABLE ${fk.tbl} DROP CONSTRAINT "${fk.conname}"`);
						await q(`ALTER TABLE ${fk.tbl} ADD CONSTRAINT "${fk.conname}" ${def} NOT VALID`);
						await q(`ALTER TABLE ${fk.tbl} VALIDATE CONSTRAINT "${fk.conname}"`);
					},
					steps,
				);
			}
		} else {
			const tables = (await tablesReferencing('user')).filter((name) => name !== userTableName);
			for (const name of tables) {
				await timed(
					`recreate ${name}`,
					async () =>
						await recreateSqliteTable(name, (sql) =>
							sql.replace(
								new RegExp(`REFERENCES "${userTableName}"`, 'g'),
								`REFERENCES "${actorTableName}"`,
							),
						),
					steps,
				);
			}
		}

		if (ctx.isSqlite) {
			await ctx.queryRunner.commitTransaction();
			await q('PRAGMA foreign_keys=ON');
		}
	}

	/**
	 * Recreates a SQLite table from its own CREATE statement, rewritten by
	 * `rewrite`, and copies all rows. This is what the TypeORM DSL does for any
	 * constraint change on SQLite.
	 */
	async function recreateSqliteTable(name: string, rewrite: (sql: string) => string) {
		const [{ sql }] = await q<Array<{ sql: string }>>(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name },
		);
		const indexes = await q<Array<{ sql: string }>>(
			"SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = :name AND sql IS NOT NULL",
			{ name },
		);
		const tmp = `tmp_${name}`;
		const createTmp = rewrite(sql).replace(
			new RegExp(`^CREATE TABLE\\s+"?${name}"?`),
			`CREATE TABLE "${tmp}"`,
		);
		await q(createTmp);
		await q(`INSERT INTO "${tmp}" SELECT * FROM "${name}"`);
		await q(`DROP TABLE "${name}"`);
		await q(`ALTER TABLE "${tmp}" RENAME TO "${name}"`);
		for (const { sql: indexSql } of indexes) await q(indexSql);
	}

	// --------------------------------------------------------------- verify

	async function verify(path: string, counts: Counts) {
		const target = path === 'C' ? 'user' : 'actor';
		const fksToTarget = await countForeignKeysTo(target);
		const fksToUser = path === 'C' ? fksToTarget : await countForeignKeysTo('user');
		console.log(`    FKs -> ${target}: ${fksToTarget}, FKs -> user: ${fksToUser}`);
		expect(fksToTarget).toBeGreaterThanOrEqual(43);
		if (path !== 'C') expect(fksToUser).toBe(0);

		if (ctx.isSqlite) {
			const violations = await q<unknown[]>('PRAGMA foreign_key_check');
			expect(violations).toHaveLength(0);
		}

		for (const table of VERIFIED_TABLES) {
			expect(await count(table)).toBe(counts[table]);
		}
		if (path !== 'C') {
			expect(await count('actor')).toBe(await count('user'));
		}
	}

	// ----------------------------------------------------------------- run

	const runners: Record<string, (steps: Step[]) => Promise<void>> = {
		A: pathA,
		B: pathB,
		C: pathC,
	};

	for (const path of PATHS) {
		it(`path ${path} with ${USERS} users`, async () => {
			await resetSchema();
			console.log(`\n  [${dbType}] path ${path}, ${USERS} users`);

			const fillStart = performance.now();
			const counts = await fill();
			const fillMs = Math.round(performance.now() - fillStart);
			console.log(
				`    fill: ${fillMs} ms, ${Object.values(counts).reduce((a, b) => a + b, 0)} rows`,
			);

			// Earlier migrations seed rows too, so compare against the real counts after the fill.
			const snapshot: Counts = {};
			for (const table of VERIFIED_TABLES) snapshot[table] = await count(table);

			const steps: Step[] = [];
			try {
				await runners[path](steps);
				await verify(path, snapshot);
			} finally {
				// Give the connection back even on failure: the pool may hold one connection.
				if (ctx.queryRunner.isTransactionActive) await ctx.queryRunner.rollbackTransaction();
				await ctx.queryRunner.release();
			}

			const totalMs = steps.reduce((sum, s) => sum + s.ms, 0);
			console.log(`    total: ${totalMs} ms`);
			results.push({ db: dbType, users: USERS, fillMs, counts, path, steps, totalMs });
		});
	}

	function report() {
		if (results.length === 0) return;
		const lines = [
			'',
			`## Actor migration bench: ${results[0].db}, ${USERS} users`,
			'',
			'| Path | Steps | Total ms | Slowest step | ms |',
			'|---|---|---|---|---|',
		];
		for (const r of results) {
			const slowest = [...r.steps].sort((a, b) => b.ms - a.ms)[0];
			lines.push(
				`| ${r.path} | ${r.steps.length} | ${r.totalMs} | ${slowest.step} | ${slowest.ms} |`,
			);
		}
		lines.push('', 'Rows:', '');
		for (const [table, n] of Object.entries(results[0].counts)) lines.push(`- ${table}: ${n}`);
		console.log(lines.join('\n'));
		if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2));
	}
});
