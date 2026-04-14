import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { Agent } from '../entities/agent.entity';
import { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentsService } from '../agents.service';

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
		activeVersionId: null,
		publishedVersion: null,
		tools: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
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
		} as unknown as import('../json-config/agent-json-config').AgentJsonConfig;

		beforeEach(() => {
			jest.spyOn(service, 'validateConfig').mockResolvedValue({ valid: true, config });
			agentRepository.save.mockImplementation(async (a) => a as Agent);
		});

		it('does not bump versionId when agent has never been published (activeVersionId is null)', async () => {
			const agent = makeAgent({ versionId: 'v1', activeVersionId: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v1');
		});

		it('does not bump versionId when already in a draft (versionId differs from activeVersionId)', async () => {
			const agent = makeAgent({ versionId: 'v2', activeVersionId: 'v1' });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v2');
		});

		it('bumps versionId on the first save after publish (versionId equals activeVersionId)', async () => {
			const agent = makeAgent({ versionId: 'v1', activeVersionId: 'v1' });
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
			mockTransaction = jest.fn(async (cb: (trx: typeof mockTrx) => Promise<void>) => cb(mockTrx));
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.publishAgent(agentId, projectId, userId)).rejects.toThrow(NotFoundError);
		});

		it('calls savePublishedVersion with the correct payload', async () => {
			const agent = makeAgent();
			const publishedVersion = mock<AgentPublishedVersion>();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			await service.publishAgent(agentId, projectId, userId);

			expect(agentPublishedVersionRepository.savePublishedVersion).toHaveBeenCalledWith(
				{
					agentId: agent.id,
					schema: agent.schema,
					model: agent.model,
					provider: agent.provider,
					credentialId: agent.credentialId,
					publishedById: userId,
				},
				mockTrx,
			);
		});

		it('stamps activeVersionId to the current versionId and saves within a transaction', async () => {
			const agent = makeAgent({ versionId });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				mock<AgentPublishedVersion>(),
			);

			await service.publishAgent(agentId, projectId, userId);

			expect(agent.activeVersionId).toBe(versionId);
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('returns the agent with publishedVersion set to the saved snapshot', async () => {
			const agent = makeAgent();
			const publishedVersion = mock<AgentPublishedVersion>();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			const result = await service.publishAgent(agentId, projectId, userId);

			expect(result.publishedVersion).toBe(publishedVersion);
			expect(result).toBe(agent);
		});
	});

	describe('unpublishAgent', () => {
		let mockTrx: { delete: jest.Mock; save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { delete: jest.fn(), save: jest.fn() };
			mockTransaction = jest.fn(async (cb: (trx: typeof mockTrx) => Promise<void>) => cb(mockTrx));
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.unpublishAgent(agentId, projectId)).rejects.toThrow(NotFoundError);
		});

		it('deletes the published version row within a transaction', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(mockTrx.delete).toHaveBeenCalledWith(AgentPublishedVersion, { agentId });
		});

		it('clears publishedVersion and activeVersionId and saves within a transaction', async () => {
			const agent = makeAgent({ activeVersionId: versionId });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(agent.publishedVersion).toBeNull();
			expect(agent.activeVersionId).toBeNull();
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('returns the agent with publishedVersion and activeVersionId cleared', async () => {
			const agent = makeAgent({ activeVersionId: versionId });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.unpublishAgent(agentId, projectId);

			expect(result.publishedVersion).toBeNull();
			expect(result.activeVersionId).toBeNull();
			expect(result).toBe(agent);
		});
	});
});
