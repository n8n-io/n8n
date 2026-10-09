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
 * transferee, so their child sessions, memory, checkpoints, observations and
 * workspace go too.
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
	 * An Assistant session with one recorded turn and one Agent builder child
	 * session. Both have a memory thread, a checkpoint and an observation under
	 * the instance agent, like a recorded builder turn.
	 */
	async function createAssistantSession(user: User, projectId: string) {
		const parentThreadId = uuid();
		const builderThreadId = `ia-builder:${parentThreadId}:${uuid()}`;
		const session = {
			agentId: INSTANCE_AGENT_ID,
			projectId,
			accessScope: 'user' as const,
			ownerId: user.id,
		};
		await threadRepo.save(
			threadRepo.create({ ...session, id: parentThreadId, agentName: 'Assistant' }),
		);
		await threadRepo.save(
			threadRepo.create({
				...session,
				id: builderThreadId,
				agentName: 'agent-builder',
				parentThreadId,
				parentAgentId: INSTANCE_AGENT_ID,
			}),
		);
		const agentMemory = memory.getImplementation(INSTANCE_AGENT_ID);
		for (const threadId of [parentThreadId, builderThreadId]) {
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
		}
		return { parentThreadId, builderThreadId };
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
			const { parentThreadId, builderThreadId } = await createAssistantSession(
				user,
				await teamProject(user),
			);

			await Container.get(UserService).deleteUser(admin, user.id);

			for (const id of [parentThreadId, builderThreadId]) {
				expect(await threadRepo.findOneBy({ id })).toMatchObject({ ownerId: null });
			}
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
		])(
			'deletes the sessions in %s with their children, state and workspace',
			async (_case, projectOf) => {
				const user = await createMember();
				const { parentThreadId, builderThreadId } = await createAssistantSession(
					user,
					await projectOf(user),
				);

				await Container.get(UserService).deleteUser(admin, user.id);

				await expectSessionGone(parentThreadId);
				await expectSessionGone(builderThreadId);
				expect(destroy).toHaveBeenCalledExactlyOnceWith({
					agentId: INSTANCE_AGENT_ID,
					threadId: parentThreadId,
					userId: user.id,
				});
			},
		);

		it.each([
			['a team project', teamProject],
			['the personal project', personalProject],
		])('deletes the sessions in %s also when the data is transferred', async (_case, projectOf) => {
			const [user, transferee] = await Promise.all([createMember(), createMember()]);
			const { parentThreadId, builderThreadId } = await createAssistantSession(
				user,
				await projectOf(user),
			);

			await Container.get(UserService).deleteUser(
				admin,
				user.id,
				(await getPersonalProject(transferee)).id,
			);

			await expectSessionGone(parentThreadId);
			await expectSessionGone(builderThreadId);
			expect(destroy).toHaveBeenCalledTimes(1);
		});

		it('deletes the sessions when the Agents feature is turned off', async () => {
			const settings = Container.get(AgentsSettingsService);
			await settings.setEnabled(false);
			try {
				const user = await createMember();
				const { parentThreadId, builderThreadId } = await createAssistantSession(
					user,
					await teamProject(user),
				);

				await Container.get(UserService).deleteUser(admin, user.id);

				await expectSessionGone(parentThreadId);
				await expectSessionGone(builderThreadId);
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

			for (const id of [kept.parentThreadId, kept.builderThreadId]) {
				expect(await threadRepo.findOneBy({ id })).toMatchObject({ ownerId: other.id });
				expect(await checkpointRepo.findByRunId(`run-${id}`)).not.toBeNull();
			}
			expect(destroy).not.toHaveBeenCalledWith(
				expect.objectContaining({ threadId: kept.parentThreadId }),
			);
		});
	});
});
