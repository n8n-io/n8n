import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN } from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';
import WorkflowPublishChoiceDialog from './WorkflowPublishChoiceDialog.vue';

const renderComponent = createComponentRenderer(WorkflowPublishChoiceDialog, {
	props: { open: false },
});

const renderOpenDialog = async (pinia: ReturnType<typeof createPinia>) => {
	const result = renderComponent({ pinia });
	await result.rerender({ open: true });
	return result;
};

describe('WorkflowPublishChoiceDialog', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders the choice and emits the selected action', async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole, emitted } = await renderOpenDialog(pinia);

		expect(
			getByRole('dialog', { name: 'New: Submit for review before publishing' }),
		).toBeInTheDocument();

		await userEvent.click(getByRole('button', { name: 'Submit for review' }));

		expect(emitted('submit-for-review')).toHaveLength(1);
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it("persists Don't show again immediately", async () => {
		const pinia = createPinia();
		useUsersStore(pinia).currentUserId = 'user-1';
		const { getByRole } = await renderOpenDialog(pinia);

		await userEvent.click(getByRole('checkbox', { name: "Don't show again" }));

		await vi.waitFor(() => {
			expect(
				localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('user-1')),
			).toBe('true');
		});
	});
});
