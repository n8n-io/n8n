import { createTestingPinia } from '@pinia/testing';
import { useUsersStore } from '@n8n/stores/users.store';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import ApplyNewProjectsDialog from './ApplyNewProjectsDialog.vue';
import type { PrototypeMissingProject } from '../prototypeMissingProjects';

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const projects: PrototypeMissingProject[] = [
	{ id: 'p1', name: 'Billing' },
	{ id: 'p2', name: 'Marketing' },
	{ id: 'p3', name: 'Support' },
];

const renderComponent = createComponentRenderer(ApplyNewProjectsDialog, {
	props: { open: true, environmentName: 'Dev', projects },
});

function signInAsCurrentUser() {
	const usersStore = useUsersStore();
	usersStore.usersById = {
		me: {
			id: 'me',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Admin',
			fullName: 'Ada Admin',
			isPending: false,
			isPendingUser: false,
			isDefaultUser: false,
			mfaEnabled: false,
			signInType: 'email',
		},
	};
	usersStore.currentUserId = 'me';
}

describe('ApplyNewProjectsDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('keeps confirm disabled until a project is selected', async () => {
		const { findByTestId } = renderComponent();
		const confirm = await findByTestId('apply-new-projects-confirm');

		expect(confirm).toBeDisabled();
		await userEvent.hover(confirm.parentElement!);
		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'Select at least one project to continue.',
		);

		await userEvent.click(await findByTestId('apply-new-projects-checkbox-p1'));

		expect(await findByTestId('apply-new-projects-confirm')).toBeDisabled();
	});

	it('asks for an admin when a selected project has none', async () => {
		const { findByTestId } = renderComponent();

		await userEvent.click(await findByTestId('apply-new-projects-checkbox-p1'));

		const confirm = await findByTestId('apply-new-projects-confirm');
		expect(confirm).toBeDisabled();
		await userEvent.hover(confirm.parentElement!);
		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'Select a project admin for each selected project.',
		);
	});

	it('selects every project from the header checkbox', async () => {
		const { findByTestId } = renderComponent();

		await userEvent.click(await findByTestId('apply-new-projects-select-all'));

		const confirm = await findByTestId('apply-new-projects-confirm');
		expect(confirm).toHaveTextContent('Add 3 missing projects');
		expect(confirm).toBeDisabled();
	});

	it('starts each project admin empty, including for the current user', async () => {
		signInAsCurrentUser();

		const { findByTestId, getAllByTestId } = renderComponent();
		const field = await findByTestId('apply-new-projects-admin-p1');

		expect(field.querySelector('input')).toHaveValue('');
		expect(field.querySelector('[data-test-id="user-select-avatar"]')).not.toBeInTheDocument();
		for (const row of getAllByTestId('apply-new-projects-row')) {
			expect(row).not.toHaveTextContent('p1');
		}
	});

	it('reports the chosen projects after an admin is assigned', async () => {
		const usersStore = useUsersStore();
		usersStore.fetchUsers.mockResolvedValue([
			{
				id: 'ada',
				email: 'ada@example.com',
				firstName: 'Ada',
				lastName: 'Admin',
				fullName: 'Ada Admin',
			},
		]);
		const { findByTestId, findByRole, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-new-projects-checkbox-p1'));
		const admin = await findByTestId('apply-new-projects-admin-p1');
		await userEvent.click(admin.querySelector('input')!);
		await userEvent.click(await findByRole('option', { name: /Ada Admin/ }));

		const button = await findByTestId('apply-new-projects-confirm');
		expect(button).toBeEnabled();
		const form = button instanceof HTMLButtonElement ? button.form : null;
		await fireEvent.submit(form!);

		await waitFor(() =>
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: '1 missing project added',
			}),
		);
		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('does not add projects when a selected project has no admin', async () => {
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-new-projects-checkbox-p1'));
		await userEvent.click(await findByTestId('apply-new-projects-checkbox-p3'));

		const button = await findByTestId('apply-new-projects-confirm');
		expect(button).toBeDisabled();
		const form = button instanceof HTMLButtonElement ? button.form : null;
		await fireEvent.submit(form!);

		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
	});
});
