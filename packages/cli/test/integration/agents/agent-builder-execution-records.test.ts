import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import {
	AgentExecutionService,
	type StartExecutionParams,
} from '@/modules/agents/agent-execution.service';
import { ExecutionRecorder } from '@/modules/agents/execution-recorder';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createMember } from '../shared/db/users';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

/**
 * The Agent builder records a turn under a system agent thread only when a
 * system agent passes a parent execution. These tests use the same recording
 * parameters as `AgentsBuilderService` and check the stored rows.
 */
describe('Agent builder execution records', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let agentRepo: AgentRepository;
	let executionService: AgentExecutionService;
	let ownerId: string;
	let projectId: string;
	let targetAgentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		agentRepo = Container.get(AgentRepository);
		executionService = Container.get(AgentExecutionService);
		ownerId = (await createMember()).id;
		await agentRepo.ensureInstanceAgent(INSTANCE_AGENT_ID, 'Assistant');
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		targetAgentId = uuid();
		await agentRepo.save(
			agentRepo.create({
				id: targetAgentId,
				name: 'Support agent',
				projectId,
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
				projectId,
				accessScope: 'user',
				ownerId,
			}),
		);
		const execution = await executionRepo.save(
			executionRepo.create({ id: uuid(), threadId: thread.id, status: 'running' }),
		);
		return { threadId: thread.id, executionId: execution.id };
	}

	async function recordBuilderTurn(parent: { threadId: string; executionId: string }) {
		const executionLinks = await executionRepo.findLinksForChildOf(parent.executionId);
		const params: StartExecutionParams = {
			access: { accessScope: 'user', ownerId },
			threadId: `ia-builder:${parent.threadId}:${targetAgentId}`,
			agentId: targetAgentId,
			agentName: 'Support agent',
			projectId,
			userMessage: 'Build a support agent',
			resourceId: ownerId,
			source: 'builder',
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
		return { threadId: params.threadId, executionId };
	}

	it('stores the builder session under the parent thread with linked executions', async () => {
		const parent = await createParentTurn();

		const first = await recordBuilderTurn(parent);
		const second = await recordBuilderTurn(parent);

		expect(first.threadId.length).toBeLessThanOrEqual(128);
		expect(await threadRepo.findOneByOrFail({ id: first.threadId })).toMatchObject({
			agentId: targetAgentId,
			projectId,
			accessScope: 'user',
			ownerId,
			parentThreadId: parent.threadId,
			parentAgentId: INSTANCE_AGENT_ID,
			totalPromptTokens: 240,
			totalCompletionTokens: 60,
		});
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

	it('finds the builder sessions of a parent thread for cleanup', async () => {
		const parent = await createParentTurn();
		const otherParent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);
		await recordBuilderTurn(otherParent);

		expect(await threadRepo.findChildSessions(parent.threadId, INSTANCE_AGENT_ID)).toEqual([
			{ id: builder.threadId, agentId: targetAgentId, projectId },
		]);
		expect(await threadRepo.findChildSessions(parent.threadId, targetAgentId)).toEqual([]);

		expect(
			await executionService.deleteThread(projectId, targetAgentId, builder.threadId, ownerId),
		).toBe(true);
		expect(await threadRepo.findOneBy({ id: builder.threadId })).toBeNull();
		expect(await executionRepo.findByThreadIdOrdered(builder.threadId)).toEqual([]);
	});

	it("keeps a builder session out of the target agent's Preview list", async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);

		const preview = await threadRepo.findByProjectIdPaginated(
			projectId,
			targetAgentId,
			ownerId,
			10,
			undefined,
			{ previewOnly: true },
		);
		expect(preview.threads).toEqual([]);

		// The session history list has no parent filter, so it shows the builder
		// session as a sub-agent session of its owner.
		const history = await threadRepo.findByProjectIdPaginated(
			projectId,
			targetAgentId,
			ownerId,
			10,
		);
		expect(history.threads.map(({ id }) => id)).toEqual([builder.threadId]);
	});
});
