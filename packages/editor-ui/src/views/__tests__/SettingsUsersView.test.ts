import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import ModalRoot from '@/components/ModalRoot.vue';
import DeleteUserModal from '@/components/DeleteUserModal.vue';
import SettingsUsersView from '@/views/SettingsUsersView.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useUsersStore } from '@/stores/users.store';
import { createUser } from '@/__tests__/data/users';
import { createProjectListItem } from '@/__tests__/data/projects';
import { useRBACStore } from '@/stores/rbac.store';
import { DELETE_USER_MODAL_KEY } from '@/constants';
import { expect } from 'vitest';

const wrapperComponentWithModal = {
	components: { SettingsUsersView, ModalRoot, DeleteUserModal },
	template: `
		<div>
		<SettingsUsersView />
		<ModalRoot name="${DELETE_USER_MODAL_KEY}">
			<template #default="{ modalName, activeId }">
				<DeleteUserModal :modal-name="modalName" :active-id="activeId" />
			</template>
		</ModalRoot>
		</div>
	`,
};

const renderComponent = createComponentRenderer(wrapperComponentWithModal);

const loggedInUser = createUser();
const users = Array.from({ length: 3 }, createUser);
const personalProjects = Array.from({ length: 3 }, createProjectListItem);

let projectsStore: ReturnType<typeof useProjectsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let rbacStore: ReturnType<typeof useRBACStore>;

describe('SettingsUsersView', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		projectsStore = useProjectsStore();
		usersStore = useUsersStore();
		rbacStore = useRBACStore();

		vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);
		vi.spyOn(usersStore, 'fetchUsers').mockImplementation(async () => await Promise.resolve());
		vi.spyOn(usersStore, 'allUsers', 'get').mockReturnValue(users);
		vi.spyOn(usersStore, 'getUserById', 'get').mockReturnValue(() => loggedInUser);
		vi.spyOn(projectsStore, 'getAllProjects').mockImplementation(
			async () => await Promise.resolve(),
		);
		vi.spyOn(projectsStore, 'personalProjects', 'get').mockReturnValue(personalProjects);
	});

	it('should show confirmation modal before deleting user and delete with transfer', async () => {
		const deleteUserSpy = vi.spyOn(usersStore, 'deleteUser').mockImplementation(async () => {});

		const { getByTestId } = renderComponent();

		const userListItem = getByTestId(`user-list-item-${users[0].email}`);
		expect(userListItem).toBeInTheDocument();

		const actionToggle = within(userListItem).getByTestId('action-toggle');
		const actionToggleButton = within(actionToggle).getByRole('button');
		expect(actionToggleButton).toBeVisible();

		await userEvent.click(actionToggle);
		const actionToggleId = actionToggleButton.getAttribute('aria-controls');

		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		const actionDelete = within(actionDropdown).getByTestId('action-delete');
		await userEvent.click(actionDelete);

		const modal = getByTestId('deleteUser-modal');
		expect(modal).toBeVisible();
		const confirmButton = within(modal).getByTestId('confirm-delete-user-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[0]);

		const projectSelect = getByTestId('project-sharing-select');
		expect(projectSelect).toBeVisible();

		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);

		expect(confirmButton).toBeEnabled();
		await userEvent.click(confirmButton);
		expect(deleteUserSpy).toHaveBeenCalledWith({
			id: users[0].id,
			transferId: expect.any(String),
		});
	});

	it('should show confirmation modal before deleting user and delete without transfer', async () => {
		const deleteUserSpy = vi.spyOn(usersStore, 'deleteUser').mockImplementation(async () => {});

		const { getByTestId } = renderComponent();

		const userListItem = getByTestId(`user-list-item-${users[0].email}`);
		expect(userListItem).toBeInTheDocument();

		const actionToggle = within(userListItem).getByTestId('action-toggle');
		const actionToggleButton = within(actionToggle).getByRole('button');
		expect(actionToggleButton).toBeVisible();

		await userEvent.click(actionToggle);
		const actionToggleId = actionToggleButton.getAttribute('aria-controls');

		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		const actionDelete = within(actionDropdown).getByTestId('action-delete');
		await userEvent.click(actionDelete);

		const modal = getByTestId('deleteUser-modal');
		expect(modal).toBeVisible();
		const confirmButton = within(modal).getByTestId('confirm-delete-user-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[1]);

		const input = within(modal).getByRole('textbox');

		await userEvent.type(input, 'delete all ');
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, 'data');
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(deleteUserSpy).toHaveBeenCalledWith({
			id: users[0].id,
		});
	});
});
