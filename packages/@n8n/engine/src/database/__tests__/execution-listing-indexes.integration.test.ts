import type { DataSource, QueryRunner, Repository } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ExecutionListQuery } from '../../execution/execution-view-store';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../entities/workflow-step-execution.entity';
import { TypeOrmExecutionViewStore } from '../typeorm-execution-view-store';

interface PlanNode {
	'Node Type': string;
	'Index Name'?: string;
	Plans?: PlanNode[];
}

// Many workflows with tens of rows each, as in production. With few workflows
// one of them is a large slice, and the planner walks the global order and
// filters instead. With few rows per workflow a sort is free, and a bitmap
// scan plus sort beats the ordered scan on cost. Neither is the shape under
// test.
const WORKFLOWS = Array.from({ length: 100 }, (_, i) => `wf-${i}`);
const ROWS = 5000;

describe('execution listing indexes (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let session: QueryRunner;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
		await seed(dataSource);

		// `SET` is per connection, so EXPLAIN runs on one pinned session. A few
		// hundred rows fit in a handful of pages, and there the planner reads the
		// whole table rather than walk an index. Disabling that choice shows
		// which index the query can use, which is what the test asserts.
		session = dataSource.createQueryRunner();
		await session.connect();
		await session.query('SET enable_seqscan = off');
	}, 120_000);

	afterAll(async () => {
		if (session) await session.release();
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	it('pages one workflow from the composite index without a sort', async () => {
		const plan = await explainList({
			workflowIds: ['wf-42'],
			before: { createdAt: new Date().toISOString(), id: '00000000-0000-0000-0000-000000000000' },
			limit: 20,
		});

		expect(indexNames(plan)).toEqual(['idx_workflow_execution_workflow_id_created_at_id']);
		expect(nodeTypes(plan)).not.toContain('Sort');
	});

	it('pages every workflow from the created_at index without a sort', async () => {
		const plan = await explainList({
			workflowIds: 'all',
			before: { createdAt: new Date().toISOString(), id: '00000000-0000-0000-0000-000000000000' },
			limit: 20,
		});

		expect(indexNames(plan)).toEqual(['idx_workflow_execution_created_at_id']);
		expect(nodeTypes(plan)).not.toContain('Sort');
	});

	/** Runs the store's own list query through EXPLAIN instead of fetching rows. */
	async function explainList(query: ExecutionListQuery): Promise<PlanNode> {
		const repo = dataSource.getRepository(WorkflowExecution);
		let captured: [string, unknown[]] | undefined;
		const capturing: Repository<WorkflowExecution> = Object.create(repo);
		capturing.createQueryBuilder = (alias?: string) => {
			const qb = repo.createQueryBuilder(alias);
			qb.getRawMany = async () => {
				captured = qb.getQueryAndParameters();
				return [];
			};
			return qb;
		};
		const store = new TypeOrmExecutionViewStore(
			capturing,
			dataSource.getRepository(WorkflowStepExecution),
		);
		await store.listExecutionViews(query);
		if (!captured) throw new Error('The list query was not captured');

		const [sql, parameters] = captured;
		const [row]: Array<{ 'QUERY PLAN': Array<{ Plan: PlanNode }> }> = await session.query(
			`EXPLAIN (FORMAT JSON) ${sql}`,
			parameters,
		);
		return row['QUERY PLAN'][0].Plan;
	}
});

async function seed(dataSource: DataSource): Promise<void> {
	await dataSource.query(
		`INSERT INTO workflow_execution
			(id, workflow_id, status, mode, graph, workflow, caller_context, response_expectation, created_at, updated_at)
		 SELECT gen_random_uuid(), ($1::text[])[(n % $2) + 1], 'completed', 'production', '{}', '{}',
			'{"hostMode":"trigger"}', '{"kind":"none"}',
			now() - (n || ' seconds')::interval, now()
		 FROM generate_series(1, $3) AS n`,
		[WORKFLOWS, WORKFLOWS.length, ROWS],
	);
	await dataSource.query('ANALYZE workflow_execution');
}

function walk(node: PlanNode): PlanNode[] {
	return [node, ...(node.Plans ?? []).flatMap(walk)];
}

function nodeTypes(plan: PlanNode): string[] {
	return walk(plan).map((node) => node['Node Type']);
}

function indexNames(plan: PlanNode): string[] {
	return walk(plan).flatMap((node) => (node['Index Name'] ? [node['Index Name']] : []));
}
