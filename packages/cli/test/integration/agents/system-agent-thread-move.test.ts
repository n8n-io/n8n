import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';

import { createOwner } from '../shared/db/users';

const AGENT_ID = 'test-system-agent';

// The queue consumer does not run in this file, so a queued message stays queued.
describe('System agent thread move', () => {
	let service: SystemAgentExecutionService;
	let threads: AgentExecutionThreadRepository;
	let owner: User;
	let projectId: string;
	let otherProjectId: string;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Test System Agent',
		authorize: async () => true,
		prepareTurn: async () => {
			throw new Error('No turn runs in this test');
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(SystemAgentExecutionService);
		threads = Container.get(AgentExecutionThreadRepository);
		await Container.get(SystemAgentRegistrationService).register(provider);
		owner = await createOwner();
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id))
			.id;
		otherProjectId = (await createTeamProject('Other project', owner)).id;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('moves an idle thread to another project', async () => {
		const thread = await service.createThread({ agentId: AGENT_ID, user: owner, projectId });

		await service.updateThread(AGENT_ID, owner, thread.id, { projectId: otherProjectId });

		expect(await threads.findOneByOrFail({ id: thread.id })).toMatchObject({
			projectId: otherProjectId,
		});
	});

	it('refuses to move a thread with a queued message and keeps its project', async () => {
		const thread = await service.createThread({ agentId: AGENT_ID, user: owner, projectId });
		await service.sendMessage({
			agentId: AGENT_ID,
			user: owner,
			threadId: thread.id,
			message: 'Go',
		});

		await expect(
			service.updateThread(AGENT_ID, owner, thread.id, { projectId: otherProjectId }),
		).rejects.toThrow('Wait for the current turn to finish before you change the project');

		expect(await threads.findOneByOrFail({ id: thread.id })).toMatchObject({ projectId });
	});
});
