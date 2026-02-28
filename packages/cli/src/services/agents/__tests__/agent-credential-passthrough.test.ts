/**
 * Tests for the credential pass-through system.
 *
 * Covers:
 * - resolveCredentialMappings() — decrypts mapped credentials for dispatch
 * - resolveExternalAgentApiKey() — decrypts A2A auth credential from registration
 * - updateExternalAgentMappings() — persists credential type → credential ID mappings
 * - registerExternalAgent() — n8nApi filtering from requiredCredentials
 * - scrubSecrets integration — workflow credential values are scrubbed from LLM observations
 */

import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { type InstanceSettings, Cipher } from 'n8n-core';
import type { ICredentialContext } from 'n8n-workflow';

import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { AgentsService } from '../agents.service';
import { scrubSecrets } from '../agents.types';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

jest.mock('../agent-llm-client');
jest.mock('../agent-external-client');
jest.mock('@/workflow-execute-additional-data', () => ({
	getBase: jest.fn().mockResolvedValue({}),
}));

// ── Shared helpers ──────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		firstName: 'Admin',
		lastName: '',
		email: 'admin@test.com',
		type: 'user',
		role: { slug: 'global:owner' },
		...overrides,
	} as unknown as User;
}

function createMockedService() {
	const mockUserRepository = {
		findOne: jest.fn(),
		findOneBy: jest.fn(),
		find: jest.fn().mockResolvedValue([]),
		save: jest.fn().mockImplementation(async (u: User) => u),
		delete: jest.fn(),
		createUserWithProject: jest.fn(),
	};

	const mockWorkflowRepository = {
		findByIds: jest.fn().mockResolvedValue([]),
	};

	const mockWorkflowSharingService = {
		getSharedWorkflowIds: jest.fn().mockResolvedValue([]),
	};

	const mockCredentialsService = {
		getMany: jest.fn().mockResolvedValue([]),
		createManagedCredential: jest.fn(),
	};

	const mockCredentialsHelper = {
		getDecrypted: jest.fn(),
	};

	const mockProjectRelationRepository = {
		findAllByUser: jest.fn().mockResolvedValue([]),
	};

	const mockProjectRepository = {
		findByIds: jest.fn().mockResolvedValue([]),
	};

	const mockExternalAgentRegistrationRepo = {
		find: jest.fn().mockResolvedValue([]),
		findOneBy: jest.fn(),
		create: jest
			.fn()
			.mockImplementation((data: Record<string, unknown>) => ({ id: 'reg-1', ...data })),
		save: jest.fn().mockImplementation(async (data: Record<string, unknown>) => data),
		delete: jest.fn(),
	};

	const mockWorkflowFinderService = { findWorkflowForUser: jest.fn() };
	const mockWorkflowRunner = { run: jest.fn() };
	const mockActiveExecutions = { getPostExecutePromise: jest.fn(), stopExecution: jest.fn() };
	const mockPush = { broadcast: jest.fn() };
	const mockPublicApiKeyService = {
		createPublicApiKeyForUser: jest.fn(),
		resolveUserFromApiKey: jest.fn(),
		apiKeyHasValidScopes: jest.fn(),
	};
	const mockCipher = { encrypt: jest.fn().mockReturnValue('encrypted') };

	const service = new AgentsService(
		mockUserRepository as any,
		mockWorkflowRepository as any,
		mockWorkflowSharingService as any,
		mockCredentialsService as any,
		mockCredentialsHelper as any,
		mockProjectRelationRepository as any,
		mockProjectRepository as any,
		mockExternalAgentRegistrationRepo as any,
		mockWorkflowFinderService as any,
		mockWorkflowRunner as any,
		mockActiveExecutions as any,
		mockPush as any,
		mockPublicApiKeyService as any,
		mockCipher as any,
	);

	return {
		service,
		mockCredentialsHelper,
		mockCredentialsService,
		mockExternalAgentRegistrationRepo,
	};
}

// ── resolveCredentialMappings ───────────────────────────────────────

describe('resolveCredentialMappings', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should decrypt each mapped credential and return string fields', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialMappings: {
				anthropicApi: 'cred-anthropic-uuid',
				currentsApi: 'cred-currents-uuid',
			},
		});

		mockCredentialsHelper.getDecrypted
			.mockResolvedValueOnce({ apiKey: 'sk-ant-secret-key', model: 'claude-3' })
			.mockResolvedValueOnce({ apiKey: 'curr-api-key-123', baseUrl: 'https://api.currents.dev' });

		const result = await service.resolveCredentialMappings('reg-1');

		expect(result).toEqual({
			anthropicApi: { apiKey: 'sk-ant-secret-key', model: 'claude-3' },
			currentsApi: { apiKey: 'curr-api-key-123', baseUrl: 'https://api.currents.dev' },
		});
		expect(mockCredentialsHelper.getDecrypted).toHaveBeenCalledTimes(2);
		expect(mockCredentialsHelper.getDecrypted).toHaveBeenCalledWith(
			expect.anything(),
			{ id: 'cred-anthropic-uuid', name: '' },
			'anthropicApi',
			'internal',
		);
	});

	it('should return empty object when registration has no mappings', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialMappings: null,
		});

		const result = await service.resolveCredentialMappings('reg-1');
		expect(result).toEqual({});
	});

	it('should return empty object when registration not found', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);

		const result = await service.resolveCredentialMappings('nonexistent');
		expect(result).toEqual({});
	});

	it('should skip credentials that fail to decrypt', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialMappings: {
				anthropicApi: 'cred-good',
				brokenApi: 'cred-deleted',
			},
		});

		mockCredentialsHelper.getDecrypted
			.mockResolvedValueOnce({ apiKey: 'sk-good-key' })
			.mockRejectedValueOnce(new Error('Credential not found'));

		const result = await service.resolveCredentialMappings('reg-1');

		expect(result).toEqual({
			anthropicApi: { apiKey: 'sk-good-key' },
		});
		expect(result).not.toHaveProperty('brokenApi');
	});

	it('should only include string values from decrypted credentials', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialMappings: { someApi: 'cred-1' },
		});

		mockCredentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-valid-string',
			timeout: 30000, // number — should be excluded
			nested: { deep: 'value' }, // object — should be excluded
			enabled: true, // boolean — should be excluded
		});

		const result = await service.resolveCredentialMappings('reg-1');
		expect(result.someApi).toEqual({ apiKey: 'sk-valid-string' });
	});
});

// ── resolveExternalAgentApiKey ──────────────────────────────────────

describe('resolveExternalAgentApiKey', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should decrypt the A2A credential and return the apiKey', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			name: 'QA Agent',
			credentialId: 'cred-n8n-api-uuid',
		});

		mockCredentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'n8n_api_remote-agent-key',
			baseUrl: 'https://remote.n8n.cloud',
		});

		const result = await service.resolveExternalAgentApiKey('reg-1');

		expect(result).toBe('n8n_api_remote-agent-key');
		expect(mockCredentialsHelper.getDecrypted).toHaveBeenCalledWith(
			expect.anything(),
			{ id: 'cred-n8n-api-uuid', name: 'n8n A2A: QA Agent' },
			'n8nApi',
			'internal',
		);
	});

	it('should throw NotFoundError when registration does not exist', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);

		await expect(service.resolveExternalAgentApiKey('nonexistent')).rejects.toThrow(NotFoundError);
	});

	it('should throw NotFoundError when registration has no credentialId', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialId: null,
		});

		await expect(service.resolveExternalAgentApiKey('reg-1')).rejects.toThrow(NotFoundError);
	});

	it('should return empty string when decrypted credential has no apiKey', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			name: 'Bot',
			credentialId: 'cred-1',
		});

		mockCredentialsHelper.getDecrypted.mockResolvedValue({
			baseUrl: 'https://remote.n8n.cloud',
			// no apiKey field
		});

		const result = await service.resolveExternalAgentApiKey('reg-1');
		expect(result).toBe('');
	});
});

// ── updateExternalAgentMappings ─────────────────────────────────────

describe('updateExternalAgentMappings', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should persist credential mappings to the registration', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();

		const registration = {
			id: 'reg-1',
			credentialMappings: null,
		};
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(registration);
		mockExternalAgentRegistrationRepo.save.mockImplementation(
			async (r: Record<string, unknown>) => r,
		);

		const mappings = {
			anthropicApi: 'cred-ant-1',
			currentsApi: 'cred-curr-1',
		};

		await service.updateExternalAgentMappings('reg-1', mappings);

		expect(mockExternalAgentRegistrationRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({ credentialMappings: mappings }),
		);
	});

	it('should overwrite previous mappings', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();

		const registration = {
			id: 'reg-1',
			credentialMappings: { anthropicApi: 'old-cred' },
		};
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(registration);
		mockExternalAgentRegistrationRepo.save.mockImplementation(
			async (r: Record<string, unknown>) => r,
		);

		const newMappings = { anthropicApi: 'new-cred', notionApi: 'notion-cred' };
		await service.updateExternalAgentMappings('reg-1', newMappings);

		expect(mockExternalAgentRegistrationRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({ credentialMappings: newMappings }),
		);
	});

	it('should throw NotFoundError when registration does not exist', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);

		await expect(
			service.updateExternalAgentMappings('nonexistent', { anthropicApi: 'cred-1' }),
		).rejects.toThrow(NotFoundError);
	});
});

// ── registerExternalAgent — n8nApi filtering ────────────────────────

describe('registerExternalAgent — n8nApi filtering', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should filter n8nApi from requiredCredentials', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsService } =
			createMockedService();

		// Mock fetch for agent card discovery
		const cardWithN8nApi = {
			name: 'Remote Bot',
			interfaces: [{ url: '/agents/remote-1/task' }],
			requiredCredentials: [
				{ type: 'n8nApi', description: 'n8n api key' },
				{ type: 'anthropicApi', description: 'Anthropic API' },
				{ type: 'currentsApi', description: 'Currents API' },
			],
			skills: [],
			capabilities: { streaming: true },
		};

		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => cardWithN8nApi,
		} as Response);

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null); // no duplicate
		mockCredentialsService.createManagedCredential.mockResolvedValue({ id: 'cred-new' });
		mockExternalAgentRegistrationRepo.save.mockImplementation(
			async (r: Record<string, unknown>) => r,
		);

		await service.registerExternalAgent('https://remote.n8n.cloud', 'sk-remote-key', makeUser());

		expect(mockExternalAgentRegistrationRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				requiredCredentials: [
					{ type: 'anthropicApi', description: 'Anthropic API' },
					{ type: 'currentsApi', description: 'Currents API' },
				],
			}),
		);

		jest.restoreAllMocks();
	});

	it('should keep requiredCredentials empty when only n8nApi is present', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsService } =
			createMockedService();

		const cardOnlyN8n = {
			name: 'Minimal Bot',
			interfaces: [{ url: '/agents/min-1/task' }],
			requiredCredentials: [{ type: 'n8nApi', description: 'n8n api key' }],
			skills: [],
		};

		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => cardOnlyN8n,
		} as Response);

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);
		mockCredentialsService.createManagedCredential.mockResolvedValue({ id: 'cred-new' });
		mockExternalAgentRegistrationRepo.save.mockImplementation(
			async (r: Record<string, unknown>) => r,
		);

		await service.registerExternalAgent('https://minimal.n8n.cloud', 'sk-key', makeUser());

		expect(mockExternalAgentRegistrationRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				requiredCredentials: [],
			}),
		);

		jest.restoreAllMocks();
	});

	it('should return existing registration when duplicate detected', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsService } =
			createMockedService();

		const existing = { id: 'reg-existing', name: 'Already Registered' };

		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({
				name: 'Remote Bot',
				interfaces: [{ url: '/agents/remote-1/task' }],
			}),
		} as Response);

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(existing);

		const result = await service.registerExternalAgent(
			'https://remote.n8n.cloud',
			'sk-key',
			makeUser(),
		);

		expect(result).toBe(existing);
		expect(mockCredentialsService.createManagedCredential).not.toHaveBeenCalled();
		expect(mockExternalAgentRegistrationRepo.save).not.toHaveBeenCalled();

		jest.restoreAllMocks();
	});

	it('should auto-create encrypted n8nApi credential', async () => {
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsService } =
			createMockedService();

		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({
				name: 'TestBot',
				interfaces: [{ url: '/agents/test-1/task' }],
			}),
		} as Response);

		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);
		mockCredentialsService.createManagedCredential.mockResolvedValue({ id: 'cred-auto' });
		mockExternalAgentRegistrationRepo.save.mockImplementation(
			async (r: Record<string, unknown>) => r,
		);

		const callingUser = makeUser();
		await service.registerExternalAgent('https://test.n8n.cloud/', 'sk-secret', callingUser);

		expect(mockCredentialsService.createManagedCredential).toHaveBeenCalledWith(
			{
				name: 'n8n A2A: TestBot',
				type: 'n8nApi',
				data: { apiKey: 'sk-secret', baseUrl: 'https://test.n8n.cloud' },
			},
			callingUser,
		);

		// Registration should reference the auto-created credential
		expect(mockExternalAgentRegistrationRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({ credentialId: 'cred-auto' }),
		);

		jest.restoreAllMocks();
	});
});

// ── deleteExternalAgent ─────────────────────────────────────────────

describe('deleteExternalAgent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should delete the registration', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({ id: 'reg-1' });

		await service.deleteExternalAgent('reg-1');

		expect(mockExternalAgentRegistrationRepo.delete).toHaveBeenCalledWith({ id: 'reg-1' });
	});

	it('should throw NotFoundError when registration does not exist', async () => {
		const { service, mockExternalAgentRegistrationRepo } = createMockedService();
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue(null);

		await expect(service.deleteExternalAgent('nonexistent')).rejects.toThrow(NotFoundError);
	});
});

// ── scrubSecrets integration with workflow credentials ──────────────

describe('scrubSecrets — workflow credential values', () => {
	it('should scrub all pass-through credential values from observation text', () => {
		const workflowCredentials = {
			anthropicApi: { apiKey: 'sk-ant-very-secret-key-123' },
			currentsApi: { apiKey: 'curr_api_9xKzPqR', baseUrl: 'https://api.currents.dev' },
		};

		// Collect secrets the same way executeAgentTaskInner does
		const knownSecrets: string[] = ['sk-llm-byok-key']; // BYOK key
		for (const creds of Object.values(workflowCredentials)) {
			knownSecrets.push(...Object.values(creds));
		}

		// Simulate an API error that echoes credentials back
		const errorMessage =
			'HTTP 401 Unauthorized: Invalid API key sk-ant-very-secret-key-123. ' +
			'Also tried curr_api_9xKzPqR at https://api.currents.dev but failed. ' +
			'BYOK key sk-llm-byok-key was also rejected.';

		const scrubbed = scrubSecrets(errorMessage, knownSecrets);

		expect(scrubbed).not.toContain('sk-ant-very-secret-key-123');
		expect(scrubbed).not.toContain('curr_api_9xKzPqR');
		expect(scrubbed).not.toContain('sk-llm-byok-key');
		// Last 3 chars should remain for debugging
		expect(scrubbed).toContain('*****123');
		expect(scrubbed).toContain('*****PqR');
		expect(scrubbed).toContain('*****key');
	});

	it('should handle empty workflow credentials without error', () => {
		const knownSecrets: string[] = ['sk-llm-key'];
		// No workflow creds — should still scrub BYOK
		const result = scrubSecrets('Error with sk-llm-key', knownSecrets);
		expect(result).not.toContain('sk-llm-key');
		expect(result).toContain('*****key');
	});

	it('should not mutate secrets that are too short to scrub', () => {
		const knownSecrets: string[] = ['ab', '']; // < 4 chars, should be skipped
		const input = 'The value ab appeared in the output';
		expect(scrubSecrets(input, knownSecrets)).toBe(input);
	});
});

// ── E2E: runtimeData construction → proxy extraction ────────────────

describe('credential flow integration — runtimeData → proxy', () => {
	const realCipher = new Cipher(
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key-for-a2a' }),
	);

	it('should round-trip: encrypt credential context → proxy extracts BYOK', async () => {
		// 1. Build credentialContext the same way runWorkflow does
		const workflowCredentials = {
			slackApi: { token: 'xoxb-consumer-token' },
			notionApi: { apiKey: 'notion-secret' },
		};
		const credentialContext: ICredentialContext = {
			version: 1,
			identity: 'caller-agent-123',
			metadata: { source: 'agent-a2a', agentId: 'agent-1', workflowCredentials },
		};

		const encryptedContext = realCipher.encrypt(credentialContext);

		// 2. Build executionContext (runtimeData) as runWorkflow does
		const executionContext = {
			version: 1 as const,
			establishedAt: Date.now(),
			source: 'webhook' as const,
			credentials: encryptedContext,
		};

		// 3. Inject the real cipher so the proxy can decrypt
		Container.set(Cipher, realCipher);

		const mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		const proxy = new DynamicCredentialsProxy(mockLogger);

		// 4. Resolve slackApi — should get consumer's BYOK
		const slackResult = await proxy.resolveIfNeeded(
			{
				id: 'cred-slack',
				name: 'Slack Cred',
				type: 'slackApi',
				isResolvable: false,
			},
			{ baseUrl: 'https://slack.com/api' },
			executionContext,
		);

		expect(slackResult).toEqual({
			baseUrl: 'https://slack.com/api',
			token: 'xoxb-consumer-token',
		});

		// 5. Resolve notionApi — should get consumer's BYOK
		const notionResult = await proxy.resolveIfNeeded(
			{
				id: 'cred-notion',
				name: 'Notion Cred',
				type: 'notionApi',
				isResolvable: false,
			},
			{ workspace: 'producer-workspace' },
			executionContext,
		);

		expect(notionResult).toEqual({
			workspace: 'producer-workspace',
			apiKey: 'notion-secret',
		});
	});

	it('should pass BYOK creds through proxyExternalTask → dispatchTask → runWorkflow → proxy pipeline', async () => {
		// This test validates the shape of what proxyExternalTask sends matches
		// what the proxy expects to extract.
		const { service, mockExternalAgentRegistrationRepo, mockCredentialsHelper } =
			createMockedService();

		// Setup: registration with credential mappings
		mockExternalAgentRegistrationRepo.findOneBy.mockResolvedValue({
			id: 'reg-1',
			credentialMappings: {
				anthropicApi: 'cred-ant',
				currentsApi: 'cred-curr',
			},
		});

		mockCredentialsHelper.getDecrypted
			.mockResolvedValueOnce({ apiKey: 'sk-ant-key' })
			.mockResolvedValueOnce({ apiKey: 'curr-key', baseUrl: 'https://api.currents.dev' });

		// Resolve credential mappings (as proxyExternalTask does)
		const resolved = await service.resolveCredentialMappings('reg-1');

		// Extract anthropicApi separately (as proxyExternalTask does)
		const anthropicData = resolved.anthropicApi;
		delete resolved.anthropicApi;

		const byokCredentials = {
			anthropicApiKey: anthropicData?.apiKey,
			workflowCredentials: resolved,
		};

		// Verify the shape matches what dispatchTask unpacks
		expect(byokCredentials.anthropicApiKey).toBe('sk-ant-key');
		expect(byokCredentials.workflowCredentials).toEqual({
			currentsApi: { apiKey: 'curr-key', baseUrl: 'https://api.currents.dev' },
		});

		// Now verify this goes through the cipher round-trip correctly
		Container.set(Cipher, realCipher);

		// Build credentialContext as runWorkflow does with workflowCredentials
		const credentialContext: ICredentialContext = {
			version: 1,
			identity: 'caller-123',
			metadata: {
				source: 'agent-a2a',
				agentId: 'agent-1',
				workflowCredentials: byokCredentials.workflowCredentials,
			},
		};
		const encrypted = realCipher.encrypt(credentialContext);

		const mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
		const proxy = new DynamicCredentialsProxy(mockLogger);

		// Proxy should extract currentsApi BYOK
		const result = await proxy.resolveIfNeeded(
			{
				id: 'cred-prod-currents',
				name: 'Currents',
				type: 'currentsApi',
				isResolvable: false,
			},
			{ existing: 'producer-data' },
			{
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook' as const,
				credentials: encrypted,
			},
		);

		expect(result).toEqual({
			existing: 'producer-data',
			apiKey: 'curr-key',
			baseUrl: 'https://api.currents.dev',
		});
	});
});
