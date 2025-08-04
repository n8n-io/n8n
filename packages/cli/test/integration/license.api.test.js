'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const nock_1 = __importDefault(require('nock'));
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const license_1 = require('@/license');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const MOCK_SERVER_URL = 'https://server.com/v1';
let owner;
let member;
let authOwnerAgent;
let authMemberAgent;
const testServer = utils.setupTestServer({ endpointGroups: ['license'] });
beforeAll(async () => {
	owner = await (0, users_1.createUserShell)('global:owner');
	member = await (0, users_1.createUserShell)('global:member');
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	config_1.default.set('license.serverUrl', MOCK_SERVER_URL);
	config_1.default.set('license.autoRenewEnabled', true);
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate(['Settings']);
});
describe('GET /license', () => {
	test('should return license information to the instance owner', async () => {
		await authOwnerAgent.get('/license').expect(200, DEFAULT_LICENSE_RESPONSE);
	});
	test('should return license information to a regular user', async () => {
		await authMemberAgent.get('/license').expect(200, DEFAULT_LICENSE_RESPONSE);
	});
});
describe('POST /license/enterprise/request_trial', () => {
	(0, nock_1.default)('https://enterprise.n8n.io').post('/enterprise-trial').reply(200);
	test('should work for instance owner', async () => {
		await authOwnerAgent.post('/license/enterprise/request_trial').expect(200);
	});
	test('does not work for regular users', async () => {
		await authMemberAgent
			.post('/license/enterprise/request_trial')
			.expect(403, { status: 'error', message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
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
			.expect(403, { status: 'error', message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
	});
	test('errors out properly', async () => {
		license_1.License.prototype.activate = jest.fn().mockImplementation(() => {
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
		await authOwnerAgent.post('/license/renew').expect(200, DEFAULT_POST_RESPONSE);
	});
	test('does not work for regular users', async () => {
		await authMemberAgent
			.post('/license/renew')
			.expect(403, { status: 'error', message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
	});
	test('errors out properly', async () => {
		license_1.License.prototype.getPlanName = jest.fn().mockReturnValue('Enterprise');
		license_1.License.prototype.renew = jest.fn().mockImplementation(() => {
			throw new Error(GENERIC_ERROR_MESSAGE);
		});
		await authOwnerAgent
			.post('/license/renew')
			.expect(400, { code: 400, message: `Failed to renew license: ${GENERIC_ERROR_MESSAGE}` });
	});
});
const DEFAULT_LICENSE_RESPONSE = {
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
const DEFAULT_POST_RESPONSE = {
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
//# sourceMappingURL=license.api.test.js.map
