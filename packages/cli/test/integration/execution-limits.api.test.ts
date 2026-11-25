import { EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING } from '@n8n/api-types';
import { ExecutionLimitsService } from '@n8n/backend-module-execution-limits';
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['execution-limits', 'project'],
	modules: ['execution-limits'],
	enabledFeatures: [
		LICENSE_FEATURES.EXECUTION_LIMITS,
		'feat:projectRole:admin',
		'feat:projectRole:editor',
	],
	quotas: { 'quota:maxTeamProjects': -1 },
});

let owner: User;
let admin: User;
let member: User;

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();
});

afterEach(async () => {
	await testDb.truncate(['Settings', 'ExecutionLimitAudit', 'ProjectExecutionLimit']);
});

describe('internal execution limits API (/rest/execution-limits/instance)', () => {
	test('reads the default settings on a fresh instance', async () => {
		const response = await testServer.authAgentFor(owner).get('/execution-limits/instance');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('allows an admin to read and write the instance execution limit', async () => {
		const agent = testServer.authAgentFor(admin);
		const putResponse = await agent.put('/execution-limits/instance').send({
			periodUnit: 'week',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 0,
		});

		expect(putResponse.statusCode).toBe(200);
		expect(putResponse.body.data).toEqual({
			periodUnit: 'week',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 1,
		});

		const getResponse = await agent.get('/execution-limits/instance');
		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.body.data).toEqual(putResponse.body.data);
	});

	test('a GET body round-trips as a valid PUT body', async () => {
		const agent = testServer.authAgentFor(owner);
		await agent.put('/execution-limits/instance').send({
			periodUnit: 'day',
			maxExecutions: 500,
			defaultProjectMaxExecutions: 100,
			version: 0,
		});

		const current = await agent.get('/execution-limits/instance');
		const retry = await agent.put('/execution-limits/instance').send(current.body.data);

		expect(retry.statusCode).toBe(200);
		expect(retry.body.data).toEqual({ ...current.body.data, version: 2 });
	});

	test('rejects a stale version with 409 and changes nothing', async () => {
		const agent = testServer.authAgentFor(owner);
		const first = await agent.put('/execution-limits/instance').send({
			periodUnit: 'month',
			maxExecutions: 1000,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
		expect(first.statusCode).toBe(200);

		const stale = await agent.put('/execution-limits/instance').send({
			periodUnit: 'day',
			maxExecutions: 500,
			defaultProjectMaxExecutions: null,
			version: 0,
		});

		expect(stale.statusCode).toBe(409);

		const current = await agent.get('/execution-limits/instance');
		expect(current.body.data).toEqual(first.body.data);
	});

	test.each([
		['missing periodUnit', { maxExecutions: 1000, defaultProjectMaxExecutions: null, version: 0 }],
		[
			'missing maxExecutions',
			{ periodUnit: 'month', defaultProjectMaxExecutions: null, version: 0 },
		],
		[
			'missing defaultProjectMaxExecutions',
			{ periodUnit: 'month', maxExecutions: 1000, version: 0 },
		],
		[
			'missing version',
			{ periodUnit: 'month', maxExecutions: 1000, defaultProjectMaxExecutions: null },
		],
		[
			'invalid periodUnit',
			{ periodUnit: 'year', maxExecutions: 1000, defaultProjectMaxExecutions: null, version: 0 },
		],
		[
			'maxExecutions above ceiling',
			{
				periodUnit: 'month',
				maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1,
				defaultProjectMaxExecutions: null,
				version: 0,
			},
		],
		[
			'unknown field',
			{
				periodUnit: 'month',
				maxExecutions: 1000,
				defaultProjectMaxExecutions: null,
				version: 0,
				unknown: true,
			},
		],
	])('rejects PUT with %s with 400', async (_label, body) => {
		const response = await testServer
			.authAgentFor(owner)
			.put('/execution-limits/instance')
			.send(body);

		expect(response.statusCode).toBe(400);
	});

	test('rejects defaultProjectMaxExecutions above maxExecutions with 400 and changes nothing', async () => {
		const agent = testServer.authAgentFor(owner);

		const response = await agent.put('/execution-limits/instance').send({
			periodUnit: 'month',
			maxExecutions: 100,
			defaultProjectMaxExecutions: 101,
			version: 0,
		});

		expect(response.statusCode).toBe(400);

		const current = await agent.get('/execution-limits/instance');
		expect(current.body.data).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('rejects a member without executionLimit scopes with 403', async () => {
		const agent = testServer.authAgentFor(member);

		expect((await agent.get('/execution-limits/instance')).statusCode).toBe(403);
		expect(
			(
				await agent.put('/execution-limits/instance').send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);
	});

	test('rejects GET and PUT with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.EXECUTION_LIMITS);
		const agent = testServer.authAgentFor(owner);

		expect((await agent.get('/execution-limits/instance')).statusCode).toBe(403);
		expect(
			(
				await agent.put('/execution-limits/instance').send({
					periodUnit: 'month',
					maxExecutions: 100,
					defaultProjectMaxExecutions: null,
					version: 0,
				})
			).statusCode,
		).toBe(403);
	});

	test('gives a new team project the default limit set through PUT', async () => {
		const agent = testServer.authAgentFor(owner);

		const updated = await agent.put('/execution-limits/instance').send({
			periodUnit: 'month',
			maxExecutions: 1000,
			defaultProjectMaxExecutions: 250,
			version: 0,
		});
		expect(updated.statusCode).toBe(200);

		const created = await agent.post('/projects').send({ name: 'Limited team' });
		expect(created.statusCode).toBe(200);
		const projectId = created.body.data.id as string;

		expect(await Container.get(ExecutionLimitsService).getProjectLimits([projectId])).toEqual([
			{ projectId, maxExecutions: 250 },
		]);
	});
});
