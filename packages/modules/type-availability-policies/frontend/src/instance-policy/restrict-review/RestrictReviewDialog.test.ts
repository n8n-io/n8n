import { N8nDialog } from '@n8n/design-system';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import RestrictReviewDialog from './RestrictReviewDialog.vue';
import { useRestrictReviewStore, type RestrictReviewRequest } from './restrict-review.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

const renderComponent = createComponentRenderer(RestrictReviewDialog);

async function clickReviewOverlay() {
	const review = (await screen.findByTestId('restrict-review-dialog')).closest('[role="dialog"]');
	const overlay = review?.previousElementSibling;
	if (!overlay) throw new Error('The review overlay was not rendered');
	await userEvent.click(overlay);
}

// An access dialog with the review stacked above it, as the page renders them.
const onAccessDialogOpenChange = vi.fn();
const renderStacked = createComponentRenderer(
	defineComponent({
		setup: () => () => [
			h(
				N8nDialog,
				{ open: true, header: 'Notion', 'onUpdate:open': onAccessDialogOpenChange },
				() => h('p', { 'data-test-id': 'access-dialog-body' }, 'Access'),
			),
			h(RestrictReviewDialog, { stacked: true }),
		],
	}),
);

function open(request: RestrictReviewRequest) {
	const review = useRestrictReviewStore();
	review.request = request;
	const resolve = vi.spyOn(review, 'resolve');
	renderComponent();
	return { resolve };
}

const notion: RestrictReviewRequest = {
	kind: 'node',
	name: 'n8n-nodes-base.notion',
	label: 'Notion',
	usage: { uses: 3, workflows: 2, activeWorkflows: 0, projects: 1 },
};

describe('RestrictReviewDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows nothing while no review is open', () => {
		renderComponent();

		expect(screen.queryByTestId('restrict-review-dialog')).not.toBeInTheDocument();
	});

	it('shows the usage and the consequence of restricting a node type', async () => {
		open(notion);

		await waitFor(() => expect(screen.getByText('Restrict "Notion"?')).toBeInTheDocument());
		expect(
			screen.getByText(
				"Users won't be able to add or use this node. This item is currently used in:",
			),
		).toBeInTheDocument();
		expect(screen.getByTestId('restrict-review-usage')).toHaveTextContent(
			'3 uses across 2 workflows',
		);
		expect(screen.getByTestId('restrict-review-usage')).toHaveTextContent('0 active workflows');
		expect(
			screen.getByText(
				"Affected workflows can't be published. Active workflows stay published, but their runs will fail.",
			),
		).toBeInTheDocument();
	});

	it('uses the credential text and singular counts', async () => {
		open({
			kind: 'credential',
			name: 'bitlyApi',
			label: 'Bitly API',
			usage: { uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 },
		});

		await waitFor(() =>
			expect(
				screen.getByText(
					"Users won't be able to add or use this credential type. This item is currently used in:",
				),
			).toBeInTheDocument(),
		);
		expect(screen.getByTestId('restrict-review-usage')).toHaveTextContent(
			'1 use across 1 workflow',
		);
		expect(screen.getByTestId('restrict-review-usage')).toHaveTextContent('1 active workflow');
	});

	it('says that the usage is not known when the counts did not load', async () => {
		open({ ...notion, usage: null });

		await waitFor(() =>
			expect(
				screen.getByText(
					"Users won't be able to add or use this node. The usage of this item could not be loaded, so it may be in use.",
				),
			).toBeInTheDocument(),
		);
		expect(screen.queryByTestId('restrict-review-usage')).not.toBeInTheDocument();
	});

	it('confirms with Restrict', async () => {
		const { resolve } = open(notion);

		await userEvent.click(await screen.findByRole('button', { name: 'Restrict' }));

		expect(resolve).toHaveBeenCalledWith(true);
	});

	it('cancels with Cancel', async () => {
		const { resolve } = open(notion);

		await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

		expect(resolve).toHaveBeenCalledWith(false);
		expect(resolve).not.toHaveBeenCalledWith(true);
	});

	it('cancels with a click outside', async () => {
		const { resolve } = open(notion);

		await clickReviewOverlay();

		await waitFor(() => expect(resolve).toHaveBeenCalledWith(false));
	});

	describe('above an access dialog', () => {
		function openStacked() {
			const review = useRestrictReviewStore();
			review.request = notion;
			const resolve = vi.spyOn(review, 'resolve');
			renderStacked();
			return { resolve };
		}

		it('closes only the review on Escape', async () => {
			const { resolve } = openStacked();
			await screen.findByTestId('restrict-review-dialog');

			await userEvent.keyboard('{Escape}');

			await waitFor(() => expect(resolve).toHaveBeenCalledWith(false));
			expect(screen.queryByTestId('restrict-review-dialog')).not.toBeInTheDocument();
			expect(onAccessDialogOpenChange).not.toHaveBeenCalled();
			expect(screen.getByTestId('access-dialog-body')).toBeInTheDocument();
		});

		it('closes only the review on a click outside', async () => {
			const { resolve } = openStacked();

			await clickReviewOverlay();

			await waitFor(() => expect(resolve).toHaveBeenCalledWith(false));
			expect(onAccessDialogOpenChange).not.toHaveBeenCalled();
			expect(screen.getByTestId('access-dialog-body')).toBeInTheDocument();
		});
	});

	it('cancels with Escape', async () => {
		const { resolve } = open(notion);
		await screen.findByTestId('restrict-review-dialog');

		await userEvent.keyboard('{Escape}');

		expect(resolve).toHaveBeenCalledWith(false);
	});
});
