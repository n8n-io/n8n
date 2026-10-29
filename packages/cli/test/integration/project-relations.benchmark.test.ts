import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Project, ProjectRelation } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';
import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';

import { createAdmin, createMember } from './shared/db/users';

/**
 * Query-level profile of `ProjectService.getProjectRelationsForUser` and the editor
 * endpoints that call it on every page load:
 *
 *   GET /rest/projects/my-projects      -> ProjectService.getMyProjects
 *   GET /rest/workflows/:id             -> WorkflowService.getWorkflowScopes
 *                                          + CredentialsService.getCredentialsAUserCanUseInAWorkflow
 *   GET /rest/credentials/for-workflow  -> CredentialsService.getCredentialsAUserCanUseInAWorkflow
 *   GET /rest/workflows (includeScopes) -> RoleService.addScopes per row
 *
 * `Role.scopes` is eager, so a relation query that joins `role` also joins
 * `role_scope -> scope`: the rows the database materializes and TypeORM hydrates grow with
 * (projects the user is a member of) x (scopes of their project role), not with the size
 * of the response. `ProjectRelationRepository.findAllByUser` now loads the relations
 * without that join and attaches the scopes from one query over the distinct roles.
 *
 * This suite seeds tiers that differ only in how many team projects one instance admin
 * created (and so is `project:admin` in), plus a member with `project:editor` in the same
 * projects, and reports for each call:
 *   - STATEMENTS: SQL statements and the rows each one materializes before hydration.
 *   - LATENCY: p50/p95 wall time and the longest event-loop stall during the timed runs.
 *
 * Only one thing is asserted: the relation statement materializes at most one row per
 * relation, so a return of the scope join fails the suite. Timing is report-only. Opt in with:
 *
 *   N8N_PROJECT_RELATIONS_BENCHMARK=1 pnpm --filter n8n test:sqlite project-relations.benchmark --silent=false
 *   N8N_PROJECT_RELATIONS_BENCHMARK=1 pnpm --filter n8n test:postgres:integration:tc project-relations.benchmark --silent=false
 *
 * Knobs: N8N_PR_BENCH_TIERS ("100,500,1000"), N8N_PR_BENCH_ITERS, N8N_PR_BENCH_OUT (JSONL file).
 */

const runBenchmarks = process.env.N8N_PROJECT_RELATIONS_BENCHMARK === '1';

// Constructed by `WorkflowService`'s dependency graph, never called by the profiled paths.
mockInstance(ActiveWorkflowManager);
mockInstance(NodeTypes);
const dialect = process.env.DB_TYPE === 'postgresdb' ? 'postgres' : 'sqlite';

const envInt = (name: string, fallback: number): number => {
	const parsed = Number(process.env[name]);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
const envIntList = (name: string, fallback: number[]): number[] => {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = raw
		.split(',')
		.map((v) => Number(v.trim()))
		.filter((v) => Number.isFinite(v) && v > 0)
		.map(Math.floor);
	return parsed.length > 0 ? parsed : fallback;
};

const TIERS = envIntList('N8N_PR_BENCH_TIERS', [100, 500, 1000]);
const ITERS = envInt('N8N_PR_BENCH_ITERS', 10);
const OUT_FILE = process.env.N8N_PR_BENCH_OUT;
const INSERT_CHUNK = 500;
const TEST_TIMEOUT_MS = 900_000;

const commas = (n: number) => Math.round(n).toLocaleString('en-US');
const ms = (n: number) => `${n.toFixed(1)}ms`;
const percentiles = (samples: number[]) => {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (p: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
	return { p50: at(50), p95: at(95) };
};
const report = (title: string, lines: string[]) => {
	console.log(
		`\n  [project-relations · ${dialect}] ${title}\n${lines.map((l) => `    ${l}`).join('\n')}\n`,
	);
};

type Statement = { sql: string; parameters: unknown[] };

type Tier = {
	projects: number;
	projectIds: string[];
	/** Instance admin who created every project of the tier: `project:admin` in each. */
	admin: User;
	/** Global member with `project:editor` in every project of the tier. */
	member: User;
	workflowId: string;
};

type ScenarioResult = {
	statements: Statement[];
	rows: number[];
	durations: number[];
	/** Longest event-loop stall observed while the timed iterations ran. */
	maxEventLoopDelayMs: number;
	returned: number;
	/** Wall time of the captured statements replayed through the driver, without hydration. */
	driverOnlyP50?: number;
};

describe.runIf(runBenchmarks)('project relations benchmarks', () => {
	let dataSource: DataSource;
	let projectService: ProjectService;
	let workflowService: WorkflowService;
	let credentialsService: CredentialsService;
	const tiers: Tier[] = [];

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

	// Both drivers call `logger.logQuery` for every statement regardless of the `logging`
	// option, so swapping the logger captures statements without reconfiguring the connection.
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

	// Rows the database hands back for a statement, before TypeORM collapses the joined
	// rows into entities.
	async function rowsMaterialized({ sql, parameters }: Statement): Promise<number> {
		if (!/^\s*SELECT/i.test(sql)) return 0;
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
		const from = /FROM (?:"?\w+"?\.)?"?(\w+)"?/i.exec(normalized)?.[1] ?? '?';
		const joins = (normalized.match(/ JOIN /gi) ?? []).length;
		return joins > 0 ? `${from} +${joins} joins` : from;
	};

	async function runScenario(
		call: () => Promise<unknown>,
		{ measureDriverOnly = false }: { measureDriverOnly?: boolean } = {},
	): Promise<ScenarioResult> {
		// warm-up: role cache, driver plan cache
		await call();

		const { result, statements } = await captureStatements(call);
		const rows: number[] = [];
		for (const statement of statements) rows.push(await rowsMaterialized(statement));

		const histogram = monitorEventLoopDelay({ resolution: 1 });
		histogram.enable();
		const durations: number[] = [];
		for (let i = 0; i < ITERS; i++) {
			const start = performance.now();
			await call();
			durations.push(performance.now() - start);
		}
		histogram.disable();

		let driverOnlyP50: number | undefined;
		if (measureDriverOnly) {
			const raw: number[] = [];
			for (let i = 0; i < ITERS; i++) {
				const start = performance.now();
				for (const { sql, parameters } of statements) await dataSource.query(sql, parameters);
				raw.push(performance.now() - start);
			}
			driverOnlyP50 = percentiles(raw).p50;
		}

		return {
			statements,
			rows,
			durations,
			maxEventLoopDelayMs: histogram.max / 1e6,
			returned: Array.isArray(result) ? result.length : 1,
			driverOnlyP50,
		};
	}

	function reportScenario(title: string, tier: Tier, who: string, result: ScenarioResult) {
		const { p50, p95 } = percentiles(result.durations);
		const rowsTotal = result.rows.reduce((a, b) => a + b, 0);
		const lines = [
			`tier: ${commas(tier.projects)} team projects, caller: ${who}`,
			`statements: ${result.statements.length}`,
			...result.statements.map(
				(s, i) =>
					`  #${i + 1} ${describeStatement(s.sql).padEnd(32)} rows materialized: ${commas(result.rows[i])}`,
			),
			`rows materialized total: ${commas(rowsTotal)}  returned: ${result.returned}`,
			`latency (n=${ITERS}): p50 ${ms(p50)}  p95 ${ms(p95)}  max event-loop stall ${ms(result.maxEventLoopDelayMs)}`,
			...(result.driverOnlyP50 !== undefined
				? [
						`driver only (same statements, no hydration): p50 ${ms(result.driverOnlyP50)}  => hydration ~${ms(Math.max(0, p50 - result.driverOnlyP50))}`,
					]
				: []),
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
					caller: who,
					projects: tier.projects,
					iterations: ITERS,
					statements: result.statements.map((s, i) => ({
						kind: describeStatement(s.sql),
						rows: result.rows[i],
					})),
					rowsTotal,
					returned: result.returned,
					p50: Math.round(p50 * 10) / 10,
					p95: Math.round(p95 * 10) / 10,
					maxEventLoopDelayMs: Math.round(result.maxEventLoopDelayMs * 10) / 10,
					driverOnlyP50:
						result.driverOnlyP50 !== undefined
							? Math.round(result.driverOnlyP50 * 10) / 10
							: undefined,
				}) + '\n',
			);
		}
	}

	async function seedTier(projects: number): Promise<Tier> {
		const admin = await createAdmin();
		const member = await createMember();

		const projectIds = Array.from({ length: projects }, () => generateNanoId());
		await bulkInsert(
			Project,
			projectIds.map((id, i) => ({
				id,
				name: `bench-${projects}-${i}`,
				type: 'team' as const,
				creatorId: admin.id,
			})),
		);

		// `createTeamProject` links the creating user as `project:admin`; mirror that, and add
		// a plain member so the two callers differ only in global role and project role.
		const relations: Array<QueryDeepPartialEntity<ProjectRelation>> = [];
		for (const projectId of projectIds) {
			relations.push({ projectId, userId: admin.id, role: { slug: 'project:admin' } });
			relations.push({ projectId, userId: member.id, role: { slug: 'project:editor' } });
		}
		await bulkInsert(ProjectRelation, relations);

		const firstProject = await dataSource
			.getRepository(Project)
			.findOneByOrFail({ id: projectIds[0] });
		const workflow = await createWorkflow({ name: `bench-${projects}` }, firstProject);

		return { projects, projectIds, admin, member, workflowId: workflow.id };
	}

	beforeAll(async () => {
		await testDb.init();
		dataSource = Container.get(DataSource);
		projectService = Container.get(ProjectService);
		workflowService = Container.get(WorkflowService);
		credentialsService = Container.get(CredentialsService);

		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'SharedCredentials',
			'CredentialsEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);

		const seedStart = performance.now();
		for (const projects of TIERS) tiers.push(await seedTier(projects));

		const counts = await Promise.all(
			[Project, ProjectRelation].map(
				async (entity) => await dataSource.getRepository(entity).count(),
			),
		);
		report('corpus seeded', [
			`tiers (team projects): ${TIERS.join(', ')}`,
			`project rows: ${commas(counts[0])}  project_relation rows: ${commas(counts[1])}`,
			`seed time: ${ms(performance.now() - seedStart)}`,
		]);
	}, TEST_TIMEOUT_MS);

	afterAll(async () => {
		await testDb.terminate();
	});

	test(
		'ProjectService.getProjectRelationsForUser (shared primitive)',
		async () => {
			for (const tier of tiers) {
				for (const [who, user] of [
					['instance admin, project:admin everywhere', tier.admin],
					['member, project:editor everywhere', tier.member],
				] as const) {
					const result = await runScenario(
						async () => await projectService.getProjectRelationsForUser(user),
						{ measureDriverOnly: true },
					);
					reportScenario('getProjectRelationsForUser', tier, who, result);
					// The relation statement must not fan out over the scopes of each role.
					const relationRows = result.rows.find((_, i) =>
						/project_relation"\s+"ProjectRelation"/.test(result.statements[i].sql),
					);
					expect(relationRows).toBeLessThanOrEqual(result.returned);
				}
			}
		},
		TEST_TIMEOUT_MS,
	);

	test(
		'GET /rest/projects/my-projects -> ProjectService.getMyProjects',
		async () => {
			for (const tier of tiers) {
				for (const [who, user] of [
					['instance admin', tier.admin],
					['member', tier.member],
				] as const) {
					const result = await runScenario(async () => await projectService.getMyProjects(user));
					reportScenario('getMyProjects', tier, who, result);
				}
			}
		},
		TEST_TIMEOUT_MS,
	);

	test(
		'GET /rest/workflows/:id -> WorkflowService.getWorkflowScopes',
		async () => {
			for (const tier of tiers) {
				for (const [who, user] of [
					['instance admin', tier.admin],
					['member', tier.member],
				] as const) {
					const result = await runScenario(
						async () => await workflowService.getWorkflowScopes(user, tier.workflowId),
					);
					reportScenario('getWorkflowScopes', tier, who, result);
				}
			}
		},
		TEST_TIMEOUT_MS,
	);

	test(
		'GET /rest/credentials/for-workflow (also inside GET /rest/workflows/:id) -> getCredentialsAUserCanUseInAWorkflow',
		async () => {
			for (const tier of tiers) {
				for (const [who, user] of [
					['instance admin', tier.admin],
					['member', tier.member],
				] as const) {
					const result = await runScenario(
						async () =>
							await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
								workflowId: tier.workflowId,
							}),
					);
					reportScenario('getCredentialsAUserCanUseInAWorkflow', tier, who, result);
				}
			}
		},
		TEST_TIMEOUT_MS,
	);
});
