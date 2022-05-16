import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { RESPONSE_ERROR_MESSAGES } from '../../src/constants';

import type { Role } from '../../src/databases/entities/Role';
import { CredentialTypes, LoadNodesAndCredentials } from '../../src';
import { LOAD_NODES_AND_CREDS_TEST_TIMEOUT } from './shared/constants';

const SCOPES_ENDPOINT = '/oauth2-credential/scopes';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({
		endpointGroups: ['oauth2-credential'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	utils.initConfigFile();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	utils.initTestLogger();

	const loadNodesAndCredentials = LoadNodesAndCredentials();
	await loadNodesAndCredentials.init();

	const credentialTypes = CredentialTypes();
	await credentialTypes.init(loadNodesAndCredentials.credentialTypes);
}, LOAD_NODES_AND_CREDS_TEST_TIMEOUT);

afterAll(async () => {
	await testDb.terminate(testDbName);
});

describe('OAuth2 scopes', () => {
	beforeEach(async () => {
		await testDb.truncate(['User'], testDbName);
	});

	test(`GET ${SCOPES_ENDPOINT} should return scopes - comma-delimited`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent
			.get(SCOPES_ENDPOINT)
			.query({ credentialType: 'twistOAuth2Api' });

		expect(response.statusCode).toBe(200);

		const scopes = response.body.data;
		const TWIST_OAUTH2_API_SCOPES_TOTAL = 6;

		expect(Array.isArray(scopes)).toBe(true);
		expect(scopes.length).toBe(TWIST_OAUTH2_API_SCOPES_TOTAL);
	});

	test(`GET ${SCOPES_ENDPOINT} should return scopes - whitespace-delimited`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent
			.get(SCOPES_ENDPOINT)
			.query({ credentialType: 'dropboxOAuth2Api' });

		expect(response.statusCode).toBe(200);

		const scopes = response.body.data;
		const DROPBOX_OAUTH2_API_SCOPES_TOTAL = 4;

		expect(Array.isArray(scopes)).toBe(true);
		expect(scopes.length).toBe(DROPBOX_OAUTH2_API_SCOPES_TOTAL);
	});

	test(`GET ${SCOPES_ENDPOINT} should return scope - non-delimited`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent
			.get(SCOPES_ENDPOINT)
			.query({ credentialType: 'harvestOAuth2Api' });

		expect(response.statusCode).toBe(200);

		const scopes = response.body.data;

		expect(Array.isArray(scopes)).toBe(true);
		expect(scopes.length).toBe(1);
	});

	test(`GET ${SCOPES_ENDPOINT} should fail with missing credential type`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent.get(SCOPES_ENDPOINT);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL_TYPE);
	});

	test(`GET ${SCOPES_ENDPOINT} should fail with non-OAuth2 credential type`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent
			.get(SCOPES_ENDPOINT)
			.query({ credentialType: 'disqusApi' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(RESPONSE_ERROR_MESSAGES.CREDENTIAL_TYPE_NOT_OAUTH2);
	});

	test(`GET ${SCOPES_ENDPOINT} should fail with wrong OAuth2 credential type`, async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent
			.get(SCOPES_ENDPOINT)
			.query({ credentialType: 'wrongOAuth2Api' });

		expect(response.statusCode).toBe(500);
		expect(response.body.message).toBe(`${RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL}: wrongOAuth2Api`);
	});
});
