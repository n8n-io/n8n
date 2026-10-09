import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiToolCallState, LinkedInstanceTransferPreflight } from '@n8n/api-types';

import { CLOUD_LINK_ID, makeLinkedProposal } from './automationProposalFixtures';
import {
	button,
	expectText,
	NEEDS_SLACK,
	preflight,
	preflightMock,
	REMOTE_URL,
	renderCard,
	resetLinkedCardWorld,
	useExperience,
} from './linkedCardHarness';

vi.mock('@/features/linkedInstances/transfer/transfer.api', () => ({
	fetchTransferPreflight: vi.fn(),
	moveWorkflow: vi.fn(),
}));

vi.mock('@/features/linkedInstances/linkedInstances.api', () => ({
	fetchLinkedInstances: vi.fn(),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { props: ['nodeType', 'nodeName', 'size'], template: '<span />' },
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null, loadNodeTypesIfNotLoaded: async () => {} }),
}));

/** A check that waits until the test answers it, so that the test can read the card meanwhile. */
function heldCheck() {
	let answer!: (value: LinkedInstanceTransferPreflight) => void;
	const pending = new Promise<LinkedInstanceTransferPreflight>((resolve) => (answer = resolve));
	return { pending, answer: (value: LinkedInstanceTransferPreflight) => answer(value) };
}

describe('AutomationProposalCard: the check of the cloud and the workflow it moves', () => {
	beforeEach(() => {
		resetLinkedCardWorld();
	});

	describe('notice of the check', () => {
		it('adds no notice when the check of the cloud finds nothing to report', async () => {
			const { getByTestId, queryByTestId } = renderCard({});

			await waitFor(() => expect(button(getByTestId, 'turn-on')).toBeEnabled());

			expect(preflightMock).toHaveBeenCalledTimes(1);
			expect(queryByTestId('automation-proposal-preflight')).not.toBeInTheDocument();
		});

		it.each([
			['"Check again" after a check that found missing set-up', 'recheck', NEEDS_SLACK],
			['"Try again" after a check that failed', 'retry', undefined],
		] as const)(
			'moves focus to the card when the user presses %s with the keyboard',
			async (_label, control, first) => {
				const second = heldCheck();
				if (first) preflightMock.mockResolvedValueOnce(first);
				else preflightMock.mockRejectedValueOnce(new Error('offline'));
				preflightMock.mockReturnValueOnce(second.pending);
				const { getByTestId, findByTestId } = renderCard({});
				const trigger = await findByTestId(`automation-proposal-preflight-${control}`);
				trigger.focus();

				await userEvent.keyboard('{Enter}');

				// The notice shows only its "Checking" line now, without the button that had focus.
				await expectText(
					() => getByTestId('automation-proposal-preflight'),
					'Checking what Team cloud needs…',
				);
				expect(trigger).not.toBeInTheDocument();
				expect(getByTestId('automation-proposal-card')).toHaveFocus();

				second.answer(preflight());

				await waitFor(() => expect(button(getByTestId, 'turn-on')).toBeEnabled());
				expect(getByTestId('automation-proposal-card')).toHaveFocus();
			},
		);
	});

	describe('keep it on this computer while the cloud needs set-up', () => {
		it('offers it in Simple mode, which has no "Change" menu, and then turns it on here', async () => {
			useExperience('simple');
			preflightMock.mockResolvedValue(NEEDS_SLACK);
			const { getByTestId, findByTestId, queryByTestId, sent } = renderCard({});

			const keepHere = await findByTestId('automation-proposal-preflight-set-up-keep-here');
			expect(keepHere).toHaveTextContent('Keep it on this computer');
			expect(button(getByTestId, 'turn-on')).toBeDisabled();

			await userEvent.click(keepHere);

			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on This computer/);
			expect(queryByTestId('automation-proposal-preflight')).not.toBeInTheDocument();
			expect(getByTestId('automation-proposal-card')).toHaveFocus();
			await userEvent.click(button(getByTestId, 'turn-on'));
			expect(sent).toEqual([
				{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: true } },
			]);
		});

		it('leaves it to the "Change" menu in Power mode', async () => {
			useExperience('power');
			preflightMock.mockResolvedValue(NEEDS_SLACK);
			const { findByTestId, queryByTestId, getByRole } = renderCard({});

			await findByTestId('automation-proposal-preflight-set-up');

			expect(getByRole('button', { name: 'Change where it runs' })).toBeInTheDocument();
			expect(
				queryByTestId('automation-proposal-preflight-set-up-keep-here'),
			).not.toBeInTheDocument();
		});
	});

	describe('name of the workflow', () => {
		// The model writes the title and chooses the workflow, so the two can name different ones.
		const renamed = () => makeLinkedProposal({ workflowName: 'Payroll export' });

		it('names the stored workflow that goes to the cloud when the title differs from it', async () => {
			const { getByTestId } = renderCard({ proposal: renamed() });

			await expectText(() => getByTestId('automation-proposal-place'), /^Runs on Team cloud/);
			expect(getByTestId('automation-proposal-name')).toHaveTextContent('Morning digest');
			expect(getByTestId('automation-proposal-workflow-name')).toHaveTextContent(
				'Workflow: Payroll export',
			);
		});

		it('adds no second name when the title is the stored name', async () => {
			const { getByTestId, queryByTestId } = renderCard({});

			await expectText(() => getByTestId('automation-proposal-place'), /^Runs on Team cloud/);
			expect(queryByTestId('automation-proposal-workflow-name')).not.toBeInTheDocument();
		});

		it('names the copy in the cloud by the stored name after the answer', async () => {
			const call = {
				value: {
					toolCallId: 'tc-1',
					toolName: 'propose_automation',
					args: {},
					isLoading: false,
					result: {
						workflowId: 'remote-9',
						url: REMOTE_URL,
						active: true,
						kept: true,
						place: { targetId: CLOUD_LINK_ID, kind: 'linked' },
					},
				} as unknown as InstanceAiToolCallState,
			};
			const answer = {
				kind: 'capabilityDecision',
				approved: true,
				values: { target: CLOUD_LINK_ID, activate: true },
			};

			const { getByTestId, getByRole } = renderCard({ proposal: renamed(), answer, call });

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				/^It's on\. "Payroll export" runs .* on Team cloud\.$/,
			);
			expect(
				getByRole('link', { name: 'Open "Payroll export" in Team cloud (opens in a new tab)' }),
			).toHaveAttribute('href', REMOTE_URL);
		});
	});
});
