/**
 * REST contract of /rest/runtime-credential-rules.
 * Environment rules show up read-only. Database rules can be created, changed and removed.
 */

import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsRepository, RuntimeCredentialRuleRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { RuntimeCredentialsService } from '@/modules/runtime-credentials/runtime-credentials.service';
import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

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
	// A non-empty list makes the server init the modules and mount their controllers.
	endpointGroups: ['credentials'],
	modules: ['runtime-credentials'],
});

const URL = '/runtime-credential-rules';
const body = {
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.authorization',
	credentialType: 'httpHeaderAuth',
};

describe('runtime credential rules REST', () => {
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let owner: User;

	beforeAll(async () => {
		await utils.initCredentialsTypes();
		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(await createMember());
	});

	afterAll(() => {
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	afterEach(async () => {
		const repository = Container.get(RuntimeCredentialRuleRepository);
		for (const row of await repository.findAll({})) await repository.deleteByAlias(row.alias, {});
		await Container.get(RuntimeCredentialsService).loadDatabaseRules();
	});

	it('lists the environment rule as read-only', async () => {
		const { body: result } = await ownerAgent.get(URL).expect(200);

		expect(result.data.rules).toEqual([
			{
				alias: 'env_token',
				nodeType: '*',
				path: 'headers.x-env',
				credentialType: 'httpHeaderAuth',
				transform: 'field:value',
				source: 'environment',
				stubCredentialId: runtimeStubId('env_token'),
			},
		]);
	});

	it('refuses a user without the securitySettings:manage scope', async () => {
		await memberAgent.get(URL).expect(403);
		await memberAgent
			.post(URL)
			.send({ alias: 'm', ...body })
			.expect(403);
	});

	it('creates a database rule and its stub credential', async () => {
		const { body: result } = await ownerAgent
			.post(URL)
			.send({ alias: 'db_create', ...body, transform: 'bearer' })
			.expect(200);

		expect(result.data).toEqual({
			alias: 'db_create',
			...body,
			transform: 'bearer',
			source: 'database',
			stubCredentialId: runtimeStubId('db_create'),
		});

		const stub = await Container.get(CredentialsRepository).findOneBy({
			id: runtimeStubId('db_create'),
		});
		expect(stub?.isRuntime).toBe(true);

		const { body: listed } = await ownerAgent.get(URL).expect(200);
		expect(listed.data.rules.map((rule: { alias: string }) => rule.alias).sort()).toEqual([
			'db_create',
			'env_token',
		]);
	});

	describe('allowed domains', () => {
		it('creates a rule with allowed domains and lists them', async () => {
			const { body: created } = await ownerAgent
				.post(URL)
				.send({ alias: 'db_domains', ...body, allowedDomains: 'api.example.com, *.example.org' })
				.expect(200);
			expect(created.data.allowedDomains).toBe('api.example.com, *.example.org');

			const { body: listed } = await ownerAgent.get(URL).expect(200);
			const rule = listed.data.rules.find((r: { alias: string }) => r.alias === 'db_domains');
			expect(rule.allowedDomains).toBe('api.example.com, *.example.org');
			const envRule = listed.data.rules.find((r: { alias: string }) => r.alias === 'env_token');
			expect(envRule.allowedDomains).toBeUndefined();

			const row = await Container.get(RuntimeCredentialRuleRepository).findByAlias(
				'db_domains',
				{},
			);
			expect(row?.allowedDomains).toBe('api.example.com, *.example.org');
			expect(
				Container.get(RuntimeCredentialsService).getRuleForStub(runtimeStubId('db_domains'))?.rule
					.allowedDomains,
			).toBe('api.example.com, *.example.org');
		});

		it('sets, changes and clears the list with a patch', async () => {
			await ownerAgent
				.post(URL)
				.send({ alias: 'db_domains_patch', ...body })
				.expect(200);

			const { body: set } = await ownerAgent
				.patch(`${URL}/db_domains_patch`)
				.send({ allowedDomains: 'a.example.com' })
				.expect(200);
			expect(set.data.allowedDomains).toBe('a.example.com');

			const { body: unchanged } = await ownerAgent
				.patch(`${URL}/db_domains_patch`)
				.send({ path: 'body.token' })
				.expect(200);
			expect(unchanged.data.allowedDomains).toBe('a.example.com');

			const { body: cleared } = await ownerAgent
				.patch(`${URL}/db_domains_patch`)
				.send({ allowedDomains: null })
				.expect(200);
			expect(cleared.data.allowedDomains).toBeUndefined();
			expect(
				Container.get(RuntimeCredentialsService).getRuleForStub(runtimeStubId('db_domains_patch'))
					?.rule.allowedDomains,
			).toBeUndefined();
		});

		it.each([
			['an empty list', ''],
			['an empty entry', 'a.com,,b.com'],
			['a space inside an entry', 'a b.com'],
			['a scheme', 'https://a.com'],
			['a path', 'a.com/x'],
			['a port', 'a.com:8080'],
			['user info', 'u@a.com'],
			['a backslash', 'a.com\\b.com'],
		])('returns 400 for %s', async (_name, allowedDomains) => {
			await ownerAgent
				.post(URL)
				.send({ alias: 'db_domains_bad', ...body, allowedDomains })
				.expect(400);

			await ownerAgent
				.post(URL)
				.send({ alias: 'db_domains_ok', ...body })
				.expect(200);
			await ownerAgent.patch(`${URL}/db_domains_ok`).send({ allowedDomains }).expect(400);
		});
	});

	it('returns 409 for an alias that exists in the database or the environment', async () => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_dup', ...body })
			.expect(200);

		await ownerAgent
			.post(URL)
			.send({ alias: 'db_dup', ...body })
			.expect(409);
		await ownerAgent
			.post(URL)
			.send({ alias: 'env_token', ...body })
			.expect(409);
	});

	it.each([
		['an unknown credential type', { credentialType: 'noSuchApi' }],
		['a bad transform', { transform: 'upper' }],
		['an unsafe path segment', { path: 'headers.__proto__.x' }],
		['an unsafe constructor segment', { path: 'constructor' }],
		['an unsafe alias', { alias: '__proto__' }],
	])('returns 400 for %s', async (_name, override) => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_bad', ...body, ...override })
			.expect(400);
	});

	it('updates nodeType, path and transform', async () => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_patch', ...body })
			.expect(200);

		const { body: result } = await ownerAgent
			.patch(`${URL}/db_patch`)
			.send({ nodeType: '*', path: 'body.token', transform: 'field:value' })
			.expect(200);

		expect(result.data).toMatchObject({
			alias: 'db_patch',
			nodeType: '*',
			path: 'body.token',
			transform: 'field:value',
			credentialType: 'httpHeaderAuth',
		});

		const { body: cleared } = await ownerAgent
			.patch(`${URL}/db_patch`)
			.send({ transform: null })
			.expect(200);
		expect(cleared.data.transform).toBeUndefined();
	});

	it('refuses to change the alias or the credential type', async () => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_fixed', ...body })
			.expect(200);

		await ownerAgent.patch(`${URL}/db_fixed`).send({ alias: 'other' }).expect(400);
		await ownerAgent
			.patch(`${URL}/db_fixed`)
			.send({ credentialType: 'gmailOAuth2Api' })
			.expect(400);
	});

	it('returns 400 for an unsafe path on update and 404 for an unknown alias', async () => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_path', ...body })
			.expect(200);

		await ownerAgent.patch(`${URL}/db_path`).send({ path: 'a.prototype' }).expect(400);
		await ownerAgent.patch(`${URL}/missing`).send({ path: 'a' }).expect(404);
	});

	it('returns 403 when it updates or deletes an environment rule', async () => {
		await ownerAgent.patch(`${URL}/env_token`).send({ path: 'a' }).expect(403);
		await ownerAgent.delete(`${URL}/env_token`).expect(403);
	});

	it('deletes a database rule and keeps the stub credential', async () => {
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_delete', ...body })
			.expect(200);

		await ownerAgent.delete(`${URL}/db_delete`).expect(200);

		const { body: listed } = await ownerAgent.get(URL).expect(200);
		expect(listed.data.rules.map((rule: { alias: string }) => rule.alias)).toEqual(['env_token']);
		const stub = await Container.get(CredentialsRepository).findOneBy({
			id: runtimeStubId('db_delete'),
		});
		expect(stub).not.toBeNull();
		await ownerAgent.delete(`${URL}/db_delete`).expect(404);
	});

	it('applies the rule to the in-memory rules without a restart', async () => {
		const service = Container.get(RuntimeCredentialsService);
		await ownerAgent
			.post(URL)
			.send({ alias: 'db_live', ...body })
			.expect(200);
		expect(
			service.stubRuleAppliesToTrigger(runtimeStubId('db_live'), 'n8n-nodes-base.webhook'),
		).toBe(true);

		await ownerAgent.delete(`${URL}/db_live`).expect(200);
		expect(service.getRuleForStub(runtimeStubId('db_live'))).toBeUndefined();
	});
});

afterAll(async () => {
	await testDb.terminate();
});
