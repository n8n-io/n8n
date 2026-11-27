import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { CredentialsRepository, RuntimeCredentialRuleRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { RuntimeCredentialStubSeeder } from '@/modules/runtime-credentials/runtime-credential-stub.seeder';

import {
	RuntimeCredentialsService,
	runtimeStubId,
} from '@/modules/runtime-credentials/runtime-credentials.service';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify({
	env_token: {
		nodeType: '*',
		path: 'headers.x-env',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
});

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['runtime-credentials', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const RULES = '/runtime-credential-rules';
const projectRules = (projectId: string) => `/projects/${projectId}/runtime-credential-rules`;
const projectPolicy = (projectId: string) =>
	`/request-fed-credential-type-policies/projects/${projectId}`;

const body = {
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.authorization',
	credentialType: 'httpHeaderAuth',
};

let owner: User;
let unscopedOwner: User;
let member: User;
let projectAdmin: User;
let projectEditor: User;
let project: Project;
let otherProject: Project;
let otherProjectAdmin: User;

beforeAll(async () => {
	await utils.initCredentialsTypes();
	owner = await createOwnerWithApiKey();
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	member = await createMemberWithApiKey({ scopes: ['securitySettings:manage'] });
	projectAdmin = await createMemberWithApiKey({
		scopes: ['credentialTypePolicy:manageRequestFed'],
	});
	otherProjectAdmin = await createMemberWithApiKey({
		scopes: ['credentialTypePolicy:manageRequestFed'],
	});
	projectEditor = await createMemberWithApiKey({
		scopes: ['credentialTypePolicy:manageRequestFed'],
	});
	project = await createTeamProject('Rules project', projectAdmin);
	otherProject = await createTeamProject('Other rules project', otherProjectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
	delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
});

afterEach(async () => {
	const repository = Container.get(RuntimeCredentialRuleRepository);
	for (const row of await repository.findAll({})) await repository.deleteByAlias(row.alias, {});
	await Container.get(RuntimeCredentialsService).loadDatabaseRules();
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

describe('runtime credential rules public API authorization', () => {
	test('an unauthenticated caller is rejected with 401', async () => {
		const agent = testServer.publicApiAgentWithoutApiKey();

		expect((await agent.get(RULES)).statusCode).toBe(401);
		expect((await agent.get(projectRules(project.id))).statusCode).toBe(401);
	});

	test.each([
		['GET', RULES],
		['POST', RULES],
		['POST', `${RULES}/impact`],
		['GET', `${RULES}/env_token`],
		['PUT', `${RULES}/env_token`],
		['DELETE', `${RULES}/env_token`],
	])('%s %s rejects an owner key without the scope with 403', async (method, path) => {
		const agent = testServer.publicApiAgentFor(unscopedOwner);
		const response = await (method === 'GET'
			? agent.get(path)
			: method === 'POST'
				? agent.post(path).send({})
				: method === 'PUT'
					? agent.put(path).send({})
					: agent.delete(path));

		expect(response.statusCode).toBe(403);
	});

	test('a member whose key has the scope is still rejected, because the user lacks the global scope', async () => {
		const agent = testServer.publicApiAgentFor(member);

		expect((await agent.get(RULES)).statusCode).toBe(403);
		expect((await agent.post(RULES).send({ alias: 'm', ...body })).statusCode).toBe(403);
	});

	test('the project read rejects an owner key without the scope with 403', async () => {
		const response = await testServer
			.publicApiAgentFor(unscopedOwner)
			.get(projectRules(project.id));

		expect(response.statusCode).toBe(403);
	});
});

describe('runtime credential rules public API', () => {
	test('lists the environment rule as read-only', async () => {
		const response = await testServer.publicApiAgentFor(owner).get(RULES);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: [
				{
					alias: 'env_token',
					nodeType: '*',
					path: 'headers.x-env',
					credentialType: 'httpHeaderAuth',
					transform: 'field:value',
					source: 'environment',
					stubCredentialId: runtimeStubId('env_token'),
				},
			],
			nextCursor: null,
		});
	});

	test('sorts the list by alias before it pages', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await agent
			.post(RULES)
			.send({ alias: 'zeta', ...body })
			.expect(201);
		await agent
			.post(RULES)
			.send({ alias: 'alpha', ...body })
			.expect(201);

		const first = await agent.get(`${RULES}?limit=2`);
		const second = await agent.get(`${RULES}?limit=2&cursor=${first.body.nextCursor}`);

		expect(
			[...first.body.data, ...second.body.data].map((rule: { alias: string }) => rule.alias),
		).toEqual(['alpha', 'env_token', 'zeta']);
	});

	test('pages the list with a cursor', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await agent
			.post(RULES)
			.send({ alias: 'one', ...body })
			.expect(201);
		await agent
			.post(RULES)
			.send({ alias: 'two', ...body })
			.expect(201);

		const first = await agent.get(`${RULES}?limit=2`);
		expect(first.body.data).toHaveLength(2);
		expect(first.body.nextCursor).toEqual(expect.any(String));

		const second = await agent.get(`${RULES}?limit=2&cursor=${first.body.nextCursor}`);
		expect(second.body.data).toHaveLength(1);
		expect(second.body.nextCursor).toBeNull();

		expect((await agent.get(`${RULES}?cursor=not-a-cursor`)).statusCode).toBe(400);
	});

	test('creates, gets, replaces and deletes a database rule', async () => {
		const agent = testServer.publicApiAgentFor(owner);

		const created = await agent
			.post(RULES)
			.send({ alias: 'db_rule', ...body, transform: 'bearer' });
		expect(created.statusCode).toBe(201);
		expect(created.body).toEqual({
			alias: 'db_rule',
			...body,
			transform: 'bearer',
			source: 'database',
			stubCredentialId: runtimeStubId('db_rule'),
		});
		const stub = await Container.get(CredentialsRepository).findOneBy({
			id: runtimeStubId('db_rule'),
		});
		expect(stub?.isRuntime).toBe(true);

		expect((await agent.get(`${RULES}/db_rule`)).body).toEqual(created.body);

		// A GET body is a valid PUT body. An absent transform is cleared.
		const replaced = await agent
			.put(`${RULES}/db_rule`)
			.send({ ...created.body, path: 'headers.x-other', transform: undefined });
		expect(replaced.statusCode).toBe(200);
		expect(replaced.body.path).toBe('headers.x-other');
		expect(replaced.body.transform).toBeUndefined();

		expect((await agent.delete(`${RULES}/db_rule`)).statusCode).toBe(204);
		expect((await agent.get(`${RULES}/db_rule`)).statusCode).toBe(404);
	});

	test('rejects a duplicate alias with 409 and an invalid body with 400', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await agent
			.post(RULES)
			.send({ alias: 'dup', ...body })
			.expect(201);

		expect((await agent.post(RULES).send({ alias: 'dup', ...body })).statusCode).toBe(409);
		expect((await agent.post(RULES).send({ alias: 'x y', ...body })).statusCode).toBe(400);
	});

	test('refuses to change the alias or credential type, and the environment rule', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await agent
			.post(RULES)
			.send({ alias: 'fixed', ...body })
			.expect(201);

		const changed = await agent
			.put(`${RULES}/fixed`)
			.send({ nodeType: '*', path: 'p', credentialType: 'slackApi' });
		expect(changed.statusCode).toBe(400);

		expect(
			(await agent.put(`${RULES}/env_token`).send({ nodeType: '*', path: 'p' })).statusCode,
		).toBe(403);
		expect((await agent.delete(`${RULES}/env_token`)).statusCode).toBe(403);
		expect(
			(await agent.put(`${RULES}/missing`).send({ nodeType: '*', path: 'p' })).statusCode,
		).toBe(404);
	});

	test('the impact check returns the shape of the internal route', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post(`${RULES}/impact`)
			.send({ nodeType: '*', path: 'headers.authorization' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ workflows: [], truncated: false });
	});
});

describe('runtime credential rules of a project', () => {
	test('a project admin who is not a global admin can read the rules', async () => {
		const response = await testServer.publicApiAgentFor(projectAdmin).get(projectRules(project.id));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual([
			{
				alias: 'env_token',
				path: 'headers.x-env',
				credentialType: 'httpHeaderAuth',
				access: 'allowed',
				blockedBy: null,
			},
		]);
	});

	test('an instance owner can read the rules', async () => {
		expect(
			(await testServer.publicApiAgentFor(owner).get(projectRules(project.id))).statusCode,
		).toBe(200);
	});

	test('a project editor and the member of no project are denied', async () => {
		expect(
			(await testServer.publicApiAgentFor(projectEditor).get(projectRules(project.id))).statusCode,
		).toBe(403);
		expect(
			(await testServer.publicApiAgentFor(member).get(projectRules(project.id))).statusCode,
		).toBe(403);
	});

	test('the admin of another project is denied on this project', async () => {
		const agent = testServer.publicApiAgentFor(otherProjectAdmin);

		expect((await agent.get(projectRules(otherProject.id))).statusCode).toBe(200);
		expect((await agent.get(projectRules(project.id))).statusCode).toBe(403);
		expect((await agent.put(projectPolicy(project.id)).send({})).statusCode).toBe(403);
	});

	test('an unknown project answers 404', async () => {
		const response = await testServer.publicApiAgentFor(owner).get(projectRules('does-not-exist'));

		expect(response.statusCode).toBe(404);
	});

	test('reflects a project policy that blocks the credential type', async () => {
		const admin = testServer.publicApiAgentFor(projectAdmin);
		await admin
			.put(projectPolicy(project.id))
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'httpHeaderAuth' } }],
				defaultAction: 'allow',
				version: 0,
			})
			.expect(200);

		const response = await admin.get(projectRules(project.id));

		expect(response.body.data[0]).toMatchObject({
			alias: 'env_token',
			access: 'blocked',
			blockedBy: 'project',
		});
	});

	test('reflects an instance policy, and leaves other projects alone', async () => {
		const other = await createTeamProject('Other project', projectAdmin);
		await testServer
			.publicApiAgentFor(owner)
			.put('/request-fed-credential-type-policies/instance')
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'httpHeaderAuth' } }],
				defaultAction: 'allow',
				version: 0,
			})
			.expect(200);

		for (const id of [project.id, other.id]) {
			const response = await testServer.publicApiAgentFor(projectAdmin).get(projectRules(id));
			expect(response.body.data[0]).toMatchObject({ access: 'blocked', blockedBy: 'instance' });
		}
	});
});

describe('request-fed credential type policy public API', () => {
	const policy = {
		rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'httpHeaderAuth' } }],
		defaultAction: 'allow',
		version: 0,
	};

	test('a project admin sets and reads the project policy', async () => {
		const agent = testServer.publicApiAgentFor(projectAdmin);

		const written = await agent.put(projectPolicy(project.id)).send(policy);
		expect(written.statusCode).toBe(200);
		expect(written.body.version).toBe(1);

		const read = await agent.get(projectPolicy(project.id));
		expect(read.body.rules).toEqual(policy.rules);
	});

	test('rejects a stale version with 409 and an editor with 403', async () => {
		const agent = testServer.publicApiAgentFor(projectAdmin);
		await agent.put(projectPolicy(project.id)).send(policy).expect(200);

		expect((await agent.put(projectPolicy(project.id)).send(policy)).statusCode).toBe(409);
		expect(
			(
				await testServer
					.publicApiAgentFor(projectEditor)
					.put(projectPolicy(project.id))
					.send(policy)
			).statusCode,
		).toBe(403);
	});

	test('the instance routes are global only', async () => {
		const path = '/request-fed-credential-type-policies/instance';

		expect((await testServer.publicApiAgentFor(projectAdmin).get(path)).statusCode).toBe(403);
		expect((await testServer.publicApiAgentFor(unscopedOwner).get(path)).statusCode).toBe(403);
		expect((await testServer.publicApiAgentFor(owner).get(path)).body).toEqual({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 0,
		});
	});
});

describe('runtime credentials feature flag', () => {
	beforeEach(() => {
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
	});

	afterEach(() => {
		process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
	});

	test.each([
		['GET', RULES],
		['GET', `${RULES}/env_token`],
		['POST', `${RULES}/impact`],
		['GET', '/request-fed-credential-type-policies/instance'],
	])('%s %s answers 503 when the flag is off', async (method, path) => {
		const agent = testServer.publicApiAgentFor(owner);
		const response = await (method === 'GET'
			? agent.get(path)
			: agent.post(path).send({ nodeType: '*', path: 'p' }));

		expect(response.statusCode).toBe(503);
	});

	test('the project read answers 503 when the flag is off', async () => {
		const response = await testServer.publicApiAgentFor(owner).get(projectRules(project.id));

		expect(response.statusCode).toBe(503);
	});

	test('the project policy answers 503 when the flag is off', async () => {
		const response = await testServer
			.publicApiAgentFor(projectAdmin)
			.get(projectPolicy(project.id));

		expect(response.statusCode).toBe(503);
	});
});

describe('license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	});

	test('the request-fed policy routes and the project read answer 403 when unlicensed', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		const ownerAgent = testServer.publicApiAgentFor(owner);
		const adminAgent = testServer.publicApiAgentFor(projectAdmin);

		expect(
			(await ownerAgent.get('/request-fed-credential-type-policies/instance')).statusCode,
		).toBe(403);
		expect(
			(await ownerAgent.put('/request-fed-credential-type-policies/instance').send({})).statusCode,
		).toBe(403);
		expect((await adminAgent.get(projectPolicy(project.id))).statusCode).toBe(403);
		expect((await adminAgent.put(projectPolicy(project.id)).send({})).statusCode).toBe(403);
		expect((await adminAgent.get(projectRules(project.id))).statusCode).toBe(403);
	});
});

describe('ruleAlias on the public credentials response', () => {
	test('a stub carries the alias of its rule', async () => {
		await Container.get(RuntimeCredentialStubSeeder).seed();

		const response = await testServer
			.publicApiAgentFor(owner)
			.get(`/credentials/${runtimeStubId('env_token')}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toMatchObject({ isRuntime: true, ruleAlias: 'env_token' });
	});
});
