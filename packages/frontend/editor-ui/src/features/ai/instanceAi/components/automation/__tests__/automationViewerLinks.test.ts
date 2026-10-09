import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { LINKED_INSTANCE_STATUSES } from '@n8n/api-types';

import { hasLinkedTargets, withViewerLinks, type ViewerLink } from '../automationViewerLinks';
import {
	CLOUD_LINK_ID,
	LAB_LINK_ID,
	makeLinkedProposal,
	makeProposal,
	OWNER_LINKS,
	serverCard,
} from './automationProposalFixtures';

const OTHER_LINK: ViewerLink = {
	id: '7c6b5a4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
	name: 'My own cloud',
	baseUrl: 'https://mine.example.test',
};

describe('withViewerLinks', () => {
	it("names each linked place from the viewer's own link with the same id", () => {
		const viewed = withViewerLinks(serverCard(makeLinkedProposal()), OWNER_LINKS);

		expect(viewed.targets).toEqual([
			{ id: 'local', kind: 'local', status: 'online' },
			{
				id: CLOUD_LINK_ID,
				kind: 'linked',
				status: 'online',
				label: 'Team cloud',
				baseUrl: 'https://cloud.example.test',
			},
			{
				id: LAB_LINK_ID,
				kind: 'linked',
				status: 'offline',
				label: 'Lab',
				baseUrl: 'https://lab.example.test',
			},
		]);
	});

	it("leaves a place unnamed when the viewer's list does not hold it, as for a teammate", () => {
		const viewed = withViewerLinks(serverCard(makeLinkedProposal()), [OTHER_LINK]);

		expect(viewed.targets[1]).toEqual({ id: CLOUD_LINK_ID, kind: 'linked', status: 'online' });
		expect(JSON.stringify(viewed)).not.toContain('My own cloud');
	});

	it('never takes a name or an address from the card itself', () => {
		// An older stored card can hold them. Only the viewer's own list names a place.
		const viewed = withViewerLinks(makeLinkedProposal(), []);

		expect(viewed.targets.map(({ label, baseUrl }) => ({ label, baseUrl }))).toEqual([
			{ label: undefined, baseUrl: undefined },
			{ label: undefined, baseUrl: undefined },
			{ label: undefined, baseUrl: undefined },
		]);
	});

	it('gives this computer no name, also when a link has its id', () => {
		const viewed = withViewerLinks(makeProposal(), [{ ...OTHER_LINK, id: 'local' }]);

		expect(viewed.targets).toEqual([{ id: 'local', kind: 'local', status: 'online' }]);
	});

	it('names a place only with the link of its own id (property)', () => {
		const linkArb = fc.record({
			id: fc.uuid(),
			name: fc.string({ minLength: 1, maxLength: 12 }),
			baseUrl: fc.webUrl(),
		});
		fc.assert(
			fc.property(
				fc.uniqueArray(linkArb, { maxLength: 4, selector: ({ id }) => id }),
				fc.array(
					fc.record({ id: fc.uuid(), status: fc.constantFrom(...LINKED_INSTANCE_STATUSES) }),
					{ maxLength: 4 },
				),
				(links, places) => {
					const card = makeProposal({
						targets: [
							{ id: 'local', kind: 'local', status: 'online' },
							...places.map((place) => ({ ...place, kind: 'linked' as const })),
						],
					});

					const viewed = withViewerLinks(card, links);

					expect(viewed.targets.map(({ id, status }) => ({ id, status }))).toEqual(
						card.targets.map(({ id, status }) => ({ id, status })),
					);
					for (const target of viewed.targets) {
						const own = links.find(({ id }) => id === target.id);
						const named = target.kind === 'linked' ? own : undefined;
						expect(target.label).toBe(named?.name);
						expect(target.baseUrl).toBe(named?.baseUrl);
					}
				},
			),
		);
	});
});

describe('hasLinkedTargets', () => {
	it('is true only for a card that lists a linked place', () => {
		expect(hasLinkedTargets(makeLinkedProposal())).toBe(true);
		expect(hasLinkedTargets(makeProposal())).toBe(false);
	});
});
