import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SharedCard } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import {
	answerAuthorship,
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

	it('names only another user, by that user’s name, and stays silent in a private chat of the viewer', () => {
		fc.assert(
			fc.property(
				authors,
				authors,
				userIds,
				fc.boolean(),
				(approvedBy, declinedBy, viewerId, shared) => {
					const result = answerAuthorship({ approvedBy, declinedBy }, viewerId, shared);
					const author = declinedBy ?? approvedBy;
					if (!author || (author.id === viewerId && !shared)) {
						expect(result).toBeUndefined();
						return;
					}
					if (result?.name !== undefined) {
						expect(author.id).not.toBe(viewerId);
						expect(result.name).toBe(author.name);
					}
					if (result) expect(result.decision).toBe(declinedBy ? 'declined' : 'approved');
				},
			),
		);
	});
});

describe('resumeFailureNotice properties', () => {
	const statuses = fc.option(fc.constantFrom(400, 403, 404, 409, 500), { nil: undefined });
	const optionalNames = fc.option(fc.constantFrom('Alice', 'Bob'), { nil: undefined });

	it('reports a known answerer, every 409 as answered, and stays silent on a stream error with nobody else', () => {
		fc.assert(
			fc.property(statuses, optionalNames, optionalNames, (status, answeredBy, answerer) => {
				const notice = resumeFailureNotice({ status, answeredBy }, answerer);
				const name = answeredBy ?? answerer;
				if (name) expect(notice).toEqual({ kind: 'already-answered', name });
				else if (status === 409) expect(notice).toEqual({ kind: 'already-answered' });
				else if (status === undefined) expect(notice).toBeUndefined();
				else expect(notice?.kind).toBe('refused');
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
