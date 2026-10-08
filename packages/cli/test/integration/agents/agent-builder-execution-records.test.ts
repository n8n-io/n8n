import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import {
	AgentExecutionService,
	type StartExecutionParams,
} from '@/modules/agents/agent-execution.service';
import {
	BUILDER_AGENT_NAME,
	BUILDER_EXECUTION_SOURCE,
} from '@/modules/agents/builder/agents-builder.service';
import { BUILT_AGENT_ID_METADATA_KEY } from '@/modules/agents/builder/builder-thread-metadata';
import { ExecutionRecorder } from '@/modules/agents/execution-recorder';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { createMember } from '../shared/db/users';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

/**
 * The Agent builder records a turn under a system agent thread only when a
 * system agent passes a parent execution. These tests use the same recording
 * parameters as `AgentsBuilderService` and check the stored rows.
 *
 * The builder session belongs to the system agent and to the working project
 * of the parent thread. The built agent lives in another project here, so the
 * tests show that nothing of the session depends on it.
 */
describe('Agent builder execution records', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let agentRepo: AgentRepository;
	let executionService: AgentExecutionService;
	let systemAgentService: SystemAgentExecutionService;
	let memory: N8nMemory;
	let owner: User;
	let workingProjectId: string;
	let targetProjectId: string;
	let targetAgentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		agentRepo = Container.get(AgentRepository);
		executionService = Container.get(AgentExecutionService);
		systemAgentService = Container.get(SystemAgentExecutionService);
		memory = Container.get(N8nMemory);
		owner = await createMember();
		await systemAgentService.register({
			agentId: INSTANCE_AGENT_ID,
			name: 'Assistant',
			authorize: async () => true,
			prepareTurn: vi.fn(),
		});
	});

	beforeEach(async () => {
		workingProjectId = (await createTeamProject(undefined, owner)).id;
		targetProjectId = (await createTeamProject(undefined, owner)).id;
		targetAgentId = uuid();
		await agentRepo.save(
			agentRepo.create({
				id: targetAgentId,
				name: 'Support agent',
				projectId: targetProjectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
	});

	afterEach(async () => {
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({ scope: 'project' });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createParentTurn(): Promise<{ threadId: string; executionId: string }> {
		const thread = await threadRepo.save(
			threadRepo.create({
				id: uuid(),
				agentId: INSTANCE_AGENT_ID,
				agentName: 'Assistant',
				projectId: workingProjectId,
				accessScope: 'user',
				ownerId: owner.id,
			}),
		);
		const execution = await executionRepo.save(
			executionRepo.create({ id: uuid(), threadId: thread.id, status: 'running' }),
		);
		return { threadId: thread.id, executionId: execution.id };
	}

	async function recordBuilderTurn(parent: { threadId: string; executionId: string }) {
		const threadId = `ia-builder:${parent.threadId}:${targetAgentId}`;
		const parentThread = await threadRepo.findOneByOrFail({ id: parent.threadId });
		await memory.getImplementation(targetAgentId).saveThread({
			id: threadId,
			resourceId: owner.id,
			metadata: { [BUILT_AGENT_ID_METADATA_KEY]: targetAgentId },
		});
		const executionLinks = await executionRepo.findLinksForChildOf(parent.executionId);
		const params: StartExecutionParams = {
			access: { accessScope: 'user', ownerId: owner.id },
			threadId,
			agentId: INSTANCE_AGENT_ID,
			agentName: BUILDER_AGENT_NAME,
			projectId: parentThread.projectId,
			checkpointAgentId: targetAgentId,
			userMessage: 'Build a support agent',
			resourceId: owner.id,
			source: BUILDER_EXECUTION_SOURCE,
			...(executionLinks ? { executionLinks } : {}),
			threadMetadata: { parentThreadId: parent.threadId, parentAgentId: INSTANCE_AGENT_ID },
		};
		const recorder = new ExecutionRecorder();
		const { executionId } = await executionService.startExecutionRecording(
			params,
			recorder.startedAt,
		);
		recorder.record({
			type: 'finish',
			finishReason: 'stop',
			usage: { promptTokens: 120, completionTokens: 30, totalTokens: 150 },
		});
		await executionService.finalizeExecution(executionId, {
			...params,
			record: recorder.getMessageRecord(),
		});
		return { threadId, executionId };
	}

	it('stores the builder session under the system agent and the working project', async () => {
		const parent = await createParentTurn();

		const first = await recordBuilderTurn(parent);
		const second = await recordBuilderTurn(parent);

		expect(first.threadId.length).toBeLessThanOrEqual(128);
		expect(await threadRepo.findOneByOrFail({ id: first.threadId })).toMatchObject({
			agentId: INSTANCE_AGENT_ID,
			agentName: BUILDER_AGENT_NAME,
			projectId: workingProjectId,
			accessScope: 'user',
			ownerId: owner.id,
			parentThreadId: parent.threadId,
			parentAgentId: INSTANCE_AGENT_ID,
			totalPromptTokens: 240,
			totalCompletionTokens: 60,
		});
		const memoryThread = await memory.getImplementation(targetAgentId).getThread(first.threadId);
		expect(memoryThread?.metadata).toMatchObject({ builtAgentId: targetAgentId });

		const executions = await executionRepo.findByThreadIdOrdered(first.threadId);
		expect(executions.map(({ id }) => id)).toEqual([first.executionId, second.executionId]);
		for (const execution of executions) {
			expect(execution).toMatchObject({
				status: 'success',
				source: 'builder',
				promptTokens: 120,
				completionTokens: 30,
				parentExecutionId: parent.executionId,
				rootExecutionId: parent.executionId,
			});
		}
	});

	it('deletes the builder sessions with the parent system agent thread', async () => {
		const parent = await createParentTurn();
		const otherParent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);
		const otherBuilder = await recordBuilderTurn(otherParent);
		await executionRepo.update({ threadId: parent.threadId }, { status: 'success' });

		expect(await threadRepo.findChildSessions(parent.threadId, INSTANCE_AGENT_ID)).toEqual([
			{ id: builder.threadId, agentId: INSTANCE_AGENT_ID, projectId: workingProjectId },
		]);

		await systemAgentService.deleteThread(INSTANCE_AGENT_ID, owner, parent.threadId);

		expect(await threadRepo.findOneBy({ id: parent.threadId })).toBeNull();
		expect(await threadRepo.findOneBy({ id: builder.threadId })).toBeNull();
		expect(await executionRepo.findByThreadIdOrdered(builder.threadId)).toEqual([]);
		// The builder memory thread goes with the session.
		expect(await memory.getImplementation(targetAgentId).getThread(builder.threadId)).toBeNull();
		expect(await threadRepo.findOneBy({ id: otherBuilder.threadId })).not.toBeNull();
	});

	it('keeps the builder sessions when the built agent is deleted', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);

		await agentRepo.delete({ id: targetAgentId });

		expect(await threadRepo.findOneBy({ id: builder.threadId })).toMatchObject({
			agentId: INSTANCE_AGENT_ID,
			parentThreadId: parent.threadId,
		});
		expect(await executionRepo.findByThreadIdOrdered(builder.threadId)).toHaveLength(1);
	});

	it('moves the builder sessions with the working project of the parent', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);
		await executionRepo.update({ threadId: parent.threadId }, { status: 'success' });
		const nextProjectId = (await createTeamProject(undefined, owner)).id;

		await systemAgentService.updateThread(INSTANCE_AGENT_ID, owner, parent.threadId, {
			projectId: nextProjectId,
		});

		expect(await threadRepo.findOneBy({ id: builder.threadId })).toMatchObject({
			projectId: nextProjectId,
		});
		// The next builder turn still finds its parent and its session.
		const next = await recordBuilderTurn(parent);
		expect(next.threadId).toBe(builder.threadId);
		expect(await executionRepo.findByThreadIdOrdered(builder.threadId)).toHaveLength(2);
	});

	it("keeps a builder session out of the built agent's session lists", async () => {
		const parent = await createParentTurn();
		await recordBuilderTurn(parent);

		for (const projectId of [targetProjectId, workingProjectId]) {
			const preview = await threadRepo.findByProjectIdPaginated(
				projectId,
				targetAgentId,
				owner.id,
				10,
				undefined,
				{ previewOnly: true },
			);
			expect(preview.threads).toEqual([]);
			const history = await threadRepo.findByProjectIdPaginated(
				projectId,
				targetAgentId,
				owner.id,
				10,
			);
			expect(history.threads).toEqual([]);
		}
	});

	it('keeps a builder session out of the system agent history lists', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);

		const owned = await threadRepo.findOwnedByAgent(INSTANCE_AGENT_ID, owner.id);
		expect(owned.map(({ id }) => id)).toEqual([parent.threadId]);
		const page = await threadRepo.findOwnedHistoryPage(INSTANCE_AGENT_ID, owner.id, 10);
		expect(page.threads.map(({ id }) => id)).toEqual([parent.threadId]);

		// Known gap, closed in the next stacked PR: the single-session lookup
		// has no parent filter, so it returns the builder session.
		expect(
			await threadRepo.findOwnedById(INSTANCE_AGENT_ID, owner.id, builder.threadId),
		).toMatchObject({ id: builder.threadId, parentThreadId: parent.threadId });
	});
});
