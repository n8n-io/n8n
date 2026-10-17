import type { SkillUsage, SkillVersionSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

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

const normalize = (text: string | null | undefined) => text?.replace(/\s+/g, ' ').trim();

/** The agents button shows only the count; its label carries the summary. */
function summaryOf(row: HTMLElement | undefined) {
	return within(row!).getByTestId('skill-version-agents').getAttribute('aria-label');
}

/** Opens the agents popover of a row and reads its entries. */
async function openAgents(row: HTMLElement | undefined) {
	await userEvent.click(within(row!).getByTestId('skill-version-agents'));
	await screen.findByTestId('skill-version-agents-list');
	return screen.getAllByTestId('skill-version-agent').map((agent) => ({
		text: normalize(agent.textContent),
		live: agent.getAttribute('data-live'),
	}));
}

async function closeAgents(row: HTMLElement | undefined) {
	await userEvent.click(within(row!).getByTestId('skill-version-agents'));
	await vi.waitFor(() =>
		expect(screen.queryByTestId('skill-version-agents-list')).not.toBeInTheDocument(),
	);
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

		expect(within(latest).getByTestId('skill-version-row-select').textContent).toMatch(
			/^\s*v6\s*Latest/,
		);
		expect(latest).not.toHaveTextContent('Version 6');
		expect(within(latest).getByTestId('skill-version-latest')).toHaveTextContent('Latest');
		expect(latest).toHaveTextContent('Ada Lovelace');
		expect(named).toHaveTextContent('EU rules');
		expect(named).toHaveTextContent('v3');
		expect(within(named).queryByTestId('skill-version-latest')).not.toBeInTheDocument();
	});

	it('renders a list with one select button for each row and the actions beside it', () => {
		const { getAllByTestId, getByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY, selectedVersion: 3 },
		});
		const rows = getAllByTestId('skill-version-row');

		expect(getByTestId('skill-version-timeline').querySelector('ul')).not.toBeNull();
		for (const row of rows) {
			expect(row.tagName).toBe('LI');
			expect(row).not.toHaveAttribute('role');
			const select = within(row).getByTestId('skill-version-row-select');
			expect(select.tagName).toBe('BUTTON');
			// No control sits inside the select button.
			expect(select.querySelector('button')).toBeNull();
		}
		expect(within(rows[1]).getByTestId('skill-version-row-select')).toHaveAttribute(
			'aria-current',
			'true',
		);
		expect(within(rows[0]).getByTestId('skill-version-row-select')).not.toHaveAttribute(
			'aria-current',
		);
	});

	it('names the agent count in a tooltip', async () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});

		await userEvent.hover(
			within(getAllByTestId('skill-version-row')[0]).getByTestId('skill-version-agents'),
		);

		expect(await screen.findByText('Used by 1 agent')).toBeInTheDocument();
	});

	it('shows the summary in the agents list only when the agents differ in state', async () => {
		const { getAllByTestId } = renderComponent({
			props: {
				versions: VERSIONS,
				latestVersion: 6,
				usedBy: {
					drafts: [
						{ agentId: 'a1', agentName: 'One', projectId: 'p1', version: 6, pinned: false },
						{ agentId: 'a2', agentName: 'Two', projectId: 'p1', version: 6, pinned: false },
						{ agentId: 'a3', agentName: 'Three', projectId: 'p1', version: 3, pinned: false },
						{ agentId: 'a4', agentName: 'Four', projectId: 'p1', version: 3, pinned: true },
					],
					pins: [],
					hiddenAgents: 0,
				},
			},
		});
		const rows = getAllByTestId('skill-version-row');

		await openAgents(rows[0]);
		expect(screen.queryByTestId('skill-version-agents-summary')).not.toBeInTheDocument();
		await closeAgents(rows[0]);

		await openAgents(rows[1]);
		expect(screen.getByTestId('skill-version-agents-summary')).toHaveTextContent(
			'2 agents · 1 draft · 1 pinned',
		);
	});

	it('summarises the agents on each version', () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');

		expect(summaryOf(rows[0])).toBe('1 agent · 1 draft');
		expect(summaryOf(rows[1])).toBe('1 agent · 1 published');
		expect(summaryOf(rows[2])).toBe('1 agent · 1 pinned');
		expect(within(rows[3]).queryByTestId('skill-version-agents')).not.toBeInTheDocument();
		// The agents are in the popover only.
		expect(screen.queryAllByTestId('skill-version-agent')).toHaveLength(0);
	});

	it('counts many agents on one version', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				versions: VERSIONS,
				latestVersion: 6,
				usedBy: {
					drafts: [
						{ agentId: 'a1', agentName: 'One', projectId: 'p1', version: 6, pinned: false },
						{ agentId: 'a2', agentName: 'Two', projectId: 'p1', version: 6, pinned: false },
						{ agentId: 'a3', agentName: 'Three', projectId: 'p1', version: 6, pinned: true },
					],
					pins: [
						{ agentId: 'a1', agentName: 'One', projectId: 'p1', version: 6 },
						{ agentId: 'a4', agentName: 'Four', projectId: 'p1', version: 6 },
					],
					hiddenAgents: 0,
				},
			},
		});

		// One merges its draft and published entries, so it counts once.
		expect(summaryOf(getAllByTestId('skill-version-row')[0])).toBe(
			'4 agents · 2 drafts · 1 pinned · 2 published',
		);
	});

	it('lists the agents of a version with their state', async () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');

		expect(await openAgents(rows[0])).toEqual([{ text: 'Support bot Draft', live: null }]);
		await closeAgents(rows[0]);
		expect(await openAgents(rows[1])).toEqual([{ text: 'Returns triage Published', live: null }]);
		await closeAgents(rows[1]);
		expect(await openAgents(rows[2])).toEqual([{ text: 'Billing agent Pinned', live: null }]);
	});

	it('opens the agents without selecting the version', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});

		await openAgents(getAllByTestId('skill-version-row')[1]);

		expect(emitted('select')).toBeUndefined();
	});

	it('explains each state in a tooltip', async () => {
		const { getAllByTestId } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');
		const tooltipOf = async (row: HTMLElement, text: string) => {
			await openAgents(row);
			await userEvent.hover(screen.getByTestId('skill-version-agent-state'));
			expect(await screen.findByText(text)).toBeInTheDocument();
			await closeAgents(row);
		};

		await tooltipOf(rows[0], 'The draft of Support bot uses this version and follows the latest');
		await tooltipOf(rows[1], 'The published Returns triage runs this version');
		await tooltipOf(rows[2], 'The draft of Billing agent is pinned to this version');
	});

	it('has no colour legend', () => {
		const { container } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});

		expect(container.querySelector('footer')).toBeNull();
		expect(container).not.toHaveTextContent('Green:');
	});

	describe('an agent with a draft and a live version', () => {
		function renderWith(usedBy: SkillUsage) {
			const { getAllByTestId } = renderComponent({
				props: { versions: VERSIONS, latestVersion: 6, usedBy },
			});
			const rows = getAllByTestId('skill-version-row');
			return (versionNumber: number) =>
				rows.find((r) => r.getAttribute('data-version') === String(versionNumber));
		}

		it('shows one entry that names both states when both use the same version', async () => {
			const rowOf = renderWith({
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

			expect(summaryOf(rowOf(6))).toBe('1 agent · 1 draft · 1 published');
			expect(await openAgents(rowOf(6))).toEqual([
				{ text: 'Support bot Draft · Published', live: 'true' },
			]);
			await userEvent.hover(screen.getByTestId('skill-version-agent-state'));
			expect(
				await screen.findByText('The draft and the published Support bot both use this version'),
			).toBeInTheDocument();
			await closeAgents(rowOf(6));

			expect(await openAgents(rowOf(2))).toEqual([
				{ text: 'Billing agent Pinned · Published', live: 'true' },
			]);
		});

		it('shows the agent on each row when the versions differ', async () => {
			const rowOf = renderWith({
				drafts: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 6, pinned: false },
				],
				pins: [{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 3 }],
				hiddenAgents: 0,
			});

			expect(await openAgents(rowOf(6))).toEqual([{ text: 'Support bot Draft', live: null }]);
			await closeAgents(rowOf(6));
			expect(await openAgents(rowOf(3))).toEqual([{ text: 'Support bot Published', live: null }]);
		});

		it('shows a live entry when only the published agent uses the skill', async () => {
			const rowOf = renderWith({
				drafts: [],
				pins: [{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 3 }],
				hiddenAgents: 0,
			});

			expect(within(rowOf(6)!).queryByTestId('skill-version-agents')).not.toBeInTheDocument();
			expect(await openAgents(rowOf(3))).toEqual([{ text: 'Support bot Published', live: null }]);
		});
	});

	it('selects a version and offers a compare on each older one', async () => {
		const { getAllByTestId, findByText, emitted } = renderComponent({
			props: { versions: VERSIONS, latestVersion: 6, usedBy: USED_BY },
		});
		const rows = getAllByTestId('skill-version-row');

		expect(within(rows[0]).queryByTestId('skill-version-row-compare')).not.toBeInTheDocument();
		const compare = within(rows[2]).getByTestId('skill-version-row-compare');
		expect(compare).toHaveAttribute('aria-label', 'Compare with latest');
		expect(compare).toHaveTextContent('');

		await userEvent.hover(compare);
		expect(await findByText('Compare with latest')).toBeInTheDocument();

		await fireEvent.click(within(rows[1]).getByTestId('skill-version-row-select'));
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
