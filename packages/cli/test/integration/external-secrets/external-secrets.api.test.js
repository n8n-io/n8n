'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const license_1 = require('@/license');
const external_secrets_manager_ee_1 = require('@/modules/external-secrets.ee/external-secrets-manager.ee');
const external_secrets_providers_ee_1 = require('@/modules/external-secrets.ee/external-secrets-providers.ee');
const utils_1 = require('../../shared/external-secrets/utils');
const users_1 = require('../shared/db/users');
const utils_2 = require('../shared/utils');
let authOwnerAgent;
let authMemberAgent;
const mockProvidersInstance = new utils_1.MockProviders();
(0, backend_test_utils_1.mockInstance)(
	external_secrets_providers_ee_1.ExternalSecretsProviders,
	mockProvidersInstance,
);
const licenseMock = (0, jest_mock_extended_1.mock)();
licenseMock.isLicensed.mockReturnValue(true);
di_1.Container.set(backend_common_1.LicenseState, licenseMock);
const testServer = (0, utils_2.setupTestServer)({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});
const connectedDate = '2023-08-01T12:32:29.000Z';
async function setExternalSecretsSettings(settings) {
	await di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).saveAndSetSettings(
		settings,
	);
}
async function getExternalSecretsSettings() {
	return await di_1.Container.get(
		external_secrets_manager_ee_1.ExternalSecretsManager,
	).getDecryptedSettings();
}
const eventService = (0, jest_mock_extended_1.mock)();
const logger = (0, backend_test_utils_1.mockLogger)();
const resetManager = async () => {
	di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).shutdown();
	di_1.Container.set(
		external_secrets_manager_ee_1.ExternalSecretsManager,
		new external_secrets_manager_ee_1.ExternalSecretsManager(
			logger,
			(0, jest_mock_extended_1.mock)(),
			di_1.Container.get(db_1.SettingsRepository),
			di_1.Container.get(license_1.License),
			mockProvidersInstance,
			di_1.Container.get(n8n_core_1.Cipher),
			eventService,
			(0, jest_mock_extended_1.mock)(),
		),
	);
	await di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).init();
};
const getDummyProviderData = ({
	data,
	includeProperties,
	connected,
	state,
	connectedAt,
	displayName,
} = {}) => {
	const dummy = {
		connected: connected ?? true,
		connectedAt: connectedAt === undefined ? connectedDate : connectedAt,
		data: data ?? {},
		name: 'dummy',
		displayName: displayName ?? 'Dummy Provider',
		icon: 'dummy',
		state: state ?? 'connected',
	};
	if (includeProperties) {
		dummy.properties = new utils_1.DummyProvider().properties;
	}
	return dummy;
};
beforeAll(async () => {
	const owner = await (0, users_1.createOwner)();
	authOwnerAgent = testServer.authAgentFor(owner);
	const member = await (0, users_1.createUser)();
	authMemberAgent = testServer.authAgentFor(member);
	config_1.default.set('userManagement.isInstanceOwnerSetUp', true);
	di_1.Container.set(
		external_secrets_manager_ee_1.ExternalSecretsManager,
		new external_secrets_manager_ee_1.ExternalSecretsManager(
			logger,
			(0, jest_mock_extended_1.mock)(),
			di_1.Container.get(db_1.SettingsRepository),
			di_1.Container.get(license_1.License),
			mockProvidersInstance,
			di_1.Container.get(n8n_core_1.Cipher),
			eventService,
			(0, jest_mock_extended_1.mock)(),
		),
	);
});
beforeEach(async () => {
	mockProvidersInstance.setProviders({
		dummy: utils_1.DummyProvider,
	});
	await setExternalSecretsSettings({
		dummy: {
			connected: true,
			connectedAt: new Date(connectedDate),
			settings: {},
		},
	});
	await resetManager();
});
afterEach(async () => {
	di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).shutdown();
});
describe('GET /external-secrets/providers', () => {
	test('can retrieve providers as owner', async () => {
		const resp = await authOwnerAgent.get('/external-secrets/providers');
		expect(resp.body).toEqual({
			data: [getDummyProviderData()],
		});
	});
	test('can not retrieve providers as non-owner', async () => {
		const resp = await authMemberAgent.get('/external-secrets/providers');
		expect(resp.status).toBe(403);
	});
	test('does obscure passwords', async () => {
		await setExternalSecretsSettings({
			dummy: {
				connected: true,
				connectedAt: new Date(connectedDate),
				settings: {
					username: 'testuser',
					password: 'testpass',
				},
			},
		});
		await resetManager();
		const resp = await authOwnerAgent.get('/external-secrets/providers');
		expect(resp.body).toEqual({
			data: [
				getDummyProviderData({
					data: {
						username: 'testuser',
						password: constants_1.CREDENTIAL_BLANKING_VALUE,
					},
				}),
			],
		});
	});
});
describe('GET /external-secrets/providers/:provider', () => {
	test('can retrieve provider as owner', async () => {
		const resp = await authOwnerAgent.get('/external-secrets/providers/dummy');
		expect(resp.body.data).toEqual(getDummyProviderData({ includeProperties: true }));
	});
	test('can not retrieve provider as non-owner', async () => {
		const resp = await authMemberAgent.get('/external-secrets/providers/dummy');
		expect(resp.status).toBe(403);
	});
	test('does obscure passwords', async () => {
		await setExternalSecretsSettings({
			dummy: {
				connected: true,
				connectedAt: new Date(connectedDate),
				settings: {
					username: 'testuser',
					password: 'testpass',
				},
			},
		});
		await resetManager();
		const resp = await authOwnerAgent.get('/external-secrets/providers/dummy');
		expect(resp.body.data).toEqual(
			getDummyProviderData({
				data: {
					username: 'testuser',
					password: constants_1.CREDENTIAL_BLANKING_VALUE,
				},
				includeProperties: true,
			}),
		);
	});
});
describe('POST /external-secrets/providers/:provider', () => {
	test('can update provider settings', async () => {
		const testData = {
			username: 'testuser',
			other: 'testother',
		};
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy').send(testData);
		expect(resp.status).toBe(200);
		const confirmResp = await authOwnerAgent.get('/external-secrets/providers/dummy');
		expect(confirmResp.body.data).toEqual(
			getDummyProviderData({ data: testData, includeProperties: true }),
		);
	});
	test('can update provider settings with blanking value', async () => {
		await setExternalSecretsSettings({
			dummy: {
				connected: true,
				connectedAt: new Date(connectedDate),
				settings: {
					username: 'testuser',
					password: 'testpass',
				},
			},
		});
		await resetManager();
		const testData = {
			username: 'newuser',
			password: constants_1.CREDENTIAL_BLANKING_VALUE,
		};
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy').send(testData);
		expect(resp.status).toBe(200);
		await authOwnerAgent.get('/external-secrets/providers/dummy');
		expect((await getExternalSecretsSettings())?.dummy.settings).toEqual({
			username: 'newuser',
			password: 'testpass',
		});
	});
});
describe('POST /external-secrets/providers/:provider/connect', () => {
	test('can change provider connected state', async () => {
		const testData = {
			connected: false,
		};
		const resp = await authOwnerAgent
			.post('/external-secrets/providers/dummy/connect')
			.send(testData);
		expect(resp.status).toBe(200);
		const confirmResp = await authOwnerAgent.get('/external-secrets/providers/dummy');
		expect(confirmResp.body.data).toEqual(
			getDummyProviderData({
				includeProperties: true,
				connected: false,
				state: 'initializing',
			}),
		);
	});
});
describe('POST /external-secrets/providers/:provider/test', () => {
	test('can test provider', async () => {
		const testData = {
			username: 'testuser',
			other: 'testother',
		};
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/test').send(testData);
		expect(resp.status).toBe(200);
		expect(resp.body.data.success).toBe(true);
		expect(resp.body.data.testState).toBe('connected');
	});
	test('can test provider fail', async () => {
		mockProvidersInstance.setProviders({
			dummy: utils_1.TestFailProvider,
		});
		await resetManager();
		const testData = {
			username: 'testuser',
			other: 'testother',
		};
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/test').send(testData);
		expect(resp.status).toBe(400);
		expect(resp.body.data.success).toBe(false);
		expect(resp.body.data.testState).toBe('error');
	});
});
describe('POST /external-secrets/providers/:provider/update', () => {
	test('can update provider', async () => {
		const updateSpy = jest.spyOn(
			di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).getProvider('dummy'),
			'update',
		);
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({ updated: true });
		expect(updateSpy).toBeCalled();
	});
	test('can not update errored provider', async () => {
		mockProvidersInstance.setProviders({
			dummy: utils_1.FailedProvider,
		});
		await resetManager();
		const updateSpy = jest.spyOn(
			di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).getProvider('dummy'),
			'update',
		);
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(400);
		expect(resp.body.data).toEqual({ updated: false });
		expect(updateSpy).not.toBeCalled();
	});
	test('can not update provider without a valid license', async () => {
		const updateSpy = jest.spyOn(
			di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager).getProvider('dummy'),
			'update',
		);
		testServer.license.disable('feat:externalSecrets');
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(400);
		expect(resp.body.data).toEqual({ updated: false });
		expect(updateSpy).not.toBeCalled();
	});
});
describe('GET /external-secrets/secrets', () => {
	test('can get secret names as owner', async () => {
		const resp = await authOwnerAgent.get('/external-secrets/secrets');
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({
			dummy: ['test1', 'test2'],
		});
	});
	test('can not get secret names as non-owner', async () => {
		const resp = await authMemberAgent.get('/external-secrets/secrets');
		expect(resp.status).toBe(403);
		expect(resp.body.data).not.toEqual({
			dummy: ['test1', 'test2'],
		});
	});
});
//# sourceMappingURL=external-secrets.api.test.js.map
