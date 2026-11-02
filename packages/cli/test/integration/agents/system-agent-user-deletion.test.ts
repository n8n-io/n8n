import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { v4 as uuid } from 'uuid';

import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { chatThreadId } from '@/modules/agents/agent-test-chat.service';
import { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { registerUserDeletionHandler } from '@/modules/agents/register-user-deletion-handler';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentMemoryEntryRepository } from '@/modules/agents/repositories/agent-memory-entry.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
} from '@/modules/agents/utils/agent-memory-scope';
import { UserService } from '@/services/user.service';

import { createMember, createOwner } from '../shared/db/users';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

describe('Agent memory on user deletion', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let checkpointRepo: AgentCheckpointRepository;
	let entryRepo: AgentMemoryEntryRepository;
	let agentRepo: AgentRepository;
	let memory: N8nMemory;
	let admin: User;
	const destroy = vi.fn(async () => {});

	beforeAll(async () => {
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		checkpointRepo = Container.get(AgentCheckpointRepository);
		entryRepo = Container.get(AgentMemoryEntryRepository);
		agentRepo = Container.get(AgentRepository);
		memory = Container.get(N8nMemory);
		admin = await createOwner();
		await Container.get(SystemAgentRegistrationService).register({
			agentId: INSTANCE_AGENT_ID,
			name: 'Assistant',
			authorize: async () => true,
			prepareTurn: vi.fn(),
			workspace: { acquire: async () => undefined, destroy },
		});
		registerUserDeletionHandler();
	});

	afterEach(async () => {
		destroy.mockClear();
		await checkpointRepo.delete({});
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({ scope: 'project' });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createSession(
		user: User,
		system = false,
		resourceId = draftChatMemoryResourceId(user.id),
		personal = false,
	) {
		const project = personal
			? await getPersonalProject(user)
			: await createTeamProject(undefined, user);
		const agent = system
			? await agentRepo.findOneByOrFail({ id: INSTANCE_AGENT_ID })
			: await agentRepo.save(
					agentRepo.create({ name: 'Audit agent', projectId: project.id, integrations: [] }),
				);
		const threadId = uuid();
		await threadRepo.save(
			threadRepo.create({
				id: threadId,
				agentId: agent.id,
				agentName: agent.name,
				projectId: project.id,
				accessScope: 'user',
				ownerId: user.id,
			}),
		);
		await executionRepo.save(
			executionRepo.create({
				id: uuid(),
				threadId,
				status: 'success',
				author: { id: user.id, name: 'Test member' },
			}),
		);
		await checkpointRepo.save(
			checkpointRepo.create({
				runId: `run-${threadId}`,
				agentId: agent.id,
				threadId,
				state: '{}',
			}),
		);
		const store = memory.getImplementation(agent.id);
		await store.saveThread({ id: threadId, resourceId });
		await store.saveMessages({
			threadId,
			resourceId,
			messages: [
				{
					id: uuid(),
					createdAt: new Date(),
					role: 'user',
					content: [{ type: 'text', text: 'Keep this action in history.' }],
				},
			],
		});
		const scope = { resourceId, threadId };
		const candidate = await store.episodic.enqueueCaptureCandidate({
			...scope,
			sourceMessageId: null,
			runId: uuid(),
			toolCallId: uuid(),
			content: 'A stored preference.',
			evidenceText: 'Keep this preference.',
			kind: 'preference',
		});
		const source = { candidateId: candidate.id, threadId, evidenceText: candidate.evidenceText };
		const entry = await entryRepo.saveEntryWithSources(
			agent.id,
			{
				resourceId,
				content: candidate.content,
				embedding: new Float32Array([1, 0]),
				embeddingModel: 'test-model',
			},
			[source],
			{},
		);
		if (!entry) throw new Error('Expected a memory entry');
		return { store, scope, entry, source, agentId: agent.id };
	}

	it.each([
		{ name: 'Preview', system: false, resourceId: draftChatMemoryResourceId },
		{ name: 'n8n Chat', system: false, resourceId: productionChatMemoryResourceId },
	])(
		'keeps $name session history and clears private embeddings',
		async ({ system, resourceId }) => {
			const user = await createMember();
			const { store, scope, entry } = await createSession(user, system, resourceId(user.id));
			const before = await threadRepo.findOneByOrFail({ id: scope.threadId });
			expect(
				await Container.get(AgentExecutionService).getThreadDetail(
					scope.threadId,
					before.projectId,
					before.agentId,
					admin.id,
				),
			).toBeNull();
			const sources = await store.episodic.getEntrySources([entry.id]);
			const messages = await store.getMessages(scope.threadId);

			await Container.get(UserService).deleteUser(admin, user.id);

			expect(await threadRepo.findOneBy({ id: scope.threadId })).toMatchObject({ ownerId: null });
			expect(await executionRepo.findByThreadIdOrdered(scope.threadId)).toHaveLength(1);
			expect(await checkpointRepo.findByRunId(`run-${scope.threadId}`)).not.toBeNull();
			expect(await store.getMessages(scope.threadId)).toEqual(messages);
			expect(await entryRepo.findOneByOrFail({ id: entry.id })).toMatchObject({
				status: 'deleted',
				embedding: null,
				embeddingModel: null,
				content: entry.content,
			});
			expect(await store.episodic.getEntrySources([entry.id])).toEqual(sources);
			expect(await store.episodic.getPendingCaptureCandidates(scope)).toEqual([]);
			const history = await Container.get(AgentExecutionService).getThreads(
				before.projectId,
				before.agentId,
				admin.id,
				10,
			);
			expect(history.threads).toEqual([
				expect.objectContaining({ id: scope.threadId, canContinueInPreview: false }),
			]);
			expect(
				await Container.get(AgentExecutionService).getThreadDetail(
					scope.threadId,
					before.projectId,
					before.agentId,
					admin.id,
				),
			).not.toBeNull();
			expect(destroy).not.toHaveBeenCalled();
		},
	);

	it.each([false, true])(
		'removes personal-project agent data with transfer=%s',
		async (transfer) => {
			const user = await createMember();
			const personal = await createSession(user, false, draftChatMemoryResourceId(user.id), true);
			const instance = await createSession(user, true, systemChatMemoryResourceId(user.id), true);
			const kept = await createSession(user, false, productionChatMemoryResourceId(user.id));
			const other = await createMember();
			const untouched = await createSession(other);
			const builderId = chatThreadId(personal.agentId, user.id);
			await personal.store.saveThread({ id: builderId, resourceId: personal.scope.resourceId });
			await personal.store.saveMessages({
				threadId: builderId,
				resourceId: personal.scope.resourceId,
				messages: [
					{
						id: uuid(),
						createdAt: new Date(),
						role: 'user',
						content: [{ type: 'text', text: 'A builder request.' }],
					},
				],
			});
			const logs = Container.get(AgentExecutionLogStore);
			const refs = [];
			for (const session of [personal, instance, kept]) {
				const [execution] = await executionRepo.findByThreadIdOrdered(session.scope.threadId);
				const ref = {
					agentId: session.agentId,
					threadId: session.scope.threadId,
					executionId: execution.id,
				};
				await executionRepo.update(execution.id, { storedAt: 'fs', source: 'n8n_chat_production' });
				await logs.write(ref, { timeline: [] }, 'fs');
				refs.push(ref);
			}
			const sandbox = vi
				.spyOn(Container.get(AgentKnowledgeService), 'destroyKnowledgeSandbox')
				.mockResolvedValue();
			try {
				await Container.get(UserService).deleteUser(
					admin,
					user.id,
					transfer ? (await getPersonalProject(other)).id : undefined,
				);
			} finally {
				sandbox.mockRestore();
			}
			for (const session of [personal, instance]) {
				expect(await threadRepo.findOneBy({ id: session.scope.threadId })).toBeNull();
				expect(await executionRepo.findByThreadIdOrdered(session.scope.threadId)).toEqual([]);
				expect(await session.store.getThread(session.scope.threadId)).toBeNull();
				expect(await session.store.getMessages(session.scope.threadId)).toEqual([]);
				expect(await entryRepo.findOneBy({ id: session.entry.id })).toBeNull();
			}
			expect(await agentRepo.findOneBy({ id: personal.agentId })).toBeNull();
			expect(await agentRepo.findOneBy({ id: INSTANCE_AGENT_ID })).not.toBeNull();
			expect(await checkpointRepo.findByRunId(`run-${personal.scope.threadId}`)).toBeNull();
			expect(await checkpointRepo.findByRunId(`run-${instance.scope.threadId}`)).toBeNull();
			expect(await checkpointRepo.findByRunId(`run-${kept.scope.threadId}`)).not.toBeNull();
			expect(destroy).toHaveBeenCalledExactlyOnceWith({
				agentId: instance.agentId,
				threadId: instance.scope.threadId,
				userId: user.id,
			});
			expect(await personal.store.getThread(builderId)).toBeNull();
			expect(await personal.store.getMessages(builderId)).toEqual([]);
			expect(await kept.store.getMessages(kept.scope.threadId)).toHaveLength(1);
			expect(await untouched.store.getMessages(untouched.scope.threadId)).toHaveLength(1);
			expect(await threadRepo.findOneByOrFail({ id: kept.scope.threadId })).toMatchObject({
				ownerId: null,
				accessScope: 'project',
			});
			expect(await threadRepo.findOneByOrFail({ id: untouched.scope.threadId })).toMatchObject({
				ownerId: other.id,
				accessScope: 'user',
			});
			const keptThread = await threadRepo.findOneByOrFail({ id: kept.scope.threadId });
			const detail = await Container.get(AgentExecutionService).getThreadDetail(
				kept.scope.threadId,
				keptThread.projectId,
				kept.agentId,
				admin.id,
			);
			expect(detail?.executions).toHaveLength(1);
			expect(detail?.executions[0].author).toEqual({ id: user.id, name: 'Test member' });
			for (const ref of refs) {
				expect(await logs.read(ref, 'fs')).toEqual(
					ref.agentId === kept.agentId ? expect.objectContaining({ timeline: [] }) : null,
				);
			}
			await logs.delete(refs.map((ref) => ({ ...ref, storedAt: 'fs' })));
		},
	);

	it('removes private system chats and keeps project audit sessions and chats of other users', async () => {
		const user = await createMember();
		const root = await createSession(user, true, systemChatMemoryResourceId(user.id));
		const child = await createSession(user, true, systemChatMemoryResourceId(user.id));
		const rootThread = await threadRepo.findOneByOrFail({ id: root.scope.threadId });
		await threadRepo.update(child.scope.threadId, {
			projectId: rootThread.projectId,
			parentThreadId: root.scope.threadId,
			parentAgentId: root.agentId,
		});
		const projectSession = await createSession(user);
		const other = await createMember();
		const kept = await createSession(other, true, systemChatMemoryResourceId(other.id));
		const logs = Container.get(AgentExecutionLogStore);
		const refs = [];
		for (const session of [root, child, kept]) {
			const [execution] = await executionRepo.findByThreadIdOrdered(session.scope.threadId);
			const ref = {
				agentId: session.agentId,
				threadId: session.scope.threadId,
				executionId: execution.id,
			};
			await executionRepo.update(execution.id, { storedAt: 'fs', source: 'system_chat' });
			await logs.write(ref, { timeline: [] }, 'fs');
			refs.push(ref);
		}
		const settings = Container.get(AgentsSettingsService);
		await settings.setEnabled(false);
		try {
			await Container.get(UserService).deleteUser(admin, user.id);
		} finally {
			await settings.setEnabled(true);
		}
		for (const session of [root, child]) {
			expect(await threadRepo.findOneBy({ id: session.scope.threadId })).toBeNull();
			expect(await executionRepo.findByThreadIdOrdered(session.scope.threadId)).toEqual([]);
			expect(await checkpointRepo.findByRunId(`run-${session.scope.threadId}`)).toBeNull();
			expect(await session.store.getThread(session.scope.threadId)).toBeNull();
			expect(await session.store.getMessages(session.scope.threadId)).toEqual([]);
			expect(await entryRepo.findOneBy({ id: session.entry.id })).toBeNull();
			expect(destroy).toHaveBeenCalledWith({
				agentId: session.agentId,
				threadId: session.scope.threadId,
				userId: user.id,
			});
		}
		expect(destroy).toHaveBeenCalledTimes(2);
		expect(await kept.store.getMessages(kept.scope.threadId)).toHaveLength(1);
		expect(await threadRepo.findOneByOrFail({ id: kept.scope.threadId })).toMatchObject({
			ownerId: other.id,
		});
		expect(await checkpointRepo.findByRunId(`run-${kept.scope.threadId}`)).not.toBeNull();
		const audit = await threadRepo.findOneByOrFail({ id: projectSession.scope.threadId });
		expect(
			await Container.get(AgentExecutionService).getThreadDetail(
				audit.id,
				audit.projectId,
				audit.agentId,
				admin.id,
			),
		).not.toBeNull();
		for (const ref of refs) {
			const log = await logs.read(ref, 'fs');
			if (ref.threadId === kept.scope.threadId) expect(log).not.toBeNull();
			else expect(log).toBeNull();
		}
		await logs.delete(refs.map((ref) => ({ ...ref, storedAt: 'fs' })));
	});

	it('discards pending system turns and keeps their input for audit history', async () => {
		const user = await createMember();
		const { store, scope, agentId } = await createSession(
			user,
			true,
			systemChatMemoryResourceId(user.id),
		);
		const thread = await threadRepo.findOneByOrFail({ id: scope.threadId });
		const queue = Container.get(AgentMessageQueueService);
		await queue.enqueue({
			agentId,
			projectId: thread.projectId,
			threadId: thread.id,
			sessionMode: 'existing',
			source: 'system',
			payload: {
				kind: 'system',
				userId: user.id,
				resourceId: scope.resourceId,
				messageId: uuid(),
				message: 'Keep this queued request in history.',
			},
		});
		const before = await store.getMessages(thread.id);

		await Container.get(SystemAgentExecutionService).stopThreadsOfUser(user.id);

		expect(await queue.claimNext(thread.id, async () => true)).toBeNull();
		expect(await store.getMessages(thread.id)).toEqual(before);
		expect(await threadRepo.findOneBy({ id: thread.id })).not.toBeNull();
	});

	it('keeps the account and session owner when a running system chat cannot be removed', async () => {
		const user = await createMember();
		const { scope, entry } = await createSession(user, true, systemChatMemoryResourceId(user.id));
		const deletion = vi
			.spyOn(Container.get(AgentExecutionService), 'deleteThread')
			.mockRejectedValue(new ConflictError('Session has active work'));
		try {
			await expect(Container.get(UserService).deleteUser(admin, user.id)).rejects.toThrow(
				ConflictError,
			);
		} finally {
			deletion.mockRestore();
		}
		expect(await Container.get(UserRepository).findOneBy({ id: user.id })).not.toBeNull();
		expect(await entryRepo.findOneByOrFail({ id: entry.id })).toMatchObject({
			status: 'active',
			embedding: entry.embedding,
		});
		expect(await threadRepo.findOneByOrFail({ id: scope.threadId })).toMatchObject({
			ownerId: user.id,
			accessScope: 'user',
		});
		expect(destroy).not.toHaveBeenCalled();
	}, 10_000);

	it('clears inactive and source-less user memories across agents without changing other scopes', async () => {
		const [user, other] = await Promise.all([createMember(), createMember()]);
		const first = await createSession(user);
		const second = await createSession(user);
		const kept = await createSession(other);
		const shared = await createSession(user, false, 'slack:T1:channel:C1');
		await entryRepo.update(first.entry.id, { status: 'superseded' });
		await entryRepo.update(second.entry.id, { status: 'dropped' });
		// The earlier session cleanup can leave a memory without a source.
		await second.store.deleteThread(second.scope.threadId);
		await entryRepo.insert({ ...second.entry, status: 'dropped' });

		await Container.get(UserService).deleteUser(admin, user.id);

		for (const id of [first.entry.id, second.entry.id]) {
			expect(await entryRepo.findOneByOrFail({ id })).toMatchObject({
				status: 'deleted',
				embedding: null,
			});
		}
		expect(await entryRepo.findOneByOrFail({ id: kept.entry.id })).toMatchObject({
			status: 'active',
			embedding: kept.entry.embedding,
		});
		expect(await entryRepo.findOneByOrFail({ id: shared.entry.id })).toMatchObject({
			status: 'active',
			embedding: shared.entry.embedding,
		});
	});

	it('keeps session history and disables later capture when personal data is transferred', async () => {
		const [user, transferee] = await Promise.all([createMember(), createMember()]);
		const { store, scope, entry, source, agentId } = await createSession(user);
		await Container.get(UserService).deleteUser(
			admin,
			user.id,
			(await getPersonalProject(transferee)).id,
		);

		expect(await threadRepo.findOneBy({ id: scope.threadId })).toMatchObject({ ownerId: null });
		expect(
			await entryRepo.saveEntryWithSources(
				agentId,
				{
					resourceId: scope.resourceId,
					content: entry.content,
					embedding: new Float32Array([1, 0]),
				},
				[source],
				{},
			),
		).toBeNull();
		const candidate = await store.episodic.enqueueCaptureCandidate({
			...scope,
			sourceMessageId: null,
			runId: uuid(),
			toolCallId: uuid(),
			content: 'Later fact.',
			evidenceText: 'Later evidence.',
			kind: 'fact',
		});
		expect(candidate.status).toBe('deleted');
		expect(await entryRepo.findOneByOrFail({ id: entry.id })).toMatchObject({ embedding: null });
	});

	it('clears embeddings when the Agents feature is turned off', async () => {
		const user = await createMember();
		const { entry } = await createSession(user);
		const settings = Container.get(AgentsSettingsService);
		await settings.setEnabled(false);
		try {
			await Container.get(UserService).deleteUser(admin, user.id);
			expect(await entryRepo.findOneByOrFail({ id: entry.id })).toMatchObject({
				embedding: null,
				status: 'deleted',
			});
		} finally {
			await settings.setEnabled(true);
		}
	});

	it('retires a scope while capture writes run concurrently', async () => {
		const user = await createMember();
		const { entry, source, scope, agentId } = await createSession(user);
		await Promise.all([
			entryRepo.saveEntryWithSources(
				agentId,
				{
					resourceId: scope.resourceId,
					content: entry.content,
					embedding: new Float32Array([0, 1]),
				},
				[source],
				{},
			),
			entryRepo.retireUserScopes([scope.resourceId], {}),
		]);
		expect(await entryRepo.findOneByOrFail({ id: entry.id })).toMatchObject({
			status: 'deleted',
			embedding: null,
		});
	});
});
