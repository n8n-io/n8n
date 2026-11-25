import { ExecutionLimitsService } from '@n8n/backend-module-execution-limits';
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createAdmin, createMember, createOwner, createUser } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['execution-limits', 'project'],
	modules: ['execution-limits'],
	enabledFeatures: [LICENSE_FEATURES.EXECUTION_LIMITS, LICENSE_FEATURES.PROJECT_ROLE_ADMIN],
	quotas: { 'quota:maxTeamProjects': -1 },
});

const INSTANCE_PATH = '/execution-limits/instance';

let owner: User;
let admin: User;
let member: User;
let readOnlyUser: User;

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();
	const readOnlyRole = await createCustomRoleWithScopeSlugs(['executionLimit:read'], {
		roleType: 'global',
	});
	readOnlyUser = await createUser({ role: readOnlyRole });
});

afterEach(async () => {
	await testDb.truncate(['Settings', 'ExecutionLimitAudit', 'ProjectExecutionLimit']);
});

afterAll(async () => {
	await testDb.truncate(['User']);
	await cleanupRolesAndScopes();
});

describe('Internal API /rest/execution-limits/instance', () => {
	test('reads default settings on a fresh instance', async () => {
		const response = await testServer.authAgentFor(owner).get(INSTANCE_PATH);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('allows an admin to read and write with the current version', async () => {
		const write = await testServer.authAgentFor(admin).put(INSTANCE_PATH).send({
			periodUnit: 'week',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 0,
		});

		expect(write.statusCode).toBe(200);
		expect(write.body.data).toEqual({
			periodUnit: 'week',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 1,
		});

		const read = await testServer.authAgentFor(admin).get(INSTANCE_PATH);
		expect(read.statusCode).toBe(200);
		expect(read.body.data).toEqual(write.body.data);

		// A GET body round-trips as a valid PUT body.
		const roundTrip = await testServer.authAgentFor(admin).put(INSTANCE_PATH).send(read.body.data);
		expect(roundTrip.statusCode).toBe(200);
		expect(roundTrip.body.data).toEqual({ ...read.body.data, version: 2 });
	});

	test('rejects a stale version with 409 and changes nothing', async () => {
		await testServer.authAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 0,
		});

		const stale = await testServer.authAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'day',
			maxExecutions: 10_000,
			defaultProjectMaxExecutions: null,
			version: 0,
		});

		expect(stale.statusCode).toBe(409);

		const current = await testServer.authAgentFor(owner).get(INSTANCE_PATH);
		expect(current.body.data).toEqual({
			periodUnit: 'month',
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
		const response = await testServer.authAgentFor(owner).put(INSTANCE_PATH).send(body);

		expect(response.statusCode).toBe(400);
	});

	test('rejects defaultProjectMaxExecutions above maxExecutions with 400 and changes nothing', async () => {
		const response = await testServer.authAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 100,
			defaultProjectMaxExecutions: 101,
			version: 0,
		});

		expect(response.statusCode).toBe(400);

		const current = await testServer.authAgentFor(owner).get(INSTANCE_PATH);
		expect(current.body.data).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('rejects unauthenticated requests with 401', async () => {
		expect((await testServer.authlessAgent.get(INSTANCE_PATH)).statusCode).toBe(401);
		expect(
			(
				await testServer.authlessAgent.put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: null,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(401);
	});

	test('rejects callers missing the required scope with 403', async () => {
		expect((await testServer.authAgentFor(member).get(INSTANCE_PATH)).statusCode).toBe(403);
		expect(
			(
				await testServer.authAgentFor(member).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);

		// A caller with only executionLimit:read can GET but not PUT.
		expect((await testServer.authAgentFor(readOnlyUser).get(INSTANCE_PATH)).statusCode).toBe(200);
		expect(
			(
				await testServer.authAgentFor(readOnlyUser).put(INSTANCE_PATH).send({
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

		expect((await testServer.authAgentFor(owner).get(INSTANCE_PATH)).statusCode).toBe(403);
		expect(
			(
				await testServer.authAgentFor(owner).put(INSTANCE_PATH).send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);
	});

	test('applies defaultProjectMaxExecutions set via PUT to a newly created team project', async () => {
		const updateResponse = await testServer.authAgentFor(owner).put(INSTANCE_PATH).send({
			periodUnit: 'month',
			maxExecutions: 10_000,
			defaultProjectMaxExecutions: 250,
			version: 0,
		});
		expect(updateResponse.statusCode).toBe(200);

		const createProjectResponse = await testServer
			.authAgentFor(owner)
			.post('/projects')
			.send({ name: 'Team With Default Limit' });
		expect(createProjectResponse.statusCode).toBe(200);

		const projectId = createProjectResponse.body.data.id as string;
		const limits = await Container.get(ExecutionLimitsService).getProjectLimits([projectId]);
		expect(limits).toEqual([{ projectId, maxExecutions: 250 }]);
	});
});
