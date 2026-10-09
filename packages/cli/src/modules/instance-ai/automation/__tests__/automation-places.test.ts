import {
	automationProposalCardSchema,
	type AutomationRecommendationReason,
	automationRecommendationReasonSchema,
	LINKED_INSTANCE_STATUSES,
	type LinkedInstanceSummary,
} from '@n8n/api-types';
import { recommendRunTarget } from '@n8n/instance-ai';
import fc from 'fast-check';

import { buildAutomationCard, type ProposalWorkflow } from '../automation-card';
import {
	cardPlaces,
	cardReasons,
	isLinkedTarget,
	LOCAL_PLACES,
	recommendationTargets,
} from '../automation-places';

const CLOUD_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const LAB_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';
const SPARE_ID = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a';

function link(overrides: Partial<LinkedInstanceSummary> = {}): LinkedInstanceSummary {
	return {
		id: CLOUD_ID,
		name: 'Team cloud',
		baseUrl: 'https://cloud.example.test',
		status: 'online',
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
		...overrides,
	};
}

describe('cardPlaces', () => {
	it('lists only this instance when the user has no links, and says that there are none', () => {
		expect(cardPlaces([])).toEqual({
			targets: [{ id: 'local', kind: 'local', status: 'online' }],
			offered: ['local'],
			noLinks: true,
		});
	});

	it('does not say that there are no links when it lists one, also an offline one', () => {
		expect(cardPlaces([link({ status: 'offline' })]).noLinks).toBe(false);
	});

	it('does not say that there are no links for a card that lists only this instance', () => {
		// The user can have links that the card does not list, for example in a shared chat.
		expect(LOCAL_PLACES.noLinks).toBe(false);
	});

	it('lists every link after this instance, in order, and offers only the online ones', () => {
		const places = cardPlaces([
			link({ id: LAB_ID, name: 'Lab', status: 'offline', baseUrl: 'https://lab.example.test' }),
			link(),
			link({ id: SPARE_ID, name: 'Spare', status: 'mcp-disabled' }),
		]);

		expect(places.targets).toEqual([
			{ id: 'local', kind: 'local', status: 'online' },
			{ id: LAB_ID, kind: 'linked', status: 'offline' },
			{ id: CLOUD_ID, kind: 'linked', status: 'online' },
			{ id: SPARE_ID, kind: 'linked', status: 'mcp-disabled' },
		]);
		expect(places.offered).toEqual(['local', CLOUD_ID]);
	});

	it('keeps the name and the address of each link off the card', () => {
		const places = cardPlaces([link(), link({ id: LAB_ID, name: 'Lab', status: 'offline' })]);

		const stored = JSON.stringify(places);
		expect(stored).not.toContain('Team cloud');
		expect(stored).not.toContain('Lab');
		expect(stored).not.toContain('example.test');
	});

	it.each(['offline', 'unauthorised', 'mcp-disabled', 'unknown'] as const)(
		'does not offer a link with the status %s',
		(status) => {
			expect(cardPlaces([link({ status })]).offered).toEqual(['local']);
		},
	);

	it('gives each card its own target of this instance', () => {
		const first = cardPlaces([]);
		first.targets[0].status = 'offline';

		expect(cardPlaces([]).targets[0].status).toBe('online');
		expect(LOCAL_PLACES.targets[0].status).toBe('online');
	});
});

describe('recommendationTargets', () => {
	it('counts a link with MCP turned off as offline and keeps the other statuses', () => {
		const { targets } = cardPlaces([
			link({ id: CLOUD_ID, status: 'mcp-disabled' }),
			link({ id: LAB_ID, name: 'Lab', status: 'unauthorised' }),
		]);

		expect(recommendationTargets(targets)).toEqual([
			{ id: 'local', kind: 'local', label: 'local', status: 'online' },
			{ id: CLOUD_ID, kind: 'linked', label: CLOUD_ID, status: 'offline' },
			{ id: LAB_ID, kind: 'linked', label: LAB_ID, status: 'unauthorised' },
		]);
	});

	it('recommends an online link for a schedule, and no link with MCP turned off', () => {
		const schedule = ['n8n-nodes-base.scheduleTrigger'];
		const mcpOff = cardPlaces([link({ status: 'mcp-disabled' })]);
		const online = cardPlaces([link()]);

		expect(
			recommendRunTarget({ nodeTypes: schedule, targets: recommendationTargets(mcpOff.targets) }),
		).toEqual({
			targetId: 'local',
			kind: 'local',
			reasons: ['always-on-trigger', 'cloud-offline'],
		});
		expect(
			recommendRunTarget({ nodeTypes: schedule, targets: recommendationTargets(online.targets) }),
		).toEqual({ targetId: CLOUD_ID, kind: 'linked', reasons: ['always-on-trigger'] });
	});
});

describe('cardReasons', () => {
	const NO_LINKS = { noLinks: true };

	it('keeps "no cloud linked" when the user has no link', () => {
		expect(cardReasons(['always-on-trigger', 'no-cloud-linked'], NO_LINKS)).toEqual([
			'always-on-trigger',
			'no-cloud-linked',
		]);
	});

	it('drops "no cloud linked" when the card lists no link for another cause', () => {
		expect(cardReasons(['always-on-trigger', 'no-cloud-linked'], LOCAL_PLACES)).toEqual([
			'always-on-trigger',
		]);
	});

	it('keeps every other reason in its order', () => {
		const reasons: AutomationRecommendationReason[] = [
			'needs-local-commands',
			'always-on-trigger',
			'cloud-offline',
		];

		expect(cardReasons(reasons, LOCAL_PLACES)).toEqual(reasons);
	});

	it('keeps the only reason, because the card needs one', () => {
		expect(cardReasons(['no-cloud-linked'], LOCAL_PLACES)).toEqual(['no-cloud-linked']);
	});

	it('returns a new list', () => {
		const reasons: AutomationRecommendationReason[] = ['manual-only'];

		expect(cardReasons(reasons, NO_LINKS)).not.toBe(reasons);
	});

	it('says "no cloud linked" only when the user has no link, and never gives an empty list (property)', () => {
		const reasonArb = fc.constantFrom(...automationRecommendationReasonSchema.options);
		fc.assert(
			fc.property(
				fc.array(reasonArb, { minLength: 1, maxLength: 4 }),
				fc.boolean(),
				(reasons, noLinks) => {
					const shown = cardReasons(reasons, { noLinks });

					expect(shown.length).toBeGreaterThan(0);
					expect(shown.every((reason) => reasons.includes(reason))).toBe(true);
					if (noLinks) {
						expect(shown).toEqual(reasons);
						return;
					}
					const others = reasons.filter((reason) => reason !== 'no-cloud-linked');
					expect(shown).toEqual(others.length > 0 ? others : reasons);
				},
			),
			{ numRuns: 300 },
		);
	});
});

describe('isLinkedTarget', () => {
	it.each([
		[undefined, false],
		['local', false],
		[CLOUD_ID, true],
		['LOCAL', true],
	])('%s → %s', (target, expected) => {
		expect(isLinkedTarget(target)).toBe(expected);
	});
});

describe('places on the card (property)', () => {
	const NODE_TYPES = [
		'n8n-nodes-base.scheduleTrigger',
		'n8n-nodes-base.webhook',
		'n8n-nodes-base.formTrigger',
		'n8n-nodes-base.readWriteFile',
		'n8n-nodes-base.executeCommand',
		'n8n-nodes-base.localFileTrigger',
		'n8n-nodes-base.slack',
		'n8n-nodes-base.httpRequest',
	];

	const linkArb = fc.record({
		id: fc.uuid(),
		name: fc.string({ minLength: 1, maxLength: 20 }),
		status: fc.constantFrom(...LINKED_INSTANCE_STATUSES),
	});

	const workflow: ProposalWorkflow = {
		id: 'wf-1',
		name: 'Digest builder',
		nodes: [{ name: 'Every day', type: 'n8n-nodes-base.scheduleTrigger' }],
		versionId: 'v-1',
		activeVersionId: null,
		isArchived: false,
		shared: [{ role: 'workflow:owner', project: { id: 'p-1', name: 'Ops', type: 'team' } }],
	};

	it('always recommends an offered place, and offers only this instance and online links', () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(linkArb, { maxLength: 5, selector: (entry) => entry.id }),
				fc.array(fc.constantFrom(...NODE_TYPES), { maxLength: 6 }),
				(links, nodeTypes) => {
					const places = cardPlaces(links.map((entry) => link(entry)));
					const recommendation = recommendRunTarget({
						nodeTypes,
						targets: recommendationTargets(places.targets),
					});
					const card = buildAutomationCard({
						workflow,
						request: { title: 'Digest', why: [] },
						trigger: { kind: 'schedule', canActivate: true },
						recommendation: {
							...recommendation,
							reasons: cardReasons(recommendation.reasons, places),
						},
						places,
						canActivate: true,
					});

					expect(automationProposalCardSchema.safeParse(card).success).toBe(true);
					expect(card.offered.target).toContain(card.recommended.targetId);
					expect(card.offered.target[0]).toBe('local');
					const online = links.filter((entry) => entry.status === 'online').map(({ id }) => id);
					expect(card.offered.target.slice(1)).toEqual(online);
					expect(card.targets.map(({ id }) => id)).toEqual(['local', ...links.map(({ id }) => id)]);
					for (const target of card.targets) {
						expect(Object.keys(target).sort()).toEqual(['id', 'kind', 'status']);
					}
					if (card.recommended.reasons.includes('no-cloud-linked')) {
						expect(links).toHaveLength(0);
					}
				},
			),
			{ numRuns: 300 },
		);
	});
});
