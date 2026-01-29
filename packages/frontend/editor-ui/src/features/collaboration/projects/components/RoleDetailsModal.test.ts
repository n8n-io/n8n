import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
import type { Role } from '@n8n/permissions';
import RoleDetailsModal from './RoleDetailsModal.vue';
import { useRolesStore } from '@/app/stores/roles.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const mockRole: Role = {
	slug: 'project:editor',
	displayName: 'Editor',
	description: 'Can edit workflows and credentials',
	systemRole: true,
	licensed: true,
	roleType: 'project',
	scopes: [
		'project:read',
		'workflow:read',
		'workflow:update',
		'workflow:create',
		'credential:read',
	],
};

// Stub that renders the title and all slots
const ElDialogStub = {
	props: ['title', 'modelValue'],
	template: `
		<div role="dialog">
			<h2>{{ title }}</h2>
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(RoleDetailsModal, {
	props: {
		modelValue: true,
		role: mockRole,
	},
	global: {
		stubs: {
			ElDialog: ElDialogStub,
		},
	},
});

describe('RoleDetailsModal', () => {
	let rolesStore: MockedStore<typeof useRolesStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		rolesStore = mockedStore(useRolesStore);
		// Make the mock return immediately to avoid loading state
		vi.spyOn(rolesStore, 'fetchRoleBySlug').mockResolvedValue(mockRole);
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render the modal when visible', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Role details')).toBeInTheDocument();
			});
		});

		it('should display role name', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Editor')).toBeInTheDocument();
			});
		});

		it('should display role description', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Can edit workflows and credentials')).toBeInTheDocument();
			});
		});

		it('should display Permissions section', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Permissions')).toBeInTheDocument();
			});
		});

		it('should not display description if role has none', async () => {
			const roleWithoutDescription = { ...mockRole, description: null };
			vi.spyOn(rolesStore, 'fetchRoleBySlug').mockResolvedValue(roleWithoutDescription);
			const { queryByText } = renderComponent({
				props: {
					modelValue: true,
					role: roleWithoutDescription,
				},
			});

			await waitFor(() => {
				expect(queryByText('Can edit workflows and credentials')).not.toBeInTheDocument();
			});
		});
	});

	describe('Scope types', () => {
		it('should render project scope section', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Project')).toBeInTheDocument();
			});
		});

		it('should render workflow scope section', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Workflows')).toBeInTheDocument();
			});
		});

		it('should render credential scope section', async () => {
			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Credentials')).toBeInTheDocument();
			});
		});
	});

	describe('Scope indicators', () => {
		it('should show check icon for scopes the role has', async () => {
			const { container } = renderComponent();

			await waitFor(() => {
				const checkIcons = container.querySelectorAll('[data-icon="check"]');
				expect(checkIcons.length).toBeGreaterThan(0);
			});
		});

		it('should show x icon for scopes the role does not have', async () => {
			const { container } = renderComponent();

			await waitFor(() => {
				const xIcons = container.querySelectorAll('[data-icon="x"]');
				expect(xIcons.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Role fetching', () => {
		it('should fetch role details when role prop changes', async () => {
			renderComponent();

			await waitFor(() => {
				expect(rolesStore.fetchRoleBySlug).toHaveBeenCalledWith({ slug: 'project:editor' });
			});
		});

		it('should use passed role data if fetch fails', async () => {
			vi.spyOn(rolesStore, 'fetchRoleBySlug').mockRejectedValue(new Error('Fetch failed'));

			const { getByText } = renderComponent();

			await waitFor(() => {
				expect(getByText('Editor')).toBeInTheDocument();
			});
		});
	});

	describe('Null role handling', () => {
		it('should not render content when role is null', () => {
			const { queryByText } = renderComponent({
				props: {
					modelValue: true,
					role: null,
				},
			});

			expect(queryByText('Editor')).not.toBeInTheDocument();
		});
	});
});
