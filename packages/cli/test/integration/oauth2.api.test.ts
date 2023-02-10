import express from 'express';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';
import { CredentialsHelper } from '@/CredentialsHelper';
import { Role } from '@/databases/entities/Role';
import Csrf from 'csrf';

let app: express.Application;
let authAgent: AuthAgent;
let globalOwnerRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['oauth2', 'credentials'] });
	utils.initConfigFile();
	globalOwnerRole = await testDb.getGlobalOwnerRole();
	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials']);

	jest.mock('@/config');
});

afterAll(async () => {
	await testDb.terminate();
});

test('GET /oauth2-credential/auth should fail due to empty credential ID', async () => {
	const owner = await testDb.createOwner();

	const response = await authAgent(owner).get('/oauth2-credential/auth');

	expect(response.statusCode).toBe(400);
});

test('GET /oauth2-credential/auth should fail due to unauthorized credential ID', async () => {
	const owner = await testDb.createOwner();

	const member = await testDb.createUser();

	const newCredentialsData = {
		id: '',
		name: 'Notion account',
		type: 'notionApi',
		nodesAccess: [],
		data: {
			apiKey: '',
		},
	};

	const {
		body: {
			data: { id },
		},
	} = await authAgent(owner).post('/credentials').send(newCredentialsData);

	const response = await authAgent(member).get('/oauth2-credential/auth').query({ id });

	expect(response.statusCode).toBe(404);
});

test('GET /oauth2-credential/auth should return authentication URL', async () => {
	const owner = await testDb.createOwner();

	const mockCredentialOverride = {
		clientId: 'rr',
		clientSecret: '12121',
		grantType: 'authorizationCode',
		authUrl: 'https://slack.com/oauth/v2/authorize',
		accessTokenUrl: 'https://slack.com/api/oauth.v2.access',
		scope: 'chat:write',
		authentication: 'body',
		authQueryParameters:
			'user_scope=channels:read channels:write chat:write files:read files:write groups:read im:read mpim:read reactions:read reactions:write stars:read stars:write usergroups:write usergroups:read users.profile:read users.profile:write users:read',
		oauthTokenData: {},
		user_scope: '',
	};

	jest
		.spyOn(CredentialsHelper.prototype, 'applyDefaultsAndOverwrites')
		.mockImplementation(() => mockCredentialOverride);

	const newCredentialsData = {
		id: '',
		name: 'Slack account2',
		type: 'slackOAuth2Api',
		nodesAccess: [],
		data: {
			clientId: mockCredentialOverride.clientId,
			clientSecret: mockCredentialOverride.clientSecret,
		},
	};

	const {
		body: {
			data: { id, name },
		},
	} = await authAgent(owner).post('/credentials').send(newCredentialsData);

	const response = await authAgent(owner)
		.get('/oauth2-credential/auth')
		.query({ id, clientId: newCredentialsData.data.clientId });

	const {
		body: { data },
	}: { body: { data: string } } = response;

	const dataDecoded = new URL(data);

	expect(response.statusCode).toBe(200);
	expect(dataDecoded.searchParams.get('client_id')).toBe(mockCredentialOverride.clientId);
	expect(dataDecoded.searchParams.has('redirect_uri')).toBe(true);
	expect(dataDecoded.searchParams.has('state')).toBe(true);
	expect(dataDecoded.searchParams.get('scope')).toBe(mockCredentialOverride.scope);
});

test('GET /oauth2-credential/callback should fail due to missing code parameter', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.get('/oauth2-credential/callback').query({ state: '' });

	expect(response.statusCode).toBe(503);
});

test('GET /oauth2-credential/callback should fail due to missing state parameter', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.get('/oauth2-credential/callback').query({ code: '' });

	expect(response.statusCode).toBe(503);
});

test('GET /oauth2-credential/callback should fail due to invalid state parameter', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent
		.get('/oauth2-credential/callback')
		.query({ code: 'test', state: 'test' });

	expect(response.statusCode).toBe(503);
});

test('GET /oauth2-credential/callback should fail due to invalid credential ID in the state', async () => {
	const authlessAgent = utils.createAgent(app);

	const state = Buffer.from(
		JSON.stringify({
			cid: '10',
		}),
	).toString('base64');

	const response = await authlessAgent
		.get('/oauth2-credential/callback')
		.query({ code: 'test', state });

	expect(response.statusCode).toBe(404);
});

test.only('GET /oauth2-credential/callback should fail due to invalid credential ID in the state', async () => {
	const authlessAgent = utils.createAgent(app);

	const owner = await testDb.createOwner();

	const mockCredentialOverride = {
		clientId: 'rr',
		clientSecret: '12121',
		grantType: 'authorizationCode',
		authUrl: 'https://slack.com/oauth/v2/authorize',
		accessTokenUrl: 'https://slack.com/api/oauth.v2.access',
		scope: 'chat:write',
		authentication: 'body',
		authQueryParameters:
			'user_scope=channels:read channels:write chat:write files:read files:write groups:read im:read mpim:read reactions:read reactions:write stars:read stars:write usergroups:write usergroups:read users.profile:read users.profile:write users:read',
		oauthTokenData: {},
		user_scope: '',
	};

	jest
		.spyOn(CredentialsHelper.prototype, 'applyDefaultsAndOverwrites')
		.mockImplementation(() => mockCredentialOverride);

	const newCredentialsData = {
		id: '',
		name: 'Slack account2',
		type: 'slackOAuth2Api',
		nodesAccess: [],
		data: {
			clientId: mockCredentialOverride.clientId,
			clientSecret: mockCredentialOverride.clientSecret,
		},
	};

	const {
		body: {
			data: { id, name },
		},
	} = await authAgent(owner).post('/credentials').send(newCredentialsData);

	console.log(id);

	const token = new Csrf();

	const csrfSecret = token.secretSync();

	const state = Buffer.from(
		JSON.stringify({
			cid: id,
			token: token.create(csrfSecret),
		}),
	).toString('base64');

	const response = await authlessAgent
		.get('/oauth2-credential/callback')
		.query({ code: 'test', state });

		console.log(response.body)

	expect(response.statusCode).toBe(404);
});
