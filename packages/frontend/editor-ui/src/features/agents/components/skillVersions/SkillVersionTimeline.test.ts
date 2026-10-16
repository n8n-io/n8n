import type { SkillUsage, SkillVersionSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, within } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import SkillVersionTimeline from './SkillVersionTimeline.vue';

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(SkillVersionTimeline, {
	pinia: createTestingPinia(),
});

function version(versionNumber: number, label: string | null = null): SkillVersionSummary {
	return {
		id: `id-${versionNumber}`,
		version: versionNumber,
		label,
		createdBy: { id: 'u1', email: 'ada@acme.test', firstName: 'Ada', lastName: 'Lovelace' },
		createdAt: new Date().toISOString(),
	};
}

// Newest first, as the API lists them.
const VERSIONS = [
	version(6),
	version(5),
	version(4),
	version(3, 'EU rules'),
	version(2),
	version(1),
];

const USED_BY: SkillUsage = {
	drafts: [
		{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 6, pinned: false },
		{ agentId: 'a2', agentName: 'Billing agent', projectId: 'p1', version: 2, pinned: true },
	],
	pins: [{ agentId: 'a3', agentName: 'Returns triage', projectId: 'p1', version: 3 }],
	hiddenAgents: 0,
};

function rowVersions(rows: HTMLElement[]) {
	return rows.map((row) => row.getAttribute('data-version'));
}

describe('SkillVersionTimeline', () => {
	it('lists versions newest first and folds unnamed runs without agents', async () => {
		const { getAllByTestId, getByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});

		// v5 and v4 fold. v2 has a pinned agent and v1 is alone, so both stay.
		expect(rowVersions(getAllByTestId('skill-version-row'))).toEqual(['6', '3', '2', '1']);
		const unnamed = getByTestId('skill-version-unnamed');
		expect(unnamed).toHaveTextContent('2 unnamed versions');

		await fireEvent.click(unnamed);

		expect(rowVersions(getAllByTestId('skill-version-row'))).toEqual([
			'6',
			'5',
			'4',
			'3',
			'2',
			'1',
		]);
	});

	it('names a version by its label, else by its number, with the author', () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6 },
		});
		const [latest, named] = getAllByTestId('skill-version-row');

		expect(latest).toHaveTextContent('Version 6');
		expect(latest).toHaveTextContent('v6 · latest');
		expect(latest).toHaveTextContent('Ada Lovelace');
		expect(named).toHaveTextContent('EU rules');
	});

	it('shows the agents on each version', () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');
		const chips = (row: HTMLElement) =>
			within(row)
				.queryAllByTestId('skill-version-agent')
				.map((chip) => chip.textContent?.trim());

		expect(chips(rows[0])).toEqual(['Support bot']);
		expect(chips(rows[1])).toEqual(['Returns triage · published']);
		expect(chips(rows[2])).toEqual(['Billing agent · pinned']);
	});

	describe('an agent with a draft and a live version', () => {
		const chipsOf = (row: HTMLElement) =>
			within(row)
				.queryAllByTestId('skill-version-agent')
				.map((chip) => ({
					text: chip.textContent?.replace(/\s+/g, ' ').trim(),
					live: chip.getAttribute('data-live'),
				}));

		function renderWith(usedBy: SkillUsage) {
			const { getAllByTestId } = renderComponent({
				props: { versions: VERSIONS, latestVersion: 6, usedBy },
			});
			const rows = getAllByTestId('skill-version-row');
			return (versionNumber: number) => {
				const row = rows.find((r) => r.getAttribute('data-version') === String(versionNumber));
				return row ? chipsOf(row) : [];
			};
		}

		it('shows one chip with a live marker when both use the same version', () => {
			const chipsOn = renderWith({
				drafts: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 6, pinned: false },
					{ agentId: 'a2', agentName: 'Billing agent', projectId: 'p1', version: 2, pinned: true },
				],
				pins: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 6 },
					{ agentId: 'a2', agentName: 'Billing agent', projectId: 'p1', version: 2 },
				],
				hiddenAgents: 0,
			});

			expect(chipsOn(6)).toEqual([{ text: 'Support bot published', live: 'true' }]);
			expect(chipsOn(2)).toEqual([{ text: 'Billing agent · pinned published', live: 'true' }]);
		});

		it('shows the agent on each row when the versions differ', () => {
			const chipsOn = renderWith({
				drafts: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 6, pinned: false },
				],
				pins: [{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 3 }],
				hiddenAgents: 0,
			});

			expect(chipsOn(6)).toEqual([{ text: 'Support bot', live: null }]);
			expect(chipsOn(3)).toEqual([{ text: 'Support bot · published', live: null }]);
		});

		it('shows a live chip when only the published agent uses the skill', () => {
			const chipsOn = renderWith({
				drafts: [],
				pins: [{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 3 }],
				hiddenAgents: 0,
			});

			expect(chipsOn(6)).toEqual([]);
			expect(chipsOn(3)).toEqual([{ text: 'Support bot · published', live: null }]);
		});
	});

	it('selects a version and offers a compare on each older one', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');

		expect(within(rows[0]).queryByTestId('skill-version-row-compare')).not.toBeInTheDocument();
		await fireEvent.click(rows[1]);
		await fireEvent.click(within(rows[2]).getByTestId('skill-version-row-compare'));

		expect(emitted('select')).toEqual([[3]]);
		expect(emitted('compare')).toEqual([[2]]);
	});

	it('closes', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6 },
		});

		await fireEvent.click(getByTestId('skill-version-timeline-close'));

		expect(emitted('close')).toHaveLength(1);
	});
});
