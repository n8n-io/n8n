import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import InstanceRoleView from './InstanceRoleView.vue';

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

const mockRoute = {
	name: VIEWS.INSTANCE_ROLE_SETTINGS,
	params: {},
	query: {} as Record<string, unknown>,
};

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
		useRoute: () => mockRoute,
	};
});

const renderComponent = createComponentRenderer(InstanceRoleView);

const mockCustomRole = {
	displayName: 'Support',
	slug: 'support',
	description: 'A custom instance role',
	scopes: ['user:read', 'user:list'],
	licensed: true,
	systemRole: false,
	roleType: 'global' as const,
};

const mockSystemRole = {
	displayName: 'Admin',
	slug: 'global:admin',
	description: 'System admin role',
	scopes: ['tag:read', 'tag:list'],
	licensed: true,
	systemRole: true,
	roleType: 'global' as const,
};

let rolesStore: MockedStore<typeof useRolesStore>;

const getFormElements = (container: Element) => ({
	nameInput: container.querySelector('input[maxlength="100"]') as HTMLInputElement,
	descriptionInput: container.querySelector('textarea[maxlength="500"]') as HTMLTextAreaElement,
});

const fillName = async (container: Element, name: string) => {
	const { nameInput } = getFormElements(container);
	await userEvent.clear(nameInput);
	await userEvent.type(nameInput, name);
};

describe('InstanceRoleView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRoute.name = VIEWS.INSTANCE_ROLE_SETTINGS;
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		rolesStore.fetchRoles.mockResolvedValue();
		rolesStore.processedInstanceRoles = [mockSystemRole];
	});

	describe('Create', () => {
		it('persists a custom instance role with roleType: "global"', async () => {
			const created = { ...mockCustomRole, slug: 'support' };
			rolesStore.createRole.mockResolvedValueOnce(created);

			const { container, getByRole } = renderComponent();

			await fillName(container, 'Support');
			await userEvent.click(getByRole('button', { name: 'Create' }));

			await waitFor(() => {
				expect(rolesStore.createRole).toHaveBeenCalledWith({
					displayName: 'Support',
					description: '',
					scopes: [],
					roleType: 'global',
				});
			});

			expect(mockReplace).toHaveBeenCalledWith({
				name: VIEWS.INSTANCE_ROLE_SETTINGS,
				params: { roleSlug: 'support' },
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: 'Role created successfully',
			});
		});

		it('shows an error toast when creation fails', async () => {
			const error = new Error('boom');
			rolesStore.createRole.mockRejectedValueOnce(error);

			const { container, getByRole } = renderComponent();

			await fillName(container, 'Support');
			await userEvent.click(getByRole('button', { name: 'Create' }));

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'Error creating role');
			});
		});

		it('populates scopes from a system-role preset', async () => {
			const { getByTestId } = renderComponent();

			// tag View resolves to tag:read + tag:list, which the Admin preset carries in full.
			await waitFor(() =>
				expect(getByTestId('scope-option-tag-view').getAttribute('aria-checked')).toBe('false'),
			);

			await userEvent.click(getByTestId('role-preset-global:admin'));

			await waitFor(() =>
				expect(getByTestId('scope-option-tag-view').getAttribute('aria-checked')).toBe('true'),
			);
		});
	});

	describe('Edit', () => {
		it('updates an existing custom role', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValueOnce(mockCustomRole);
			rolesStore.updateRole.mockResolvedValueOnce({ ...mockCustomRole, displayName: 'Support 2' });

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() =>
				expect(rolesStore.fetchRoleBySlug).toHaveBeenCalledWith({ slug: 'support' }),
			);
			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(rolesStore.updateRole).toHaveBeenCalledWith('support', {
					displayName: 'Support 2',
					description: 'A custom instance role',
					scopes: ['user:read', 'user:list'],
				});
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: 'Role updated successfully',
			});
		});
	});

	describe('Read-only', () => {
		it('renders system roles read-only with no save/create actions', async () => {
			mockRoute.name = VIEWS.INSTANCE_ROLE_VIEW;
			rolesStore.fetchRoleBySlug.mockResolvedValueOnce(mockSystemRole);

			const { queryByRole, container } = renderComponent({ props: { roleSlug: 'global:admin' } });

			await waitFor(() => expect(rolesStore.fetchRoleBySlug).toHaveBeenCalled());

			expect(queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
			expect(queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput).toBeDisabled();
			});
		});
	});
});
