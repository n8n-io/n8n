import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, type ExecutionEntity, type User, type WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';

import { createExecution } from '../shared/db/executions';
import { createOwnerWithApiKey } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(CommunityPackagesService);

const databaseConfig = Container.get(GlobalConfig).database;
const isPostgres = databaseConfig.type === 'postgresdb';
const originalPoolSize = databaseConfig.postgresdb.poolSize;
// Keep SET TIME ZONE and application queries on the same connection.
databaseConfig.postgresdb.poolSize = 1;

const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
const timezones = isPostgres
	? ['UTC', 'Europe/Moscow', 'America/New_York', 'Asia/Kathmandu']
	: ['UTC'];
const startedAfter = '2024-01-15T10:00:00.000Z';
const startedBefore = '2024-01-15T11:45:00.000Z';
const startTimes = [
	'2024-01-15T09:59:59.999Z',
	startedAfter,
	'2024-01-15T10:06:03.149Z',
	'2024-01-15T11:37:06.324Z',
	startedBefore,
	'2024-01-15T11:45:00.001Z',
];

let owner: User;
let originalTimezone: string;

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	if (isPostgres) {
		const [row] = await Container.get(DataSource).query<Array<{ timezone: string }>>(
			"SELECT current_setting('TimeZone') AS timezone",
		);
		originalTimezone = row.timezone;
	}
});

afterAll(() => {
	databaseConfig.postgresdb.poolSize = originalPoolSize;
});

describe.each(timezones)('execution date filters with database timezone %s', (timezone) => {
	let workflow: WorkflowEntity;
	let executions: ExecutionEntity[];
	let successfulExecution: ExecutionEntity;

	beforeEach(async () => {
		if (isPostgres) {
			await Container.get(DataSource).query("SELECT set_config('TimeZone', $1, false)", [timezone]);
		}
		await testDb.truncate(['SharedWorkflow', 'WorkflowEntity', 'ExecutionEntity']);
		workflow = await createWorkflow({}, owner);
		executions = [];
		for (const startedAt of startTimes) {
			executions.push(
				await createExecution(
					{ startedAt: new Date(startedAt), status: 'error', finished: false },
					workflow,
				),
			);
		}
		successfulExecution = await createExecution({ startedAt: new Date(startedAfter) }, workflow);
		const otherWorkflow = await createWorkflow({}, owner);
		await createExecution(
			{ startedAt: new Date(startTimes[0]), status: 'error', finished: false },
			otherWorkflow,
		);
	});

	afterEach(async () => {
		if (isPostgres) {
			await Container.get(DataSource).query("SELECT set_config('TimeZone', $1, false)", [
				originalTimezone,
			]);
		}
	});

	test.each([
		{
			name: 'UTC bounds',
			filters: { startedAfter, startedBefore },
			expected: [1, 2, 3, 4],
		},
		{
			name: 'positive-offset bounds',
			filters: {
				startedAfter: '2024-01-15T13:00:00.000+03:00',
				startedBefore: '2024-01-15T14:45:00.000+03:00',
			},
			expected: [1, 2, 3, 4],
		},
		{
			name: 'negative-offset bounds',
			filters: {
				startedAfter: '2024-01-15T05:00:00.000-05:00',
				startedBefore: '2024-01-15T06:45:00.000-05:00',
			},
			expected: [1, 2, 3, 4],
		},
		{
			name: 'fractional-hour-offset bounds',
			filters: {
				startedAfter: '2024-01-15T15:45:00.000+05:45',
				startedBefore: '2024-01-15T17:30:00.000+05:45',
			},
			expected: [1, 2, 3, 4],
		},
		{ name: 'lower bound only', filters: { startedAfter }, expected: [1, 2, 3, 4, 5] },
		{ name: 'upper bound only', filters: { startedBefore }, expected: [0, 1, 2, 3, 4] },
	])('should filter the public API by $name', async ({ filters, expected }) => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.get('/executions')
			.query({
				...filters,
				workflowId: workflow.id,
				status: 'error',
				includeData: false,
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual(
			expected.map((index) => executions[index].id).reverse(),
		);
		expect(response.body.nextCursor).toBeNull();
	});

	test('should paginate the filtered public API results', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const query = {
			startedAfter,
			startedBefore,
			workflowId: workflow.id,
			status: 'error',
			limit: 2,
		};
		const first = await agent.get('/executions').query({ ...query, includeData: false });
		expect(first.statusCode).toBe(200);
		expect(first.body.nextCursor).toEqual(expect.any(String));
		expect(first.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
			executions[4].id,
			executions[3].id,
		]);

		const second = await agent.get('/executions').query({
			...query,
			includeData: true,
			cursor: first.body.nextCursor,
		});
		expect(second.statusCode).toBe(200);
		expect(second.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
			executions[2].id,
			executions[1].id,
		]);
	});

	test('should use the same bounds for UI lists, counts, stopping, and deletion selection', async () => {
		const repository = Container.get(ExecutionRepository);
		const filters = {
			startedAfter,
			startedBefore,
			workflowId: workflow.id,
			status: ['error' as const],
		};
		const expectedIds = executions.slice(1, 5).map(({ id }) => id);
		const listed = await repository.findManyByRangeQuery({
			...filters,
			kind: 'range',
			user: owner,
			range: { limit: 20 },
		});
		expect(listed.map(({ id }) => id)).toEqual([...expectedIds].reverse());
		expect(await repository.fetchCount({ ...filters, kind: 'count', user: owner })).toBe(4);
		expect(
			(await repository.findByStopExecutionsFilter(filters)).map(({ id }) => id).sort(),
		).toEqual([...expectedIds].sort());
		const deletable = await repository.findExecutionsToDelete({
			filters,
			accessibleWorkflowIds: [workflow.id],
			deleteConditions: { deleteBefore: new Date('2024-01-16T00:00:00.000Z') },
		});
		expect(deletable.map(({ executionId }) => executionId).sort()).toEqual([...expectedIds].sort());
	});

	test('should use an inclusive cutoff for recent executions and their workflows', async () => {
		const repository = Container.get(ExecutionRepository);
		const cutoff = new Date(startedAfter);
		expect((await repository.getIdsSince(cutoff)).sort()).toEqual(
			[...executions.slice(1).map(({ id }) => id), successfulExecution.id].sort(),
		);
		expect(await repository.getWorkflowIdsWithExecutionsSince(cutoff)).toEqual([workflow.id]);
	});
});
