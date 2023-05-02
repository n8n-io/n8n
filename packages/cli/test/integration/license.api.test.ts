import type { SuperAgentTest } from 'supertest';
import config from '@/config';
import type { User } from '@db/entities/User';
import type { ILicensePostResponse, ILicenseReadResponse } from '@/Interfaces';
import { License } from '@/License';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils';

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['license'] });

	const globalOwnerRole = await testDb.getGlobalOwnerRole();
	const globalMemberRole = await testDb.getGlobalMemberRole();
	owner = await testDb.createUserShell(globalOwnerRole);
	member = await testDb.createUserShell(globalMemberRole);

	const authAgent = utils.createAuthAgent(app);
	authOwnerAgent = authAgent(owner);
	authMemberAgent = authAgent(member);

	config.set('license.serverUrl', MOCK_SERVER_URL);
	config.set('license.autoRenewEnabled', true);
	config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
});

afterEach(async () => {
	await testDb.truncate(['Settings']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /license', () => {
	test('should return license information to the instance owner', async () => {
		// No license defined so we just expect the result to be the defaults
		await authOwnerAgent.get('/license').expect(200, DEFAULT_LICENSE_RESPONSE);
	});

	test('should return license information to a regular user', async () => {
		// No license defined so we just expect the result to be the defaults
		await authMemberAgent.get('/license').expect(200, DEFAULT_LICENSE_RESPONSE);
	});
});

describe('POST /license/activate', () => {
	test('should work for instance owner', async () => {
		await authOwnerAgent
			.post('/license/activate')
			.send({ activationKey: 'abcde' })
			.expect(200, DEFAULT_POST_RESPONSE);
	});

	test('does not work for regular users', async () => {
		await authMemberAgent
			.post('/license/activate')
			.send({ activationKey: 'abcde' })
			.expect(403, { code: 403, message: NON_OWNER_ACTIVATE_RENEW_MESSAGE });
	});

	test('errors out properly', async () => {
		License.prototype.activate = jest.fn().mockImplementation(() => {
			throw new Error(INVALID_ACIVATION_KEY_MESSAGE);
		});

		await authOwnerAgent
			.post('/license/activate')
			.send({ activationKey: 'abcde' })
			.expect(400, { code: 400, message: INVALID_ACIVATION_KEY_MESSAGE });
	});
});

describe('POST /license/renew', () => {
	test('should work for instance owner', async () => {
		// No license defined so we just expect the result to be the defaults
		await authOwnerAgent.post('/license/renew').expect(200, DEFAULT_POST_RESPONSE);
	});

	test('does not work for regular users', async () => {
		await authMemberAgent
			.post('/license/renew')
			.expect(403, { code: 403, message: NON_OWNER_ACTIVATE_RENEW_MESSAGE });
	});

	test('errors out properly', async () => {
		License.prototype.renew = jest.fn().mockImplementation(() => {
			throw new Error(RENEW_ERROR_MESSAGE);
		});

		await authOwnerAgent
			.post('/license/renew')
			.expect(400, { code: 400, message: RENEW_ERROR_MESSAGE });
	});
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
