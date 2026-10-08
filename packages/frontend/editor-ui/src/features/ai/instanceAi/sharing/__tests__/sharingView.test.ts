import { describe, expect, it, vi } from 'vitest';
import type { SharedCard } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import {
	answerAuthorship,
	canShareThread,
	isTeammate,
	resumeFailureNotice,
	sharedRowLabel,
	teammateCardAccess,
	threadSharingView,
	type SharingFacts,
} from '../sharingView';

const OWNER = { id: 'owner-1', name: 'Alice Owner' };
const TEAMMATE_ID = 'teammate-1';
const PROJECT = 'project-1';
const SHARED_WITH = { projectId: PROJECT, projectName: 'Marketing' };
const READ: Scope[] = ['instanceAi:message', 'project:read'];

const approvalPayload = { requestId: 'r-1', message: 'Delete "Invoices"?', severity: 'destructive' };
const proposalPayload = {
	requestId: 'r-2',
	message: 'Run "Digest" every Monday?',
	severity: 'info',
	offered: { activate: [true, false] },
	automationProposal: { archived: false },
};

const call = (toolName: string, input: unknown, suspendPayload: unknown = approvalPayload) =>
	({ toolName, input, suspendPayload }) satisfies SharedCard;

function facts(overrides: Partial<SharingFacts> = {}): SharingFacts {
	return {
		viewerId: OWNER.id,
		projectId: PROJECT,
		project: { type: 'team', name: 'Marketing', scopes: READ },
		...overrides,
	};
}

const licensed = () => true;
const canShare = (overrides: Partial<SharingFacts> = {}, licence = licensed) =>
	canShareThread(threadSharingView(facts(overrides)), licence);

describe('isTeammate', () => {
	it('treats the viewer of a chat without an owner field as the owner', () => {
		expect(isTeammate(OWNER.id, undefined)).toBe(false);
		expect(isTeammate(undefined, undefined)).toBe(false);
	});

	it('treats every user but the owner as a teammate, also an unknown viewer', () => {
		expect(isTeammate(OWNER.id, OWNER)).toBe(false);
		expect(isTeammate(TEAMMATE_ID, OWNER)).toBe(true);
		expect(isTeammate(undefined, OWNER)).toBe(true);
	});

	it('treats a shared chat whose owner is gone as nobody’s chat', () => {
		expect(isTeammate(OWNER.id, { id: '', name: '' })).toBe(true);
	});
});

describe('threadSharingView', () => {
	describe('for the owner of a private chat', () => {
		it('offers to share a chat in a team project where the owner can read shared chats', () => {
			expect(threadSharingView(facts())).toEqual({
				role: 'owner',
				isShared: false,
				ownerName: '',
				projectId: PROJECT,
				projectName: 'Marketing',
				projectType: 'team',
				scopes: READ,
			});
			expect(canShare()).toBe(true);
		});

		it('does not offer to share a chat in a personal project', () => {
			expect(canShare({ project: { type: 'personal', name: 'Me', scopes: READ } })).toBe(false);
		});

		it('does not offer to share without the team-project licence', () => {
			expect(canShare({}, () => false)).toBe(false);
		});

		it('reads the licence only when the rest allows a share', () => {
			const licence = vi.fn(() => true);
			canShare({ project: { type: 'personal', name: 'Me', scopes: READ } }, licence);
			canShare({ owner: OWNER, sharedWith: SHARED_WITH }, licence);
			expect(licence).not.toHaveBeenCalled();

			canShare({}, licence);
			expect(licence).toHaveBeenCalledOnce();
		});

		it.each<[string, Scope[] | undefined]>([
			['without project:read', ['instanceAi:message']],
			['without instanceAi:message', ['project:read']],
			['without scopes', []],
			['when the project list has no scopes', undefined],
		])('does not offer to share %s', (_, scopes) => {
			expect(canShare({ project: { type: 'team', name: 'M', scopes } })).toBe(false);
		});

		it('does not offer to share a chat whose project is not in the project list', () => {
			const view = threadSharingView(facts({ project: undefined }));
			expect(view).toMatchObject({ projectName: '', projectType: undefined, scopes: [] });
			expect(canShareThread(view, licensed)).toBe(false);
		});
	});

	describe('for a shared chat', () => {
		it('shows the owner the project, and offers no second share', () => {
			const view = threadSharingView(facts({ owner: OWNER, sharedWith: SHARED_WITH }));
			expect(canShareThread(view, licensed)).toBe(false);
			expect(view).toMatchObject({
				role: 'owner',
				isShared: true,
				ownerName: 'Alice Owner',
				projectName: 'Marketing',
			});
		});

		it('shows a teammate the owner, the project and the teammate’s scopes', () => {
			const scopes: Scope[] = [...READ, 'workflow:execute'];
			const view = threadSharingView(
				facts({
					viewerId: TEAMMATE_ID,
					owner: OWNER,
					sharedWith: SHARED_WITH,
					project: { type: 'team', name: 'Marketing', scopes },
				}),
			);
			expect(view).toEqual({
				role: 'teammate',
				isShared: true,
				ownerName: 'Alice Owner',
				projectId: PROJECT,
				projectName: 'Marketing',
				projectType: 'team',
				scopes,
			});
			expect(canShareThread(view, licensed)).toBe(false);
		});

		it('takes the project of the share over the project that the runtime knows', () => {
			const view = threadSharingView(
				facts({ projectId: 'stale', owner: OWNER, sharedWith: SHARED_WITH }),
			);
			expect(view.projectId).toBe(PROJECT);
		});

		it('falls back to the project list name when the server sent no project name', () => {
			const view = threadSharingView(
				facts({
					viewerId: TEAMMATE_ID,
					owner: OWNER,
					sharedWith: { projectId: PROJECT, projectName: '' },
					project: { type: 'team', name: 'Sales' },
				}),
			);
			expect(view.projectName).toBe('Sales');
		});
	});
});

describe('teammateCardAccess', () => {
	it.each<[string, SharedCard, Scope]>([
		['delete a workflow', call('workflows', { action: 'delete', workflowId: 'wf-1' }), 'workflow:delete'],
		['run a workflow', call('executions', { action: 'run', workflowId: 'wf-1' }), 'workflow:execute'],
		[
			'delete a credential',
			call('credentials', { action: 'delete', credentialId: 'c-1' }),
			'credential:delete',
		],
		['create a data table', call('data-tables', { action: 'create', name: 'Leads' }), 'dataTable:create'],
		[
			'create a folder in the chat project',
			call('workspace', { action: 'create-folder', projectId: PROJECT }),
			'folder:create',
		],
		[
			'keep a proposed automation',
			call('propose_automation', { workflowId: 'wf-1' }, proposalPayload),
			'workflow:update',
		],
	])('lets a teammate %s with the scope of the action', (_, card, scope) => {
		expect(teammateCardAccess(card, PROJECT, [scope])).toBe('answer');
	});

	it('asks for the role when the teammate does not hold the scope of the action', () => {
		const card = call('workflows', { action: 'delete', workflowId: 'wf-1' });
		expect(teammateCardAccess(card, PROJECT, ['workflow:update', ...READ])).toBe('needs-role');
		expect(teammateCardAccess(card, PROJECT, [])).toBe('needs-role');
	});

	it.each<[string, SharedCard | undefined, string | undefined]>([
		['a card without its tool call', undefined, PROJECT],
		['a card in a chat without a project', call('workflows', { action: 'delete', workflowId: 'w' }), undefined],
		['a tool without teammate rules', call('build-workflow', { workflowId: 'wf-1' }), PROJECT],
		['an action without teammate rules', call('workflows', { action: 'publish', workflowId: 'w' }), PROJECT],
		['an action without its resource', call('workflows', { action: 'delete' }), PROJECT],
		[
			'a card that asks for more than a yes or no',
			call('workflows', { action: 'delete', workflowId: 'w' }, { ...approvalPayload, inputType: 'text' }),
			PROJECT,
		],
		[
			'questions',
			call('ask-user', {}, { requestId: 'r', message: '', inputType: 'questions', questions: [] }),
			PROJECT,
		],
		[
			'a folder in another project',
			call('workspace', { action: 'create-folder', projectId: 'other' }),
			PROJECT,
		],
	])('keeps %s for the owner', (_, card, projectId) => {
		const allScopes: Scope[] = ['workflow:delete', 'workflow:publish', 'folder:create', ...READ];
		expect(teammateCardAccess(card, projectId, allScopes)).toBe('owner-only');
	});
});

describe('answerAuthorship', () => {
	const other = { id: TEAMMATE_ID, name: 'Bob Teammate' };
	const viewer = { id: OWNER.id, name: 'Alice Owner' };

	it('names nobody when nobody answered', () => {
		expect(answerAuthorship({}, OWNER.id, true)).toBeUndefined();
	});

	it('names the other user who approved or declined', () => {
		expect(answerAuthorship({ approvedBy: other }, OWNER.id, true)).toEqual({
			decision: 'approved',
			name: 'Bob Teammate',
		});
		expect(answerAuthorship({ declinedBy: other }, OWNER.id, true)).toEqual({
			decision: 'declined',
			name: 'Bob Teammate',
		});
	});

	it('calls the viewer "you" in a shared chat, and says nothing in a private chat', () => {
		expect(answerAuthorship({ approvedBy: viewer }, OWNER.id, true)).toEqual({ decision: 'approved' });
		expect(answerAuthorship({ declinedBy: viewer }, OWNER.id, true)).toEqual({ decision: 'declined' });
		expect(answerAuthorship({ approvedBy: viewer }, OWNER.id, false)).toBeUndefined();
	});

	it('still names another user in a chat that is not marked as shared', () => {
		expect(answerAuthorship({ approvedBy: other }, OWNER.id, false)).toEqual({
			decision: 'approved',
			name: 'Bob Teammate',
		});
	});

	it('names nobody for another user without a name', () => {
		expect(answerAuthorship({ approvedBy: { id: 'x', name: '' } }, OWNER.id, true)).toBeUndefined();
	});

	it('reports the decline when a malformed part names both', () => {
		expect(answerAuthorship({ approvedBy: viewer, declinedBy: other }, OWNER.id, true)).toEqual({
			decision: 'declined',
			name: 'Bob Teammate',
		});
	});
});

describe('resumeFailureNotice', () => {
	it('names the user that the 409 names, over the history', () => {
		expect(resumeFailureNotice({ status: 409, answeredBy: 'Alice' }, 'Bob')).toEqual({
			kind: 'already-answered',
			name: 'Alice',
		});
	});

	it('names the user from the history when the server sent no name', () => {
		expect(resumeFailureNotice({ status: 409 }, 'Bob')).toEqual({
			kind: 'already-answered',
			name: 'Bob',
		});
		// The loser of a race gets a stream error, not a 409.
		expect(resumeFailureNotice({}, 'Bob')).toEqual({ kind: 'already-answered', name: 'Bob' });
	});

	it('says that someone answered a 409 without any name', () => {
		expect(resumeFailureNotice({ status: 409 }, undefined)).toEqual({ kind: 'already-answered' });
	});

	it('passes on the reason of any other refusal', () => {
		expect(
			resumeFailureNotice({ status: 403, message: 'Only editors in Marketing can approve this.' }, undefined),
		).toEqual({ kind: 'refused', message: 'Only editors in Marketing can approve this.' });
		expect(resumeFailureNotice({ status: 400 }, undefined)).toEqual({ kind: 'refused' });
		expect(resumeFailureNotice({ status: 500, message: '' }, undefined)).toEqual({ kind: 'refused' });
	});

	it('adds nothing to a stream error when nobody else answered', () => {
		expect(resumeFailureNotice({}, undefined)).toBeUndefined();
		expect(resumeFailureNotice({ message: 'The model failed' }, undefined)).toBeUndefined();
	});
});

describe('sharedRowLabel', () => {
	it('labels only shared chats', () => {
		expect(sharedRowLabel({}, OWNER.id)).toBeUndefined();
		expect(sharedRowLabel({ owner: OWNER }, TEAMMATE_ID)).toBeUndefined();
	});

	it('tells a teammate who shared the chat', () => {
		expect(sharedRowLabel({ owner: OWNER, sharedWith: SHARED_WITH }, TEAMMATE_ID)).toEqual({
			kind: 'shared-by',
			name: 'Alice Owner',
		});
	});

	it('tells the owner where the chat is shared', () => {
		expect(sharedRowLabel({ owner: OWNER, sharedWith: SHARED_WITH }, OWNER.id)).toEqual({
			kind: 'shared-with',
			name: 'Marketing',
		});
	});
});
