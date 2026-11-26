import type { PromotionReviewChanges } from '@n8n/api-types';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';

import {
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
} from '../../__tests__/missingDependencies.fixtures';
import * as api from '../../promotions.api';
import PromotionReviewChangesTab from './PromotionReviewChanges.vue';
import PromotionReviewIssues from './PromotionReviewIssues.vue';

vi.mock('../../promotions.api');

const renderComponent = createComponentRenderer(PromotionReviewIssues, {
	// These tests read text. Icons and skeletons only add render work.
	global: { stubs: { N8nIcon: true } },
});

const reviewChanges = (
	missingDependencies: PromotionReviewChanges['missingDependencies'],
): PromotionReviewChanges => ({
	baselineCommitSha: 'a'.repeat(40),
	headCommitSha: 'b'.repeat(40),
	resources: [],
	dependencies: [],
	warnings: [],
	outcome: null,
	missingDependencies,
});

const render = (reviewId = 'review-1') =>
	renderComponent({ pinia: createTestingPinia(), props: { reviewId } });

const renderChangesTab = createComponentRenderer(PromotionReviewChangesTab);

/** The Changes tab of the inbox, which loads the review before the Issues tab can open. */
async function renderLoadedChangesTab(
	missingDependencies: PromotionReviewChanges['missingDependencies'],
	reviewId = 'review-1',
) {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValueOnce(
		reviewChanges(missingDependencies),
	);
	const result = renderChangesTab({ pinia: createTestingPinia(), props: { reviewId } });
	await waitAllPromises();
	return result;
}

const issueNames = (issues: HTMLElement) =>
	within(issues)
		.getAllByTestId('promotion-preview-blocker-row')
		.map((row) => within(row).getAllByRole('cell')[0].textContent?.trim());

/** A section of the list, by its heading. */
const section = (sections: HTMLElement[], title: string) => {
	const element = sections.find(
		(candidate) => within(candidate).queryByRole('heading', { name: title }) !== null,
	);
	if (!element) throw new Error(`No section ${title}`);
	return within(element);
};

beforeEach(() => {
	vi.mocked(api.getPromotionReviewChanges).mockReset();
});

it('shows a loading state until the changes of the review arrive', async () => {
	const changes = createDeferredPromise<PromotionReviewChanges>();
	vi.mocked(api.getPromotionReviewChanges).mockReturnValue(changes.promise);

	const { getByTestId, queryByTestId } = render();

	expect(getByTestId('promotion-review-issues-loading')).toBeInTheDocument();
	expect(api.getPromotionReviewChanges).toHaveBeenCalledWith(expect.anything(), 'review-1');

	changes.resolve(reviewChanges([outsideAccessWorkflow]));
	await waitAllPromises();

	expect(queryByTestId('promotion-review-issues-loading')).not.toBeInTheDocument();
	expect(getByTestId('promotion-review-issues')).toBeVisible();
});

it('says that the issues cannot load when the request fails', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockRejectedValue(new Error('offline'));

	const { getByTestId, queryByTestId } = render();
	await waitAllPromises();

	expect(getByTestId('promotion-review-issues-error')).toHaveTextContent(
		"Couldn't load the issues of this review",
	);
	expect(queryByTestId('promotion-review-issues')).not.toBeInTheDocument();
});

it('lists the dependencies that the promotion leaves out, in one section for each group', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
		reviewChanges([otherProjectCredential, outsideAccessWorkflow, personalCredential]),
	);

	const { getAllByRole, getAllByTestId, getByTestId } = render();
	await waitAllPromises();

	const issues = getByTestId('promotion-review-issues');
	expect(issues).toHaveTextContent(
		'These dependencies are not part of this promotion. Workflows that use them cannot be published until they exist where this is applied.',
	);
	// The text of the Promote page is for the author, not for the reviewer.
	expect(issues).not.toHaveTextContent('Issues may stop you from promoting some changes.');
	expect(getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
		'In another project (1)',
		'Outside your access (1)',
		'Cannot be promoted (1)',
	]);

	const outside = section(
		getAllByTestId('promotion-preview-blockers-section'),
		'Outside your access (1)',
	);
	expect(
		outside.getByText(
			'The promotion does not carry them. Where it is applied, they must exist before the workflows that use them can be published.',
		),
	).toBeVisible();
	expect(
		within(outside.getByRole('row', { name: /Send audit log/ }))
			.getAllByRole('cell')
			.map((cell) => cell.textContent?.trim()),
	).toEqual([
		'Send audit log',
		'Invoice reconciliationWeekly KPI report',
		'Workflow',
		'No access',
		'Include',
	]);
});

it('keeps the Include action disabled, because the reviewer cannot include a dependency', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
		reviewChanges([outsideAccessWorkflow]),
	);

	const { getByRole, getByTestId, queryByTestId } = render();
	await waitAllPromises();

	expect(getByRole('button', { name: 'Include' })).toBeDisabled();
	expect(getByTestId('promotion-preview-blocker-disabled-action')).toHaveAccessibleName(
		'Include. This workflow is in a project that you do not have access to, so you cannot include it.',
	);
	expect(queryByTestId('promotion-preview-blocker-create')).not.toBeInTheDocument();
});

it('shows the workflows that use a dependency as text, because the review opens no card from a name', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
		reviewChanges([otherProjectCredential, outsideAccessWorkflow, personalCredential]),
	);

	const { getAllByTestId, queryAllByTestId } = render();
	await waitAllPromises();

	expect(getAllByTestId('promotion-preview-workflow-name').map((name) => name.textContent)).toEqual(
		['Invoice reconciliation', 'Invoice reconciliation', 'Weekly KPI report', 'Weekly KPI report'],
	);
	expect(queryAllByTestId('promotion-preview-workflow-link')).toHaveLength(0);
	for (const row of getAllByTestId('promotion-preview-blocker-row')) {
		const [, usedBy] = within(row).getAllByRole('cell');
		expect(within(usedBy).queryByRole('button')).not.toBeInTheDocument();
		expect(within(usedBy).queryByRole('link')).not.toBeInTheDocument();
	}
});

it('shows no project and no owner of a dependency, also when the API sends the project', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
		reviewChanges([
			{ ...otherProjectCredential, project: { id: 'p2', name: 'Finance' } },
			outsideAccessWorkflow,
		]),
	);

	const { getAllByTestId, getByTestId } = render();
	await waitAllPromises();

	// "Billing" is the project of the workflows, and "Finance" the project of "CRM key".
	expect(getByTestId('promotion-review-issues')).not.toHaveTextContent('Billing');
	expect(getByTestId('promotion-review-issues')).not.toHaveTextContent('Finance');
	for (const row of getAllByTestId('promotion-preview-blocker-row')) {
		expect(row).not.toHaveTextContent(/project|owner/i);
	}
	// The reason of the action does not name the project too.
	for (const action of getAllByTestId('promotion-preview-blocker-disabled-action')) {
		expect(action.getAttribute('aria-label')).not.toContain('Finance');
	}
});

it('loads the issues of another review, and drops a late answer for the review before it', async () => {
	const first = createDeferredPromise<PromotionReviewChanges>();
	vi.mocked(api.getPromotionReviewChanges)
		.mockReturnValueOnce(first.promise)
		.mockResolvedValue(reviewChanges([personalCredential]));

	const { getByTestId, queryByText, rerender } = render();
	await rerender({ reviewId: 'review-2' });
	await waitAllPromises();
	first.resolve(reviewChanges([outsideAccessWorkflow]));
	await waitAllPromises();

	expect(api.getPromotionReviewChanges).toHaveBeenLastCalledWith(expect.anything(), 'review-2');
	expect(getByTestId('promotion-review-issues')).toHaveTextContent('Personal Gmail');
	expect(queryByText('Send audit log')).not.toBeInTheDocument();
});

describe('with the Changes tab of the review', () => {
	it('lists the dependencies that the Changes tab counted, and sends no second request', async () => {
		const changesTab = await renderLoadedChangesTab([
			otherProjectCredential,
			outsideAccessWorkflow,
		]);
		// A second request can find other dependencies, at another head commit.
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(reviewChanges([personalCredential]));

		const { getByTestId, queryByTestId } = render();

		expect(queryByTestId('promotion-review-issues-loading')).not.toBeInTheDocument();
		await waitAllPromises();

		expect(api.getPromotionReviewChanges).toHaveBeenCalledTimes(1);
		const names = issueNames(getByTestId('promotion-review-issues'));
		expect(names).toEqual([otherProjectCredential.name, outsideAccessWorkflow.name]);
		expect(changesTab.emitted().state.at(-1)).toEqual([
			expect.objectContaining({ status: 'ready', issueCount: names.length }),
		]);
	});

	it('lists the dependencies of the newest answer after the Changes tab loads again', async () => {
		const first = await renderLoadedChangesTab([otherProjectCredential, outsideAccessWorkflow]);
		first.unmount();
		await renderLoadedChangesTab([personalCredential]);

		const { getByTestId } = render();
		await waitAllPromises();

		expect(api.getPromotionReviewChanges).toHaveBeenCalledTimes(2);
		expect(issueNames(getByTestId('promotion-review-issues'))).toEqual([personalCredential.name]);
	});

	it('loads the issues itself when the Changes tab shows another review', async () => {
		await renderLoadedChangesTab([outsideAccessWorkflow], 'review-2');
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(reviewChanges([personalCredential]));

		const { getByTestId } = render('review-1');
		await waitAllPromises();

		expect(api.getPromotionReviewChanges).toHaveBeenLastCalledWith(expect.anything(), 'review-1');
		expect(issueNames(getByTestId('promotion-review-issues'))).toEqual([personalCredential.name]);
	});

	it('loads the issues itself after the Changes tab is gone', async () => {
		const changesTab = await renderLoadedChangesTab([outsideAccessWorkflow]);
		changesTab.unmount();
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(reviewChanges([personalCredential]));

		const { getByTestId } = render();
		expect(getByTestId('promotion-review-issues-loading')).toBeInTheDocument();
		await waitAllPromises();

		expect(api.getPromotionReviewChanges).toHaveBeenCalledTimes(2);
		expect(issueNames(getByTestId('promotion-review-issues'))).toEqual([personalCredential.name]);
	});

	it('loads the issues itself when the Changes tab cannot load the review', async () => {
		vi.mocked(api.getPromotionReviewChanges).mockRejectedValueOnce(new Error('offline'));
		renderChangesTab({ pinia: createTestingPinia(), props: { reviewId: 'review-1' } });
		await waitAllPromises();
		vi.mocked(api.getPromotionReviewChanges).mockRejectedValue(new Error('offline'));

		const { getByTestId } = render();
		await waitAllPromises();

		expect(api.getPromotionReviewChanges).toHaveBeenCalledTimes(2);
		expect(getByTestId('promotion-review-issues-error')).toBeVisible();
	});
});
