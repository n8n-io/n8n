import type { InstanceAiThreadInfo } from '@n8n/api-types';
import type { Project, User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../../../agents/repositories/agent-execution-thread.repository';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import { SharedThreadFields } from '../shared-thread-fields';

const makeUser = (id: string, firstName: string, lastName: string) =>
	mock<User>({ id, firstName, lastName });

const ada = makeUser('ada', 'Ada', 'Lovelace');
const grace = makeUser('grace', 'Grace', 'Hopper');
const finance = mock<Project>({ id: 'finance', name: 'Finance' });
const sales = mock<Project>({ id: 'sales', name: 'Sales' });

const info = (id: string, resourceId = ada.id): InstanceAiThreadInfo => ({
	id,
	title: id,
	resourceId,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z',
	metadata: { assistantTurnDefaults: { pushRef: 'push-1' }, source: 'assistant_page' },
});

const sharedRow = (id: string, projectId: string, ownerId: string | null) =>
	mock<AgentExecutionThread>({ id, projectId, ownerId, accessScope: 'project' });

function setup(shared: AgentExecutionThread[]) {
	const threads = mock<AgentExecutionThreadRepository>();
	const projectService = mock<ProjectService>();
	const users = mock<UserRepository>();
	threads.findSharedByIds.mockResolvedValue(shared);
	projectService.findProject.mockImplementation(
		async (id) => [finance, sales].find((project) => project.id === id) ?? null,
	);
	users.findManyByIds.mockImplementation(async (ids) =>
		[ada, grace].filter((user) => ids.includes(user.id)),
	);
	return {
		fields: new SharedThreadFields(threads, projectService, users),
		threads,
		projectService,
		users,
	};
}

describe('SharedThreadFields.addTo', () => {
	it('returns the list as it is, and looks up nothing else, when no thread is shared', async () => {
		const { fields, threads, projectService, users } = setup([]);
		const list = [info('mine'), info('other', grace.id)];

		await expect(fields.addTo(grace, list)).resolves.toBe(list);
		expect(threads.findSharedByIds).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, ['mine', 'other']);
		expect(projectService.findProject).not.toHaveBeenCalled();
		expect(users.findManyByIds).not.toHaveBeenCalled();
	});

	it('marks each shared thread with its project and owner', async () => {
		const { fields } = setup([
			sharedRow('a', finance.id, ada.id),
			sharedRow('b', sales.id, grace.id),
		]);

		const result = await fields.addTo(ada, [info('a'), info('b', grace.id), info('private')]);

		expect(result.map(({ sharedWith, owner }) => ({ sharedWith, owner }))).toEqual([
			{
				sharedWith: { projectId: 'finance', projectName: 'Finance' },
				owner: { id: 'ada', name: 'Ada Lovelace' },
			},
			{
				sharedWith: { projectId: 'sales', projectName: 'Sales' },
				owner: { id: 'grace', name: 'Grace Hopper' },
			},
			{ sharedWith: undefined, owner: undefined },
		]);
	});

	it('looks up each project and owner once', async () => {
		const { fields, projectService, users } = setup([
			sharedRow('a', finance.id, ada.id),
			sharedRow('b', finance.id, ada.id),
		]);

		await fields.addTo(ada, [info('a'), info('b')]);

		expect(projectService.findProject).toHaveBeenCalledTimes(1);
		expect(users.findManyByIds).toHaveBeenCalledWith(['ada']);
	});

	it('names an owner without a name by email', async () => {
		const { fields, users } = setup([sharedRow('a', finance.id, 'sso')]);
		users.findManyByIds.mockResolvedValue([
			mock<User>({ id: 'sso', firstName: '', lastName: '', email: 'sso-user@example.com' }),
		]);

		const [thread] = await fields.addTo(ada, [info('a', 'sso')]);

		expect(thread.owner).toEqual({ id: 'sso', name: 'sso-user@example.com' });
	});

	it('uses empty names for a project or an owner that is gone', async () => {
		const { fields } = setup([sharedRow('a', 'gone', 'deleted-user')]);

		const [thread] = await fields.addTo(ada, [info('a', 'deleted-user')]);

		expect(thread).toMatchObject({
			sharedWith: { projectId: 'gone', projectName: '' },
			owner: { id: 'deleted-user', name: '' },
		});
	});

	it("hides the owner's turn defaults from other users only", async () => {
		const { fields } = setup([sharedRow('a', finance.id, ada.id)]);

		const [forGrace] = await fields.addTo(grace, [info('a')]);
		const [forAda] = await fields.addTo(ada, [info('a')]);

		expect(forGrace.metadata).toEqual({ source: 'assistant_page' });
		expect(forAda.metadata).toEqual(info('a').metadata);
	});
});

describe('SharedThreadFields.addTo run target', () => {
	const LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
	const linkedTarget = { kind: 'linked' as const, instanceId: LINK_ID, name: 'Cloud' };

	it('keeps the run target for the owner of a shared thread', async () => {
		const { fields } = setup([sharedRow('a', finance.id, ada.id)]);

		const [result] = await fields.addTo(ada, [{ ...info('a'), runTarget: linkedTarget }]);

		expect(result.runTarget).toEqual(linkedTarget);
	});

	it('drops the run target and the owner-only defaults for a teammate', async () => {
		const { fields } = setup([sharedRow('a', finance.id, ada.id)]);
		const thread = {
			...info('a'),
			runTarget: linkedTarget,
			metadata: {
				assistantTurnDefaults: { pushRef: 'push-1', runTarget: linkedTarget },
				source: 'assistant_page',
			},
		};

		const [result] = await fields.addTo(grace, [thread]);

		expect(result).not.toHaveProperty('runTarget');
		expect(result.metadata).toEqual({ source: 'assistant_page' });
		expect(result.owner).toEqual({ id: 'ada', name: 'Ada Lovelace' });
	});
});
