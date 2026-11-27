import { N8nDialog } from '@n8n/design-system';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import RestrictReviewDialog from './RestrictReviewDialog.vue';
import {
	useRestrictReviewStore,
	type BulkRestrictReviewRequest,
	type RestrictReviewRequest,
} from './restrict-review.store';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

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

	describe('telemetry', () => {
		const reviewedEvent = TELEMETRY_EVENT.TYPE_AVAILABILITY_POLICIES.USER_REVIEWED_TYPE_RESTRICTION;

		it('reports a confirm with the type and its usage', async () => {
			open(notion);

			await userEvent.click(await screen.findByRole('button', { name: 'Restrict' }));

			expect(track).toHaveBeenCalledTimes(1);
			expect(track).toHaveBeenCalledWith(reviewedEvent, {
				kind: 'node-types',
				type_name: 'n8n-nodes-base.notion',
				decision: 'confirm',
				use_count: 3,
				workflow_count: 2,
				active_workflow_count: 0,
			});
		});

		it('reports a cancel by Escape, with unknown counts', async () => {
			open({ ...notion, kind: 'credential', name: 'notionApi', usage: null });

			await screen.findByTestId('restrict-review-dialog');
			await userEvent.keyboard('{Escape}');

			await waitFor(() =>
				expect(track).toHaveBeenCalledWith(reviewedEvent, {
					kind: 'credential-types',
					type_name: 'notionApi',
					decision: 'cancel',
					use_count: null,
					workflow_count: null,
					active_workflow_count: null,
				}),
			);
			expect(track).toHaveBeenCalledTimes(1);
		});

		it.each([
			[
				'the Cancel button',
				async () => {
					await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
				},
			],
			['a click outside', clickReviewOverlay],
		])('reports a cancel by %s, with the usage', async (_, cancel) => {
			open(notion);

			await cancel();

			await waitFor(() =>
				expect(track).toHaveBeenCalledWith(reviewedEvent, {
					kind: 'node-types',
					type_name: 'n8n-nodes-base.notion',
					decision: 'cancel',
					use_count: 3,
					workflow_count: 2,
					active_workflow_count: 0,
				}),
			);
			expect(track).toHaveBeenCalledTimes(1);
		});

		it('does not report a review that the page cancels', async () => {
			open(notion);
			await screen.findByTestId('restrict-review-dialog');

			useRestrictReviewStore().cancelAll();

			await waitFor(() =>
				expect(screen.queryByTestId('restrict-review-dialog')).not.toBeInTheDocument(),
			);
			expect(track).not.toHaveBeenCalled();
		});
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

	describe('bulk restriction', () => {
		const bulk: BulkRestrictReviewRequest = {
			kind: 'node',
			total: 5,
			items: [
				{ name: 'n8n-nodes-base.notion', label: 'Notion', usage: notion.usage },
				{ name: 'n8n-nodes-base.slack', label: 'Slack', usage: null },
			],
		};

		function openBulk(request: BulkRestrictReviewRequest) {
			const review = useRestrictReviewStore();
			review.bulkRequest = request;
			const resolve = vi.spyOn(review, 'resolve');
			renderComponent();
			return { resolve };
		}

		it('lists each type in use with its usage, and the types with no known usage', async () => {
			openBulk(bulk);

			await waitFor(() => expect(screen.getByText('Restrict 5 nodes?')).toBeInTheDocument());
			expect(
				screen.getByText(
					// Slack has its own line, but its usage is not known, so it does not count as in use.
					"Users won't be able to add or use these nodes. 1 of the 5 selected items is currently used:",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText('Notion: 3 uses across 2 workflows, 0 active workflows'),
			).toBeInTheDocument();
			expect(
				screen.getByText('Slack: the usage could not be loaded, so it may be in use'),
			).toBeInTheDocument();
		});

		it('counts each type in use', async () => {
			openBulk({
				...bulk,
				items: bulk.items.map((item) => ({ ...item, usage: notion.usage })),
			});

			expect(
				await screen.findByText(
					"Users won't be able to add or use these nodes. 2 of the 5 selected items are currently used:",
				),
			).toBeInTheDocument();
		});

		it('uses the credential text', async () => {
			openBulk({ ...bulk, kind: 'credential' });

			expect(await screen.findByText('Restrict 5 credential types?')).toBeInTheDocument();
		});

		it('confirms with the count, and reports no single-type review', async () => {
			const { resolve } = openBulk(bulk);

			await userEvent.click(await screen.findByRole('button', { name: 'Restrict 5' }));
			expect(resolve).toHaveBeenCalledWith(true);
			expect(track).not.toHaveBeenCalled();
		});

		it('cancels with Cancel', async () => {
			const { resolve } = openBulk(bulk);

			await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
			expect(resolve).toHaveBeenCalledWith(false);
		});
	});
});
