import express from 'express';

import config from '@/config';
import type { Role } from '@db/entities/Role';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';
import { ILicensePostResponse, ILicenseReadResponse } from '@/Interfaces';
import { LicenseManager } from '@n8n_io/license-sdk';
import { License } from '@/License';

jest.mock('@/telemetry');
jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_N8N_VERSION = '0.27.0';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;
let license: License;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['license'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();

	config.set('license.serverUrl', MOCK_SERVER_URL);
	config.set('license.autoRenewEnabled', true);
	config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
});

beforeEach(async () => {
	license = new License();
	await license.init(MOCK_INSTANCE_ID, MOCK_N8N_VERSION);
});

afterEach(async () => {
	await testDb.truncate(['Settings'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /license should return license information to the instance owner', async () => {
	const userShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(userShell).get('/license');

	expect(response.statusCode).toBe(200);

	// No license defined so we just expect the result to be the defaults
	expect(response.body).toStrictEqual(DEFAULT_LICENSE_RESPONSE);
});

test('GET /license should return license information to a regular user', async () => {
	const userShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(userShell).get('/license');

	expect(response.statusCode).toBe(200);

	// No license defined so we just expect the result to be the defaults
	expect(response.body).toStrictEqual(DEFAULT_LICENSE_RESPONSE);
});

test('POST /license/activate should work for instance owner', async () => {
	const userShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(userShell)
		.post('/license/activate')
		.send({ activationKey: 'abcde' });

	expect(response.statusCode).toBe(200);

	// No license defined so we just expect the result to be the defaults
	expect(response.body).toMatchObject(DEFAULT_POST_RESPONSE);
});

test('POST /license/activate does not work for regular users', async () => {
	const userShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(userShell)
		.post('/license/activate')
		.send({ activationKey: 'abcde' });

	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe(NON_OWNER_ACTIVATE_RENEW_MESSAGE);
});

test('POST /license/activate errors out properly', async () => {
	License.prototype.activate = jest.fn().mockImplementation(() => {
		throw new Error(INVALID_ACIVATION_KEY_MESSAGE);
	});

	const userShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(userShell)
		.post('/license/activate')
		.send({ activationKey: 'abcde' });

	expect(response.statusCode).toBe(400);
	expect(response.body.message).toBe(INVALID_ACIVATION_KEY_MESSAGE);
});

test('POST /license/renew should work for instance owner', async () => {
	const userShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(userShell).post('/license/renew');

	expect(response.statusCode).toBe(200);

	// No license defined so we just expect the result to be the defaults
	expect(response.body).toMatchObject(DEFAULT_POST_RESPONSE);
});

test('POST /license/renew does not work for regular users', async () => {
	const userShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(userShell).post('/license/renew');

	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe(NON_OWNER_ACTIVATE_RENEW_MESSAGE);
});

test('POST /license/renew errors out properly', async () => {
	License.prototype.renew = jest.fn().mockImplementation(() => {
		throw new Error(RENEW_ERROR_MESSAGE);
	});

	const userShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(userShell).post('/license/renew');

	expect(response.statusCode).toBe(400);
	expect(response.body.message).toBe(RENEW_ERROR_MESSAGE);
});

const DEFAULT_LICENSE_RESPONSE: { data: ILicenseReadResponse } = {
	data: {
		usage: {
			executions: {
				value: 0,
				limit: -1,
				warningThreshold: 0.8,
			},
		},
		license: {
			planId: '',
			planName: 'Community',
		},
	},
};

const DEFAULT_POST_RESPONSE: { data: ILicensePostResponse } = {
	data: {
		usage: {
			executions: {
				value: 0,
				limit: -1,
				warningThreshold: 0.8,
			},
		},
		license: {
			planId: '',
			planName: 'Community',
		},
		managementToken: '',
	},
};

const NON_OWNER_ACTIVATE_RENEW_MESSAGE = 'Only an instance owner may activate or renew a license';
const INVALID_ACIVATION_KEY_MESSAGE = 'Invalid activation key';
const RENEW_ERROR_MESSAGE = 'Something went wrong when trying to renew license';
