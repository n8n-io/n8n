import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { UserRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { InstanceAiThreadTabsRepository } from '@/modules/instance-ai/repositories/instance-ai-thread-tabs.repository';

import { createMember } from '../shared/db/users';

const firstState: InstanceAiThreadTabsState = {
	tabs: [
		{ type: 'workflow', id: 'wf-1', name: 'First Workflow', projectId: 'project-1' },
		{ type: 'data-table', id: 'dt-1', name: 'Table' },
	],
	closedTabs: [{ type: 'agent', id: 'agent-1' }],
	activeTab: { type: 'workflow', id: 'wf-1' },
	previewOpen: true,
};

const secondState: InstanceAiThreadTabsState = {
	tabs: [{ type: 'data-table', id: 'dt-1', name: 'Table' }],
	closedTabs: [
		{ type: 'agent', id: 'agent-1' },
		{ type: 'workflow', id: 'wf-1' },
	],
	activeTab: null,
};

describe('Instance AI thread tabs', () => {
	let tabsRepository: InstanceAiThreadTabsRepository;
	let threadRepository: AgentExecutionThreadRepository;
	let agentId: string;
	let project: Project;
	let user: User;
	let otherUser: User;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents', 'instance-ai']);
		await testDb.init();
		tabsRepository = Container.get(InstanceAiThreadTabsRepository);
		threadRepository = Container.get(AgentExecutionThreadRepository);
		project = await createTeamProject();
		user = await createMember();
		otherUser = await createMember();
		const agents = Container.get(AgentRepository);
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		agentId = agent.id;
	});

	beforeEach(async () => {
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				agentId,
				agentName: 'Agent',
				projectId: project.id,
				accessScope: 'user',
				ownerId: user.id,
			}),
		);
	});

	afterEach(async () => {
		await tabsRepository.delete({});
		await threadRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns null when no tabs are stored', async () => {
		await expect(tabsRepository.findState(threadId, user.id)).resolves.toBeNull();
	});

	it('stores the tabs and replaces them on the next save', async () => {
		await tabsRepository.saveState(threadId, user.id, firstState);
		await expect(tabsRepository.findState(threadId, user.id)).resolves.toEqual(firstState);

		await tabsRepository.saveState(threadId, user.id, secondState);
		await expect(tabsRepository.findState(threadId, user.id)).resolves.toEqual(secondState);
		await expect(tabsRepository.count()).resolves.toBe(1);
	});

	it('keeps separate tabs for each user of a thread', async () => {
		await tabsRepository.saveState(threadId, user.id, firstState);
		await tabsRepository.saveState(threadId, otherUser.id, secondState);

		await expect(tabsRepository.findState(threadId, user.id)).resolves.toEqual(firstState);
		await expect(tabsRepository.findState(threadId, otherUser.id)).resolves.toEqual(secondState);
	});

	it('deletes the tabs when the thread is deleted', async () => {
		await tabsRepository.saveState(threadId, user.id, firstState);

		await threadRepository.delete({ id: threadId });

		await expect(tabsRepository.count()).resolves.toBe(0);
	});

	it('deletes the tabs of a user when the user is deleted', async () => {
		// Threads are removed by an app event when a user is deleted, not by a
		// foreign key, so the user cascade must clear the tabs on its own.
		const deletedUser = await createMember();
		await tabsRepository.saveState(threadId, deletedUser.id, firstState);
		await tabsRepository.saveState(threadId, user.id, secondState);

		await Container.get(UserRepository).delete({ id: deletedUser.id });

		await expect(tabsRepository.findState(threadId, deletedUser.id)).resolves.toBeNull();
		await expect(tabsRepository.findState(threadId, user.id)).resolves.toEqual(secondState);
		await expect(threadRepository.existsBy({ id: threadId })).resolves.toBe(true);
	});
});
