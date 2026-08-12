import { useToast } from '@n8n/composables/useToast';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewDecisionPopover from './WorkflowReviewDecisionPopover.vue';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(),
}));

/**
 * Reka UI popovers do not open in jsdom, so the four primitives N8nPopover imports are
 * stubbed to render inline. Copied rather than imported: the design system keeps its own
 * set private. Reka's trigger machinery goes with them, hence the open button standing in
 * for it — everything after that is the component's own `v-model:open`.
 */
const rekaStubs = {
	PopoverRoot: {
		props: ['open'],
		emits: ['update:open'],
		template: `
			<div :data-open="open" data-test-id="popover-root">
				<button data-test-id="open-popover" @click="$emit('update:open', true)" />
				<slot />
			</div>`,
	},
	PopoverTrigger: { template: '<div><slot /></div>' },
	PopoverPortal: { template: '<div><slot /></div>' },
	PopoverContent: { template: '<div><slot /></div>' },
};

// The real tooltip renders its content in a portal on hover, which jsdom cannot exercise;
// expose the bindings as attributes instead.
const tooltipStub = {
	N8nTooltip: {
		props: ['disabled', 'content'],
		template:
			'<div data-test-id="decision-tooltip" :data-disabled="disabled" :data-content="content"><slot /></div>',
	},
};

const renderComponent = createComponentRenderer(WorkflowReviewDecisionPopover, {
	global: { stubs: { ...rekaStubs, ...tooltipStub } },
	props: {
		deciding: false,
		viewerCanDecide: true,
		viewerCanComment: true,
		ineligibilityHint: '',
	},
});

function tooltipOf(button: HTMLElement) {
	const tooltip = button.closest('[data-test-id="decision-tooltip"]');
	if (!tooltip) throw new Error('button is not wrapped in a tooltip');
	return tooltip;
}

const showError = vi.fn();

describe('WorkflowReviewDecisionPopover', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(() => {
		createTestingPinia();
		showError.mockReset();
		vi.mocked(useToast).mockReturnValue({ showError } as unknown as ReturnType<typeof useToast>);
		store = mockedStore(useReviewActivityStore);
		store.decisionNote = '';
		store.posting = false;
		store.postComment.mockResolvedValue(undefined);
	});

	it('needs a note before the reviewer can request changes or comment', async () => {
		const { getByTestId } = renderComponent();

		const requestChanges = getByTestId('workflow-review-decision-request-changes-button');
		expect(requestChanges).toBeDisabled();
		expect(getByTestId('workflow-review-decision-comment-button')).toBeDisabled();
		expect(tooltipOf(requestChanges)).toHaveAttribute(
			'data-content',
			'Add a note to request changes',
		);
		expect(tooltipOf(requestChanges)).toHaveAttribute('data-disabled', 'false');

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Please add retries');

		expect(requestChanges).not.toBeDisabled();
		expect(getByTestId('workflow-review-decision-comment-button')).not.toBeDisabled();
		expect(tooltipOf(requestChanges)).toHaveAttribute('data-disabled', 'true');
	});

	it('submits a change request with the note', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Please add retries');
		await userEvent.click(getByTestId('workflow-review-decision-request-changes-button'));

		expect(emitted('decide')).toEqual([
			[{ decision: 'changes_requested', note: 'Please add retries' }],
		]);
	});

	it('submits an approval with the note', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Ship it');
		await userEvent.click(getByTestId('workflow-review-decision-approve-button'));

		expect(emitted('decide')).toEqual([[{ decision: 'approved', note: 'Ship it' }]]);
	});

	it('approves without a note rather than sending an empty one', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('workflow-review-decision-approve-button'));

		expect(emitted('decide')).toEqual([[{ decision: 'approved' }]]);
	});

	it('dismisses itself once a decision is submitted', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('open-popover'));
		expect(getByTestId('popover-root')).toHaveAttribute('data-open', 'true');

		await userEvent.click(getByTestId('workflow-review-decision-approve-button'));

		expect(getByTestId('popover-root')).toHaveAttribute('data-open', 'false');
	});

	it('posts the note as a comment and shows the viewer where it landed', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Just a thought');
		await userEvent.click(getByTestId('workflow-review-decision-comment-button'));

		expect(store.postComment).toHaveBeenCalledWith('Just a thought');
		expect(emitted('comment-posted')).toHaveLength(1);
		expect(store.decisionNote).toBe('');
		expect(emitted('decide')).toBeUndefined();
	});

	it('keeps the note when the comment could not be posted', async () => {
		const error = new Error('nope');
		store.postComment.mockRejectedValueOnce(error);

		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Just a thought');
		await userEvent.click(getByTestId('workflow-review-decision-comment-button'));

		expect(showError).toHaveBeenCalledWith(error, 'Could not post comment');
		expect(store.decisionNote).toBe('Just a thought');
		expect(getByTestId('workflow-review-decision-note')).toHaveValue('Just a thought');
		expect(emitted('comment-posted')).toBeUndefined();
	});

	// The draft has to outlive both the popover closing and a switch to another review,
	// so the input is bound to the store rather than to a local ref.
	it('shows the note the review already has and writes edits back', async () => {
		store.decisionNote = 'started earlier';

		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-review-decision-note')).toHaveValue('started earlier');

		await userEvent.type(getByTestId('workflow-review-decision-note'), ' and continued');

		expect(store.decisionNote).toBe('started earlier and continued');
	});

	it('says why the viewer cannot decide instead of just blocking them', () => {
		const { getByTestId } = renderComponent({
			props: {
				viewerCanDecide: false,
				ineligibilityHint: 'You contributed a version to this review.',
			},
		});

		const trigger = getByTestId('workflow-review-decision-trigger');
		expect(trigger).toBeDisabled();
		expect(tooltipOf(trigger)).toHaveAttribute(
			'data-content',
			'You contributed a version to this review.',
		);
		expect(tooltipOf(trigger)).toHaveAttribute('data-disabled', 'false');
	});

	it('keeps the reviewer out while their decision is in flight', () => {
		const { getByTestId } = renderComponent({ props: { deciding: true } });

		expect(getByTestId('workflow-review-decision-trigger')).toBeDisabled();
	});
});
