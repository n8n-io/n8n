import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import DeleteUserModal from './DeleteUserModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { getDropdownItems } from '@/__tests__/utils';
import { createProjectListItem } from '@/__tests__/data/projects';
import { DELETE_USER_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import { ProjectTypes } from '@/types/projects.types';
import userEvent from '@testing-library/user-event';
import { useUsersStore } from '@/stores/users.store';
import { ROLE, type UsersList, type User } from '@n8n/api-types';

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

const loggedInUser: User = {
	id: '1',
	email: 'admin@example.com',
	firstName: 'Admin',
	lastName: 'User',
	role: ROLE.Admin,
	isOwner: true,
	isPending: false,
	settings: {},
};
const invitedUser: User = {
	id: '3',
	email: 'pending@example.com',
	firstName: '',
	lastName: '',
	role: ROLE.Member,
	isOwner: false,
	isPending: true,
	settings: {},
	inviteAcceptUrl: 'https://example.com/invite/123',
};
const user: User = {
	id: '2',
	email: 'member@example.com',
	firstName: 'Member',
	lastName: 'User',
	role: ROLE.Member,
	isOwner: false,
	isPending: false,
	settings: {},
};

const mockUsersList: UsersList = {
	items: [loggedInUser, user, invitedUser],
	count: 3,
};

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
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(DeleteUserModal);
let pinia: ReturnType<typeof createTestingPinia>;
let usersStore: MockedStore<typeof useUsersStore>;

describe('DeleteUserModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		usersStore = mockedStore(useUsersStore);

		usersStore.usersList = {
			state: mockUsersList,
			isLoading: false,
			execute: vi.fn(),
			isReady: true,
			error: null,
			then: vi.fn(),
		};
	});

	it('should delete invited users', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: DELETE_USER_MODAL_KEY,
				data: {
					userId: invitedUser.id,
				},
			},
			global,
			pinia,
		});

		await userEvent.click(getByTestId('confirm-delete-user-button'));

		expect(usersStore.deleteUser).toHaveBeenCalledWith({ id: invitedUser.id });
	});

	it('should delete user and transfer workflows and credentials', async () => {
		const { getByTestId, getAllByRole } = renderModal({
			props: {
				modalName: DELETE_USER_MODAL_KEY,
				data: {
					userId: user.id,
				},
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

		expect(confirmButton).toBeEnabled();
		await userEvent.click(confirmButton);

		expect(usersStore.deleteUser).toHaveBeenCalledWith({
			id: user.id,
			transferId: expect.any(String),
		});
	});

	it('should delete user without transfer', async () => {
		const { getByTestId, getAllByRole, getByRole } = renderModal({
			props: {
				modalName: DELETE_USER_MODAL_KEY,
				data: {
					userId: user.id,
				},
			},
			global,
			pinia,
		});

		const confirmButton = getByTestId('confirm-delete-user-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(getAllByRole('radio')[1]);

		const input = getByRole('textbox');

		await userEvent.type(input, 'delete all ');
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, 'data');
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(usersStore.deleteUser).toHaveBeenCalledWith({
			id: user.id,
		});
	});
});
