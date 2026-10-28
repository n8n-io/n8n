import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentMemoryTraceService } from '@/modules/agents/agent-memory-trace.service';
import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import type { TimelineEvent } from '@/modules/agents/execution-recorder';
import { N8nMemory, type N8nMemoryImpl } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentMemoryEntryRepository } from '@/modules/agents/repositories/agent-memory-entry.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createMember } from '../shared/db/users';

describe('AgentMemoryTraceService', () => {
	const resourceId = 'draft-chat:user';
	let projectId: string;
	let agentId: string;
	let viewerId: string;
	let otherUserId: string;
	let memory: N8nMemoryImpl;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		viewerId = (await createMember()).id;
		otherUserId = (await createMember()).id;
		projectId = (await createTeamProject()).id;
		const agentRepository = Container.get(AgentRepository);
		agentId = (
			await agentRepository.save(
				agentRepository.create({ id: uuid(), name: 'Agent', projectId, integrations: [] }),
			)
		).id;
		memory = Container.get(N8nMemory).getImplementation(agentId);
	}, 60_000);

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createThread(ownerId: string): Promise<string> {
		const threads = Container.get(AgentExecutionThreadRepository);
		const thread = await threads.save(
			threads.create({
				id: uuid(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: 'user',
				ownerId,
			}),
		);
		await memory.saveThread({ id: thread.id, resourceId });
		return thread.id;
	}

	async function flag(threadId: string, toolCallId: string, content: string) {
		return await memory.episodic.enqueueCaptureCandidate({
			resourceId,
			threadId,
			sourceMessageId: null,
			runId: 'run-1',
			toolCallId,
			content,
			evidenceText: `Evidence: ${content}`,
			kind: 'fact',
		});
	}

	async function store(threadId: string, toolCallId: string, content: string) {
		const candidate = await flag(threadId, toolCallId, content);
		const entry = await memory.episodic.saveEntryWithSources({ resourceId, content }, [
			{ candidateId: candidate.id, threadId, evidenceText: candidate.evidenceText },
		]);
		await memory.episodic.completeCaptureCandidates([candidate.id]);
		return { candidate, entry: entry! };
	}

	function toolCall(
		name: string,
		toolCallId: string,
		extra: Partial<TimelineEvent & { type: 'tool-call' }> = {},
	): TimelineEvent {
		return {
			type: 'tool-call',
			kind: 'tool',
			name,
			toolCallId,
			input: {},
			output: {},
			startTime: 0,
			endTime: 0,
			success: true,
			...extra,
		};
	}

	it('resolves recalled entries and flagged facts with their current state', async () => {
		const entries = Container.get(AgentMemoryEntryRepository);
		const currentThread = await createThread(viewerId);
		const othersThread = await createThread(otherUserId);
		const ownThread = await createThread(viewerId);
		const { entry: othersEntry } = await store(othersThread, 'source-1', 'Alerts go to Slack.');
		const { entry: deletedEntry } = await store(ownThread, 'source-2', 'Reports are weekly.');
		await entries.markDeleted(agentId, deletedEntry.id);
		const pending = await flag(currentThread, 'flag-pending', 'Funnel data is in Hex.');
		const stored = await store(currentThread, 'flag-stored', 'Budget owner is Sin.');
		const deleted = await store(currentThread, 'flag-deleted', 'Standup is at 10.');
		await entries.deleteCandidate(agentId, deleted.candidate.id, {});

		const result = await Container.get(AgentMemoryTraceService).getThreadMemory({
			agentId,
			projectId,
			userId: viewerId,
			threadId: currentThread,
			executions: [
				{
					timeline: [
						toolCall('recall_memory', 'recall', {
							traceOutput: { entryIds: [othersEntry.id, deletedEntry.id, 'missing'] },
						}),
						toolCall('recall_memory', 'recall-before-tracing'),
						toolCall('flag_memory', 'flag-pending'),
						toolCall('flag_memory', 'flag-stored'),
						toolCall('flag_memory', 'flag-deleted'),
					],
				} as AgentExecution,
			],
		});

		expect(result.recalls).toEqual({
			recall: [
				{
					entryId: othersEntry.id,
					content: 'Alerts go to Slack.',
					status: 'active',
					origin: expect.objectContaining({
						threadId: othersThread,
						canOpen: false,
						evidence: 'Evidence: Alerts go to Slack.',
					}),
				},
				{
					entryId: deletedEntry.id,
					content: 'Reports are weekly.',
					status: 'deleted',
					origin: expect.objectContaining({ threadId: ownThread, canOpen: true }),
				},
			],
		});
		expect(result.flags).toEqual({
			'flag-pending': {
				captureId: pending.id,
				content: 'Funnel data is in Hex.',
				evidence: 'Evidence: Funnel data is in Hex.',
				status: 'pending',
			},
			'flag-stored': expect.objectContaining({ captureId: stored.candidate.id, status: 'stored' }),
			'flag-deleted': expect.objectContaining({
				captureId: deleted.candidate.id,
				status: 'deleted',
			}),
		});
	});

	it('reports a flag as stored when a merge moved its entry to a replacement', async () => {
		const threadId = await createThread(viewerId);
		const { candidate, entry } = await store(threadId, 'flag-merged', 'Deploys run on Fridays.');
		await memory.episodic.applyReflection(
			{ resourceId, threadId },
			{
				drop: [],
				merge: [
					{
						supersedes: [entry.id],
						entry: { resourceId, content: 'Deploys run on Friday mornings.' },
					},
				],
			},
		);

		const result = await Container.get(AgentMemoryTraceService).getThreadMemory({
			agentId,
			projectId,
			userId: viewerId,
			threadId,
			executions: [{ timeline: [toolCall('flag_memory', 'flag-merged')] } as AgentExecution],
		});

		expect(result.flags).toEqual({
			'flag-merged': expect.objectContaining({ captureId: candidate.id, status: 'stored' }),
		});
	});
});
