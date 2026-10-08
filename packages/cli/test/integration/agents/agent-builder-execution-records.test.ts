import type { SerializableAgentState } from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { v4 as uuid } from 'uuid';

import {
	AgentExecutionService,
	type StartExecutionParams,
} from '@/modules/agents/agent-execution.service';
import {
	BUILDER_AGENT_NAME,
	BUILDER_EXECUTION_SOURCE,
	getBuilderStateOwnerAgentId,
} from '@/modules/agents/builder/agents-builder.service';
import { BUILT_AGENT_ID_METADATA_KEY } from '@/modules/agents/builder/builder-thread-metadata';
import { ExecutionRecorder } from '@/modules/agents/execution-recorder';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentObservationRepository } from '@/modules/agents/repositories/agent-observation.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { EXECUTION_METADATA_KEY } from '@/modules/agents/types/agent-queued-message';
import { UserService } from '@/services/user.service';

import { createMember, createOwner } from '../shared/db/users';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

/**
 * The Agent builder records a turn under a system agent thread only when a
 * system agent passes a parent execution. These tests use the same recording
 * parameters as `AgentsBuilderService` and check the stored rows.
 *
 * The builder session belongs to the system agent and to the working project
 * of the parent thread. Its checkpoints and observational memory belong to the
 * same system agent (the state owner). The built agent lives in another
 * project here, so the tests show that nothing of the session depends on it.
 */
describe('Agent builder execution records', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let agentRepo: AgentRepository;
	let executionService: AgentExecutionService;
	let systemAgentService: SystemAgentExecutionService;
	let memory: N8nMemory;
	let checkpointStorage: N8NCheckpointStorage;
	let checkpointRepo: AgentCheckpointRepository;
	let observationRepo: AgentObservationRepository;
	let owner: User;
	let admin: User;
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
		checkpointStorage = Container.get(N8NCheckpointStorage);
		checkpointRepo = Container.get(AgentCheckpointRepository);
		observationRepo = Container.get(AgentObservationRepository);
		owner = await createMember();
		admin = await createOwner();
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
		await checkpointRepo.delete({});
		await observationRepo.delete({});
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

	/** The state owner that `AgentsBuilderService` uses for a recorded (v2) turn. */
	const stateOwner = () =>
		getBuilderStateOwnerAgentId(targetAgentId, { agentId: INSTANCE_AGENT_ID });

	function suspendedState(threadId: string, executionId: string): SerializableAgentState {
		return {
			status: 'suspended',
			persistence: {
				threadId,
				resourceId: owner.id,
				hostMetadata: { [EXECUTION_METADATA_KEY]: executionId },
			},
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		};
	}

	/**
	 * Record one builder turn with the parameters of `AgentsBuilderService`.
	 * `suspendRunId` saves a checkpoint while the turn runs, like a builder
	 * question. `resumeRunId` resumes such a checkpoint.
	 */
	async function recordBuilderTurn(
		parent: { threadId: string; executionId: string },
		options: { suspendRunId?: string; resumeRunId?: string } = {},
	) {
		const threadId = `ia-builder:${parent.threadId}:${targetAgentId}`;
		const parentThread = await threadRepo.findOneByOrFail({ id: parent.threadId });
		await memory.getImplementation(stateOwner()).saveThread({
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
			userMessage: options.resumeRunId ? null : 'Build a support agent',
			resourceId: owner.id,
			source: BUILDER_EXECUTION_SOURCE,
			...(options.resumeRunId
				? { resumeRunId: options.resumeRunId, sessionMode: 'existing' as const }
				: {}),
			...(executionLinks ? { executionLinks } : {}),
			threadMetadata: { parentThreadId: parent.threadId, parentAgentId: INSTANCE_AGENT_ID },
		};
		const recorder = new ExecutionRecorder();
		const { executionId } = await executionService.startExecutionRecording(
			params,
			recorder.startedAt,
		);
		if (options.suspendRunId) {
			await checkpointStorage.save(
				options.suspendRunId,
				suspendedState(threadId, executionId),
				stateOwner(),
			);
		}
		recorder.record({
			type: 'finish',
			finishReason: 'stop',
			usage: { promptTokens: 120, completionTokens: 30, totalTokens: 150 },
		});
		let hitlStatus: 'suspended' | 'resumed' | undefined;
		if (options.suspendRunId) hitlStatus = 'suspended';
		else if (options.resumeRunId) hitlStatus = 'resumed';
		await executionService.finalizeExecution(executionId, {
			...params,
			record: recorder.getMessageRecord(),
			hitlStatus,
		});
		return { threadId, executionId };
	}

	async function addObservation(agentId: string, threadId: string) {
		await memory
			.getImplementation(agentId)
			.appendObservationLogEntries([
				{ observationScopeId: threadId, marker: 'info', text: 'The user wants Slack.' },
			]);
	}

	async function observationsOf(agentId: string, threadId: string) {
		return await memory
			.getImplementation(agentId)
			.getObservationLog({ observationScopeId: threadId });
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
		const memoryThread = await memory.getImplementation(stateOwner()).getThread(first.threadId);
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
		expect(await memory.getImplementation(stateOwner()).getThread(builder.threadId)).toBeNull();
		expect(await threadRepo.findOneBy({ id: otherBuilder.threadId })).not.toBeNull();
	});

	it('keys the builder state on the system agent and resumes without an override', async () => {
		const parent = await createParentTurn();
		expect(stateOwner()).toBe(INSTANCE_AGENT_ID);

		const suspended = await recordBuilderTurn(parent, { suspendRunId: 'builder-run-1' });
		await addObservation(stateOwner(), suspended.threadId);

		expect(await checkpointRepo.findByRunId('builder-run-1')).toMatchObject({
			agentId: INSTANCE_AGENT_ID,
			threadId: suspended.threadId,
		});
		expect(await observationsOf(INSTANCE_AGENT_ID, suspended.threadId)).toHaveLength(1);
		expect(await observationsOf(targetAgentId, suspended.threadId)).toEqual([]);

		// The admission reads the checkpoint under the session agent.
		const resumed = await recordBuilderTurn(parent, { resumeRunId: 'builder-run-1' });
		expect(resumed.threadId).toBe(suspended.threadId);
		expect(
			(await executionRepo.findByThreadIdOrdered(suspended.threadId)).map(({ id }) => id),
		).toEqual([suspended.executionId, resumed.executionId]);
	});

	it('deletes the builder checkpoints and observations with the parent thread', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent, { suspendRunId: 'builder-run-1' });
		await addObservation(stateOwner(), builder.threadId);
		// Another parent's builder state uses the same agent and must stay.
		const otherParent = await createParentTurn();
		const otherBuilder = await recordBuilderTurn(otherParent, { suspendRunId: 'builder-run-2' });
		await addObservation(stateOwner(), otherBuilder.threadId);
		await executionRepo.update({ threadId: parent.threadId }, { status: 'success' });

		await systemAgentService.deleteThread(INSTANCE_AGENT_ID, owner, parent.threadId);

		expect(await checkpointRepo.findByRunId('builder-run-1')).toBeNull();
		expect(await observationsOf(INSTANCE_AGENT_ID, builder.threadId)).toEqual([]);
		expect(await checkpointRepo.findByRunId('builder-run-2')).not.toBeNull();
		expect(await observationsOf(INSTANCE_AGENT_ID, otherBuilder.threadId)).toHaveLength(1);
	});

	it('keeps the builder checkpoints and observations when the built agent is deleted', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent, { suspendRunId: 'builder-run-1' });
		await addObservation(stateOwner(), builder.threadId);

		await agentRepo.delete({ id: targetAgentId });

		expect(await checkpointRepo.findByRunId('builder-run-1')).toMatchObject({
			agentId: INSTANCE_AGENT_ID,
			expired: false,
		});
		expect(await observationsOf(INSTANCE_AGENT_ID, builder.threadId)).toHaveLength(1);
	});

	it('keeps the builder state on the built agent without a parent execution', async () => {
		// The v1 builder records nothing and keys its state on the built agent.
		const v1Owner = getBuilderStateOwnerAgentId(targetAgentId);
		expect(v1Owner).toBe(targetAgentId);
		const threadId = `ia-builder:${uuid()}:${targetAgentId}`;
		await memory.getImplementation(v1Owner).saveThread({ id: threadId, resourceId: owner.id });
		await checkpointStorage.save(
			'builder-run-v1',
			{
				status: 'suspended',
				persistence: { threadId, resourceId: owner.id },
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			},
			v1Owner,
		);
		await addObservation(v1Owner, threadId);

		expect(await checkpointRepo.findByRunId('builder-run-v1')).toMatchObject({
			agentId: targetAgentId,
		});
		expect(await observationsOf(targetAgentId, threadId)).toHaveLength(1);
		expect(await observationsOf(INSTANCE_AGENT_ID, threadId)).toEqual([]);

		// As before, the checkpoints go with the built agent.
		await agentRepo.delete({ id: targetAgentId });
		expect(await checkpointRepo.findByRunId('builder-run-v1')).toBeNull();
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

		expect(
			await threadRepo.findOwnedById(INSTANCE_AGENT_ID, owner.id, builder.threadId),
		).toBeNull();
		expect((await threadRepo.findOwnedById(INSTANCE_AGENT_ID, owner.id, parent.threadId))?.id).toBe(
			parent.threadId,
		);
	});

	it('does not open a builder session through the system agent session entry points', async () => {
		const parent = await createParentTurn();
		const builder = await recordBuilderTurn(parent);
		await executionRepo.update({ threadId: parent.threadId }, { status: 'success' });

		await expect(
			systemAgentService.getThread(INSTANCE_AGENT_ID, owner, builder.threadId),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.getUsableThread(INSTANCE_AGENT_ID, owner, builder.threadId),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.updateThread(INSTANCE_AGENT_ID, owner, builder.threadId, {
				title: 'Renamed',
			}),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.sendMessage({
				agentId: INSTANCE_AGENT_ID,
				user: owner,
				threadId: builder.threadId,
				message: 'hi',
			}),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.cancel(INSTANCE_AGENT_ID, owner, builder.threadId),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.deleteThread(INSTANCE_AGENT_ID, owner, builder.threadId),
		).rejects.toThrow(NotFoundError);
		// A client cannot start a new session with the id of a builder session.
		await expect(
			systemAgentService.createThread({
				agentId: INSTANCE_AGENT_ID,
				user: owner,
				projectId: workingProjectId,
				threadId: builder.threadId,
			}),
		).rejects.toThrow(NotFoundError);
		await expect(
			systemAgentService.prepareChatMessage({
				agentId: INSTANCE_AGENT_ID,
				user: owner,
				sessionId: builder.threadId,
				message: 'hi',
			}),
		).rejects.toThrow();
		await expect(
			systemAgentService.prepareChatMessage({
				agentId: INSTANCE_AGENT_ID,
				user: owner,
				projectId: workingProjectId,
				sessionId: builder.threadId,
				message: 'hi',
			}),
		).rejects.toThrow(NotFoundError);

		expect(await threadRepo.findOneBy({ id: builder.threadId })).toMatchObject({
			title: null,
			parentThreadId: parent.threadId,
		});
		expect(await executionRepo.findByThreadIdOrdered(builder.threadId)).toHaveLength(1);
	});

	/**
	 * These tests do not initialize the agents module, so its user deletion
	 * handler is not registered (see `system-agent-user-deletion.test.ts`).
	 * The database decides: the owner column is set to null, and deleting the
	 * personal project cascades to the sessions in it. A builder session has
	 * the working project of its parent, so it always shares the fate of its
	 * parent.
	 */
	describe('when the session owner is deleted', () => {
		async function deleteUserWithSessions(projectOf: (user: User) => Promise<string>) {
			const user = await createMember();
			workingProjectId = await projectOf(user);
			const parentThread = await threadRepo.save(
				threadRepo.create({
					id: uuid(),
					agentId: INSTANCE_AGENT_ID,
					agentName: 'Assistant',
					projectId: workingProjectId,
					accessScope: 'user',
					ownerId: user.id,
				}),
			);
			const parentExecution = await executionRepo.save(
				executionRepo.create({ id: uuid(), threadId: parentThread.id, status: 'success' }),
			);
			const previousOwner = owner;
			owner = user;
			try {
				const builder = await recordBuilderTurn({
					threadId: parentThread.id,
					executionId: parentExecution.id,
				});
				await Container.get(UserService).deleteUser(admin, user.id);
				return { parentThreadId: parentThread.id, builderThreadId: builder.threadId };
			} finally {
				owner = previousOwner;
			}
		}

		it('keeps the parent and the builder session of a team project, without an owner', async () => {
			const { parentThreadId, builderThreadId } = await deleteUserWithSessions(
				async (user) => (await createTeamProject(undefined, user)).id,
			);

			for (const id of [parentThreadId, builderThreadId]) {
				expect(await threadRepo.findOneBy({ id })).toMatchObject({ ownerId: null });
			}
			expect(await executionRepo.findByThreadIdOrdered(builderThreadId)).toHaveLength(1);
		});

		it('deletes the parent and the builder session of the personal project together', async () => {
			const { parentThreadId, builderThreadId } = await deleteUserWithSessions(
				async (user) =>
					(await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id)).id,
			);

			expect(await threadRepo.findOneBy({ id: parentThreadId })).toBeNull();
			expect(await threadRepo.findOneBy({ id: builderThreadId })).toBeNull();
		});
	});
});
