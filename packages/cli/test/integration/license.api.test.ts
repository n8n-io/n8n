import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import nock from 'nock';

import config from '@/config';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import type { ILicensePostResponse, ILicenseReadResponse } from '@/interfaces';
import { License } from '@/license';

import { createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const MOCK_SERVER_URL = 'https://server.com/v1';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['license'] });

beforeAll(async () => {
	owner = await createUserShell('global:owner');
	member = await createUserShell('global:member');

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	config.set('license.serverUrl', MOCK_SERVER_URL);
	config.set('license.autoRenewEnabled', true);
});

afterEach(async () => {
	await testDb.truncate(['Settings']);
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

describe('POST /license/enterprise/request_trial', () => {
	nock('https://enterprise.n8n.io').post('/enterprise-trial').reply(200);

	test('should work for instance owner', async () => {
		await authOwnerAgent.post('/license/enterprise/request_trial').expect(200);
	});

	test('does not work for regular users', async () => {
		await authMemberAgent
			.post('/license/enterprise/request_trial')
			.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
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
			.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
	});

	test('errors out properly', async () => {
		License.prototype.activate = jest.fn().mockImplementation(() => {
			throw new Error('some fake error');
		});

		await authOwnerAgent
			.post('/license/activate')
			.send({ activationKey: 'abcde' })
			.expect(400, { code: 400, message: `${ACTIVATION_FAILED_MESSAGE}: some fake error` });
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
			.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
	});

	test('errors out properly', async () => {
		License.prototype.getPlanName = jest.fn().mockReturnValue('Enterprise');
		License.prototype.renew = jest.fn().mockImplementation(() => {
			throw new Error(GENERIC_ERROR_MESSAGE);
		});

		await authOwnerAgent
			.post('/license/renew')
			.expect(400, { code: 400, message: `Failed to renew license: ${GENERIC_ERROR_MESSAGE}` });
	});
});

const DEFAULT_LICENSE_RESPONSE: { data: ILicenseReadResponse } = {
	data: {
		usage: {
			activeWorkflowTriggers: {
				value: 0,
				limit: -1,
				warningThreshold: 0.8,
			},
			workflowsHavingEvaluations: {
				value: 0,
				limit: 0,
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
			activeWorkflowTriggers: {
				value: 0,
				limit: -1,
				warningThreshold: 0.8,
			},
			workflowsHavingEvaluations: {
				value: 0,
				limit: 0,
			},
		},
		license: {
			planId: '',
			planName: 'Community',
		},
		managementToken: '',
	},
};

const ACTIVATION_FAILED_MESSAGE = 'Failed to activate license';
const GENERIC_ERROR_MESSAGE = 'Something went wrong';
