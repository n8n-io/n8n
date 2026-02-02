import { LicenseState } from '@n8n/backend-common';
import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IDataObject } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import type { EventService } from '@/events/event.service';
import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsProviderLifecycle } from '@/modules/external-secrets.ee/provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from '@/modules/external-secrets.ee/provider-registry.service';
import { ExternalSecretsRetryManager } from '@/modules/external-secrets.ee/retry-manager.service';
import { ExternalSecretsSecretsCache } from '@/modules/external-secrets.ee/secrets-cache.service';
import { ExternalSecretsSettingsStore } from '@/modules/external-secrets.ee/settings-store.service';
import type {
	ExternalSecretsSettings,
	SecretsProviderState,
} from '@/modules/external-secrets.ee/types';

import {
	DummyProvider,
	FailedProvider,
	MockProviders,
	TestFailProvider,
} from '../../shared/external-secrets/utils';
import { createOwner, createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';
import { Cipher } from 'n8n-core';
import { SecretsProviderConnectionRepository } from '@n8n/db';

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);
const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

const testServer = setupTestServer({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});

const connectedDate = '2023-08-01T12:32:29.000Z';

async function setExternalSecretsSettings(settings: ExternalSecretsSettings) {
	const settingsStore = Container.get(ExternalSecretsSettingsStore);
	await settingsStore.save(settings);
}

async function getExternalSecretsSettings(): Promise<ExternalSecretsSettings | null> {
	const settingsStore = Container.get(ExternalSecretsSettingsStore);
	return await settingsStore.reload();
}

const eventService = mock<EventService>();

const logger = mockLogger();

const resetManager = async () => {
	Container.get(ExternalSecretsManager).shutdown();

	// Get all service dependencies from Container
	const config = Container.get(ExternalSecretsConfig);
	const settingsStore = Container.get(ExternalSecretsSettingsStore);
	const providerRegistry = Container.get(ExternalSecretsProviderRegistry);
	const providerLifecycle = Container.get(ExternalSecretsProviderLifecycle);
	const retryManager = Container.get(ExternalSecretsRetryManager);
	const secretsCache = Container.get(ExternalSecretsSecretsCache);
	const secretsProviderConnectionRepository = Container.get(SecretsProviderConnectionRepository);
	const cipher = Container.get(Cipher);

	Container.set(
		ExternalSecretsManager,
		new ExternalSecretsManager(
			logger,
			config,
			mockProvidersInstance,
			eventService,
			mock(),
			settingsStore,
			providerRegistry,
			providerLifecycle,
			retryManager,
			secretsCache,
			secretsProviderConnectionRepository,
			cipher,
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

	// Get all service dependencies from Container
	const config = Container.get(ExternalSecretsConfig);
	const settingsStore = Container.get(ExternalSecretsSettingsStore);
	const providerRegistry = Container.get(ExternalSecretsProviderRegistry);
	const providerLifecycle = Container.get(ExternalSecretsProviderLifecycle);
	const retryManager = Container.get(ExternalSecretsRetryManager);
	const secretsCache = Container.get(ExternalSecretsSecretsCache);
	const secretsProviderConnectionRepository = Container.get(SecretsProviderConnectionRepository);
	const cipher = Container.get(Cipher);

	Container.set(
		ExternalSecretsManager,
		new ExternalSecretsManager(
			logger,
			config,
			mockProvidersInstance,
			eventService,
			mock(),
			settingsStore,
			providerRegistry,
			providerLifecycle,
			retryManager,
			secretsCache,
			secretsProviderConnectionRepository,
			cipher,
		),
	);
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

	test('updates are reflected in list of secrets after manual sync', async () => {
		// Baseline: current secrets before any change
		const listBefore = await authOwnerAgent.get('/external-secrets/secrets');
		expect(listBefore.status).toBe(200);
		expect(listBefore.body.data).toEqual({ dummy: ['test1', 'test2'] });

		// Arrange: change what the provider will publish on update()
		const manager = Container.get(ExternalSecretsManager);
		const provider = manager.getProvider('dummy') as unknown as DummyProvider;
		provider._updateSecrets = { rotated: 'new-value' };

		// Act: trigger manual update (as frontend would do)
		const resp = await authOwnerAgent.post('/external-secrets/providers/dummy/update');
		expect(resp.status).toBe(200);

		// Assert: list endpoint reflects freshly updated secrets
		const listAfter = await authOwnerAgent.get('/external-secrets/secrets');
		expect(listAfter.status).toBe(200);
		expect(listAfter.body.data).toEqual({ dummy: ['rotated'] });
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
