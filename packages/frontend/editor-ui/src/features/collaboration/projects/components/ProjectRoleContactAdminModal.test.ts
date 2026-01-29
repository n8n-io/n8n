import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ProjectRoleContactAdminModal from './ProjectRoleContactAdminModal.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const mockAdminUser = {
	id: 'admin-1',
	firstName: 'Admin',
	lastName: 'User',
	email: 'admin@example.com',
	role: 'global:admin',
	isPending: false,
	isDefaultUser: false,
	isPendingUser: false,
	mfaEnabled: false,
} as IUser;

const mockOwnerUser = {
	id: 'owner-1',
	firstName: 'Owner',
	lastName: 'User',
	email: 'owner@example.com',
	role: 'global:owner',
	isPending: false,
	isDefaultUser: false,
	isPendingUser: false,
	mfaEnabled: false,
} as IUser;

const mockRegularUser = {
	id: 'user-1',
	firstName: 'Regular',
	lastName: 'User',
	email: 'user@example.com',
	role: 'global:member',
	isPending: false,
	isDefaultUser: false,
	isPendingUser: false,
	mfaEnabled: false,
} as IUser;

const ElDialogStub = {
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(ProjectRoleContactAdminModal, {
	props: {
		modelValue: true,
	},
	global: {
		stubs: {
			ElDialog: ElDialogStub,
		},
	},
});

describe('ProjectRoleContactAdminModal', () => {
	let usersStore: MockedStore<typeof useUsersStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		usersStore = mockedStore(useUsersStore);
		vi.spyOn(usersStore, 'allUsers', 'get').mockReturnValue([
			mockAdminUser,
			mockOwnerUser,
			mockRegularUser,
		]);
		vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue(mockRegularUser);
	});

	describe('Main View', () => {
		it('should render the main view when visible', () => {
			const { getByText } = renderComponent();

			expect(getByText("Custom roles aren't set up yet")).toBeInTheDocument();
		});

		it('should show documentation link', () => {
			const { getByText } = renderComponent();

			expect(getByText('Documentation')).toBeInTheDocument();
		});

		it('should show Cancel and View admins buttons', () => {
			const { getByText } = renderComponent();

			expect(getByText('Cancel')).toBeInTheDocument();
			expect(getByText('View admins')).toBeInTheDocument();
		});
	});

	describe('View transitions', () => {
		it('should switch to admins view when clicking View admins', async () => {
			const user = userEvent.setup();
			const { getByText } = renderComponent();

			await user.click(getByText('View admins'));

			expect(getByText('Instance admins')).toBeInTheDocument();
		});

		it('should show back button in admins view', async () => {
			const user = userEvent.setup();
			const { getByText, container } = renderComponent();

			await user.click(getByText('View admins'));

			const backButton = container.querySelector('button[type="button"]');
			expect(backButton).toBeInTheDocument();
		});

		it('should return to main view when clicking back', async () => {
			const user = userEvent.setup();
			const { getByText, container } = renderComponent();

			await user.click(getByText('View admins'));

			const backButton = container.querySelector('button[type="button"]') as HTMLElement;
			await user.click(backButton);

			expect(getByText("Custom roles aren't set up yet")).toBeInTheDocument();
		});
	});

	describe('Admins list', () => {
		it('should display admin users', async () => {
			const user = userEvent.setup();
			const { getByText } = renderComponent();

			await user.click(getByText('View admins'));

			expect(getByText('Admin User')).toBeInTheDocument();
			expect(getByText('admin@example.com')).toBeInTheDocument();
		});

		it('should display owner users', async () => {
			const user = userEvent.setup();
			const { getByText } = renderComponent();

			await user.click(getByText('View admins'));

			expect(getByText('Owner User')).toBeInTheDocument();
			expect(getByText('owner@example.com')).toBeInTheDocument();
		});

		it('should not display regular users', async () => {
			const user = userEvent.setup();
			const { getByText, queryByText } = renderComponent();

			await user.click(getByText('View admins'));

			expect(queryByText('Regular User')).not.toBeInTheDocument();
		});
	});

	describe('Modal controls', () => {
		it('should emit update:modelValue when Cancel is clicked', async () => {
			const user = userEvent.setup();
			const { getByText, emitted } = renderComponent();

			await user.click(getByText('Cancel'));

			expect(emitted()['update:modelValue']).toBeTruthy();
		});
	});
});
