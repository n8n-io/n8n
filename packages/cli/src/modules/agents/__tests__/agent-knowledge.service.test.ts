import type { AgentJsonConfig } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import type { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import type { AgentObservationEntity } from '../entities/agent-observation.entity';
import type { AgentThreadEntity } from '../entities/agent-thread.entity';
import type { Agent } from '../entities/agent.entity';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentMemoryEntrySourceRepository } from '../repositories/agent-memory-entry-source.repository';
import type { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';
import type { AgentObservationRepository } from '../repositories/agent-observation.repository';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import { draftChatMemoryResourceId } from '../utils/agent-memory-scope';

const projectId = 'project-1';
const agentId = 'agent-1';
const userId = 'user-1';
const resourceId = draftChatMemoryResourceId(userId);

function makeAgent(schema: AgentJsonConfig | null): Agent {
	return {
		id: agentId,
		projectId,
		schema,
	} as unknown as Agent;
}

function makeConfig(memory: AgentJsonConfig['memory']): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-5.5',
		credential: 'credential-1',
		instructions: 'Help the user.',
		tools: [],
		skills: [],
		memory,
		integrations: [],
	} as AgentJsonConfig;
}

function makeMemoryEntry(overrides: Partial<AgentMemoryEntryEntity> = {}): AgentMemoryEntryEntity {
	return {
		id: 'entry-1',
		agentId,
		resourceId,
		content: 'The launch package is called Launch Concierge.',
		contentHash: 'content-hash',
		status: 'active',
		supersededBy: null,
		embeddingModel: 'openai/text-embedding-3-small',
		embedding: null,
		metadata: null,
		lastSeenAt: new Date('2026-05-19T10:00:00.000Z'),
		createdAt: new Date('2026-05-19T09:00:00.000Z'),
		updatedAt: new Date('2026-05-19T10:00:00.000Z'),
		...overrides,
	} as AgentMemoryEntryEntity;
}

function makeSource(overrides: Partial<AgentMemoryEntrySourceEntity> = {}) {
	return {
		id: 'source-1',
		memoryEntryId: 'entry-1',
		observationId: 'observation-1',
		threadId: 'thread-1',
		evidenceHash: 'evidence-hash',
		evidenceText: 'We are calling this package Launch Concierge.',
		createdAt: new Date('2026-05-19T09:05:00.000Z'),
		updatedAt: new Date('2026-05-19T09:05:00.000Z'),
		...overrides,
	} as AgentMemoryEntrySourceEntity;
}

describe('AgentKnowledgeService', () => {
	let service: AgentKnowledgeService;
	let agentRepository: jest.Mocked<AgentRepository>;
	let memoryEntryRepository: jest.Mocked<AgentMemoryEntryRepository>;
	let memoryEntrySourceRepository: jest.Mocked<AgentMemoryEntrySourceRepository>;
	let observationRepository: jest.Mocked<AgentObservationRepository>;
	let threadRepository: jest.Mocked<AgentThreadRepository>;
	let executionThreadRepository: jest.Mocked<AgentExecutionThreadRepository>;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		memoryEntryRepository = mock<AgentMemoryEntryRepository>();
		memoryEntrySourceRepository = mock<AgentMemoryEntrySourceRepository>();
		observationRepository = mock<AgentObservationRepository>();
		threadRepository = mock<AgentThreadRepository>();
		executionThreadRepository = mock<AgentExecutionThreadRepository>();

		service = new AgentKnowledgeService(
			agentRepository,
			memoryEntryRepository,
			memoryEntrySourceRepository,
			observationRepository,
			threadRepository,
			executionThreadRepository,
		);
	});

	it('returns null when the agent does not belong to the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.listAgentKnowledge({ projectId, agentId, userId })).resolves.toBeNull();
	});

	it('returns disabled knowledge without reading entries when episodic memory is disabled', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(makeConfig({ enabled: true, storage: 'n8n', episodicMemory: { enabled: false } })),
		);

		await expect(service.listAgentKnowledge({ projectId, agentId, userId })).resolves.toEqual({
			enabled: false,
			entries: [],
		});
		expect(memoryEntryRepository.find).not.toHaveBeenCalled();
	});

	it('returns active draft-scope knowledge entries with source trace data', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				makeConfig({
					enabled: true,
					storage: 'n8n',
					episodicMemory: { enabled: true, credential: 'credential-1' },
				}),
			),
		);
		memoryEntryRepository.find.mockResolvedValue([makeMemoryEntry()]);
		memoryEntrySourceRepository.find.mockResolvedValue([
			makeSource(),
			makeSource({
				id: 'source-2',
				observationId: 'observation-2',
				threadId: 'thread-without-execution-row',
				evidenceText: 'Launch Concierge is the durable package name.',
			}),
		]);
		observationRepository.find.mockResolvedValue([
			{
				id: 'observation-1',
				marker: 'critical',
				text: 'User named the launch package Launch Concierge.',
				createdAt: new Date('2026-05-19T09:04:00.000Z'),
			} as AgentObservationEntity,
		]);
		executionThreadRepository.find.mockResolvedValue([
			{
				id: 'thread-1',
				title: 'Launch naming',
				sessionNumber: 7,
			} as AgentExecutionThread,
		]);
		threadRepository.find.mockResolvedValue([
			{
				id: 'thread-without-execution-row',
				title: 'Memory thread title',
			} as AgentThreadEntity,
		]);

		const result = await service.listAgentKnowledge({ projectId, agentId, userId });

		expect(result).toEqual({
			enabled: true,
			entries: [
				{
					id: 'entry-1',
					content: 'The launch package is called Launch Concierge.',
					createdAt: '2026-05-19T09:00:00.000Z',
					updatedAt: '2026-05-19T10:00:00.000Z',
					lastSeenAt: '2026-05-19T10:00:00.000Z',
					sourceCount: 2,
					sources: [
						{
							id: 'source-1',
							threadId: 'thread-1',
							threadTitle: 'Launch naming',
							threadSessionNumber: 7,
							observationId: 'observation-1',
							observationMarker: 'critical',
							observationText: 'User named the launch package Launch Concierge.',
							observationCreatedAt: '2026-05-19T09:04:00.000Z',
							evidenceText: 'We are calling this package Launch Concierge.',
							createdAt: '2026-05-19T09:05:00.000Z',
						},
						{
							id: 'source-2',
							threadId: 'thread-without-execution-row',
							threadTitle: 'Memory thread title',
							threadSessionNumber: null,
							observationId: 'observation-2',
							observationMarker: null,
							observationText: null,
							observationCreatedAt: null,
							evidenceText: 'Launch Concierge is the durable package name.',
							createdAt: '2026-05-19T09:05:00.000Z',
						},
					],
				},
			],
		});
		expect(memoryEntryRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { agentId, resourceId, status: 'active' },
			}),
		);
	});
});
