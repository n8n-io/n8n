import { createComponentRenderer } from '@/__tests__/render';
import DeleteUserModal from './DeleteUserModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { getDropdownItems } from '@/__tests__/utils';
import { createProjectListItem } from '@/__tests__/data/projects';
import { createUser } from '@/__tests__/data/users';

import { DELETE_USER_MODAL_KEY } from '@/constants';
import { ProjectTypes } from '@/types/projects.types';
import userEvent from '@testing-library/user-event';
import { useUsersStore } from '@/stores/users.store';
import { STORES } from '@/constants';

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const loggedInUser = createUser();
const invitedUser = createUser({ firstName: undefined });
const user = createUser();

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[DELETE_USER_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [DELETE_USER_MODAL_KEY],
	},
	[STORES.PROJECTS]: {
		projects: [
			ProjectTypes.Personal,
			ProjectTypes.Personal,
			ProjectTypes.Team,
			ProjectTypes.Team,
		].map(createProjectListItem),
	},
	[STORES.USERS]: {
		usersById: {
			[loggedInUser.id]: loggedInUser,
			[user.id]: user,
			[invitedUser.id]: invitedUser,
		},
	},
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(DeleteUserModal);
let pinia: ReturnType<typeof createTestingPinia>;

describe('DeleteUserModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
	});

	it('should delete invited users', async () => {
		const { getByTestId } = renderModal({
			props: {
				activeId: invitedUser.id,
			},
			global,
			pinia,
		});

		const userStore = useUsersStore();

		await userEvent.click(getByTestId('confirm-delete-user-button'));

		expect(userStore.deleteUser).toHaveBeenCalledWith({ id: invitedUser.id });
	});

	it('should delete user and transfer workflows and credentials', async () => {
		const { getByTestId, getAllByRole } = renderModal({
			props: {
				activeId: user.id,
			},
			global,
			pinia,
		});

		const confirmButton = getByTestId('confirm-delete-user-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(getAllByRole('radio')[0]);

		const projectSelect = getByTestId('project-sharing-select');
		expect(projectSelect).toBeVisible();

		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);

		const userStore = useUsersStore();

		expect(confirmButton).toBeEnabled();
		await userEvent.click(confirmButton);

		expect(userStore.deleteUser).toHaveBeenCalledWith({
			id: user.id,
			transferId: expect.any(String),
		});
	});

	it('should delete user without transfer', async () => {
		const { getByTestId, getAllByRole, getByRole } = renderModal({
			props: {
				activeId: user.id,
			},
			global,
			pinia,
		});

		const userStore = useUsersStore();

		const confirmButton = getByTestId('confirm-delete-user-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(getAllByRole('radio')[1]);

		const input = getByRole('textbox');

		await userEvent.type(input, 'delete all ');
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, 'data');
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(userStore.deleteUser).toHaveBeenCalledWith({
			id: user.id,
		});
	});
});
