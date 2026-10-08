import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SharedCard } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import {
	answerAuthorship,
	asksForInput,
	canShareThread,
	resumeFailureNotice,
	sharedRowLabel,
	teammateCardAccess,
	threadSharingView,
	type SharingFacts,
} from '../sharingView';

const SCOPES: Scope[] = [
	'instanceAi:message',
	'project:read',
	'workflow:update',
	'workflow:delete',
	'workflow:publish',
	'workflow:unpublish',
	'workflow:execute',
	'credential:delete',
	'dataTable:create',
	'dataTable:update',
	'dataTable:delete',
	'dataTable:writeRow',
	'folder:create',
	'folder:delete',
];

const userIds = fc.constantFrom('alice', 'bob', 'carol', '');
const names = fc.constantFrom('Alice', 'Bob', '', 'Ünïcode Ñame');
const scopeSets = fc.uniqueArray(fc.constantFrom(...SCOPES));
const owners = fc.record({ id: userIds, name: names });

const factsArb: fc.Arbitrary<SharingFacts> = fc.record(
	{
		viewerId: userIds,
		projectId: fc.constantFrom('p-1', 'p-2'),
		owner: owners,
		sharedWith: fc.record({ projectId: fc.constantFrom('p-1', 'p-2'), projectName: names }),
		project: fc.record({
			type: fc.constantFrom('team', 'personal'),
			name: names,
			scopes: fc.option(scopeSets, { nil: undefined }),
		}),
	},
	{ requiredKeys: [] },
);

const payloads = fc.constantFrom<unknown>(
	{ requestId: 'r', message: 'Sure?', severity: 'warning' },
	{ requestId: 'r', message: 'Keep?', offered: { activate: [true] }, automationProposal: {} },
	{ requestId: 'r', message: '', inputType: 'questions', questions: [] },
	{ requestId: 'r', message: 'Set up', setupRequests: [{}] },
	undefined,
);

const cards: fc.Arbitrary<SharedCard> = fc.record({
	toolName: fc.constantFrom(
		'workflows',
		'executions',
		'credentials',
		'data-tables',
		'workspace',
		'propose_automation',
		'build-workflow',
	),
	input: fc.record(
		{
			action: fc.constantFrom('delete', 'run', 'create', 'create-folder', 'publish', 'insert-rows'),
			workflowId: fc.constantFrom('wf-1', ''),
			credentialId: fc.constant('c-1'),
			dataTableId: fc.constant('dt-1'),
			projectId: fc.constantFrom('p-1', 'p-2'),
		},
		{ requiredKeys: [] },
	),
	suspendPayload: payloads,
});

describe('threadSharingView properties', () => {
	it('offers a share only to the owner of a chat that is not shared, in a licensed team project', () => {
		fc.assert(
			fc.property(factsArb, fc.boolean(), (facts, licensed) => {
				const view = threadSharingView(facts);
				if (!canShareThread(view, () => licensed)) return;
				expect(view.role).toBe('owner');
				expect(view.isShared).toBe(false);
				expect(licensed).toBe(true);
				expect(facts.project?.type).toBe('team');
				expect(facts.project?.scopes).toEqual(
					expect.arrayContaining(['instanceAi:message', 'project:read']),
				);
			}),
		);
	});

	it('makes every viewer but the owner of a shared chat a teammate', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const view = threadSharingView(facts);
				const isOwner = facts.owner === undefined || facts.owner.id === facts.viewerId;
				expect(view.role).toBe(isOwner ? 'owner' : 'teammate');
				expect(view.isShared).toBe(facts.sharedWith !== undefined);
			}),
		);
	});
});

describe('teammateCardAccess properties', () => {
	it('never lets a teammate without scopes answer, and never asks a teammate with every scope for a role', () => {
		fc.assert(
			fc.property(cards, fc.constantFrom('p-1', 'p-2'), (card, projectId) => {
				expect(teammateCardAccess(card, projectId, [])).not.toBe('answer');
				expect(teammateCardAccess(card, projectId, SCOPES)).not.toBe('needs-role');
			}),
		);
	});

	it('only grows with more scopes, and keeps owner-only cards owner-only for every scope set', () => {
		fc.assert(
			fc.property(cards, scopeSets, scopeSets, (card, held, extra) => {
				const before = teammateCardAccess(card, 'p-1', held);
				const after = teammateCardAccess(card, 'p-1', [...held, ...extra]);
				if (before === 'answer') expect(after).toBe('answer');
				expect(after === 'owner-only').toBe(before === 'owner-only');
			}),
		);
	});
});

describe('answerAuthorship properties', () => {
	const authors = fc.option(owners, { nil: undefined });
	const states = fc.option(fc.constantFrom(...Object.values(TOOL_CALL_STATE)), { nil: undefined });
	const cancelledFlags = fc.option(fc.boolean(), { nil: undefined });
	const payloads = fc.option(
		fc.oneof(
			fc.record({ inputType: fc.constantFrom('approval', 'questions', 'text', 'plan-review') }),
			fc.record({ setupRequests: fc.array(fc.constant({ node: 'n' }), { maxLength: 2 }) }),
			fc.record({ credentialRequests: fc.array(fc.constant({ type: 't' }), { maxLength: 2 }) }),
			fc.constant('not a payload'),
		),
		{ nil: undefined },
	);

	it('names only another user, by that user’s name, and stays silent in a private chat of the viewer', () => {
		fc.assert(
			fc.property(
				fc.record({
					approvedBy: authors,
					declinedBy: authors,
					canceled: cancelledFlags,
					state: states,
					suspendPayload: payloads,
				}),
				userIds,
				fc.boolean(),
				(call, viewerId, shared) => {
					const result = answerAuthorship(call, viewerId, shared);
					const author = call.declinedBy ?? call.approvedBy;
					const cancelled = call.canceled === true || call.state === TOOL_CALL_STATE.CANCELLED;
					if (!author || cancelled || (author.id === viewerId && !shared)) {
						expect(result).toBeUndefined();
						return;
					}
					if (result?.name !== undefined) {
						expect(author.id).not.toBe(viewerId);
						expect(result.name).toBe(author.name);
					}
					if (!result) return;
					if (call.declinedBy) expect(result.decision).toBe('declined');
					else expect(result.decision).not.toBe('declined');
				},
			),
		);
	});

	it('says "answered" to a card that asks for input and "approved" to any other card', () => {
		fc.assert(
			fc.property(authors, authors, payloads, (approvedBy, declinedBy, suspendPayload) => {
				const result = answerAuthorship({ approvedBy, declinedBy, suspendPayload }, 'viewer', true);
				if (result === undefined || result.decision === 'declined') return;
				expect(declinedBy).toBeUndefined();
				expect(result.decision).toBe(asksForInput(suspendPayload) ? 'answered' : 'approved');
			}),
		);
	});
});

describe('resumeFailureNotice properties', () => {
	const statuses = fc.option(fc.constantFrom(400, 403, 404, 409, 500), { nil: undefined });
	const serverNames = fc.option(fc.constantFrom('Alice', 'Bob', ''), { nil: undefined });
	const answerers = fc.option(owners, { nil: undefined });
	const viewers = fc.option(userIds, { nil: undefined });
	interface FailureCase {
		status?: number;
		answeredBy?: string;
		answerer?: { id: string; name: string };
		viewerId?: string;
		isShared: boolean;
	}
	const cases: fc.Arbitrary<FailureCase> = fc.record({
		status: statuses,
		answeredBy: serverNames,
		answerer: answerers,
		viewerId: viewers,
		isShared: fc.boolean(),
	});

	const noticeOf = ({ status, answeredBy, ...context }: FailureCase) =>
		resumeFailureNotice({ status, answeredBy }, context);
	const byOther = (c: FailureCase) => c.answerer !== undefined && c.answerer.id !== c.viewerId;

	it('says "you" only when the history names the viewer, or in a private chat', () => {
		fc.assert(
			fc.property(cases, (c) => {
				if (noticeOf(c)?.kind !== 'answered-by-you') return;
				expect(byOther(c)).toBe(false);
				expect(c.answerer?.id === c.viewerId || !c.isShared).toBe(true);
			}),
		);
	});

	it('never names the viewer’s own answer as someone else’s', () => {
		fc.assert(
			fc.property(cases, (c) => {
				const notice = noticeOf(c);
				if (c.answerer && c.answerer.id === c.viewerId) {
					expect(notice?.kind).not.toBe('already-answered');
				}
				// A private chat names another user only when the history does.
				if (!c.isShared && !byOther(c) && notice?.kind === 'already-answered') {
					expect(notice).toEqual({ kind: 'already-answered' });
				}
			}),
		);
	});

	it('names the other user that the history records', () => {
		fc.assert(
			fc.property(cases, (c) => {
				if (!byOther(c)) return;
				const notice = noticeOf(c);
				expect(notice?.kind).toBe('already-answered');
				if (c.answerer?.name)
					expect(notice).toEqual({ kind: 'already-answered', name: c.answerer.name });
			}),
		);
	});

	it('answers every 409, and adds nothing to a stream error that names nobody else', () => {
		fc.assert(
			fc.property(cases, (c) => {
				const notice = noticeOf(c);
				if (c.status === 409) expect(notice?.kind).not.toBe('refused');
				if (c.status === 409) expect(notice).toBeDefined();
				if (c.status === undefined && !c.answeredBy && !byOther(c)) {
					expect(notice).toBeUndefined();
				}
				if (notice?.kind === 'refused') {
					expect(c.status !== undefined && c.status !== 409 && !c.answeredBy).toBe(true);
				}
			}),
		);
	});
});

describe('sharedRowLabel properties', () => {
	it('labels exactly the shared chats', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const label = sharedRowLabel(facts, facts.viewerId);
				expect(label !== undefined).toBe(facts.sharedWith !== undefined);
			}),
		);
	});
});
