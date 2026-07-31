import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN } from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import WorkflowReviewSubmittedDialog from './WorkflowReviewSubmittedDialog.vue';

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/workflow-review-requests/:reviewRequestId?',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowReviewSubmittedDialog, {
	props: { open: false, workflowReviewRequestId: 'review-1' },
	// The real RouterLink resolves the named route, so the test asserts the URL
	// the user actually lands on rather than the raw `to` object.
	global: { plugins: [router], stubs: { RouterLink: false } },
});

const renderOpenDialog = async (pinia: ReturnType<typeof createPinia>) => {
	const result = renderComponent({ pinia });
	await result.rerender({ open: true });
	return result;
};

describe('WorkflowReviewSubmittedDialog', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('links to the submitted review', async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole } = await renderOpenDialog(pinia);

		expect(getByRole('link', { name: 'your submission' })).toHaveAttribute(
			'href',
			'/workflow-review-requests/review-1',
		);
	});

	it('renders the confirmation and closes from Got it', async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole, getByTestId, emitted } = await renderOpenDialog(pinia);

		expect(
			getByRole('dialog', { name: 'Workflow version submitted for review' }),
		).toBeInTheDocument();
		expect(getByTestId('workflow-review-submitted-dialog')).toHaveTextContent(
			'You can view your submission in the reviews area',
		);

		await userEvent.click(getByRole('button', { name: 'Got it' }));

		expect(emitted('update:open')).toContainEqual([false]);
	});

	it("persists Don't show again immediately", async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole } = await renderOpenDialog(pinia);

		await userEvent.click(getByRole('checkbox', { name: "Don't show again" }));

		await vi.waitFor(() => {
			expect(
				localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('user-1')),
			).toBe('true');
		});
	});
});
