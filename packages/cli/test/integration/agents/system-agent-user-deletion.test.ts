import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { registerUserDeletionHandler } from '@/modules/agents/register-user-deletion-handler';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { UserService } from '@/services/user.service';

import { createMember, createOwner } from '../shared/db/users';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

/**
 * A user's system agent sessions are private. When the user is deleted, the
 * agents module deletes them through `deleteThread`, with or without a
 * transferee, so their memory, checkpoints, observations and workspace go too.
 */
describe('System agent sessions on user deletion', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let checkpointRepo: AgentCheckpointRepository;
	let agentRepo: AgentRepository;
	let memory: N8nMemory;
	let admin: User;
	const destroy = vi.fn(async () => {});

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		checkpointRepo = Container.get(AgentCheckpointRepository);
		agentRepo = Container.get(AgentRepository);
		memory = Container.get(N8nMemory);
		admin = await createOwner();
		await Container.get(SystemAgentExecutionService).register({
			agentId: INSTANCE_AGENT_ID,
			name: 'Assistant',
			authorize: async () => true,
			prepareTurn: vi.fn(),
			workspace: { acquire: async () => undefined, destroy },
		});
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

	/**
	 * An Assistant session with one recorded turn, a memory thread, a
	 * checkpoint and an observation under the instance agent.
	 */
	async function createAssistantSession(user: User, projectId: string) {
		const threadId = uuid();
		await threadRepo.save(
			threadRepo.create({
				id: threadId,
				agentId: INSTANCE_AGENT_ID,
				agentName: 'Assistant',
				projectId,
				accessScope: 'user',
				ownerId: user.id,
			}),
		);
		const agentMemory = memory.getImplementation(INSTANCE_AGENT_ID);
		await executionRepo.save(executionRepo.create({ id: uuid(), threadId, status: 'success' }));
		await agentMemory.saveThread({ id: threadId, resourceId: user.id });
		await checkpointRepo.save(
			checkpointRepo.create({
				runId: `run-${threadId}`,
				agentId: INSTANCE_AGENT_ID,
				threadId,
				state: '{}',
			}),
		);
		await agentMemory.appendObservationLogEntries([
			{ observationScopeId: threadId, marker: 'info', text: 'The user wants Slack.' },
		]);
		return threadId;
	}

	async function expectSessionGone(threadId: string) {
		const agentMemory = memory.getImplementation(INSTANCE_AGENT_ID);
		expect(await threadRepo.findOneBy({ id: threadId })).toBeNull();
		expect(await executionRepo.findByThreadIdOrdered(threadId)).toEqual([]);
		expect(await checkpointRepo.findByRunId(`run-${threadId}`)).toBeNull();
		expect(await agentMemory.getThread(threadId)).toBeNull();
		expect(await agentMemory.getObservationLog({ observationScopeId: threadId })).toEqual([]);
	}

	const teamProject = async (user: User) => (await createTeamProject(undefined, user)).id;
	const personalProject = async (user: User) => (await getPersonalProject(user)).id;

	// Runs first: the handler is registered only when the agents module initializes.
	describe('when the agents module handler is not registered', () => {
		it('leaves the sessions of a team project without an owner', async () => {
			const user = await createMember();
			const threadId = await createAssistantSession(user, await teamProject(user));

			await Container.get(UserService).deleteUser(admin, user.id);

			expect(await threadRepo.findOneBy({ id: threadId })).toMatchObject({ ownerId: null });
			expect(destroy).not.toHaveBeenCalled();
		});
	});

	describe('when the agents module handler is registered', () => {
		beforeAll(() => {
			registerUserDeletionHandler();
		});

		it.each([
			['a team project', teamProject],
			['the personal project', personalProject],
		])('deletes the sessions in %s with their state and workspace', async (_case, projectOf) => {
			const user = await createMember();
			const threadId = await createAssistantSession(user, await projectOf(user));

			await Container.get(UserService).deleteUser(admin, user.id);

			await expectSessionGone(threadId);
			expect(destroy).toHaveBeenCalledExactlyOnceWith({
				agentId: INSTANCE_AGENT_ID,
				threadId,
				userId: user.id,
			});
		});

		it.each([
			['a team project', teamProject],
			['the personal project', personalProject],
		])('deletes the sessions in %s also when the data is transferred', async (_case, projectOf) => {
			const [user, transferee] = await Promise.all([createMember(), createMember()]);
			const threadId = await createAssistantSession(user, await projectOf(user));

			await Container.get(UserService).deleteUser(
				admin,
				user.id,
				(await getPersonalProject(transferee)).id,
			);

			await expectSessionGone(threadId);
			expect(destroy).toHaveBeenCalledTimes(1);
		});

		it('deletes the child sessions of delegated runs', async () => {
			const user = await createMember();
			const projectId = await teamProject(user);
			const rootId = await createAssistantSession(user, projectId);
			const childId = await createAssistantSession(user, projectId);
			const grandchildId = await createAssistantSession(user, projectId);
			await threadRepo.update(childId, {
				parentThreadId: rootId,
				parentAgentId: INSTANCE_AGENT_ID,
			});
			await threadRepo.update(grandchildId, {
				parentThreadId: childId,
				parentAgentId: INSTANCE_AGENT_ID,
			});

			await Container.get(UserService).deleteUser(admin, user.id);

			for (const threadId of [rootId, childId, grandchildId]) {
				await expectSessionGone(threadId);
			}
			expect(destroy).toHaveBeenCalledTimes(3);
		});

		it('deletes the sessions when the Agents feature is turned off', async () => {
			const settings = Container.get(AgentsSettingsService);
			await settings.setEnabled(false);
			try {
				const user = await createMember();
				const threadId = await createAssistantSession(user, await teamProject(user));

				await Container.get(UserService).deleteUser(admin, user.id);

				await expectSessionGone(threadId);
			} finally {
				await settings.setEnabled(true);
			}
		});

		it('keeps the sessions of other users', async () => {
			const [user, other] = await Promise.all([createMember(), createMember()]);
			const projectId = await teamProject(user);
			await createAssistantSession(user, projectId);
			const kept = await createAssistantSession(other, projectId);

			await Container.get(UserService).deleteUser(admin, user.id);

			expect(await threadRepo.findOneBy({ id: kept })).toMatchObject({ ownerId: other.id });
			expect(await checkpointRepo.findByRunId(`run-${kept}`)).not.toBeNull();
			expect(destroy).not.toHaveBeenCalledWith(expect.objectContaining({ threadId: kept }));
		});
	});
});
