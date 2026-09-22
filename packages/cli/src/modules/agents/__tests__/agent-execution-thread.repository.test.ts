/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import type { TransactionRunner } from '@n8n/db';
import { mockEntityManager } from '@test/mocking';

import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

const access = { accessScope: 'project' as const, ownerId: null };

const entityManager = mockEntityManager(AgentExecutionThread);
const mockDataSource = { manager: entityManager };

describe('AgentExecutionThreadRepository', () => {
	let repository: AgentExecutionThreadRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentExecutionThreadRepository(
			mockDataSource as never,
			mock<TransactionRunner>(),
		);
	});

	describe('findOrCreate', () => {
		const makeScopedRepository = (saved: AgentExecutionThread, max = 7) => ({
			findOneBy: vi.fn().mockResolvedValue(null),
			createQueryBuilder: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				getRawOne: vi.fn().mockResolvedValue({ max }),
			}),
			create: vi.fn().mockReturnValue(saved),
			save: vi.fn().mockResolvedValue(saved),
		});

		it('assigns the project-scoped session number with the supplied context', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			entityManager.getRepository.mockReturnValue(scopedRepository as never);

			const result = await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
				access,
				{},
			);

			expect(entityManager.getRepository).toHaveBeenCalledWith(AgentExecutionThread);
			expect(scopedRepository.create).toHaveBeenCalledWith({
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: 'project-1',
				...access,
				taskId: null,
				taskVersionId: null,
				sessionNumber: 8,
				parentThreadId: null,
				parentAgentId: null,
			});
			expect(result).toEqual({ thread: saved, created: true });
		});

		it('stores subagent origin metadata when creating a thread', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const parent = mock<AgentExecutionThread>({
				id: 'parent-thread-1',
				projectId: 'project-1',
				agentId: 'parent-agent-1',
				...access,
			});
			scopedRepository.findOneBy.mockResolvedValueOnce(parent).mockResolvedValueOnce(null);
			entityManager.getRepository.mockReturnValue(scopedRepository as never);

			await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
				access,
				{},
				{
					parentThreadId: 'parent-thread-1',
					parentAgentId: 'parent-agent-1',
				},
			);

			expect(scopedRepository.create).toHaveBeenCalledWith({
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: 'project-1',
				...access,
				taskId: null,
				taskVersionId: null,
				sessionNumber: 8,
				parentThreadId: 'parent-thread-1',
				parentAgentId: 'parent-agent-1',
			});
		});

		it('stores the published task snapshot version when supplied', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			entityManager.getRepository.mockReturnValue(scopedRepository as never);

			await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
				access,
				{},
				undefined,
				'task-1',
				'version-1',
			);

			expect(scopedRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			);
		});
	});
});
