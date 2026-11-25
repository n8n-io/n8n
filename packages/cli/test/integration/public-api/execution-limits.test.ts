import { EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { ExecutionLimitsService } from '@n8n/backend-module-execution-limits';
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { ProjectService } from '@/services/project.service.ee';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['execution-limits'],
	enabledFeatures: [LICENSE_FEATURES.EXECUTION_LIMITS, 'feat:projectRole:editor'],
	quotas: { 'quota:maxTeamProjects': -1 },
});

let owner: User;
let readOnlyOwner: User;
let writeOnlyOwner: User;
let unscopedOwner: User;
let memberWithKey: User;

const VALID_BODY = {
	periodUnit: 'month' as const,
	maxExecutions: 100_000,
	defaultProjectMaxExecutions: 10_000,
	version: 0,
};

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	readOnlyOwner = await createOwnerWithApiKey({ scopes: ['executionLimit:read'] });
	writeOnlyOwner = await createOwnerWithApiKey({ scopes: ['executionLimit:update'] });
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	memberWithKey = await createMemberWithApiKey({
		scopes: ['executionLimit:read', 'executionLimit:update'],
	});
});

afterEach(async () => {
	await testDb.truncate(['Settings', 'ExecutionLimitAudit', 'ProjectExecutionLimit']);
});

describe('execution limits public API authorization', () => {
	test('an unauthenticated caller is rejected with 401', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.get('/execution-limits/instance');

		expect(response.statusCode).toBe(401);
	});

	test('rejects an owner key without the required scope with 403', async () => {
		const unscoped = testServer.publicApiAgentFor(unscopedOwner);
		expect((await unscoped.get('/execution-limits/instance')).statusCode).toBe(403);
		expect((await unscoped.put('/execution-limits/instance').send(VALID_BODY)).statusCode).toBe(
			403,
		);

		expect(
			(
				await testServer
					.publicApiAgentFor(readOnlyOwner)
					.put('/execution-limits/instance')
					.send(VALID_BODY)
			).statusCode,
		).toBe(403);
		expect(
			(await testServer.publicApiAgentFor(writeOnlyOwner).get('/execution-limits/instance'))
				.statusCode,
		).toBe(403);
	});

	test('rejects a member without global RBAC scopes with 403 even if the key carries the scope', async () => {
		const memberAgent = testServer.publicApiAgentFor(memberWithKey);

		expect((await memberAgent.get('/execution-limits/instance')).statusCode).toBe(403);
		expect((await memberAgent.put('/execution-limits/instance').send(VALID_BODY)).statusCode).toBe(
			403,
		);
	});
});

describe('execution limits public API license and module gating', () => {
	test('rejects GET and PUT with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.EXECUTION_LIMITS);
		const agent = testServer.publicApiAgentFor(owner);

		expect((await agent.get('/execution-limits/instance')).statusCode).toBe(403);
		expect((await agent.put('/execution-limits/instance').send(VALID_BODY)).statusCode).toBe(403);
	});

	test('returns 503 when the execution-limits module is not enabled', async () => {
		const active = vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
		try {
			const agent = testServer.publicApiAgentFor(owner);

			expect((await agent.get('/execution-limits/instance')).statusCode).toBe(503);
			expect((await agent.put('/execution-limits/instance').send(VALID_BODY)).statusCode).toBe(503);
		} finally {
			active.mockRestore();
		}
	});
});

describe('execution limits public API instance settings', () => {
	test('reads the default settings on a fresh instance', async () => {
		const response = await testServer
			.publicApiAgentFor(readOnlyOwner)
			.get('/execution-limits/instance');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('writes with the correct version, bumps version, and round-trips GET into PUT', async () => {
		const agent = testServer.publicApiAgentFor(owner);

		const saved = await agent.put('/execution-limits/instance').send(VALID_BODY);
		expect(saved.statusCode).toBe(200);
		expect(saved.body).toEqual({ ...VALID_BODY, version: 1 });

		const fetched = await agent.get('/execution-limits/instance');
		expect(fetched.statusCode).toBe(200);
		expect(fetched.body).toEqual(saved.body);

		const roundTrip = await agent.put('/execution-limits/instance').send(fetched.body);
		expect(roundTrip.statusCode).toBe(200);
		expect(roundTrip.body).toEqual({ ...fetched.body, version: 2 });
	});

	test('rejects a stale version with 409 and changes nothing', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const saved = await agent.put('/execution-limits/instance').send(VALID_BODY);
		expect(saved.statusCode).toBe(200);

		const stale = await agent.put('/execution-limits/instance').send({
			periodUnit: 'day',
			maxExecutions: 500,
			defaultProjectMaxExecutions: null,
			version: 0,
		});

		expect(stale.statusCode).toBe(409);

		const current = await agent.get('/execution-limits/instance');
		expect(current.body).toEqual(saved.body);
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
				extra: true,
			},
		],
	])('rejects PUT with %s with 400', async (_label, body) => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/execution-limits/instance')
			.send(body);

		expect(response.statusCode).toBe(400);
	});

	test('rejects defaultProjectMaxExecutions above maxExecutions with 400 and changes nothing', async () => {
		const agent = testServer.publicApiAgentFor(owner);

		const response = await agent.put('/execution-limits/instance').send({
			periodUnit: 'month',
			maxExecutions: 100,
			defaultProjectMaxExecutions: 101,
			version: 0,
		});

		expect(response.statusCode).toBe(400);

		const current = await agent.get('/execution-limits/instance');
		expect(current.body).toEqual({
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});

	test('gives a new team project the default limit set through PUT', async () => {
		const agent = testServer.publicApiAgentFor(owner);

		const updated = await agent.put('/execution-limits/instance').send({
			periodUnit: 'month',
			maxExecutions: 1000,
			defaultProjectMaxExecutions: 300,
			version: 0,
		});
		expect(updated.statusCode).toBe(200);

		const project = await Container.get(ProjectService).createTeamProject(owner, {
			name: 'Public API limited team',
		});

		expect(await Container.get(ExecutionLimitsService).getProjectLimits([project.id])).toEqual([
			{ projectId: project.id, maxExecutions: 300 },
		]);
	});
});
