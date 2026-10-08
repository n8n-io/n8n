import { describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { AutomationProposalCard as Proposal } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { makeManualProposal, makeProposal } from './automationProposalFixtures';

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'nodeName', 'size'],
		template: '<span data-test-id="node-icon" />',
	},
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) =>
			type === 'n8n-nodes-base.slack' ? { displayName: 'Slack' } : null,
	}),
}));

const renderComponent = createComponentRenderer(AutomationProposalCard, {
	pinia: createTestingPinia(),
});

function renderCard(proposal: Proposal, disabled = false) {
	return renderComponent({ props: { proposal, disabled } });
}

const buttonLabels = (buttons: HTMLElement[]) =>
	buttons.map((button) => button.textContent?.trim());

describe('AutomationProposalCard', () => {
	it('shows the schedule, the steps, the place and who can see it', () => {
		const { getByRole, getByTestId, queryByTestId } = renderCard(makeProposal());

		const card = getByRole('group', { name: 'Want this to happen automatically?' });
		expect(card).toBe(getByTestId('automation-proposal-card'));
		expect(getByTestId('automation-proposal-name')).toHaveTextContent('Morning digest');
		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs at 08:00, Monday through Friday (Europe/London)',
		);
		expect(getByTestId('automation-proposal-place')).toHaveTextContent(
			'Runs on This computer · Only runs while this computer is on.',
		);
		expect(queryByTestId('automation-proposal-caveat')).not.toBeInTheDocument();
		expect(getByTestId('automation-proposal-visible-to')).toHaveTextContent('Visible to: Ops');

		const steps = within(getByRole('list', { name: 'Steps' }));
		expect(steps.getByRole('img', { name: 'Every weekday' })).toBeInTheDocument();
		expect(steps.getByRole('img', { name: 'Send digest' })).toBeInTheDocument();
	});

	it('offers the buttons in the order turn on, save switched off, not now', () => {
		const { getAllByRole } = renderCard(makeProposal());

		expect(buttonLabels(getAllByRole('button'))).toEqual([
			'Turn it on',
			'Save, but leave it off',
			'Not now',
		]);
	});

	it('asks to keep a manual workflow, without a trigger line or "Turn it on"', () => {
		const { getByRole, getAllByRole, queryByTestId, queryByText } = renderCard(
			makeManualProposal(),
		);

		expect(getByRole('group', { name: 'Keep this as a workflow?' })).toBeInTheDocument();
		expect(queryByTestId('automation-proposal-trigger')).not.toBeInTheDocument();
		expect(queryByText('Turn it on')).not.toBeInTheDocument();
		expect(buttonLabels(getAllByRole('button'))).toEqual(['Save workflow', 'Not now']);
		expect(queryByTestId('automation-proposal-turn-on')).not.toBeInTheDocument();
		expect(getByRole('button', { name: 'Save workflow' })).toBe(getAllByRole('button').at(0));
	});

	it.each([
		['automation-proposal-turn-on', { target: 'local', activate: true }],
		['automation-proposal-save', { target: 'local', activate: false }],
	])('sends the values that %s chose', async (testId, values) => {
		const { getByTestId, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId(testId));

		expect(emitted().submit).toEqual([[{ kind: 'capabilityDecision', approved: true, values }]]);
	});

	it('declines with "Not now"', async () => {
		const { getByTestId, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId('automation-proposal-not-now'));

		expect(emitted().submit).toEqual([[{ kind: 'capabilityDecision', approved: false }]]);
	});

	it('saves a manual workflow switched off', async () => {
		const { getByRole, emitted } = renderCard(makeManualProposal());

		await fireEvent.click(getByRole('button', { name: 'Save workflow' }));

		expect(emitted().submit).toEqual([
			[
				{
					kind: 'capabilityDecision',
					approved: true,
					values: { target: 'local', activate: false },
				},
			],
		]);
	});

	it('sends one answer and then disables the buttons', async () => {
		const { getByTestId, getAllByRole, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		await fireEvent.click(getByTestId('automation-proposal-not-now'));

		expect(emitted().submit).toHaveLength(1);
		for (const button of getAllByRole('button')) expect(button).toBeDisabled();
	});

	it('disables every button and sends nothing while the card is disabled', async () => {
		const { getAllByRole, emitted } = renderCard(makeProposal(), true);

		const buttons = getAllByRole('button');
		expect(buttons).toHaveLength(3);
		for (const button of buttons) {
			expect(button).toBeDisabled();
			await fireEvent.click(button);
		}
		expect(emitted().submit).toBeUndefined();
	});

	it('adds the caveat on its own line after a local need', () => {
		const { getByTestId, getAllByText } = renderCard(
			makeProposal({
				recommended: { targetId: 'local', kind: 'local', reasons: ['needs-local-files'] },
			}),
		);

		expect(getByTestId('automation-proposal-place')).toHaveTextContent(
			'Runs on This computer · it needs files on this computer',
		);
		expect(getByTestId('automation-proposal-caveat')).toHaveTextContent(
			'Only runs while this computer is on.',
		);
		expect(getAllByText(/Only runs while this computer is on/)).toHaveLength(1);
	});

	it('names the place without a reason when the first reason has no text', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				trigger: { kind: 'other' },
				recommended: { targetId: 'local', kind: 'local', reasons: ['manual-only'] },
			}),
		);

		expect(getByTestId('automation-proposal-place').textContent?.trim()).toBe(
			'Runs on This computer',
		);
		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs when its trigger fires',
		);
	});

	it('names a linked instance by its label', () => {
		const { getByTestId, queryByTestId } = renderCard(
			makeProposal({
				recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
				targets: [{ id: 'cloud-1', kind: 'linked', label: 'Team cloud', status: 'online' }],
				offered: { target: ['cloud-1'], activate: [true, false] },
			}),
		);

		expect(getByTestId('automation-proposal-place').textContent?.trim()).toBe('Runs on Team cloud');
		expect(queryByTestId('automation-proposal-caveat')).not.toBeInTheDocument();
	});

	it('describes a trigger without a schedule by its kind', () => {
		const { getByTestId } = renderCard(makeProposal({ trigger: { kind: 'webhook' } }));

		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs when a request arrives',
		);
	});

	it('falls back to the schedule line for a cron it cannot describe', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				trigger: { kind: 'schedule', cron: 'not a cron', timezone: 'Europe/London' },
			}),
		);

		expect(getByTestId('automation-proposal-trigger').textContent?.trim()).toBe(
			'Runs on a schedule',
		);
	});

	it('leaves out the time zone when the card has none', () => {
		const { getByTestId } = renderCard(
			makeProposal({ trigger: { kind: 'schedule', cron: '*/15 * * * *' } }),
		);

		expect(getByTestId('automation-proposal-trigger').textContent?.trim()).toBe(
			'Runs every 15 minutes',
		);
	});

	it('labels a step without a name by its node type and counts the hidden steps', () => {
		const { getByRole } = renderCard(
			makeProposal({ steps: [{ name: '', type: 'n8n-nodes-base.slack' }], stepCount: 4 }),
		);

		const steps = within(getByRole('list', { name: 'Steps' }));
		expect(steps.getByRole('img', { name: 'Slack' })).toBeInTheDocument();
		expect(steps.getByText('+3 more')).toBeInTheDocument();
	});

	it('shows only the name of a personal project', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				visibleTo: {
					projectId: 'project-2',
					projectName: 'Jane Doe <jane@example.com>',
					projectType: 'personal',
				},
			}),
		);

		expect(getByTestId('automation-proposal-visible-to').textContent?.trim()).toBe(
			'Visible to: Jane Doe',
		);
	});
});
