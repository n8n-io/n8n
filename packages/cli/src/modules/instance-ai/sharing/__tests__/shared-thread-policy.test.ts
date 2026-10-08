import type { Project, User, UserRepository } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import { SharedThreadPolicy } from '../shared-thread-policy';

const READER: Scope[] = ['instanceAi:message', 'project:read'];
const EDITOR: Scope[] = [...READER, 'workflow:update'];
const PUBLISHER: Scope[] = [...EDITOR, 'workflow:publish'];

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
		accessScope: 'project',
		ownerId: owner.id,
		parentThreadId: null,
		...overrides,
	});
}

const shared = makeThread();
const workflowHead = { versionId: 'v1', activeVersionId: null, updatedAt: new Date(0) };

function setup(scopes: Scope[] = PUBLISHER) {
	const projectService = mock<ProjectService>();
	const users = mock<UserRepository>();
	const workflowFinder = mock<WorkflowFinderService>();
	const policy = new SharedThreadPolicy(projectService, users, workflowFinder);

	projectService.findProject.mockImplementation(
		async (id) => [teamProject, personalProject].find((project) => project.id === id) ?? null,
	);
	projectService.getProjectScopesForUser.mockResolvedValue(scopes);
	users.findOneBy.mockResolvedValue(owner);
	workflowFinder.findWorkflowHeadForUser.mockResolvedValue(workflowHead);

	return { policy, projectService, users, workflowFinder };
}

const deployCall = { toolName: 'deploy_workflow', input: {} };
const approve = { kind: 'capabilityDecision', approved: true };

describe('SharedThreadPolicy', () => {
	describe('canRead', () => {
		it('lets the owner read without a scope lookup', async () => {
			const { policy, projectService } = setup([]);

			await expect(policy.canRead(owner, shared)).resolves.toBe(true);
			await expect(policy.canRead(owner, makeThread({ accessScope: 'user' }))).resolves.toBe(true);
			expect(projectService.getProjectScopesForUser).not.toHaveBeenCalled();
		});

		it('refuses a private thread of another user without a scope lookup', async () => {
			const { policy, projectService } = setup();

			await expect(policy.canRead(teammate, makeThread({ accessScope: 'user' }))).resolves.toBe(
				false,
			);
			await expect(policy.canRead(teammate, makeThread({ ownerId: null }))).resolves.toBe(false);
			expect(projectService.getProjectScopesForUser).not.toHaveBeenCalled();
		});

		it.each([
			['the read scopes', READER, true],
			['only project read', ['project:read'] satisfies Scope[], false],
			['only the Assistant scope', ['instanceAi:message'] satisfies Scope[], false],
			['no scope', [], false],
		])('lets a teammate with %s read a shared thread: %s', async (_label, scopes, expected) => {
			const { policy, projectService } = setup(scopes);

			await expect(policy.canRead(teammate, shared)).resolves.toBe(expected);
			expect(projectService.getProjectScopesForUser).toHaveBeenCalledWith(teammate, 'project-1');
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
			const { policy, projectService, workflowFinder } = setup([]);
			const answer = { kind: 'approval', approved: true, scope: 'session', userInput: 'Go' };

			await expect(policy.authorizeAnswer(owner, shared, deployCall, answer)).resolves.toBe(answer);
			expect(projectService.getProjectScopesForUser).not.toHaveBeenCalled();
			expect(workflowFinder.findWorkflowHeadForUser).not.toHaveBeenCalled();
		});

		it('returns the answer of an editor, with "always allow" used once', async () => {
			const { policy } = setup(EDITOR);

			await expect(
				policy.authorizeAnswer(teammate, shared, deployCall, {
					kind: 'approval',
					approved: true,
					scope: 'session',
				}),
			).resolves.toEqual({ kind: 'approval', approved: true, scope: 'once' });
			await expect(
				policy.authorizeAnswer(teammate, shared, deployCall, {
					kind: 'domainAccessApprove',
					domainAccessAction: 'allow_all',
				}),
			).resolves.toEqual({ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' });
		});

		it('drops fields that are not part of the answer', async () => {
			const { policy } = setup(EDITOR);

			await expect(
				policy.authorizeAnswer(teammate, shared, deployCall, { ...approve, extra: 'x' }),
			).resolves.toEqual(approve);
		});

		it('refuses a viewer with the project name, before it reads the answer', async () => {
			const { policy, workflowFinder } = setup(READER);

			const answer = policy.authorizeAnswer(teammate, shared, deployCall, { not: 'an answer' });

			await expect(answer).rejects.toThrow(ForbiddenError);
			await expect(answer).rejects.toThrow('Only editors in Finance can approve this.');
			expect(workflowFinder.findWorkflowHeadForUser).not.toHaveBeenCalled();
		});

		it('names "this project" when the project is gone', async () => {
			const { policy } = setup(READER);

			await expect(
				policy.authorizeAnswer(teammate, makeThread({ projectId: 'gone' }), deployCall, approve),
			).rejects.toThrow('Only editors in this project can approve this.');
		});

		it('refuses a teammate who cannot read the thread, also with editor scopes', async () => {
			const { policy } = setup(EDITOR);

			await expect(
				policy.authorizeAnswer(teammate, makeThread({ accessScope: 'user' }), deployCall, approve),
			).rejects.toThrow(ForbiddenError);
		});

		it('needs publish to answer an automation proposal', async () => {
			const { policy } = setup(EDITOR);
			const proposal = { toolName: 'propose_automation', input: {} };

			await expect(policy.authorizeAnswer(teammate, shared, proposal, approve)).rejects.toThrow(
				'Only editors in Finance can approve this.',
			);
			await expect(policy.authorizeAnswer(teammate, shared, deployCall, approve)).resolves.toEqual(
				approve,
			);
		});

		it.each([
			['text', { kind: 'approval', approved: false, userInput: 'Change step 2' }],
			['a credential choice', { kind: 'credentialSelection', credentials: { slackApi: 'c-1' } }],
			['a setup with credentials', { kind: 'setupWorkflowApply', nodeCredentials: {} }],
			['an integration', { kind: 'mcpConnect', approved: true }],
			['a computer resource', { kind: 'resourceDecision', resourceDecision: 'allowOnce' }],
			['a message in place of a card answer', { _type: 'agent.cancellation', message: 'Stop' }],
			['an answer without kind', { approved: true }],
		])('keeps %s for the owner', async (_label, answer) => {
			const { policy } = setup();

			const refusal = policy.authorizeAnswer(teammate, shared, deployCall, answer);

			await expect(refusal).rejects.toThrow(ForbiddenError);
			await expect(refusal).rejects.toThrow('Only Ada Lovelace can answer this.');
		});

		it('checks the workflow of the card with the scopes of the card', async () => {
			const { policy, workflowFinder } = setup();
			const call = { toolName: 'propose_automation', input: { workflowId: 'workflow-1' } };

			await expect(policy.authorizeAnswer(teammate, shared, call, approve)).resolves.toEqual(
				approve,
			);
			expect(workflowFinder.findWorkflowHeadForUser).toHaveBeenCalledWith('workflow-1', teammate, [
				'workflow:update',
				'workflow:publish',
			]);
		});

		it('refuses a card about a workflow that the teammate cannot edit', async () => {
			const { policy, workflowFinder } = setup();
			workflowFinder.findWorkflowHeadForUser.mockResolvedValue(null);
			const call = { toolName: 'deploy_workflow', input: { workflowId: 'personal-workflow' } };

			const refusal = policy.authorizeAnswer(teammate, shared, call, approve);

			await expect(refusal).rejects.toThrow(ForbiddenError);
			await expect(refusal).rejects.toThrow('Only editors of this workflow can approve this.');
		});

		it.each([
			['no input', null],
			['an input without a workflow', { name: 'Invoices' }],
			['a workflow id that is not text', { workflowId: 7 }],
			['a list input', ['workflow-1']],
		])('checks no workflow for %s', async (_label, input) => {
			const { policy, workflowFinder } = setup();

			await expect(
				policy.authorizeAnswer(teammate, shared, { toolName: 'deploy_workflow', input }, approve),
			).resolves.toEqual(approve);
			expect(workflowFinder.findWorkflowHeadForUser).not.toHaveBeenCalled();
		});
	});

	describe('assertCanShare', () => {
		const privateThread = makeThread({ accessScope: 'user' });

		it('lets the owner share a thread of a team project', async () => {
			const { policy, projectService } = setup(READER);

			await expect(policy.assertCanShare(owner, privateThread)).resolves.toBeUndefined();
			expect(projectService.getProjectScopesForUser).toHaveBeenCalledWith(owner, 'project-1');
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

		it('refuses an owner who cannot read shared threads in the project', async () => {
			const { policy } = setup(['project:read']);

			await expect(policy.assertCanShare(owner, privateThread)).rejects.toThrow(
				'You need access to this project to share the chat.',
			);
		});

		it('tells a reader that only the owner shares, and answers 404 to anyone else', async () => {
			const { policy, projectService } = setup(READER);

			await expect(policy.assertCanShare(teammate, shared)).rejects.toThrow(
				'Only the owner can share this chat.',
			);
			projectService.getProjectScopesForUser.mockResolvedValue([]);
			await expect(policy.assertCanShare(teammate, shared)).rejects.toThrow(NotFoundError);
			await expect(policy.assertCanShare(teammate, privateThread)).rejects.toThrow(NotFoundError);
		});
	});
});
