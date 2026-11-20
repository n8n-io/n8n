import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer, mockedStore } from '@n8n/frontend-test-utils';

import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewDecisionPopover from './WorkflowReviewDecisionPopover.vue';

// The real tooltip renders its content in a portal on hover, which jsdom cannot exercise;
// expose the bindings as attributes instead.
const tooltipStub = {
	N8nTooltip: {
		props: ['content'],
		template: '<div data-test-id="decision-tooltip" :data-content="content"><slot /></div>',
	},
};

const renderComponent = createComponentRenderer(WorkflowReviewDecisionPopover, {
	global: { stubs: tooltipStub },
	props: {
		reviewTitle: 'Rename the Slack node',
		deciding: false,
		viewerCanDecide: true,
		viewerCanClose: true,
		ineligibilityHint: '',
	},
});

async function openMenu() {
	await userEvent.click(screen.getByRole('button', { name: 'Review' }));
	return await screen.findByRole('menu');
}

async function choose(name: string) {
	await userEvent.click(within(await openMenu()).getByRole('menuitem', { name }));
}

describe('WorkflowReviewDecisionPopover', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(() => {
		createTestingPinia();
		store = mockedStore(useReviewActivityStore);
		store.decisionNote = '';
	});

	it.each<[string, { viewerCanDecide: boolean; viewerCanClose: boolean }, string[]]>([
		[
			'a reviewer',
			{ viewerCanDecide: true, viewerCanClose: true },
			['Approve and publish', 'Request changes', 'Close review'],
		],
		['the requester', { viewerCanDecide: false, viewerCanClose: true }, ['Close review']],
	])('offers %s only the review actions they may take', async (_label, props, labels) => {
		renderComponent({ props });

		const items = within(await openMenu()).getAllByRole('menuitem');

		expect(items.map((item) => item.textContent?.trim())).toEqual(labels);
	});

	it('says why a viewer who may neither decide nor close is blocked', () => {
		const { getByTestId } = renderComponent({
			props: {
				viewerCanDecide: false,
				viewerCanClose: false,
				ineligibilityHint: 'You contributed a version to this review.',
			},
		});

		const trigger = getByTestId('workflow-review-decision-trigger');
		expect(trigger).toBeDisabled();
		expect(trigger.closest('[data-test-id="decision-tooltip"]')).toHaveAttribute(
			'data-content',
			'You contributed a version to this review.',
		);
	});

	it('keeps the reviewer out while their decision is in flight', () => {
		const { getByTestId } = renderComponent({ props: { deciding: true } });

		expect(getByTestId('workflow-review-decision-trigger')).toBeDisabled();
	});

	it('approves without a note', async () => {
		const { emitted } = renderComponent();

		await choose('Approve and publish');

		expect(emitted('decide')).toEqual([[{ decision: 'approved' }]]);
	});

	it('closes the review only once the viewer confirms', async () => {
		const { emitted } = renderComponent();

		await choose('Close review');
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveTextContent("Close 'Rename the Slack node'?");
		expect(emitted('close')).toBeUndefined();
		await userEvent.click(within(dialog).getByRole('button', { name: 'Close review' }));

		expect(emitted('close')).toHaveLength(1);
		expect(emitted('decide')).toBeUndefined();
	});

	it('leaves the review open when the viewer cancels the close', async () => {
		const { emitted } = renderComponent();

		await choose('Close review');
		await userEvent.click(
			within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
		);

		expect(emitted('close')).toBeUndefined();
	});

	it('asks for a note before it requests changes', async () => {
		const { emitted } = renderComponent();

		await choose('Request changes');
		const submit = await screen.findByTestId('workflow-review-decision-request-changes-button');
		expect(submit).toBeDisabled();
		await userEvent.type(screen.getByTestId('workflow-review-decision-note'), '  Rename the node ');
		await userEvent.click(submit);

		expect(emitted('decide')).toEqual([
			[{ decision: 'changes_requested', note: 'Rename the node' }],
		]);
		expect(screen.queryByTestId('workflow-review-request-changes-form')).not.toBeInTheDocument();
	});

	it('requests nothing when the reviewer cancels the note', async () => {
		const { emitted } = renderComponent();

		await choose('Request changes');
		await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

		expect(emitted('decide')).toBeUndefined();
		expect(screen.queryByTestId('workflow-review-request-changes-form')).not.toBeInTheDocument();
	});

	// The draft has to outlive the form closing and a switch to another review,
	// so the input is bound to the store rather than to a local ref.
	it('shows the note the review already has and writes edits back', async () => {
		store.decisionNote = 'started earlier';
		renderComponent();

		await choose('Request changes');
		const input = await screen.findByTestId('workflow-review-decision-note');
		expect(input).toHaveValue('started earlier');
		await userEvent.type(input, ' and continued');

		expect(store.decisionNote).toBe('started earlier and continued');
	});
});
