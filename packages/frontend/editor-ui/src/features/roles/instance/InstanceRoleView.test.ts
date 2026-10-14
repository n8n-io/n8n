import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@n8n/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { GLOBAL_ADMIN_SCOPES } from '@n8n/permissions';
import InstanceRoleView from './InstanceRoleView.vue';
import {
	BASELINE_INSTANCE_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	MANDATORY_INSTANCE_SCOPES,
} from '@n8n/permissions';

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
const mockConfirm = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
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
	// The mandatory options and baseline scopes every instance role carries.
	scopes: [...MANDATORY_INSTANCE_SCOPES],
	licensed: true,
	systemRole: false,
	roleType: 'global' as const,
};

const mockSystemRole = {
	displayName: 'Admin',
	slug: 'global:admin',
	description: 'System admin role',
	scopes: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete'],
	licensed: true,
	systemRole: true,
	roleType: 'global' as const,
};

const mockMemberRole = {
	displayName: 'Member',
	slug: 'global:member',
	description: 'Can create and use their own workflows and credentials',
	scopes: [...GLOBAL_MEMBER_SCOPES],
	licensed: true,
	systemRole: true,
	roleType: 'global' as const,
};

const mockChatRole = {
	displayName: 'Chat',
	slug: 'global:chatUser',
	description: 'Can only use chat',
	scopes: ['chatHub:message'],
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
		rolesStore.processedInstanceRoles = [mockSystemRole, mockMemberRole, mockChatRole];
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
					// Mandatory on every instance role — see instanceRoleScopes.ts.
					scopes: [...MANDATORY_INSTANCE_SCOPES],
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
				expect(mockShowError).toHaveBeenCalledWith(error, "Couldn't create role");
			});
		});

		it('shows a validation error and does not call the API when name is empty', async () => {
			const { getByRole } = renderComponent();

			await userEvent.click(getByRole('button', { name: 'Create' }));

			expect(rolesStore.createRole).not.toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'error',
				title: "Couldn't create role",
				message: 'Enter a name of at least 2 characters',
			});
		});

		it('shows a validation error and does not call the API when name is shorter than 2 characters', async () => {
			const { container, getByRole } = renderComponent();

			await fillName(container, 'A');
			await userEvent.click(getByRole('button', { name: 'Create' }));

			expect(rolesStore.createRole).not.toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'error',
				title: "Couldn't create role",
				message: 'Enter a name of at least 2 characters',
			});
		});

		it('ticks Credentials "Manage" when starting from the real Admin preset', async () => {
			// Before the credential group existed, setPreset's ALL_INSTANCE_SCOPES filter
			// silently dropped all 12 credential scopes, so "Start from Admin" produced a
			// role that could not see credentials at all. It now ticks Credentials Manage.
			rolesStore.processedInstanceRoles = [
				{ ...mockSystemRole, scopes: [...GLOBAL_ADMIN_SCOPES] },
			] as typeof rolesStore.processedInstanceRoles;

			const { getByTestId } = renderComponent();

			await waitFor(() =>
				expect(getByTestId('scope-option-credential-manage').getAttribute('aria-checked')).toBe(
					'false',
				),
			);

			await userEvent.click(getByTestId('role-preset-global:admin'));

			await waitFor(() =>
				expect(getByTestId('scope-option-credential-manage').getAttribute('aria-checked')).toBe(
					'true',
				),
			);
			// The lower rungs render as implied, not as independent selections.
			expect(getByTestId('scope-option-credential-view')).toBeDisabled();
			expect(getByTestId('scope-option-credential-use')).toBeDisabled();
		});

		it('populates scopes from a system-role preset', async () => {
			const { getByTestId } = renderComponent();

			// tag Manage resolves to all 5 tag scopes; the Admin preset carries them in full.
			await waitFor(() =>
				expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('false'),
			);

			await userEvent.click(getByTestId('role-preset-global:admin'));

			await waitFor(() =>
				expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('true'),
			);
		});

		it('offers the Member and Admin system roles as presets, in that order, but not Chat', async () => {
			const { container, queryByTestId } = renderComponent();

			await waitFor(() => expect(queryByTestId('role-preset-global:member')).toBeInTheDocument());

			const presets = Array.from(container.querySelectorAll('[data-test-id^="role-preset-"]')).map(
				(el) => el.getAttribute('data-test-id'),
			);
			expect(presets).toEqual(['role-preset-global:member', 'role-preset-global:admin']);
		});

		it('populates the options Member grants in full from the Member preset, with no half-checked box', async () => {
			const { container, getByTestId } = renderComponent();

			await waitFor(() =>
				expect(getByTestId('scope-option-settings-mcp-use').getAttribute('aria-checked')).toBe(
					'false',
				),
			);

			await userEvent.click(getByTestId('role-preset-global:member'));

			await waitFor(() =>
				expect(getByTestId('scope-option-settings-mcp-use').getAttribute('aria-checked')).toBe(
					'true',
				),
			);
			for (const testId of [
				'scope-option-settings-aiassistant-use',
				'scope-option-apiKey-manage-own',
				'scope-option-variable-view',
			]) {
				expect(getByTestId(testId).getAttribute('aria-checked')).toBe('true');
			}
			expect(getByTestId('scope-option-settings-manage').getAttribute('aria-checked')).toBe(
				'false',
			);
			// Member holds four of the five Tags scopes: the partial option is left
			// out of the preset instead of rendering half-checked.
			expect(getByTestId('scope-option-tag-manage').getAttribute('aria-checked')).toBe('false');
			const halfChecked = Array.from(
				container.querySelectorAll('[data-test-id^="scope-option-"]'),
			).filter((el) => el.getAttribute('aria-checked') === 'mixed');
			expect(halfChecked).toHaveLength(0);
		});

		it('highlights the preset the form matches and drops the highlight on any change', async () => {
			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('role-preset-global:member')).toBeInTheDocument());
			// A new role starts with the mandatory scopes only: no preset matches yet.
			expect(getByTestId('role-preset-global:member').getAttribute('aria-pressed')).toBe('false');
			expect(getByTestId('role-preset-global:admin').getAttribute('aria-pressed')).toBe('false');

			await userEvent.click(getByTestId('role-preset-global:member'));

			await waitFor(() =>
				expect(getByTestId('role-preset-global:member').getAttribute('aria-pressed')).toBe('true'),
			);
			expect(getByTestId('role-preset-global:admin').getAttribute('aria-pressed')).toBe('false');

			// Any change to the form drops the highlight ...
			await userEvent.click(getByTestId('scope-option-project-create'));

			await waitFor(() =>
				expect(getByTestId('role-preset-global:member').getAttribute('aria-pressed')).toBe('false'),
			);

			// ... and it returns once the form matches the preset again.
			await userEvent.click(getByTestId('scope-option-project-create'));

			await waitFor(() =>
				expect(getByTestId('role-preset-global:member').getAttribute('aria-pressed')).toBe('true'),
			);
		});
	});

	describe('Loading', () => {
		it('shows the name and description of a role the roles list already holds before the fetch resolves', async () => {
			// Never resolves: everything asserted below comes from the store, not the fetch.
			rolesStore.fetchRoleBySlug.mockReturnValue(new Promise(() => {}));
			rolesStore.roles.global = [mockCustomRole];

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput, descriptionInput } = getFormElements(container);
				expect(nameInput.value).toBe('Support');
				expect(descriptionInput.value).toBe('A custom instance role');
			});
			expect(getByRole('heading', { level: 1 })).toHaveTextContent('Role "Support"');
		});

		it('replaces the cached role with the fetched one and keeps the form clean', async () => {
			rolesStore.roles.global = [mockCustomRole];
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockCustomRole, displayName: 'Helpdesk' });

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => expect(getFormElements(container).nameInput.value).toBe('Helpdesk'));
			expect(getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('empties the form when the fetch fails, even for a cached role', async () => {
			rolesStore.roles.global = [mockCustomRole];
			const error = new Error('boom');
			rolesStore.fetchRoleBySlug.mockRejectedValue(error);

			const { container, queryByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(error, 'Error fetching role'));
			expect(getFormElements(container).nameInput.value).toBe('');
			expect(queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
		});
	});

	describe('Edit', () => {
		it('updates an existing custom role', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue(mockCustomRole);
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
					scopes: [...MANDATORY_INSTANCE_SCOPES],
				});
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: 'Role updated successfully',
			});
			expect(mockConfirm).not.toHaveBeenCalled();
		});

		it('asks for confirmation before updating a role with assigned users', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockCustomRole, usedByUsers: 8 });
			rolesStore.updateRole.mockResolvedValueOnce({ ...mockCustomRole, displayName: 'Support 2' });
			mockConfirm.mockResolvedValueOnce('confirm');

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalledWith(
					expect.stringContaining('<b>8 users</b>'),
					'Update permissions for this role?',
					expect.objectContaining({ type: 'warning' }),
				);
			});
			await waitFor(() => {
				expect(rolesStore.updateRole).toHaveBeenCalledWith('support', {
					displayName: 'Support 2',
					description: 'A custom instance role',
					scopes: [...MANDATORY_INSTANCE_SCOPES],
				});
			});
		});

		it('does not save changes when the confirmation is cancelled', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockCustomRole, usedByUsers: 1 });
			mockConfirm.mockResolvedValueOnce('cancel');

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalledWith(
					expect.stringContaining('<b>1 user</b>'),
					'Update permissions for this role?',
					expect.objectContaining({ type: 'warning' }),
				);
			});
			expect(rolesStore.updateRole).not.toHaveBeenCalled();
			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('skips the confirmation when the role has no assigned users', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockCustomRole, usedByUsers: 0 });
			rolesStore.updateRole.mockResolvedValueOnce({ ...mockCustomRole, displayName: 'Support 2' });

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(rolesStore.updateRole).toHaveBeenCalled());
			expect(mockConfirm).not.toHaveBeenCalled();
		});

		it('picks up assignments made after the page was loaded', async () => {
			// The role is unassigned at page load; by save time it has 3 users.
			rolesStore.fetchRoleBySlug
				.mockResolvedValueOnce(mockCustomRole)
				.mockResolvedValueOnce({ ...mockCustomRole, usedByUsers: 3 });
			rolesStore.updateRole.mockResolvedValueOnce({ ...mockCustomRole, displayName: 'Support 2' });
			mockConfirm.mockResolvedValueOnce('confirm');

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalledWith(
					expect.stringContaining('<b>3 users</b>'),
					'Update permissions for this role?',
					expect.objectContaining({ type: 'warning' }),
				);
			});
			await waitFor(() => expect(rolesStore.updateRole).toHaveBeenCalled());
		});

		it('does not mark a role unsaved when the mandatory scopes are already stored', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue(mockCustomRole);

			const { getByRole, container } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			expect(getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('does not mark a role unsaved when only non-editor scopes were stripped', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({
				...mockCustomRole,
				scopes: [...MANDATORY_INSTANCE_SCOPES, 'workflow:read'],
			});

			const { getByRole, container } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			expect(getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('enables save when a stored role is missing mandatory scopes', async () => {
			const legacyRole = {
				...mockCustomRole,
				scopes: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete'],
			};
			rolesStore.fetchRoleBySlug.mockResolvedValue(legacyRole);
			rolesStore.updateRole.mockResolvedValueOnce({
				...legacyRole,
				scopes: [...legacyRole.scopes, 'user:list', ...BASELINE_INSTANCE_SCOPES],
			});

			const { getByRole, getByTestId } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				expect(getByTestId('scope-option-user-view').getAttribute('aria-checked')).toBe('true');
			});

			const save = getByRole('button', { name: 'Save' });
			expect(save).toBeEnabled();

			await userEvent.click(save);

			await waitFor(() => {
				expect(rolesStore.updateRole).toHaveBeenCalledWith('support', {
					displayName: 'Support',
					description: 'A custom instance role',
					// The editor unions in the missing mandatory scopes: Users View and the baseline.
					scopes: [
						'tag:read',
						'tag:list',
						'tag:create',
						'tag:update',
						'tag:delete',
						'user:list',
						...BASELINE_INSTANCE_SCOPES,
					],
				});
			});
		});

		it('enables save for a role stored before Tags: View became mandatory', async () => {
			// A custom role saved on an earlier release: it has Users: View but no
			// tag scopes at all. The editor shows Tags: View checked and offers Save,
			// which is what writes the scopes — there is no backfill migration.
			const preTagViewRole = { ...mockCustomRole, scopes: ['user:list'] };
			rolesStore.fetchRoleBySlug.mockResolvedValue(preTagViewRole);
			rolesStore.updateRole.mockResolvedValueOnce({
				...preTagViewRole,
				scopes: [...MANDATORY_INSTANCE_SCOPES],
			});

			const { getByRole, getByTestId } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				expect(getByTestId('scope-option-tag-view').getAttribute('aria-checked')).toBe('true');
			});
			expect(getByTestId('scope-option-tag-view').hasAttribute('disabled')).toBe(true);

			const save = getByRole('button', { name: 'Save' });
			expect(save).toBeEnabled();

			await userEvent.click(save);

			await waitFor(() => {
				expect(rolesStore.updateRole).toHaveBeenCalledWith('support', {
					displayName: 'Support',
					description: 'A custom instance role',
					scopes: [...MANDATORY_INSTANCE_SCOPES],
				});
			});
		});

		it('falls back to the count from page load when the pre-save fetch fails', async () => {
			rolesStore.fetchRoleBySlug
				.mockResolvedValueOnce({ ...mockCustomRole, usedByUsers: 8 })
				.mockRejectedValueOnce(new Error('network error'));
			mockConfirm.mockResolvedValueOnce('cancel');

			const { container, getByRole } = renderComponent({ props: { roleSlug: 'support' } });

			await waitFor(() => {
				const { nameInput } = getFormElements(container);
				expect(nameInput?.value).toBe('Support');
			});

			await fillName(container, 'Support 2');
			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalledWith(
					expect.stringContaining('<b>8 users</b>'),
					'Update permissions for this role?',
					expect.objectContaining({ type: 'warning' }),
				);
			});
			expect(rolesStore.updateRole).not.toHaveBeenCalled();
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
