import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN } from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';
import WorkflowReviewSubmittedDialog from './WorkflowReviewSubmittedDialog.vue';

const renderComponent = createComponentRenderer(WorkflowReviewSubmittedDialog, {
	props: { open: false },
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

	it('renders the confirmation and closes from Got it', async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole, getByText, emitted } = await renderOpenDialog(pinia);

		expect(
			getByRole('dialog', { name: 'Workflow version submitted for review' }),
		).toBeInTheDocument();
		expect(getByText(/You can view your submission in the reviews area/)).toBeInTheDocument();

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
