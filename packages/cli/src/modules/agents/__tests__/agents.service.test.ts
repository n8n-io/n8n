/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, id-denylist -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import * as agents from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsService, chatThreadId } from '../agents.service';
import type { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../integrations/agent-chat-integration';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import type { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const versionId = 'v1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId,
		schema: null,
		model: 'claude-3',
		provider: 'anthropic',
		credentialId: 'cred-1',
		publishedVersion: null,
		tools: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

function makePublishedVersion(
	overrides: Partial<AgentPublishedVersion> = {},
): AgentPublishedVersion {
	return {
		agentId,
		publishedFromVersionId: versionId,
		schema: null,
		model: null,
		provider: null,
		credentialId: null,
		publishedById: null,
		...overrides,
	} as unknown as AgentPublishedVersion;
}

describe('AgentsService', () => {
	let service: AgentsService;
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentPublishedVersionRepository: jest.Mocked<AgentPublishedVersionRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;

	beforeEach(() => {
		jest.clearAllMocks();

		agentRepository = mock<AgentRepository>();
		agentPublishedVersionRepository = mock<AgentPublishedVersionRepository>();
		n8nMemory = mock<N8nMemory>();

		service = new AgentsService(
			mockLogger(),
			agentRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(), // NodeTypes
			n8nMemory,
			mock(),
			agentPublishedVersionRepository,
		);
	});

	describe('updateConfig', () => {
		const config = {
			name: 'Test Agent',
		} as unknown as AgentJsonConfig;

		beforeEach(() => {
			jest.spyOn(service, 'validateConfig').mockResolvedValue({ valid: true, config });
			agentRepository.save.mockImplementation(async (a) => a as Agent);
		});

		it('does not bump versionId when agent has never been published', async () => {
			const agent = makeAgent({ versionId: 'v1', publishedVersion: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v1');
		});

		it('does not bump versionId when already in a draft (versionId differs from publishedFromVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v2',
				publishedVersion: makePublishedVersion({ publishedFromVersionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v2');
		});

		it('bumps versionId on the first save after publish (versionId equals publishedFromVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v1',
				publishedVersion: makePublishedVersion({ publishedFromVersionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			const savedVersionId = agentRepository.save.mock.calls[0][0].versionId as string;
			expect(savedVersionId).not.toBe('v1');
			expect(savedVersionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});
	});

	describe('publishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.publishAgent(agentId, projectId, userId)).rejects.toThrow(NotFoundError);
		});

		it('calls savePublishedVersion with the correct payload including publishedFromVersionId', async () => {
			const agent = makeAgent({ versionId });
			const publishedVersion = makePublishedVersion();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			await service.publishAgent(agentId, projectId, userId);

			expect(agentPublishedVersionRepository.savePublishedVersion).toHaveBeenCalledWith(
				{
					agentId: agent.id,
					schema: agent.schema,
					publishedFromVersionId: versionId,
					model: agent.model,
					provider: agent.provider,
					credentialId: agent.credentialId,
					publishedById: userId,
				},
				mockTrx,
			);
		});

		it('assigns a new versionId and persists it when the agent has none', async () => {
			const agent = makeAgent({ versionId: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				makePublishedVersion(),
			);

			await service.publishAgent(agentId, projectId, userId);

			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('returns the agent with publishedVersion set to the saved snapshot', async () => {
			const agent = makeAgent();
			const publishedVersion = makePublishedVersion();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			const result = await service.publishAgent(agentId, projectId, userId);

			expect(result.publishedVersion).toBe(publishedVersion);
			expect(result).toBe(agent);
		});
	});

	describe('unpublishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
			// unpublishAgent lazy-imports ChatIntegrationService and calls disconnect via the
			// DI container — register a mock so Container.get doesn't try to construct the real
			// service (which would fail resolving DataSource in unit tests).
			Container.set(ChatIntegrationService, mock<ChatIntegrationService>());
		});

		afterEach(() => {
			Container.reset();
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.unpublishAgent(agentId, projectId)).rejects.toThrow(NotFoundError);
		});

		it('deletes the published version row and clears publishedVersion on the entity', async () => {
			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(agentPublishedVersionRepository.deleteByAgentId).toHaveBeenCalledWith(
				agentId,
				mockTrx,
			);
			expect(agent.publishedVersion).toBeNull();
		});

		it('returns the agent with publishedVersion cleared', async () => {
			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.unpublishAgent(agentId, projectId);

			expect(result.publishedVersion).toBeNull();
			expect(result).toBe(agent);
		});
	});

	describe('getTestChatMessages', () => {
		it('scopes the memory lookup to the caller via resourceId', async () => {
			n8nMemory.getMessages.mockResolvedValue([]);

			await service.getTestChatMessages(agentId, userId);

			expect(n8nMemory.getMessages).toHaveBeenCalledWith(chatThreadId(agentId), {
				resourceId: userId,
			});
		});

		it('returns whatever memory returns for this user', async () => {
			const persisted = [{ id: 'm1' }, { id: 'm2' }];
			n8nMemory.getMessages.mockResolvedValue(persisted as never);

			const result = await service.getTestChatMessages(agentId, userId);

			expect(result).toBe(persisted);
		});
	});

	describe('clearTestChatMessages', () => {
		it('deletes only the caller’s messages on the shared test-chat thread', async () => {
			await service.clearTestChatMessages(agentId, userId);

			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId), userId);
			// Must not wipe the thread row — other users share it.
			expect(n8nMemory.deleteThread).not.toHaveBeenCalled();
		});
	});

	describe('clearAllTestChatMessages', () => {
		it('deletes every message and the thread row itself', async () => {
			await service.clearAllTestChatMessages(agentId);

			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId));
			// Second arg must be absent — undefined means "all users".
			expect(n8nMemory.deleteMessagesByThread.mock.calls[0]).toHaveLength(1);
			expect(n8nMemory.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId));
		});
	});

	describe('listChatIntegrations', () => {
		class TestIntegration extends AgentChatIntegration {
			readonly type = 'test-platform';
			readonly credentialTypes = ['testApi'];
			readonly displayLabel = 'Test Platform';
			readonly displayIcon = 'circle';
			async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
				return {};
			}
		}

		it('returns one descriptor per registered integration', () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new TestIntegration());
			Container.set(ChatIntegrationRegistry, registry);

			const result = service.listChatIntegrations();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				type: 'test-platform',
				label: 'Test Platform',
				icon: 'circle',
				credentialTypes: ['testApi'],
			});
		});

		it('returns an empty array when no integrations are registered', () => {
			const registry = new ChatIntegrationRegistry();
			Container.set(ChatIntegrationRegistry, registry);

			expect(service.listChatIntegrations()).toEqual([]);
		});

		afterEach(() => {
			Container.reset();
		});
	});

	describe('attachAppToolsets', () => {
		it('skips unknown app kinds with a warn log', () => {
			const agent = mock<agents.Agent>();
			(
				service as unknown as {
					attachAppToolsets: (
						a: agents.Agent,
						apps: Array<{ kind: string; credentialId: string; credentialName: string }>,
						projectId: string,
					) => void;
				}
			).attachAppToolsets(
				agent,
				[{ kind: 'unknown-app-kind', credentialId: 'c1', credentialName: 'X' }],
				'project-1',
			);

			expect(agent.tool).not.toHaveBeenCalled();
		});
	});

	describe('delete — chat cleanup', () => {
		it('removes the test-chat thread + messages after removing the agent', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.delete(agentId, projectId);

			expect(agentRepository.remove).toHaveBeenCalledWith(agent);
			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId));
			expect(n8nMemory.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId));
		});

		it('still returns true when chat cleanup fails — agent removal is the primary intent', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			n8nMemory.deleteMessagesByThread.mockRejectedValueOnce(new Error('db down'));

			await expect(service.delete(agentId, projectId)).resolves.toBe(true);
		});
	});
});
