import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import {
	CredentialsEntity,
	GLOBAL_MEMBER_ROLE,
	Project,
	ProjectRelation,
	SharedCredentials,
	User as UserEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';

import { CredentialsService } from '@/credentials/credentials.service';

import { encryptCredentialData } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import { initCredentialsTypes } from '../shared/utils';

/**
 * Query-level profile of `CredentialsService.getManyAndCount`, the backend of
 * `GET /rest/credentials`.
 *
 * The list query joins `credentials -> shared_credentials -> project -> project_relation`,
 * so the rows the database materializes grow with (sharings per credential) x (members per
 * shared project), not with the page size. This suite seeds several "tiers" of team projects
 * that differ only in member count, then reports for each service call:
 *   - STATEMENTS: how many SQL statements ran, and for each the rows it materialized before
 *     TypeORM de-duplicated them into entities.
 *   - LATENCY: p50/p95/p99 wall time of the service call (report-only; CI boxes are noisy).
 *   - RESULT: returned length vs reported `count`, to surface pagination drift.
 *
 * Only the statement count is asserted, and only loosely, so the suite trips on a
 * regression to per-row queries but not on timing.
 *
 *   N8N_CREDENTIALS_BENCHMARK=1 pnpm --filter n8n test:sqlite credentials-list.benchmark
 *   N8N_CREDENTIALS_BENCHMARK=1 pnpm --filter n8n test:postgres:integration:tc credentials-list.benchmark
 *
 * Knobs (all optional):
 *   N8N_CREDENTIALS_BENCH_TIERS         members per project for each tier, e.g. "50,200,800"
 *   N8N_CREDENTIALS_BENCH_SCALE         multiplier applied to every tier
 *   N8N_CREDENTIALS_BENCH_PROJECTS      team projects per tier
 *   N8N_CREDENTIALS_BENCH_CREDS         owned credentials per project
 *   N8N_CREDENTIALS_BENCH_SHARES        extra `credential:user` shares per credential (same tier)
 *   N8N_CREDENTIALS_BENCH_GLOBALS       global credentials
 *   N8N_CREDENTIALS_BENCH_SHARED_WITH_ME credentials per tier shared to the member's personal project
 *   N8N_CREDENTIALS_BENCH_ITERS         timed iterations per scenario
 *   N8N_CREDENTIALS_BENCH_TAKE          page size for paginated scenarios
 *   N8N_CREDENTIALS_BENCH_OUT           append one JSON line per scenario to this file
 */

const runBenchmarks = process.env.N8N_CREDENTIALS_BENCHMARK === '1';

const dialect = process.env.DB_TYPE === 'postgresdb' ? 'postgres' : 'sqlite';

const envInt = (name: string, fallback: number): number => {
	const raw = process.env[name];
	const parsed = raw !== undefined ? Number(raw) : NaN;
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const envIntList = (name: string, fallback: number[]): number[] => {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = raw
		.split(',')
		.map((v) => Number(v.trim()))
		.filter((v) => Number.isFinite(v) && v > 0);
	return parsed.length > 0 ? parsed.map(Math.floor) : fallback;
};

const SCALE = envInt('N8N_CREDENTIALS_BENCH_SCALE', 1);
const TIERS = envIntList('N8N_CREDENTIALS_BENCH_TIERS', [50, 200, 800]).map((n) => n * SCALE);
const PROJECTS_PER_TIER = envInt('N8N_CREDENTIALS_BENCH_PROJECTS', 5);
const CREDS_PER_PROJECT = envInt('N8N_CREDENTIALS_BENCH_CREDS', 25);
const EXTRA_SHARES = Math.min(
	envInt('N8N_CREDENTIALS_BENCH_SHARES', 3),
	Math.max(PROJECTS_PER_TIER - 1, 0),
);
const GLOBAL_CREDS = envInt('N8N_CREDENTIALS_BENCH_GLOBALS', 20);
const SHARED_WITH_ME = envInt('N8N_CREDENTIALS_BENCH_SHARED_WITH_ME', 10);
const ITERS = envInt('N8N_CREDENTIALS_BENCH_ITERS', 30);
const TAKE = envInt('N8N_CREDENTIALS_BENCH_TAKE', 50);
const OUT_FILE = process.env.N8N_CREDENTIALS_BENCH_OUT;

// The tier the single-scenario suite runs against; the scale suite runs every tier.
const REFERENCE_TIER_INDEX = Math.min(1, TIERS.length - 1);

const INSERT_CHUNK = 500;
const TEST_TIMEOUT_MS = 600_000;
const CREDENTIAL_TYPE = 'githubApi';

const commas = (n: number) => Math.round(n).toLocaleString('en-US');
const ms = (n: number) => `${n.toFixed(1)}ms`;

const percentiles = (samples: number[]) => {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (p: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
	return { p50: at(50), p95: at(95), p99: at(99) };
};

const report = (title: string, lines: string[]) => {
	console.log(
		`\n  [credentials-list · ${dialect}] ${title}\n${lines.map((l) => `    ${l}`).join('\n')}\n`,
	);
};

type Statement = { sql: string; parameters: unknown[] };

type Tier = {
	membersPerProject: number;
	projectIds: string[];
	/** A member of every project in the tier, with `project:editor`. */
	member: User;
	credentialIds: string[];
};

describe.runIf(runBenchmarks)('credentials list benchmarks', () => {
	let dataSource: DataSource;
	let service: CredentialsService;
	let owner: User;
	const tiers: Tier[] = [];
	let encryptedData: string;

	async function bulkInsert<T>(
		entity: new () => T,
		rows: Array<QueryDeepPartialEntity<T>>,
	): Promise<void> {
		for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
			await dataSource
				.createQueryBuilder()
				.insert()
				.into(entity)
				.values(rows.slice(i, i + INSERT_CHUNK))
				.orIgnore()
				.execute();
		}
	}

	/**
	 * Both drivers call `logger.logQuery` for every statement regardless of the `logging`
	 * option, so swapping the logger captures statements without reconfiguring the connection.
	 */
	async function captureStatements<T>(
		run: () => Promise<T>,
	): Promise<{ result: T; statements: Statement[] }> {
		const original = dataSource.logger;
		const statements: Statement[] = [];

		const capturing = Object.create(original) as DataSource['logger'];
		capturing.logQuery = (sql: string, parameters?: unknown[]) => {
			statements.push({ sql, parameters: parameters ?? [] });
		};
		dataSource.logger = capturing;

		try {
			const result = await run();
			return { result, statements };
		} finally {
			dataSource.logger = original;
		}
	}

	/**
	 * Rows the database hands back for a statement, before TypeORM collapses the joined
	 * rows into entities. This is the cost the joins add, and what `getMany` has to hydrate.
	 */
	async function rowsMaterialized({ sql, parameters }: Statement): Promise<number> {
		// A count statement collapses to one row; measure the joined rows it aggregates instead.
		const inner = sql.replace(/^\s*SELECT COUNT\(.*?\) AS "cnt"/i, 'SELECT 1');
		const rows = await dataSource.query<Array<{ n: number | string }>>(
			`SELECT COUNT(*) AS n FROM (${inner}) AS bench_rows`,
			parameters,
		);
		return Number(rows[0].n);
	}

	const describeStatement = (sql: string): string => {
		const normalized = sql.replace(/\s+/g, ' ');
		if (/^SELECT COUNT\(/i.test(normalized)) return 'count';
		if (/^SELECT DISTINCT/i.test(normalized)) return 'page ids';
		// `FROM "schema"."prefix_table"` on Postgres, `FROM "table"` on SQLite
		const from = /FROM (?:"?\w+"?\.)?"?(\w+)"?/i.exec(normalized)?.[1] ?? '?';
		const joins = (normalized.match(/ JOIN /gi) ?? []).length;
		return joins > 0 ? `${from} +${joins} joins` : from;
	};

	type ScenarioResult = {
		statements: Statement[];
		rows: number[];
		durations: number[];
		returned: number;
		count: number;
	};

	async function runScenario(
		call: () => Promise<{ credentials: unknown[]; count: number }>,
	): Promise<ScenarioResult> {
		// warm-up: role cache, key cache, driver plan cache
		await call();

		const { result, statements } = await captureStatements(call);
		const rows: number[] = [];
		for (const statement of statements) {
			rows.push(await rowsMaterialized(statement));
		}

		const durations: number[] = [];
		for (let i = 0; i < ITERS; i++) {
			const start = performance.now();
			await call();
			durations.push(performance.now() - start);
		}

		return {
			statements,
			rows,
			durations,
			returned: result.credentials.length,
			count: result.count,
		};
	}

	function reportScenario(title: string, tier: Tier, result: ScenarioResult) {
		const { p50, p95, p99 } = percentiles(result.durations);
		const lines = [
			`tier: ${commas(tier.membersPerProject)} members/project, ${commas(tier.credentialIds.length)} credentials visible`,
			`statements: ${result.statements.length}`,
			...result.statements.map(
				(s, i) =>
					`  #${i + 1} ${describeStatement(s.sql).padEnd(28)} rows materialized: ${commas(result.rows[i])}`,
			),
			`rows materialized total: ${commas(result.rows.reduce((a, b) => a + b, 0))}`,
			`returned: ${result.returned}  count: ${result.count}`,
			`latency (n=${ITERS}): p50 ${ms(p50)}  p95 ${ms(p95)}  p99 ${ms(p99)}`,
		];
		report(title, lines);

		if (OUT_FILE) {
			mkdirSync(dirname(OUT_FILE), { recursive: true });
			appendFileSync(
				OUT_FILE,
				JSON.stringify({
					recordedAt: new Date().toISOString(),
					dialect,
					scenario: title,
					membersPerProject: tier.membersPerProject,
					iterations: ITERS,
					statements: result.statements.map((s, i) => ({
						kind: describeStatement(s.sql),
						rows: result.rows[i],
					})),
					rowsTotal: result.rows.reduce((a, b) => a + b, 0),
					returned: result.returned,
					count: result.count,
					p50: Math.round(p50 * 10) / 10,
					p95: Math.round(p95 * 10) / 10,
					p99: Math.round(p99 * 10) / 10,
				}) + '\n',
			);
		}
	}

	async function seedTier(membersPerProject: number): Promise<Tier> {
		const member = await createMember();

		const projectIds = Array.from({ length: PROJECTS_PER_TIER }, () => generateNanoId());
		await bulkInsert(
			Project,
			projectIds.map((id, i) => ({
				id,
				name: `bench-${membersPerProject}-${i}`,
				type: 'team' as const,
			})),
		);

		// Filler members: one user row per membership keeps the seed simple; the join
		// cost only depends on `project_relation` rows per project.
		const users: Array<QueryDeepPartialEntity<UserEntity>> = [];
		const relations: Array<QueryDeepPartialEntity<ProjectRelation>> = [];
		for (const projectId of projectIds) {
			relations.push({ projectId, userId: member.id, role: { slug: 'project:editor' } });
			for (let i = 0; i < membersPerProject - 1; i++) {
				const userId = randomUUID();
				users.push({
					id: userId,
					email: `${userId}@bench.local`,
					firstName: 'Bench',
					lastName: 'User',
					role: { slug: GLOBAL_MEMBER_ROLE.slug },
				});
				relations.push({ projectId, userId, role: { slug: 'project:editor' } });
			}
		}
		await bulkInsert(UserEntity, users);
		await bulkInsert(ProjectRelation, relations);

		const credentials: Array<QueryDeepPartialEntity<CredentialsEntity>> = [];
		const sharings: Array<QueryDeepPartialEntity<SharedCredentials>> = [];
		const credentialIds: string[] = [];
		projectIds.forEach((projectId, projectIndex) => {
			for (let i = 0; i < CREDS_PER_PROJECT; i++) {
				const id = generateNanoId();
				credentialIds.push(id);
				credentials.push({
					id,
					name: `bench ${membersPerProject} ${projectIndex} ${i}`,
					type: CREDENTIAL_TYPE,
					data: encryptedData,
				});
				sharings.push({ credentialsId: id, projectId, role: 'credential:owner' });
				for (let s = 1; s <= EXTRA_SHARES; s++) {
					sharings.push({
						credentialsId: id,
						projectId: projectIds[(projectIndex + s) % projectIds.length],
						role: 'credential:user',
					});
				}
			}
		});
		// A slice of the tier is also shared directly to the member, so `onlySharedWithMe` has data.
		const personalProject = await dataSource
			.getRepository(Project)
			.findOneByOrFail({ type: 'personal', creatorId: member.id });
		for (const credentialsId of credentialIds.slice(0, SHARED_WITH_ME)) {
			sharings.push({ credentialsId, projectId: personalProject.id, role: 'credential:user' });
		}

		await bulkInsert(CredentialsEntity, credentials);
		await bulkInsert(SharedCredentials, sharings);

		return { membersPerProject, projectIds, member, credentialIds };
	}

	async function seedGlobals(): Promise<void> {
		const ownerProject = await dataSource
			.getRepository(Project)
			.findOneByOrFail({ type: 'personal', creatorId: owner.id });
		const credentials: Array<QueryDeepPartialEntity<CredentialsEntity>> = [];
		const sharings: Array<QueryDeepPartialEntity<SharedCredentials>> = [];
		for (let i = 0; i < GLOBAL_CREDS; i++) {
			const id = generateNanoId();
			credentials.push({
				id,
				name: `bench global ${i}`,
				type: CREDENTIAL_TYPE,
				data: encryptedData,
				isGlobal: true,
			});
			sharings.push({ credentialsId: id, projectId: ownerProject.id, role: 'credential:owner' });
		}
		await bulkInsert(CredentialsEntity, credentials);
		await bulkInsert(SharedCredentials, sharings);
	}

	beforeAll(async () => {
		await testDb.init();
		await initCredentialsTypes();
		dataSource = Container.get(DataSource);
		service = Container.get(CredentialsService);

		await testDb.truncate([
			'SharedCredentials',
			'CredentialsEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);

		owner = await createOwner();
		const template = new CredentialsEntity();
		Object.assign(template, {
			name: 'template',
			type: CREDENTIAL_TYPE,
			data: { accessToken: 'bench-token', server: 'https://api.github.com' },
		});
		await encryptCredentialData(template);
		encryptedData = template.data;

		const seedStart = performance.now();
		for (const membersPerProject of TIERS) {
			tiers.push(await seedTier(membersPerProject));
		}
		await seedGlobals();

		const counts = await Promise.all(
			[UserEntity, Project, ProjectRelation, CredentialsEntity, SharedCredentials].map(
				async (entity) => await dataSource.getRepository(entity).count(),
			),
		);
		report('corpus seeded', [
			`tiers (members/project): ${TIERS.join(', ')}  projects/tier: ${PROJECTS_PER_TIER}`,
			`credentials/project: ${CREDS_PER_PROJECT}  extra shares/credential: ${EXTRA_SHARES}  globals: ${GLOBAL_CREDS}`,
			`user rows: ${commas(counts[0])}  project rows: ${commas(counts[1])}  project_relation rows: ${commas(counts[2])}`,
			`credentials rows: ${commas(counts[3])}  shared_credentials rows: ${commas(counts[4])}`,
			`seed time: ${ms(performance.now() - seedStart)}`,
		]);
	}, TEST_TIMEOUT_MS);

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('reference tier', () => {
		let tier: Tier;
		beforeAll(() => {
			tier = tiers[REFERENCE_TIER_INDEX];
		});

		test(
			'member, paginated, default select',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(tier.member, {
							listQueryOptions: { take: TAKE, skip: 0 },
						}),
				);
				reportScenario('member · take=' + TAKE, tier, result);
				expect(result.returned).toBe(TAKE);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, unpaginated (controller default)',
			async () => {
				const result = await runScenario(
					async () => await service.getManyAndCount(tier.member, { listQueryOptions: {} }),
				);
				reportScenario('member · unpaginated', tier, result);
				expect(result.returned).toBe(tier.credentialIds.length);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, paginated, includeData',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(tier.member, {
							listQueryOptions: { take: TAKE, skip: 0 },
							includeData: true,
						}),
				);
				reportScenario('member · take=' + TAKE + ' · includeData', tier, result);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, paginated, includeGlobal',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(tier.member, {
							listQueryOptions: { take: TAKE, skip: 0 },
							includeGlobal: true,
						}),
				);
				reportScenario('member · take=' + TAKE + ' · includeGlobal', tier, result);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, onlySharedWithMe',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(tier.member, {
							listQueryOptions: { take: TAKE, skip: 0 },
							onlySharedWithMe: true,
						}),
				);
				reportScenario('member · onlySharedWithMe', tier, result);
				expect(result.returned).toBe(SHARED_WITH_ME);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, filter by team project',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(tier.member, {
							listQueryOptions: { take: TAKE, skip: 0, filter: { projectId: tier.projectIds[0] } },
						}),
				);
				reportScenario('member · filter.projectId', tier, result);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'owner, paginated, default select',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(owner, {
							listQueryOptions: { take: TAKE, skip: 0 },
						}),
				);
				reportScenario('owner · take=' + TAKE, tier, result);
				expect(result.returned).toBe(TAKE);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'owner, filter by team project',
			async () => {
				const result = await runScenario(
					async () =>
						await service.getManyAndCount(owner, {
							listQueryOptions: { take: TAKE, skip: 0, filter: { projectId: tier.projectIds[0] } },
						}),
				);
				reportScenario('owner · filter.projectId', tier, result);
				expect(result.statements.length).toBeLessThanOrEqual(8);
			},
			TEST_TIMEOUT_MS,
		);
	});

	describe('scale across tiers', () => {
		test(
			'member, paginated, default select, per tier',
			async () => {
				const summary: string[] = [];
				for (const tier of tiers) {
					const result = await runScenario(
						async () =>
							await service.getManyAndCount(tier.member, {
								listQueryOptions: { take: TAKE, skip: 0 },
							}),
					);
					reportScenario(`scale · member · take=${TAKE}`, tier, result);
					const { p50, p95 } = percentiles(result.durations);
					summary.push(
						`${commas(tier.membersPerProject).padStart(7)} members/project | statements ${result.statements.length} | rows ${commas(result.rows.reduce((a, b) => a + b, 0)).padStart(10)} | p50 ${ms(p50).padStart(9)} | p95 ${ms(p95).padStart(9)}`,
					);
				}
				report('scale summary · member · take=' + TAKE, summary);
			},
			TEST_TIMEOUT_MS,
		);

		test(
			'member, unpaginated, per tier',
			async () => {
				const summary: string[] = [];
				for (const tier of tiers) {
					const result = await runScenario(
						async () => await service.getManyAndCount(tier.member, { listQueryOptions: {} }),
					);
					reportScenario('scale · member · unpaginated', tier, result);
					const { p50, p95 } = percentiles(result.durations);
					summary.push(
						`${commas(tier.membersPerProject).padStart(7)} members/project | statements ${result.statements.length} | rows ${commas(result.rows.reduce((a, b) => a + b, 0)).padStart(10)} | p50 ${ms(p50).padStart(9)} | p95 ${ms(p95).padStart(9)}`,
					);
				}
				report('scale summary · member · unpaginated', summary);
			},
			TEST_TIMEOUT_MS,
		);
	});
});
