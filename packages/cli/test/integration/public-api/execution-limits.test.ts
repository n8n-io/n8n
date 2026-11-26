import { ModuleRegistry } from '@n8n/backend-common';
import { ExecutionLimitsService } from '@n8n/backend-module-execution-limits';
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	createAdminWithApiKey,
	createMemberWithApiKey,
	createOwnerWithApiKey,
} from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['execution-limits'],
	enabledFeatures: [LICENSE_FEATURES.EXECUTION_LIMITS, LICENSE_FEATURES.PROJECT_ROLE_ADMIN],
	quotas: { 'quota:maxTeamProjects': -1 },
});

const INSTANCE_PATH = '/execution-limits/instance';

let owner: User;
let admin: User;
let member: User;
let unscopedOwner: User;
let readOnlyOwner: User;

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	admin = await createAdminWithApiKey();
	member = await createMemberWithApiKey({
		scopes: ['executionLimit:read', 'executionLimit:update'],
	});
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	readOnlyOwner = await createOwnerWithApiKey({ scopes: ['executionLimit:read'] });
});

afterEach(async () => {
	vi.restoreAllMocks();
	await testDb.truncate(['Settings', 'ExecutionLimitAudit', 'ProjectExecutionLimit']);
});

describe('Public API /api/v1/execution-limits/instance', () => {
	test('reads default settings on a fresh instance', async () => {
		const response = await testServer.publicApiAgentFor(owner).get(INSTANCE_PATH);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('allows an admin API key to read, write with the current version, and round-trip GET to PUT', async () => {
		const write = await testServer.publicApiAgentFor(admin).put(INSTANCE_PATH).send({
			periodUnit: 'day',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 0,
		});

		expect(write.statusCode).toBe(200);
		expect(write.body).toEqual({
			periodUnit: 'day',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 1,
		});

		const read = await testServer.publicApiAgentFor(admin).get(INSTANCE_PATH);
		expect(read.statusCode).toBe(200);
		expect(read.body).toEqual(write.body);

		const roundTrip = await testServer.publicApiAgentFor(admin).put(INSTANCE_PATH).send(read.body);
		expect(roundTrip.statusCode).toBe(200);
		expect(roundTrip.body).toEqual({ ...read.body, version: 2 });
	});

	test('rejects a stale version with 409 and changes nothing', async () => {
		await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'week',
			maxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 0,
		});

		const stale = await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 10_000,
			defaultProjectMaxExecutions: null,
			version: 0,
		});

		expect(stale.statusCode).toBe(409);

		const current = await testServer.publicApiAgentFor(owner).get(INSTANCE_PATH);
		expect(current.body).toEqual({
			periodUnit: 'week',
			maxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 1,
		});
	});

	test.each([
		['missing periodUnit', { maxExecutions: 100, defaultProjectMaxExecutions: null, version: 0 }],
		[
			'missing maxExecutions',
			{ periodUnit: 'month', defaultProjectMaxExecutions: null, version: 0 },
		],
		[
			'missing defaultProjectMaxExecutions',
			{ periodUnit: 'month', maxExecutions: 100, version: 0 },
		],
		[
			'missing version',
			{ periodUnit: 'month', maxExecutions: 100, defaultProjectMaxExecutions: null },
		],
		[
			'extra unknown field',
			{
				periodUnit: 'month',
				maxExecutions: 100,
				defaultProjectMaxExecutions: null,
				version: 0,
				unknownField: true,
			},
		],
	])('rejects %s with 400', async (_, body) => {
		const response = await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send(body);

		expect(response.statusCode).toBe(400);
	});

	test('rejects defaultProjectMaxExecutions above maxExecutions with 400 and changes nothing', async () => {
		const response = await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 100,
			defaultProjectMaxExecutions: 101,
			version: 0,
		});

		expect(response.statusCode).toBe(400);

		const current = await testServer.publicApiAgentFor(owner).get(INSTANCE_PATH);
		expect(current.body).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('rejects unauthenticated requests with 401', async () => {
		expect((await testServer.publicApiAgentWithoutApiKey().get(INSTANCE_PATH)).statusCode).toBe(
			401,
		);
		expect(
			(
				await testServer.publicApiAgentWithoutApiKey().put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: null,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(401);
	});

	test('rejects callers missing the required API key or RBAC scope with 403', async () => {
		expect((await testServer.publicApiAgentFor(unscopedOwner).get(INSTANCE_PATH)).statusCode).toBe(
			403,
		);
		expect(
			(
				await testServer.publicApiAgentFor(unscopedOwner).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);

		expect((await testServer.publicApiAgentFor(member).get(INSTANCE_PATH)).statusCode).toBe(403);
		expect(
			(
				await testServer.publicApiAgentFor(member).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);

		// A key with only executionLimit:read can GET but not PUT.
		expect((await testServer.publicApiAgentFor(readOnlyOwner).get(INSTANCE_PATH)).statusCode).toBe(
			200,
		);
		expect(
			(
				await testServer.publicApiAgentFor(readOnlyOwner).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);
	});

	test('rejects requests with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.EXECUTION_LIMITS);

		expect((await testServer.publicApiAgentFor(owner).get(INSTANCE_PATH)).statusCode).toBe(403);
		expect(
			(
				await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);
	});

	test('returns 503 when the execution-limits module is not enabled', async () => {
		vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);

		expect((await testServer.publicApiAgentFor(owner).get(INSTANCE_PATH)).statusCode).toBe(503);
		expect(
			(
				await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(503);
	});

	test('applies defaultProjectMaxExecutions set via PUT to a newly created team project', async () => {
		const updateResponse = await testServer.publicApiAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 10_000,
			defaultProjectMaxExecutions: 500,
			version: 0,
		});
		expect(updateResponse.statusCode).toBe(200);

		const createProjectResponse = await testServer
			.publicApiAgentFor(owner)
			.post('/projects')
			.send({ name: 'Public API Team Project' });
		expect(createProjectResponse.statusCode).toBe(201);

		const projectId = createProjectResponse.body.id as string;
		const limits = await Container.get(ExecutionLimitsService).getProjectLimits([projectId]);
		expect(limits).toEqual([{ projectId, maxExecutions: 500 }]);
	});
});
