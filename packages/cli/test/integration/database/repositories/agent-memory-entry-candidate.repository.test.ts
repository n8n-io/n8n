import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentMemoryEntryCandidateRepository } from '@/modules/agents/repositories/agent-memory-entry-candidate.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentResourceRepository } from '@/modules/agents/repositories/agent-resource.repository';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';

describe('AgentMemoryEntryCandidateRepository', () => {
	let candidateRepository: AgentMemoryEntryCandidateRepository;
	let agentRepository: AgentRepository;
	let resourceRepository: AgentResourceRepository;
	let threadRepository: AgentThreadRepository;
	let agentId: string;
	let resourceId: string;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		candidateRepository = Container.get(AgentMemoryEntryCandidateRepository);
		agentRepository = Container.get(AgentRepository);
		resourceRepository = Container.get(AgentResourceRepository);
		threadRepository = Container.get(AgentThreadRepository);
	}, 30_000);

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
		resourceId = uuid();
		threadId = uuid();
		await resourceRepository.insert({ id: resourceId, metadata: null });
		await threadRepository.insert({ id: threadId, resourceId, title: null, metadata: null });
	});

	afterEach(async () => {
		await candidateRepository.delete({});
		await threadRepository.delete({});
		await resourceRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function enqueue(
		toolCallId: string,
		overrides: Partial<{ resourceId: string; threadId: string; runId: string }> = {},
	) {
		return await candidateRepository.enqueueCandidate({
			agentId,
			resourceId: overrides.resourceId ?? resourceId,
			threadId: overrides.threadId ?? threadId,
			sourceMessageId: null,
			runId: overrides.runId ?? 'run-1',
			toolCallId,
			content: `Durable memory for ${toolCallId}`,
			evidenceText: `Evidence for ${toolCallId}`,
			kind: 'fact',
		});
	}

	it('enqueues replayed tool calls once and reads pending rows by resource in order', async () => {
		const first = await enqueue('call-1');
		const replay = await enqueue('call-1');
		const nextRun = await enqueue('call-1', { runId: 'run-2' });
		const second = await enqueue('call-2');

		const otherResourceId = uuid();
		const otherThreadId = uuid();
		await resourceRepository.insert({ id: otherResourceId, metadata: null });
		await threadRepository.insert({
			id: otherThreadId,
			resourceId: otherResourceId,
			title: null,
			metadata: null,
		});
		await enqueue('call-other', { resourceId: otherResourceId, threadId: otherThreadId });
		await candidateRepository.update(first.id, {
			createdAt: new Date('2026-05-12T10:00:00.000Z'),
		});
		await candidateRepository.update(nextRun.id, {
			createdAt: new Date('2026-05-12T10:30:00.000Z'),
		});
		await candidateRepository.update(second.id, {
			createdAt: new Date('2026-05-12T11:00:00.000Z'),
		});

		expect(replay.id).toBe(first.id);
		await expect(
			candidateRepository.findPendingForResource(agentId, resourceId, 10),
		).resolves.toEqual([
			expect.objectContaining({ id: first.id }),
			expect.objectContaining({ id: nextRun.id }),
			expect.objectContaining({ id: second.id }),
		]);
	});

	it('completes selected rows and stops retrying rows at the failure limit', async () => {
		const completed = await enqueue('call-complete');
		const failed = await enqueue('call-fail');

		await candidateRepository.markCandidatesCompleted(agentId, [completed.id]);
		await Promise.all([
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3),
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3),
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3),
		]);

		await expect(candidateRepository.findOneByOrFail({ id: completed.id })).resolves.toMatchObject({
			status: 'completed',
			attemptCount: 0,
		});
		await expect(candidateRepository.findOneByOrFail({ id: failed.id })).resolves.toMatchObject({
			status: 'failed',
			attemptCount: 3,
		});
		await expect(
			candidateRepository.findPendingForResource(agentId, resourceId, 10),
		).resolves.toEqual([]);
	});
});
