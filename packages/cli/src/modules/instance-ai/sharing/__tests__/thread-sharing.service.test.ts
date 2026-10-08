import type { InstanceAiThreadInfo } from '@n8n/api-types';
import type { Project, ProjectRelation, User, UserRepository } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../../../agents/repositories/agent-execution-thread.repository';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import type { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import { ThreadSharingService } from '../thread-sharing.service';

const READER: Scope[] = ['instanceAi:message', 'project:read'];
const EDITOR: Scope[] = [...READER, 'workflow:update', 'workflow:publish'];

const makeUser = (id: string, firstName: string, lastName: string) =>
	mock<User>({ id, firstName, lastName, role: { slug: 'global:member', scopes: [] } });

const owner = makeUser('owner-1', 'Ada', 'Lovelace');
const teammate = makeUser('teammate-1', 'Grace', 'Hopper');

const teamProject = mock<Project>({ id: 'project-1', name: 'Finance', type: 'team' });
const personalProject = mock<Project>({ id: 'project-2', name: 'Ada', type: 'personal' });

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return mock<AgentExecutionThread>({
		id: 'thread-1',
		agentId: ASSISTANT_AGENT_ID,
		projectId: teamProject.id,
		accessScope: 'user',
		ownerId: owner.id,
		parentThreadId: null,
		...overrides,
	});
}

const info = (id: string): InstanceAiThreadInfo => ({
	id,
	title: id,
	resourceId: owner.id,
	projectId: teamProject.id,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z',
});

function relation(project: Pick<Project, 'id' | 'type'>, scopes: Scope[]): ProjectRelation {
	return mock<ProjectRelation>({
		projectId: project.id,
		project: mock<Project>({ id: project.id, type: project.type }),
		role: { scopes: scopes.map((slug) => ({ slug })) },
	});
}

function setup() {
	const threads = mock<AgentExecutionThreadRepository>();
	const projectService = mock<ProjectService>();
	const users = mock<UserRepository>();
	const memory = mock<InstanceAiMemoryService>();
	const service = new ThreadSharingService(threads, projectService, users, memory);

	projectService.findProject.mockImplementation(
		async (id) => [teamProject, personalProject].find((project) => project.id === id) ?? null,
	);
	projectService.getProjectScopesForUser.mockResolvedValue(EDITOR);
	users.findOneBy.mockResolvedValue(owner);
	users.findManyByIds.mockResolvedValue([owner]);
	memory.getThreadInfo.mockImplementation(async (id) => info(id));
	threads.findSharedByIds.mockResolvedValue([]);

	return { service, threads, projectService, users, memory };
}

const SHARED_FIELDS = {
	sharedWith: { projectId: 'project-1', projectName: 'Finance' },
	owner: { id: 'owner-1', name: 'Ada Lovelace' },
};

describe('ThreadSharingService', () => {
	describe('share', () => {
		it('shares a private thread of the owner and returns it with the sharing fields', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(makeThread());
			threads.findSharedByIds.mockResolvedValue([makeThread({ accessScope: 'project' })]);

			const result = await service.share(owner, 'thread-1');

			expect(threads.findOneBy).toHaveBeenCalledWith({
				id: 'thread-1',
				agentId: ASSISTANT_AGENT_ID,
			});
			expect(threads.shareWithProject).toHaveBeenCalledWith('thread-1', owner.id);
			expect(result).toEqual({ ...info('thread-1'), ...SHARED_FIELDS });
		});

		it('returns a shared thread again without a second update', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(makeThread({ accessScope: 'project' }));
			threads.findSharedByIds.mockResolvedValue([makeThread({ accessScope: 'project' })]);

			await expect(service.share(owner, 'thread-1')).resolves.toMatchObject(SHARED_FIELDS);
			expect(threads.shareWithProject).not.toHaveBeenCalled();
		});

		it('refuses a thread in a personal project', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(makeThread({ projectId: personalProject.id }));

			const share = service.share(owner, 'thread-1');

			await expect(share).rejects.toThrow(BadRequestError);
			await expect(share).rejects.toThrow('Move this chat to a team project to share it.');
			expect(threads.shareWithProject).not.toHaveBeenCalled();
		});

		it('refuses an owner who can no longer read the project', async () => {
			const { service, threads, projectService } = setup();
			threads.findOneBy.mockResolvedValue(makeThread());
			projectService.getProjectScopesForUser.mockResolvedValue(['instanceAi:message']);

			await expect(service.share(owner, 'thread-1')).rejects.toThrow(ForbiddenError);
			expect(projectService.getProjectScopesForUser).toHaveBeenCalledWith(owner, 'project-1');
			expect(threads.shareWithProject).not.toHaveBeenCalled();
		});

		it('tells a teammate that only the owner shares', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(makeThread({ accessScope: 'project' }));

			const share = service.share(teammate, 'thread-1');
			await expect(share).rejects.toThrow(ForbiddenError);
			await expect(share).rejects.toThrow('Only the owner can share this chat.');
		});

		it('answers 404 to a user who cannot read the thread', async () => {
			const { service, threads, projectService } = setup();
			threads.findOneBy.mockResolvedValue(makeThread());

			await expect(service.share(teammate, 'thread-1')).rejects.toThrow(NotFoundError);
			// A private thread of another user needs no scope lookup to refuse.
			expect(projectService.getProjectScopesForUser).not.toHaveBeenCalled();
		});

		it('answers 404 for an unknown thread or a thread without project', async () => {
			const { service, threads, projectService } = setup();
			threads.findOneBy.mockResolvedValueOnce(null);
			await expect(service.share(owner, 'missing')).rejects.toThrow(NotFoundError);

			threads.findOneBy.mockResolvedValueOnce(makeThread({ projectId: 'gone' }));
			await expect(service.share(owner, 'thread-1')).rejects.toThrow(NotFoundError);
			expect(projectService.findProject).toHaveBeenCalledWith('gone');
		});
	});

	describe('assertCanRead', () => {
		it.each([
			['the owner of a private thread', owner, makeThread(), READER],
			['the owner of a shared thread', owner, makeThread({ accessScope: 'project' }), []],
			['a teammate with read scopes', teammate, makeThread({ accessScope: 'project' }), READER],
		])('lets %s read', async (_label, user, thread, scopes) => {
			const { service, threads, projectService } = setup();
			threads.findOneBy.mockResolvedValue(thread);
			projectService.getProjectScopesForUser.mockResolvedValue(scopes);

			await expect(service.assertCanRead(user, 'thread-1')).resolves.toBeUndefined();
		});

		it.each([
			['a private thread of another user', makeThread(), EDITOR],
			[
				'a shared thread without read scopes',
				makeThread({ accessScope: 'project' }),
				['project:read'],
			],
			[
				'a thread of another agent',
				makeThread({ agentId: 'other-agent', accessScope: 'project' }),
				EDITOR,
			],
		])('answers 404 to a teammate for %s', async (_label, thread, scopes: Scope[]) => {
			const { service, threads, projectService } = setup();
			threads.findOneBy.mockResolvedValue(thread);
			projectService.getProjectScopesForUser.mockResolvedValue(scopes);

			await expect(service.assertCanRead(teammate, 'thread-1')).rejects.toThrow(NotFoundError);
		});

		it('lets a new thread id through only when the route allows new threads', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(null);

			await expect(
				service.assertCanRead(owner, 'new-thread', { allowNew: true }),
			).resolves.toBeUndefined();
			await expect(service.assertCanRead(owner, 'new-thread')).rejects.toThrow(NotFoundError);
		});

		it('does not let an existing thread through because the route allows new threads', async () => {
			const { service, threads } = setup();
			threads.findOneBy.mockResolvedValue(makeThread());

			await expect(service.assertCanRead(teammate, 'thread-1', { allowNew: true })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('listThreads', () => {
		it('adds the shared threads of the team projects where the user can read them', async () => {
			const { service, projectService, memory, threads } = setup();
			projectService.getProjectRelationsForUser.mockResolvedValue([
				relation({ id: 'team-reader', type: 'team' }, READER),
				relation({ id: 'team-chat-user', type: 'team' }, ['agent:execute']),
				relation({ id: 'personal', type: 'personal' }, EDITOR),
			]);
			memory.listThreads.mockResolvedValue({
				threads: [info('mine'), info('shared')],
				total: 2,
				page: 0,
				hasMore: false,
			});
			threads.findSharedByIds.mockResolvedValue([
				makeThread({ id: 'shared', accessScope: 'project' }),
			]);

			const result = await service.listThreads(teammate);

			expect(memory.listThreads).toHaveBeenCalledWith(teammate.id, 0, 100, ['team-reader']);
			expect(threads.findSharedByIds).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, ['mine', 'shared']);
			expect(result).toEqual({
				threads: [info('mine'), { ...info('shared'), ...SHARED_FIELDS }],
				total: 2,
				page: 0,
				hasMore: false,
			});
		});

		it('reads no names when no listed thread is shared', async () => {
			const { service, projectService, memory, users } = setup();
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
			memory.listThreads.mockResolvedValue({
				threads: [info('mine')],
				total: 1,
				page: 0,
				hasMore: false,
			});

			const result = await service.listThreads(owner);

			expect(result.threads).toEqual([info('mine')]);
			expect(memory.listThreads).toHaveBeenCalledWith(owner.id, 0, 100, []);
			expect(users.findManyByIds).not.toHaveBeenCalled();
			expect(projectService.findProject).not.toHaveBeenCalled();
		});
	});

	describe('owner-only metadata', () => {
		const withMetadata = (id: string): InstanceAiThreadInfo => ({
			...info(id),
			metadata: { assistantTurnDefaults: { pushRef: 'push-ref-1' }, source: 'assistant_page' },
		});

		it('hides the turn defaults of the owner from a teammate', async () => {
			const { service, threads, memory } = setup();
			memory.getThreadInfo.mockResolvedValue(withMetadata('thread-1'));
			threads.findSharedByIds.mockResolvedValue([makeThread({ accessScope: 'project' })]);

			const thread = await service.getThreadInfo(teammate, 'thread-1');

			expect(thread.metadata).toEqual({ source: 'assistant_page' });
			expect(thread).toMatchObject(SHARED_FIELDS);
		});

		it('keeps the turn defaults for the owner', async () => {
			const { service, threads, memory } = setup();
			memory.getThreadInfo.mockResolvedValue(withMetadata('thread-1'));
			threads.findSharedByIds.mockResolvedValue([makeThread({ accessScope: 'project' })]);

			const thread = await service.getThreadInfo(owner, 'thread-1');

			expect(thread.metadata).toEqual(withMetadata('thread-1').metadata);
		});

		it('hides them in a list too, and keeps a thread without metadata as it is', async () => {
			const { service, threads, memory, projectService } = setup();
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
			memory.listThreads.mockResolvedValue({
				threads: [withMetadata('shared'), info('plain')],
				total: 2,
				page: 0,
				hasMore: false,
			});
			threads.findSharedByIds.mockResolvedValue([
				makeThread({ id: 'shared', accessScope: 'project' }),
				makeThread({ id: 'plain', accessScope: 'project' }),
			]);

			const { threads: listed } = await service.listThreads(teammate);

			expect(listed[0].metadata).toEqual({ source: 'assistant_page' });
			expect(listed[1]).not.toHaveProperty('metadata');
		});
	});

	describe('listThreadHistory', () => {
		it('passes the readable team projects and marks shared threads', async () => {
			const { service, projectService, memory, threads } = setup();
			projectService.getProjectRelationsForUser.mockResolvedValue([
				relation({ id: 'project-1', type: 'team' }, EDITOR),
			]);
			memory.listThreadHistory.mockResolvedValue({
				threads: [info('shared')],
				hasMore: false,
				nextCursor: null,
			});
			threads.findSharedByIds.mockResolvedValue([
				makeThread({ id: 'shared', accessScope: 'project' }),
			]);

			const result = await service.listThreadHistory(teammate, { limit: 30 });

			expect(memory.listThreadHistory).toHaveBeenCalledWith(teammate.id, { limit: 30 }, [
				'project-1',
			]);
			expect(result.threads).toEqual([{ ...info('shared'), ...SHARED_FIELDS }]);
		});
	});

	describe('sendError', () => {
		it('names the owner', async () => {
			const { service } = setup();

			const error = await service.sendError(teammate, makeThread({ accessScope: 'project' }));

			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.message).toBe('Only Ada Lovelace can send messages here.');
		});

		it('falls back to "the owner" when the owner is gone', async () => {
			const { service, users } = setup();
			users.findOneBy.mockResolvedValue(null);

			const error = await service.sendError(teammate, makeThread({ accessScope: 'project' }));

			expect(error.message).toBe('Only the owner can send messages here.');
		});
	});

	describe('authorizeAnswer', () => {
		const shared = makeThread({ accessScope: 'project' });

		it('returns the answer of an editor without "always allow"', async () => {
			const { service } = setup();

			await expect(
				service.authorizeAnswer(teammate, shared, 'deploy_workflow', {
					kind: 'approval',
					approved: true,
					scope: 'session',
				}),
			).resolves.toEqual({ kind: 'approval', approved: true, scope: 'once' });
		});

		it('refuses a viewer with the project name', async () => {
			const { service, projectService } = setup();
			projectService.getProjectScopesForUser.mockResolvedValue(READER);

			const answer = service.authorizeAnswer(teammate, shared, 'deploy_workflow', {
				approved: true,
			});
			await expect(answer).rejects.toThrow(ForbiddenError);
			await expect(answer).rejects.toThrow('Only editors in Finance can approve this.');
		});

		it('needs publish to answer an automation proposal', async () => {
			const { service, projectService } = setup();
			projectService.getProjectScopesForUser.mockResolvedValue([...READER, 'workflow:update']);

			await expect(
				service.authorizeAnswer(teammate, shared, 'propose_automation', { approved: true }),
			).rejects.toThrow(ForbiddenError);
			await expect(
				service.authorizeAnswer(teammate, shared, 'deploy_workflow', { approved: true }),
			).resolves.toEqual({ approved: true });
		});

		it('keeps the answer of the owner as it is', async () => {
			const { service, projectService } = setup();
			projectService.getProjectScopesForUser.mockResolvedValue([]);
			const answer = { kind: 'approval', approved: true, scope: 'session' };

			await expect(service.authorizeAnswer(owner, shared, 'deploy_workflow', answer)).resolves.toBe(
				answer,
			);
		});
	});

	describe('canRead', () => {
		it('answers for the owner and for private threads without a scope lookup', async () => {
			const { service, projectService } = setup();

			await expect(service.canRead(owner, makeThread({ accessScope: 'project' }))).resolves.toBe(
				true,
			);
			await expect(service.canRead(teammate, makeThread())).resolves.toBe(false);
			expect(projectService.getProjectScopesForUser).not.toHaveBeenCalled();
		});

		it('checks the scopes of a teammate in the thread project', async () => {
			const { service, projectService } = setup();
			projectService.getProjectScopesForUser.mockResolvedValue(['project:read']);

			await expect(service.canRead(teammate, makeThread({ accessScope: 'project' }))).resolves.toBe(
				false,
			);
			expect(projectService.getProjectScopesForUser).toHaveBeenCalledWith(teammate, 'project-1');
		});
	});
});
