import nock from 'nock';

import { configureNode, createCredential, executeWorkflow, loadWorkflow, mockNode } from '../src';
import crmRequests from './fixtures/crm-requests.json';
import qualysRequest from './fixtures/qualys-request.json';

const crm = 'https://crm.example.com';
const customer = { id: 42, name: 'Ada' };

afterEach(() => nock.cleanAll());

function loadCrm() {
	const workflow = loadWorkflow(crmRequests);
	mockNode(workflow.node('Get orders'), [{ orders: 0 }]);
	return workflow;
}

test('sends the header of an httpHeaderAuth credential and redacts its value', async () => {
	nock(crm).get('/customers/42').matchHeader('x-api-key', 'test-key').reply(200, customer);

	const result = await executeWorkflow(loadCrm(), {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
		},
	});

	const [request] = result.node('Get customer').requests;
	expect(request.headers['x-api-key']).toBe('[credential: CRM API key.value]');
	expect(result.node('Get customer').output).toEqual([customer]);
});

test('fills omitted fields with the defaults of the credential type', async () => {
	nock('https://qualys.example.com')
		.get('/scans')
		.matchHeader('x-requested-with', 'n8n application')
		.basicAuth({ user: 'ada', pass: 'secret' })
		.reply(200, { scans: [] });

	const result = await executeWorkflow(loadWorkflow(qualysRequest), {
		credentials: {
			'Qualys account': createCredential('qualysApi', { username: 'ada', password: 'secret' }),
		},
	});

	expect(result.output).toEqual([{ scans: [] }]);
});

test('throws on an unknown credential type', () => {
	expect(() => createCredential('crmApiKey', {})).toThrow(
		expect.objectContaining({ code: 'CREDENTIAL_TYPE_UNKNOWN' }),
	);
});

test('throws on a credential type name that only exists on the object prototype', () => {
	expect(() => createCredential('toString', {})).toThrow(
		expect.objectContaining({ code: 'CREDENTIAL_TYPE_UNKNOWN' }),
	);
});

test('fails before the run when the credential type does not match the node', async () => {
	const execution = executeWorkflow(loadCrm(), {
		credentials: { 'CRM API key': createCredential('httpBasicAuth', { user: 'ada' }) },
	});

	await expect(execution).rejects.toMatchObject({
		code: 'CREDENTIAL_TYPE_MISMATCH',
		node: 'Get customer',
	});
});

test('fails on a missing credential and names each node that uses it', async () => {
	const execution = executeWorkflow(loadWorkflow(crmRequests));

	await expect(execution).rejects.toMatchObject({
		code: 'CREDENTIAL_NOT_SUPPLIED',
		node: 'Get customer',
		message: expect.stringContaining('Nodes that use it: Get customer, Get orders.'),
	});
});

test('finds a credential by its ID', async () => {
	nock(crm).get('/customers/42').matchHeader('x-api-key', 'test-key').reply(200, customer);

	const result = await executeWorkflow(loadCrm(), {
		credentials: {
			'cred-1': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
		},
	});

	expect(result.node('Get customer').output).toEqual([customer]);
});

test('resolves a secret in the credential data', async () => {
	nock(crm).get('/customers/42').matchHeader('x-api-key', 'vault-key').reply(200, customer);

	const result = await executeWorkflow(loadCrm(), {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', {
				name: 'X-Api-Key',
				value: '={{ $secrets.vault.crmToken }}',
			}),
		},
		secrets: { vault: { crmToken: 'vault-key' } },
	});

	expect(result.node('Get customer').output).toEqual([customer]);
});

test('fails on a secret that the test did not supply', async () => {
	const execution = executeWorkflow(loadCrm(), {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', {
				name: 'X-Api-Key',
				value: '={{ $secrets.vault.crmToken }}',
			}),
		},
		secrets: { vault: {} },
	});

	await expect(execution).rejects.toMatchObject({
		code: 'SECRET_NOT_SUPPLIED',
		message: expect.stringContaining('"vault.crmToken"'),
	});
});

test('treats a secret that the test set to null as missing', async () => {
	nock(crm).get('/customers/42').reply(200, customer);

	const result = await executeWorkflow(loadCrm(), {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', {
				name: 'X-Api-Key',
				value: '={{ $secrets.vault.crmToken ?? "fallback" }}',
			}),
		},
		secrets: { vault: { crmToken: null } },
	});

	expect(result.node('Get customer').requests[0].headers).not.toHaveProperty('x-api-key');
});

test('keeps the parameters when configureNode rejects an unknown credential', () => {
	const workflow = loadCrm();
	const node = workflow.node('Get customer');
	const definition = workflow.definition.nodes.find(({ name }) => name === 'Get customer');
	const before = structuredClone(definition?.parameters);

	expect(() =>
		configureNode(node, {
			parameters: { url: 'https://staging.example.com/customers/7' },
			credentials: { 'Unknown key': createCredential('httpHeaderAuth', {}) },
		}),
	).toThrow(expect.objectContaining({ code: 'CREDENTIAL_NOT_FOUND' }));
	expect(definition?.parameters).toEqual(before);
});

test('replaces a supplied parameter and keeps the others', async () => {
	nock('https://staging.example.com')
		.get('/customers/7')
		.matchHeader('x-api-key', 'test-key')
		.reply(200, customer);
	const workflow = loadCrm();

	configureNode(workflow.node('Get customer'), {
		parameters: { url: '=https://staging.example.com/customers/{{ 3 + 4 }}' },
	});
	const result = await executeWorkflow(workflow, {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
		},
	});

	expect(result.node('Get customer').output).toEqual([customer]);
});

test('uses a credential from configureNode over the credentials option', async () => {
	nock(crm).get('/customers/42').matchHeader('x-api-key', 'node-key').reply(200, customer);
	const workflow = loadCrm();

	configureNode(workflow.node('Get customer'), {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'node-key' }),
		},
	});
	const result = await executeWorkflow(workflow, {
		credentials: {
			'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
		},
	});

	expect(result.node('Get customer').output).toEqual([customer]);
});

test('redacts the access token of an OAuth2 credential', async () => {
	nock(crm)
		.get('/customers/42')
		.matchHeader('authorization', 'Bearer oauth-token')
		.reply(200, customer);
	const workflow = loadCrm();
	configureNode(workflow.node('Get customer'), { parameters: { genericAuthType: 'oAuth2Api' } });
	const definition = workflow.definition.nodes.find((node) => node.name === 'Get customer')!;
	definition.credentials = { oAuth2Api: { id: 'cred-2', name: 'CRM OAuth' } };

	const result = await executeWorkflow(workflow, {
		credentials: {
			'CRM OAuth': createCredential('oAuth2Api', {
				grantType: 'clientCredentials',
				accessTokenUrl: `${crm}/token`,
				clientId: 'client',
				clientSecret: 'client-secret',
				oauthTokenData: { access_token: 'oauth-token', token_type: 'Bearer' },
			}),
		},
	});

	expect(result.node('Get customer').requests[0].headers.authorization).toBe(
		'Bearer [credential: CRM OAuth.oauthTokenData.access_token]',
	);
});
