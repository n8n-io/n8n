import { Container } from 'typedi';
import { Cipher } from 'n8n-core';
import { jsonParse, type IDataObject } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { License } from '@/License';
import type { ExternalSecretsSettings, SecretsProviderState } from '@/Interfaces';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { ExternalSecretsProviders } from '@/ExternalSecrets/ExternalSecretsProviders.ee';
import config from '@/config';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

import { mockInstance } from '../../shared/mocking';
import { setupTestServer } from '../shared/utils';
import { createOwner, createUser } from '../shared/db/users';
import {
	DummyProvider,
	FailedProvider,
	MockProviders,
	TestFailProvider,
} from '../../shared/ExternalSecrets/utils';
import type { SuperAgentTest } from '../shared/types';

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const testServer = setupTestServer({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
});

const connectedDate = '2023-08-01T12:32:29.000Z';

async function setExternalSecretsSettings(settings: ExternalSecretsSettings) {
	return await Container.get(SettingsRepository).saveEncryptedSecretsProviderSettings(
		Container.get(Cipher).encrypt(settings),
	);
}

async function getExternalSecretsSettings(): Promise<ExternalSecretsSettings | null> {
	const encSettings = await Container.get(SettingsRepository).getEncryptedSecretsProviderSettings();
	if (encSettings === null) {
		return null;
	}
	return await jsonParse(Container.get(Cipher).decrypt(encSettings));
}

const resetManager = async () => {
	Container.get(ExternalSecretsManager).shutdown();
	Container.set(
		ExternalSecretsManager,
		new ExternalSecretsManager(
			mock(),
			Container.get(SettingsRepository),
			Container.get(License),
			mockProvidersInstance,
			Container.get(Cipher),
		),
	);

	await Container.get(ExternalSecretsManager).init();
};

const getDummyProviderData = ({
	data,
	includeProperties,
	connected,
	state,
	connectedAt,
	displayName,
}: {
	data?: IDataObject;
	includeProperties?: boolean;
	connected?: boolean;
	state?: SecretsProviderState;
	connectedAt?: string | null;
	displayName?: string;
} = {}) => {
	const dummy: IDataObject = {
		connected: connected ?? true,
		connectedAt: connectedAt === undefined ? connectedDate : connectedAt,
		data: data ?? {},
		name: 'dummy',
		displayName: displayName ?? 'Dummy Provider',
		icon: 'dummy',
		state: state ?? 'connected',
	};

	if (includeProperties) {
		dummy.properties = new DummyProvider().properties;
	}

	return dummy;
};

beforeAll(async () => {
	const owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	const member = await createUser();
	authMemberAgent = testServer.authAgentFor(member);
	config.set('userManagement.isInstanceOwnerSetUp', true);
});

beforeEach(async () => {
	mockProvidersInstance.setProviders({
		dummy: DummyProvider,
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
	Container.get(ExternalSecretsManager).shutdown();
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
						password: CREDENTIAL_BLANKING_VALUE,
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
					password: CREDENTIAL_BLANKING_VALUE,
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
			password: CREDENTIAL_BLANKING_VALUE,
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
			dummy: TestFailProvider,
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
			Container.get(ExternalSecretsManager).getProvider('dummy')!,
			'update',
		);

		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({ updated: true });
		expect(updateSpy).toBeCalled();
	});

	test('can not update errored provider', async () => {
		mockProvidersInstance.setProviders({
			dummy: FailedProvider,
		});

		await resetManager();

		const updateSpy = jest.spyOn(
			Container.get(ExternalSecretsManager).getProvider('dummy')!,
			'update',
		);

		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(400);
		expect(resp.body.data).toEqual({ updated: false });
		expect(updateSpy).not.toBeCalled();
	});

	test('can not update provider without a valid license', async () => {
		const updateSpy = jest.spyOn(
			Container.get(ExternalSecretsManager).getProvider('dummy')!,
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
