/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, id-denylist -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import { mockLogger } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsService } from '../agents.service';
import type { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
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

	beforeEach(() => {
		jest.clearAllMocks();

		agentRepository = mock<AgentRepository>();
		agentPublishedVersionRepository = mock<AgentPublishedVersionRepository>();

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
});
