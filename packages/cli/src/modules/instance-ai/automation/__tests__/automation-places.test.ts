import {
	automationProposalCardSchema,
	LINKED_INSTANCE_STATUSES,
	type LinkedInstanceSummary,
} from '@n8n/api-types';
import { recommendRunTarget } from '@n8n/instance-ai';
import fc from 'fast-check';

import { buildAutomationCard, type ProposalWorkflow } from '../automation-card';
import {
	cardPlaces,
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
	it('lists only this instance when the user has no links', () => {
		expect(cardPlaces([])).toEqual({
			targets: [{ id: 'local', kind: 'local', status: 'online' }],
			offered: ['local'],
		});
	});

	it('lists every link after this instance, in order, and offers only the online ones', () => {
		const places = cardPlaces([
			link({ id: LAB_ID, name: 'Lab', status: 'offline', baseUrl: 'https://lab.example.test' }),
			link(),
			link({ id: SPARE_ID, name: 'Spare', status: 'mcp-disabled' }),
		]);

		expect(places.targets).toEqual([
			{ id: 'local', kind: 'local', status: 'online' },
			{
				id: LAB_ID,
				kind: 'linked',
				label: 'Lab',
				status: 'offline',
				baseUrl: 'https://lab.example.test',
			},
			{
				id: CLOUD_ID,
				kind: 'linked',
				label: 'Team cloud',
				status: 'online',
				baseUrl: 'https://cloud.example.test',
			},
			{
				id: SPARE_ID,
				kind: 'linked',
				label: 'Spare',
				status: 'mcp-disabled',
				baseUrl: 'https://cloud.example.test',
			},
		]);
		expect(places.offered).toEqual(['local', CLOUD_ID]);
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
			{ id: 'local', kind: 'local', label: 'This computer', status: 'online' },
			{ id: CLOUD_ID, kind: 'linked', label: 'Team cloud', status: 'offline' },
			{ id: LAB_ID, kind: 'linked', label: 'Lab', status: 'unauthorised' },
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
						recommendation,
						places,
						canActivate: true,
					});

					expect(automationProposalCardSchema.safeParse(card).success).toBe(true);
					expect(card.offered.target).toContain(card.recommended.targetId);
					expect(card.offered.target[0]).toBe('local');
					const online = links.filter((entry) => entry.status === 'online').map(({ id }) => id);
					expect(card.offered.target.slice(1)).toEqual(online);
					expect(card.targets.map(({ id }) => id)).toEqual(['local', ...links.map(({ id }) => id)]);
				},
			),
			{ numRuns: 300 },
		);
	});
});
