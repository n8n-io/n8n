import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
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
	) {
		const project = await createTeamProject(undefined, user);
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
		await executionRepo.save(executionRepo.create({ id: uuid(), threadId, status: 'success' }));
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
		{ name: 'system chat', system: true, resourceId: systemChatMemoryResourceId },
	])(
		'keeps $name session history and clears private embeddings',
		async ({ system, resourceId }) => {
			const user = await createMember();
			const { store, scope, entry } = await createSession(user, system, resourceId(user.id));
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
			expect(destroy).not.toHaveBeenCalled();
		},
	);

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
