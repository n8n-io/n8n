jest.mock('@n8n/instance-ai', () => ({
	BuilderSandboxFactory: class {},
	BuilderSandboxSessionRegistry: class {
		cleanupThread = jest.fn();
		cleanupAll = jest.fn();
	},
	createSandbox: jest.fn(),
	createWorkspace: jest.fn(),
	SnapshotManager: class {},
}));

import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { createSandbox } from '@n8n/instance-ai';

import { InstanceAiSandboxService } from '../sandbox/instance-ai-sandbox.service';

const fakeUser = { id: 'user-1' } as User;

function makeConfig(overrides: Partial<InstanceAiConfig> = {}): InstanceAiConfig {
	return {
		builderSandboxTtlMs: 1000,
		sandboxEnabled: false,
		sandboxProvider: 'local',
		sandboxTimeout: 300_000,
		daytonaApiUrl: '',
		daytonaApiKey: '',
		n8nSandboxServiceUrl: '',
		n8nSandboxServiceApiKey: '',
		sandboxImage: '',
		...overrides,
	} as InstanceAiConfig;
}

function createSandboxService(config: InstanceAiConfig) {
	const client = {
		getSandboxProxyConfig: jest.fn(async () => ({ image: 'proxy-image' })),
		getSandboxProxyBaseUrl: jest.fn(() => 'https://proxy.example/sandbox'),
		getBuilderApiProxyToken: jest.fn(async () => ({
			tokenType: 'Bearer',
			accessToken: 'proxy-token',
		})),
	};
	const deps = {
		instanceAiConfig: config,
		aiService: {
			isProxyEnabled: jest.fn(() => false),
			getClient: jest.fn(async () => client),
		},
		settingsService: {
			resolveDaytonaConfig: jest.fn(async () => ({
				apiUrl: 'https://daytona.example',
				apiKey: 'daytona-key',
			})),
			resolveN8nSandboxConfig: jest.fn(async () => ({
				serviceUrl: 'https://sandbox.example',
				apiKey: 'sandbox-key',
			})),
		},
		logger: { warn: jest.fn() },
		errorReporter: {},
	};

	return { service: new InstanceAiSandboxService(deps as never), deps, client };
}

describe('InstanceAiSandboxService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not create a workspace when sandboxing is disabled', async () => {
		const { service } = createSandboxService(makeConfig({ sandboxEnabled: false }));

		await expect(service.getOrCreateWorkspace('thread-a', fakeUser)).resolves.toBeUndefined();

		expect(createSandbox).not.toHaveBeenCalled();
	});

	it('routes Daytona sandbox config through the AI service proxy when enabled', async () => {
		const { service, deps, client } = createSandboxService(
			makeConfig({ sandboxEnabled: true, sandboxProvider: 'daytona' }),
		);
		deps.aiService.isProxyEnabled.mockReturnValue(true);

		const config = await service.resolveSandboxConfig(fakeUser);

		expect(config).toMatchObject({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example/sandbox',
			image: 'proxy-image',
		});
		if (!('getAuthToken' in config) || !config.getAuthToken) {
			throw new Error('Expected proxied Daytona config to expose getAuthToken');
		}
		await expect(config.getAuthToken()).resolves.toBe('proxy-token');
		expect(client.getBuilderApiProxyToken).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ userMessageId: expect.any(String) },
		);
		expect(deps.settingsService.resolveDaytonaConfig).not.toHaveBeenCalled();
	});
});
