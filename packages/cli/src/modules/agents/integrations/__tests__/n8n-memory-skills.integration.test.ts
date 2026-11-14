import { Agent } from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { MockLanguageModelV3 } from 'ai/test';

import { AgentRepository } from '../../repositories/agent.repository';
import { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { IntegrationMessageContextService } from '../integration-message-context.service';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';

const scope = { threadId: 'thread-1', resourceId: 'user-1', agentName: 'assistant' };
const state = { skillIds: ['planning'], versions: { planning: 'v1', retired: null } };

describe('N8nMemory active skills', () => {
	let service: N8nMemory;
	let memory: N8nMemoryImpl;
	let threads: AgentThreadRepository;
	let agentId: string;
	let otherAgentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(N8nMemory);
		threads = Container.get(AgentThreadRepository);
		const project = await createTeamProject();
		const agents = Container.get(AgentRepository);
		const saved = await agents.save([
			agents.create({ name: 'Assistant', projectId: project.id, integrations: [] }),
			agents.create({ name: 'Other assistant', projectId: project.id, integrations: [] }),
		]);
		agentId = saved[0].id;
		otherAgentId = saved[1].id;
	});

	beforeEach(async () => {
		await threads.delete({});
		memory = service.getImplementation(agentId);
		await memory.saveThread({
			id: scope.threadId,
			resourceId: scope.resourceId,
			metadata: { topic: 'Example' },
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('restores skill instructions when observations replace the activating tool call', async () => {
		const instructions = 'Use the planning checklist before every answer.';
		const prompts: string[] = [];
		const model = new MockLanguageModelV3({
			modelId: 'skill-memory-test',
			doGenerate: async ({ prompt }) => {
				const first = prompts.length === 0;
				prompts.push(JSON.stringify(prompt));
				return {
					content: first
						? [
								{
									type: 'tool-call',
									toolCallId: 'load-planning',
									toolName: 'load_skill',
									input: JSON.stringify({ skillId: 'planning' }),
								},
							]
						: [{ type: 'text', text: 'Done' }],
					finishReason: { unified: first ? 'tool-calls' : 'stop', raw: undefined },
					usage: {
						inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
						outputTokens: { total: 1, text: 1, reasoning: 0 },
					},
					warnings: [],
				};
			},
		});
		const agent = (backend: N8nMemoryImpl) =>
			new Agent(scope.agentName)
				.model(model)
				.instructions('Follow the relevant skills.')
				.skills([{ id: 'planning', name: 'Planning', description: 'Plan tasks.', instructions }])
				.memory({
					memory: backend,
					observationalMemory: {
						observerThresholdTokens: 100_000,
						observe: async () => '',
						reflect: async () => '{"drop":[],"merge":[]}',
					},
				});
		const options = { persistence: { threadId: scope.threadId, resourceId: scope.resourceId } };
		await agent(memory).generate('Load the planning skill.', options);
		expect(prompts[1]).toContain(instructions);

		const messages = await memory.getMessages(scope.threadId);
		const last = messages[messages.length - 1];
		const point = { lastObservedMessageId: last.id, lastObservedAt: last.createdAt };
		await memory.commitObservationLogBatch({
			observationScopeId: scope.threadId,
			expectedCursor: null,
			nextCursor: { observationScopeId: scope.threadId, ...point, updatedAt: new Date() },
			entries: [
				{
					marker: 'important',
					text: 'The user requested a plan.',
					parentIndex: null,
					tokenCount: 8,
					createdAt: last.createdAt,
				},
			],
		});
		await memory.saveResumeState({
			observationScopeId: scope.threadId,
			resumeFrom: point,
			resumeNotes: 'The user requested a plan.',
			lastRequestTokens: 1,
			lastModelId: 'skill-memory-test',
		});

		await agent(service.getImplementation(agentId)).generate('Continue.', options);

		expect(prompts).toHaveLength(3);
		expect(prompts[2]).not.toContain('load-planning');
		expect(prompts[2]).toContain(instructions);
	});

	it('persists active skills across memory instances', async () => {
		expect(memory).toHaveProperty('skillState');
		await memory.skillState.save(scope, state);

		const restored = service.getImplementation(agentId);
		await expect(restored.skillState.load(scope)).resolves.toEqual(state);
		expect((await restored.getThread(scope.threadId))?.metadata).toMatchObject({
			topic: 'Example',
		});
	});

	it('isolates skill selections by thread, resource, agent name and agent id', async () => {
		await memory.skillState.save(scope, state);
		for (const otherScope of [
			{ ...scope, threadId: 'thread-2' },
			{ ...scope, resourceId: 'user-2' },
			{ ...scope, agentName: 'reviewer' },
		]) {
			await expect(memory.skillState.load(otherScope)).resolves.toBeUndefined();
		}
		await expect(
			service.getImplementation(otherAgentId).skillState.load(scope),
		).resolves.toBeUndefined();
	});

	it('retains newer skills when an integration message update reads older metadata', async () => {
		await memory.skillState.save(scope, state);
		const newer = { skillIds: ['planning', 'review'] };
		const read = createDeferredPromise<undefined>();
		const release = createDeferredPromise<undefined>();
		const findOneBy = threads.findOneBy.bind(threads);
		let paused = false;
		const reader = vi.spyOn(threads, 'findOneBy').mockImplementation(async (where) => {
			const row = await findOneBy(where);
			if (!paused) {
				paused = true;
				read.resolve(undefined);
				await release.promise;
			}
			return row;
		});
		const contexts = Container.get(IntegrationMessageContextService);
		const writing = contexts.setLatest(scope.threadId, scope.resourceId, {
			integrationConnectionId: 'slack:test',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:channel:1' },
			messageId: '1',
			updatedAt: '2026-01-01T00:00:00.000Z',
		});
		try {
			// A locked writer can finish without an unlocked snapshot read.
			await Promise.race([read.promise, writing]);
			await memory.skillState.save(scope, newer);
		} finally {
			release.resolve(undefined);
			reader.mockRestore();
			await writing;
		}

		await expect(memory.skillState.load(scope)).resolves.toEqual(newer);
		await expect(contexts.getLatest(scope.threadId)).resolves.toMatchObject({ messageId: '1' });
	});

	it('retains concurrent selections and unrelated metadata updates', async () => {
		await Promise.all([
			memory.skillState.save(scope, state),
			service
				.getImplementation(agentId)
				.skillState.save({ ...scope, agentName: 'reviewer' }, { skillIds: ['review'] }),
			memory.saveThread({
				id: scope.threadId,
				resourceId: scope.resourceId,
				metadata: { summary: 'Updated' },
			}),
		]);

		await expect(memory.skillState.load(scope)).resolves.toEqual(state);
		await expect(memory.skillState.load({ ...scope, agentName: 'reviewer' })).resolves.toEqual({
			skillIds: ['review'],
		});
		expect((await memory.getThread(scope.threadId))?.metadata).toMatchObject({
			topic: 'Example',
			summary: 'Updated',
		});
	});

	it('keeps skills when an Agent creates the thread during an integration metadata update', async () => {
		await memory.deleteThread(scope.threadId);
		const resources = Container.get(AgentResourceRepository);
		const ensureExists = resources.ensureExists.bind(resources);
		const creation = vi.spyOn(resources, 'ensureExists').mockImplementationOnce(async (id) => {
			await ensureExists(id);
			await memory.saveThread({ id: scope.threadId, resourceId: scope.resourceId });
			await memory.skillState.save(scope, state);
		});
		const contexts = Container.get(IntegrationMessageContextService);
		try {
			await contexts.setLatest(scope.threadId, scope.resourceId, {
				integrationConnectionId: 'slack:test',
				platform: 'slack',
				target: { type: 'thread', threadId: 'slack:channel:1' },
				messageId: '1',
				updatedAt: '2026-01-01T00:00:00.000Z',
			});
		} finally {
			creation.mockRestore();
		}

		await expect(memory.skillState.load(scope)).resolves.toEqual(state);
		await expect(contexts.getLatest(scope.threadId)).resolves.toMatchObject({ messageId: '1' });
	});

	it('does not overwrite current skill state when saving stale thread metadata', async () => {
		await memory.skillState.save(scope, state);
		const stale = await memory.getThread(scope.threadId);
		expect(stale).not.toBeNull();
		await memory.skillState.save(scope, { skillIds: [] });

		await memory.saveThread({
			id: scope.threadId,
			resourceId: scope.resourceId,
			metadata: stale?.metadata,
		});

		await expect(memory.skillState.load(scope)).resolves.toEqual({ skillIds: [] });
	});

	it('keeps skills when another writer creates a thread after saveThread initially finds no row', async () => {
		await memory.deleteThread(scope.threadId);
		const patchThread = threads.patchThread.bind(threads);
		const creation = vi.spyOn(threads, 'patchThread').mockImplementationOnce(async (...args) => {
			const missing = await patchThread(...args);
			expect(missing).toBeNull();
			await threads.ensureExists(scope.threadId, 'original-owner');
			await memory.skillState.save(scope, state);
			return missing;
		});
		try {
			await memory.saveThread({
				id: scope.threadId,
				resourceId: scope.resourceId,
				title: 'Plan',
				metadata: { summary: 'Updated' },
			});
		} finally {
			creation.mockRestore();
		}

		await expect(memory.skillState.load(scope)).resolves.toEqual(state);
		expect(await memory.getThread(scope.threadId)).toMatchObject({
			resourceId: 'original-owner',
			title: 'Plan',
			metadata: { summary: 'Updated' },
		});
	});

	it('returns no selection for legacy or invalid metadata', async () => {
		await expect(memory.skillState.load(scope)).resolves.toBeUndefined();
		await threads.update(scope.threadId, {
			metadata: JSON.stringify({ activeSkillStates: 'invalid' }),
		});
		await expect(memory.skillState.load(scope)).resolves.toBeUndefined();
	});

	it('preserves valid selections when another stored entry is malformed', async () => {
		await memory.skillState.save(scope, state);
		const thread = await memory.getThread(scope.threadId);
		await threads.update(scope.threadId, {
			metadata: JSON.stringify({
				...thread?.metadata,
				activeSkillStates: [
					null,
					{ agentId, ...scope, skillIds: 'invalid' },
					{ agentId, ...scope, ...state },
				],
			}),
		});

		await expect(memory.skillState.load(scope)).resolves.toEqual(state);
		const reviewer = { ...scope, agentName: 'reviewer' };
		await memory.skillState.save(reviewer, { skillIds: ['review'] });

		await expect(memory.skillState.load(scope)).resolves.toEqual(state);
		await expect(memory.skillState.load(reviewer)).resolves.toEqual({ skillIds: ['review'] });
	});

	it('does not recreate a deleted thread while saving active skills', async () => {
		await memory.deleteThread(scope.threadId);

		await expect(memory.skillState.save(scope, state)).rejects.toThrow(
			'Cannot save active skills for a missing thread',
		);
		await expect(memory.getThread(scope.threadId)).resolves.toBeNull();
	});
});
