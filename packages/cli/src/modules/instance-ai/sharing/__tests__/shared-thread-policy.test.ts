import type { Project, ProjectRelation, User, UserRepository } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import type { SharedCardAccess } from '../shared-card-access';
import { SharedThreadPolicy } from '../shared-thread-policy';

const READER: Scope[] = ['instanceAi:message', 'project:read'];
const EDITOR: Scope[] = [...READER, 'workflow:update', 'workflow:delete', 'credential:delete'];

const makeUser = (id: string, firstName: string, lastName: string, scopes: Scope[] = []) =>
	mock<User>({ id, firstName, lastName, role: { slug: 'global:member', scopes } });

/** A member user. The Assistant scope comes from the global role, as in n8n. */
const owner = makeUser('owner-1', 'Ada', 'Lovelace', [{ slug: 'instanceAi:message' }] as never);
const teammate = makeUser('teammate-1', 'Grace', 'Hopper');

const teamProject = mock<Project>({ id: 'project-1', name: 'Finance', type: 'team' });
const personalProject = mock<Project>({ id: 'project-2', name: 'Ada', type: 'personal' });

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return mock<AgentExecutionThread>({
		id: 'thread-1',
		agentId: ASSISTANT_AGENT_ID,
		projectId: teamProject.id,
		accessScope: 'project',
		ownerId: owner.id,
		parentThreadId: null,
		...overrides,
	});
}

const shared = makeThread();

const relationWith = (scopes: Scope[]) =>
	mock<ProjectRelation>({ role: { scopes: scopes.map((slug) => ({ slug })) } });

/** `scopes`: the project role of every user, or null for a user who is not a member. */
function setup(scopes: Scope[] | null = EDITOR) {
	const projectService = mock<ProjectService>();
	const users = mock<UserRepository>();
	const cardAccess = mock<SharedCardAccess>();
	const policy = new SharedThreadPolicy(projectService, users, cardAccess);

	projectService.findProject.mockImplementation(
		async (id) => [teamProject, personalProject].find((project) => project.id === id) ?? null,
	);
	projectService.getProjectRelationForUserAndProject.mockResolvedValue(
		scopes ? relationWith(scopes) : null,
	);
	users.findOneBy.mockResolvedValue(owner);
	cardAccess.canAnswer.mockResolvedValue(true);

	return { policy, projectService, users, cardAccess };
}

const card = { requestId: 'r-1', message: 'Archive "Invoices"', severity: 'warning' };
const archiveCall = {
	toolName: 'workflows',
	input: { action: 'delete', workflowId: 'workflow-1' },
	suspendPayload: card,
};
const archiveRule = {
	scopes: ['workflow:delete'],
	target: { type: 'workflow', id: 'workflow-1' },
};
const approve = { kind: 'approval', approved: true };

describe('SharedThreadPolicy', () => {
	describe('canRead', () => {
		it('lets the owner read without a membership lookup', async () => {
			const { policy, projectService } = setup(null);

			await expect(policy.canRead(owner, shared)).resolves.toBe(true);
			await expect(policy.canRead(owner, makeThread({ accessScope: 'user' }))).resolves.toBe(true);
			expect(projectService.getProjectRelationForUserAndProject).not.toHaveBeenCalled();
		});

		it('refuses a private thread of another user without a membership lookup', async () => {
			const { policy, projectService } = setup();

			await expect(policy.canRead(teammate, makeThread({ accessScope: 'user' }))).resolves.toBe(
				false,
			);
			await expect(policy.canRead(teammate, makeThread({ ownerId: null }))).resolves.toBe(false);
			expect(projectService.getProjectRelationForUserAndProject).not.toHaveBeenCalled();
		});

		it.each([
			['the read scopes', READER, true],
			['only project read', ['project:read'] satisfies Scope[], false],
			['only the Assistant scope', ['instanceAi:message'] satisfies Scope[], false],
			['no scope', [], false],
		])('lets a member with %s read a shared thread: %s', async (_label, scopes, expected) => {
			const { policy, projectService } = setup(scopes);

			await expect(policy.canRead(teammate, shared)).resolves.toBe(expected);
			expect(projectService.getProjectRelationForUserAndProject).toHaveBeenCalledWith(
				'teammate-1',
				'project-1',
			);
		});

		it('adds the global role to the project role of a member', async () => {
			const { policy } = setup(['project:read']);

			await expect(policy.canRead(owner, makeThread({ ownerId: 'someone-else' }))).resolves.toBe(
				true,
			);
		});

		it('refuses a user who is not a member, whatever the global role holds', async () => {
			const { policy } = setup(null);
			const admin = makeUser('admin-1', 'Alan', 'Turing', READER.map((slug) => ({ slug })) as never);

			await expect(policy.canRead(admin, shared)).resolves.toBe(false);
		});
	});

	describe('sendError', () => {
		it('names the owner', async () => {
			const { policy, users } = setup();

			const error = await policy.sendError(teammate, shared);

			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.message).toBe('Only Ada Lovelace can send messages here.');
			expect(users.findOneBy).toHaveBeenCalledWith({ id: 'owner-1' });
		});

		it('falls back to "the owner" when the owner is gone', async () => {
			const { policy, users } = setup();
			users.findOneBy.mockResolvedValue(null);

			const error = await policy.sendError(teammate, shared);

			expect(error.message).toBe('Only the owner can send messages here.');
		});
	});

	describe('authorizeAnswer', () => {
		it('keeps the answer of the owner as it is, without any check', async () => {
			const { policy, projectService, cardAccess } = setup(null);
			const answer = { kind: 'approval', approved: true, scope: 'session', userInput: 'Go' };
			const anyCall = { toolName: 'ask-user', input: {}, suspendPayload: { questions: [] } };

			await expect(policy.authorizeAnswer(owner, shared, anyCall, answer)).resolves.toBe(answer);
			expect(projectService.getProjectRelationForUserAndProject).not.toHaveBeenCalled();
			expect(cardAccess.canAnswer).not.toHaveBeenCalled();
		});

		it('checks the card rule on the resource of the card, as the teammate', async () => {
			const { policy, cardAccess } = setup();

			await expect(policy.authorizeAnswer(teammate, shared, archiveCall, approve)).resolves.toEqual(
				approve,
			);
			expect(cardAccess.canAnswer).toHaveBeenCalledWith(teammate, archiveRule);
		});

		it('uses "always allow" from a teammate once and drops fields outside the answer', async () => {
			const { policy } = setup();

			await expect(
				policy.authorizeAnswer(teammate, shared, archiveCall, {
					...approve,
					scope: 'session',
					extra: 'x',
				}),
			).resolves.toEqual({ ...approve, scope: 'once' });
		});

		it.each([
			['a question card', { toolName: 'ask-user', input: {}, suspendPayload: { questions: [] } }],
			['a web fetch card', { toolName: 'research', input: { url: 'x' }, suspendPayload: card }],
			[
				'a sub-agent card',
				{ toolName: 'build-agent', input: { task: 'x' }, suspendPayload: card },
			],
			[
				'a publish card',
				{ toolName: 'workflows', input: { action: 'publish', workflowId: 'w' }, suspendPayload: card },
			],
			[
				'a setup card of a listed tool',
				{ ...archiveCall, suspendPayload: { ...card, setupRequests: [] } },
			],
		])('keeps %s for the owner, before any scope lookup', async (_label, call) => {
			const { policy, projectService, cardAccess } = setup();

			const refusal = policy.authorizeAnswer(teammate, shared, call, approve);

			await expect(refusal).rejects.toThrow(ForbiddenError);
			await expect(refusal).rejects.toThrow('Only Ada Lovelace can answer this.');
			expect(projectService.getProjectRelationForUserAndProject).not.toHaveBeenCalled();
			expect(cardAccess.canAnswer).not.toHaveBeenCalled();
		});

		it.each([
			['text', { kind: 'approval', approved: false, userInput: 'Change step 2' }],
			['a credential choice', { kind: 'credentialSelection', credentials: { slackApi: 'c-1' } }],
			['a plan denial', { kind: 'planDeny' }],
			['a web domain approval', { kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
			['a message in place of a card answer', { _type: 'agent.cancellation', message: 'Stop' }],
			['an answer without kind', { approved: true }],
		])('keeps %s for the owner', async (_label, answer) => {
			const { policy } = setup();

			await expect(policy.authorizeAnswer(teammate, shared, archiveCall, answer)).rejects.toThrow(
				'Only Ada Lovelace can answer this.',
			);
		});

		it('refuses a member without the scope of the card, with the project name', async () => {
			const { policy, cardAccess } = setup([...READER, 'workflow:update']);

			const refusal = policy.authorizeAnswer(teammate, shared, archiveCall, approve);

			await expect(refusal).rejects.toThrow(ForbiddenError);
			await expect(refusal).rejects.toThrow('Only editors in Finance can approve this.');
			expect(cardAccess.canAnswer).not.toHaveBeenCalled();
		});

		it('names "this project" when the project is gone', async () => {
			const { policy } = setup(READER);

			await expect(
				policy.authorizeAnswer(teammate, makeThread({ projectId: 'gone' }), archiveCall, approve),
			).rejects.toThrow('Only editors in this project can approve this.');
		});

		it('refuses a user who is not a member of the project, also with a global role', async () => {
			const { policy } = setup(null);
			const admin = makeUser('admin-1', 'Alan', 'Turing', EDITOR.map((slug) => ({ slug })) as never);

			await expect(policy.authorizeAnswer(admin, shared, archiveCall, approve)).rejects.toThrow(
				'Only editors in Finance can approve this.',
			);
		});

		it('refuses a teammate who cannot read the thread, also with editor scopes', async () => {
			const { policy } = setup();

			await expect(
				policy.authorizeAnswer(teammate, makeThread({ accessScope: 'user' }), archiveCall, approve),
			).rejects.toThrow(ForbiddenError);
		});

		it.each([
			['workflow', archiveCall],
			[
				'credential',
				{
					toolName: 'credentials',
					input: { action: 'delete', credentialId: 'c-1' },
					suspendPayload: card,
				},
			],
			[
				'data table',
				{
					toolName: 'data-tables',
					input: { action: 'delete', dataTableId: 't-1' },
					suspendPayload: card,
				},
			],
		])(
			'refuses a card about a %s that the teammate cannot change, and names it',
			async (name, call) => {
				const { policy, cardAccess } = setup([
					...EDITOR,
					'dataTable:delete',
				] satisfies Scope[]);
				cardAccess.canAnswer.mockResolvedValue(false);

				const refusal = policy.authorizeAnswer(teammate, shared, call, approve);

				await expect(refusal).rejects.toThrow(ForbiddenError);
				await expect(refusal).rejects.toThrow(`Only editors of this ${name} can approve this.`);
			},
		);

		it('needs publish in the project to turn on a proposed automation', async () => {
			const { policy, cardAccess } = setup();
			const proposal = {
				toolName: 'propose_automation',
				input: { workflowId: 'workflow-1' },
				suspendPayload: { ...card, offered: {}, automationProposal: { archived: false } },
			};
			const keep = { kind: 'capabilityDecision', approved: true };

			await expect(policy.authorizeAnswer(teammate, shared, proposal, keep)).resolves.toEqual(keep);
			expect(cardAccess.canAnswer).toHaveBeenCalledWith(teammate, {
				scopes: ['workflow:update'],
				target: { type: 'workflow', id: 'workflow-1' },
			});
			await expect(
				policy.authorizeAnswer(teammate, shared, proposal, { ...keep, values: { activate: true } }),
			).rejects.toThrow('Only editors in Finance can approve this.');
		});
	});

	describe('readerText', () => {
		it('removes the context that the Assistant added for the model', () => {
			const { policy } = setup();
			const stored = [
				'<thread-context>',
				'<past-conversations>',
				'Salary review',
				'</past-conversations>',
				'</thread-context>',
				'',
				'Build the invoice flow',
			].join('\n');

			expect(policy.readerText(stored)).toBe('Build the invoice flow');
			expect(policy.readerText('Build the invoice flow')).toBe('Build the invoice flow');
		});

		it('hides an automatic follow-up', () => {
			const { policy } = setup();

			expect(policy.readerText('(continue)')).toBeNull();
		});
	});

	describe('assertCanShare', () => {
		const privateThread = makeThread({ accessScope: 'user' });

		it('lets the owner share a thread of a team project', async () => {
			const { policy, projectService } = setup(READER);

			await expect(policy.assertCanShare(owner, privateThread)).resolves.toBeUndefined();
			expect(projectService.getProjectRelationForUserAndProject).toHaveBeenCalledWith(
				'owner-1',
				'project-1',
			);
		});

		it('refuses a personal project with a hint to move the chat', async () => {
			const { policy } = setup();

			const refusal = policy.assertCanShare(
				owner,
				makeThread({ accessScope: 'user', projectId: personalProject.id }),
			);

			await expect(refusal).rejects.toThrow(BadRequestError);
			await expect(refusal).rejects.toThrow('Move this chat to a team project to share it.');
		});

		it('answers 404 when the project is gone', async () => {
			const { policy } = setup();

			await expect(
				policy.assertCanShare(owner, makeThread({ accessScope: 'user', projectId: 'gone' })),
			).rejects.toThrow(NotFoundError);
		});

		it.each([
			['cannot read shared threads', ['project:read'] satisfies Scope[]],
			['is not a member', null],
		])('refuses an owner who %s in the project', async (_label, scopes) => {
			const { policy } = setup(scopes);

			await expect(policy.assertCanShare(teammate, makeThread({ ownerId: teammate.id }))).rejects.toThrow(
				'You need access to this project to share the chat.',
			);
		});

		it('tells a reader that only the owner shares, and answers 404 to anyone else', async () => {
			const { policy, projectService } = setup(READER);

			await expect(policy.assertCanShare(teammate, shared)).rejects.toThrow(
				'Only the owner can share this chat.',
			);
			projectService.getProjectRelationForUserAndProject.mockResolvedValue(null);
			await expect(policy.assertCanShare(teammate, shared)).rejects.toThrow(NotFoundError);
			await expect(policy.assertCanShare(teammate, privateThread)).rejects.toThrow(NotFoundError);
		});
	});

	describe('readableProjectIds', () => {
		it('lists the team projects where the member can read shared threads', async () => {
			const { policy, projectService } = setup();
			const relation = (projectId: string, type: string, scopes: Scope[]) =>
				mock<ProjectRelation>({
					projectId,
					project: { type },
					role: { scopes: scopes.map((slug) => ({ slug })) },
				});
			projectService.getProjectRelationsForUser.mockResolvedValue([
				relation('team-reader', 'team', READER),
				relation('team-no-access', 'team', ['project:read']),
				relation('personal', 'personal', READER),
			]);

			await expect(policy.readableProjectIds(teammate)).resolves.toEqual(['team-reader']);
		});
	});
});
