import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { InstanceAiThreadTabsRepository } from '@/modules/instance-ai/repositories/instance-ai-thread-tabs.repository';
import { InstanceAiThreadRepository } from '@/modules/instance-ai/repositories/instance-ai-thread.repository';

import { createMember } from '../shared/db/users';

const firstState: InstanceAiThreadTabsState = {
	tabs: [
		{ type: 'workflow', id: 'wf-1', name: 'First Workflow', projectId: 'project-1' },
		{ type: 'data-table', id: 'dt-1', name: 'Table' },
	],
	closedTabs: [{ type: 'agent', id: 'agent-1' }],
	activeTab: { type: 'workflow', id: 'wf-1' },
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
	let threadRepository: InstanceAiThreadRepository;
	let project: Project;
	let user: User;
	let otherUser: User;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		tabsRepository = Container.get(InstanceAiThreadTabsRepository);
		threadRepository = Container.get(InstanceAiThreadRepository);
		project = await createTeamProject();
		user = await createMember();
		otherUser = await createMember();
	});

	beforeEach(async () => {
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				resourceId: user.id,
				projectId: project.id,
				title: '',
				metadata: null,
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
});
