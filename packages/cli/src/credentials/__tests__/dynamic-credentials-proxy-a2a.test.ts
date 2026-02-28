import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IExecutionContext } from 'n8n-workflow';

import type {
	CredentialResolveMetadata,
	ICredentialResolutionProvider,
} from '../credential-resolution-provider.interface';
import { DynamicCredentialsProxy } from '../dynamic-credentials-proxy';

// ── Helpers ─────────────────────────────────────────────────────────

function createProxy(logger: jest.Mocked<Logger>) {
	return new DynamicCredentialsProxy(logger);
}

function createLogger(): jest.Mocked<Logger> {
	return {
		warn: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
	} as unknown as jest.Mocked<Logger>;
}

function createMockCipher(decryptReturn: string) {
	return { decrypt: jest.fn().mockReturnValue(decryptReturn) } as unknown as Cipher;
}

function createA2ACredentialContext(workflowCredentials?: Record<string, Record<string, string>>) {
	return JSON.stringify({
		version: 1,
		identity: 'agent-consumer-123',
		metadata: {
			source: 'agent-a2a',
			workflowCredentials,
		},
	});
}

function createA2AExecutionContext(encryptedCreds = 'encrypted-a2a'): IExecutionContext {
	return {
		version: 1,
		establishedAt: Date.now(),
		source: 'webhook' as const,
		credentials: encryptedCreds,
	};
}

function createMetadata(
	overrides: Partial<CredentialResolveMetadata> = {},
): CredentialResolveMetadata {
	return {
		id: 'cred-123',
		name: 'Test Credential',
		type: 'slackApi',
		isResolvable: false,
		resolvableAllowFallback: false,
		...overrides,
	};
}

const staticData: ICredentialDataDecryptedObject = { baseUrl: 'https://slack.com' };

// ── Tests ───────────────────────────────────────────────────────────

describe('DynamicCredentialsProxy — A2A inline resolution', () => {
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockLogger = createLogger();
	});

	it('should merge BYOK credentials with static data for A2A context', async () => {
		const cipher = createMockCipher(
			createA2ACredentialContext({ slackApi: { token: 'consumer-slack-token' } }),
		);
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata(),
			staticData,
			createA2AExecutionContext(),
		);

		expect(result).toEqual({ baseUrl: 'https://slack.com', token: 'consumer-slack-token' });
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'A2A proxy: injecting inline BYOK credentials',
			expect.objectContaining({ credentialType: 'slackApi' }),
		);
	});

	it('should return BYOK credentials even when resolvingProvider is NOT set (no EE module)', async () => {
		const cipher = createMockCipher(
			createA2ACredentialContext({ slackApi: { token: 'byok-token' } }),
		);
		Container.set(Cipher, cipher);

		// No setResolverProvider() call — simulates unlicensed instance
		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata(),
			staticData,
			createA2AExecutionContext(),
		);

		expect(result).toEqual({ baseUrl: 'https://slack.com', token: 'byok-token' });
	});

	it('should fall back to static data when A2A has no BYOK for requested type and resolvableAllowFallback is true', async () => {
		const cipher = createMockCipher(
			createA2ACredentialContext({ notionApi: { apiKey: 'notion-key' } }),
		);
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata({ resolvableAllowFallback: true }),
			staticData,
			createA2AExecutionContext(),
		);

		expect(result).toEqual(staticData);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'A2A proxy: no BYOK for type, falling back to static',
			expect.objectContaining({ credentialType: 'slackApi' }),
		);
	});

	it('should throw when A2A has no BYOK for requested type and resolvableAllowFallback is false', async () => {
		const cipher = createMockCipher(createA2ACredentialContext({}));
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);

		await expect(
			proxy.resolveIfNeeded(
				createMetadata({ resolvableAllowFallback: false }),
				staticData,
				createA2AExecutionContext(),
			),
		).rejects.toThrow('A2A credential resolution failed');
	});

	it('should resolve BYOK even when isResolvable is false (bypasses EE gate)', async () => {
		const cipher = createMockCipher(
			createA2ACredentialContext({ slackApi: { token: 'byok-token' } }),
		);
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata({ isResolvable: false }),
			staticData,
			createA2AExecutionContext(),
		);

		expect(result).toEqual({ baseUrl: 'https://slack.com', token: 'byok-token' });
	});

	it('should delegate to resolvingProvider for non-A2A context', async () => {
		const normalContext = JSON.stringify({
			version: 1,
			identity: 'user-789',
			metadata: {},
		});
		const cipher = createMockCipher(normalContext);
		Container.set(Cipher, cipher);

		const mockProvider: jest.Mocked<ICredentialResolutionProvider> = {
			resolveIfNeeded: jest.fn().mockResolvedValue({ token: 'ee-resolved' }),
		};

		const proxy = createProxy(mockLogger);
		proxy.setResolverProvider(mockProvider);

		const executionContext = createA2AExecutionContext();
		const result = await proxy.resolveIfNeeded(
			createMetadata({ isResolvable: true }),
			staticData,
			executionContext,
		);

		expect(result).toEqual({ token: 'ee-resolved' });
		expect(mockProvider.resolveIfNeeded).toHaveBeenCalledWith(
			expect.anything(),
			staticData,
			executionContext,
			undefined,
			undefined,
		);
	});

	it('should return static data when no resolvingProvider and isResolvable is false for non-A2A context', async () => {
		// Non-A2A context but no EE module
		const normalContext = JSON.stringify({
			version: 1,
			identity: 'user-789',
			metadata: {},
		});
		const cipher = createMockCipher(normalContext);
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata({ isResolvable: false }),
			staticData,
			createA2AExecutionContext(),
		);

		expect(result).toEqual(staticData);
	});

	it('should resolve different credential types independently from same A2A context', async () => {
		const cipher = createMockCipher(
			createA2ACredentialContext({
				slackApi: { token: 'slack-token' },
				notionApi: { apiKey: 'notion-key' },
			}),
		);
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const execCtx = createA2AExecutionContext();

		const slackResult = await proxy.resolveIfNeeded(
			createMetadata({ id: 'cred-slack', type: 'slackApi' }),
			{ baseUrl: 'https://slack.com' },
			execCtx,
		);

		const notionResult = await proxy.resolveIfNeeded(
			createMetadata({ id: 'cred-notion', type: 'notionApi' }),
			{ baseUrl: 'https://notion.so' },
			execCtx,
		);

		expect(slackResult).toEqual({ baseUrl: 'https://slack.com', token: 'slack-token' });
		expect(notionResult).toEqual({ baseUrl: 'https://notion.so', apiKey: 'notion-key' });
	});

	it('should return static data when no execution context is provided (no crash)', async () => {
		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(createMetadata(), staticData);

		expect(result).toEqual(staticData);
	});

	it('should return static data when cipher decrypt fails (graceful degradation)', async () => {
		const cipher = {
			decrypt: jest.fn().mockImplementation(() => {
				throw new Error('Decryption failed');
			}),
		} as unknown as Cipher;
		Container.set(Cipher, cipher);

		const proxy = createProxy(mockLogger);
		const result = await proxy.resolveIfNeeded(
			createMetadata(),
			staticData,
			createA2AExecutionContext(),
		);

		// Should fall through to the non-A2A path (no resolvingProvider, isResolvable=false → static)
		expect(result).toEqual(staticData);
		expect(mockLogger.error).toHaveBeenCalledWith(
			'Failed to decrypt credential context for A2A check',
			expect.objectContaining({ error: 'Decryption failed' }),
		);
	});
});
