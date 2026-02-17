import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { SecretProviderConnection } from '@n8n/api-types';
import ProjectExternalSecrets from './ProjectExternalSecrets.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '../projects.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { ROLE } from '@n8n/api-types';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY } from '@/app/constants';

// Mock vue-router
const mockRouterPush = vi.fn();
vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: mockRouterPush,
		}),
		useRoute: () => ({
			params: { projectId: 'project-1' },
			query: {},
		}),
	};
});

// Mock design system components
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nDataTableServer: {
			name: 'N8nDataTableServer',
			props: {
				headers: { type: Array, required: true },
				items: { type: Array, required: true },
				itemsLength: { type: Number, required: true },
				loading: { type: Boolean },
				page: { type: Number },
				itemsPerPage: { type: Number },
				pageSizes: { type: Array },
			},
			emits: ['update:page', 'update:items-per-page'],
			template: `
				<div data-test-id="external-secrets-table">
					<table>
						<thead>
							<tr>
								<th v-for="header in headers" :key="header.key">{{ header.title }}</th>
							</tr>
						</thead>
						<tbody>
							<slot name="item" v-for="item in items" :key="item.id" :item="item" />
						</tbody>
					</table>
					<div v-if="loading" data-test-id="loading">Loading...</div>
					<div v-if="itemsLength > itemsPerPage" data-test-id="pagination">
						Pagination: Page {{ page + 1 }}
					</div>
				</div>
			`,
		},
		N8nInput: {
			name: 'N8nInput',
			props: ['modelValue', 'placeholder', 'clearable', 'size'],
			emits: ['update:modelValue'],
			template: `
				<div data-test-id="secrets-providers-search">
					<input
						:value="modelValue"
						:placeholder="placeholder"
						@input="$emit('update:modelValue', $event.target.value)"
					/>
				</div>
			`,
		},
	};
});

// Mock composables
const mockActiveProviders = { value: [] };
vi.mock(
	'@/features/integrations/secretsProviders.ee/composables/useSecretsProvidersList.ee',
	() => ({
		useSecretsProvidersList: vi.fn(() => ({
			activeProviders: mockActiveProviders,
			providerTypes: {
				value: [
					{ type: 'awsSecretsManager', displayName: 'AWS Secrets Manager' },
					{ type: 'azureKeyVault', displayName: 'Azure Key Vault' },
				],
			},
			fetchProviderTypes: vi.fn().mockResolvedValue(undefined),
			fetchActiveConnections: vi.fn().mockResolvedValue(undefined),
		})),
	}),
);

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(() => ({
		check: {
			value: vi.fn((flag: string) => flag === 'EXTERNAL_SECRETS_FOR_PROJECTS'),
		},
	})),
}));

const mockProviders: SecretProviderConnection[] = [
	{
		id: '1',
		name: 'aws-prod',
		type: 'awsSecretsManager',
		projects: [{ id: 'project-1', name: 'Test Project' }],
		settings: {},
		isEnabled: true,
		secretsCount: 3,
		state: 'connected',
		secrets: [
			{ name: 'API_KEY', credentialsCount: 2 },
			{ name: 'DATABASE_PASSWORD', credentialsCount: 1 },
			{ name: 'SECRET_TOKEN', credentialsCount: 0 },
		],
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	},
	{
		id: '2',
		name: 'azure-dev',
		type: 'azureKeyVault',
		projects: [{ id: 'project-1', name: 'Test Project' }],
		settings: {},
		isEnabled: true,
		secretsCount: 1,
		state: 'connected',
		secrets: [{ name: 'DEV_API_KEY', credentialsCount: 1 }],
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	},
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectExternalSecrets', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				projects: {
					currentProject: {
						id: 'project-1',
						name: 'Test Project',
						type: 'team',
						scopes: ['externalSecretsProvider:list', 'externalSecretsProvider:create'],
					},
				},
				users: {
					currentUser: {
						id: 'user-1',
						email: 'test@example.com',
						role: ROLE.Owner,
						isOwner: true,
					},
				},
			},
		});

		setActivePinia(pinia);
		projectsStore = useProjectsStore();
		usersStore = useUsersStore();
		uiStore = useUIStore();

		// Mock the store method
		vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue([]);

		renderComponent = createComponentRenderer(ProjectExternalSecrets);
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockRouterPush.mockClear();
	});

	describe('Rendering', () => {
		it('should render external secrets section when feature is enabled', () => {
			renderComponent();
			expect(screen.getByText(/External secret stores/)).toBeInTheDocument();
		});

		it('should show empty state when no providers exist', () => {
			renderComponent();
			expect(screen.getByText('No external secrets available yet')).toBeInTheDocument();
		});
	});

	// Note: Instance Admin empty state tests are covered by E2E tests
	// The unit test mocking for this scenario is complex due to reactive composable behavior

	describe('Empty States - Project Admin', () => {
		beforeEach(() => {
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				id: 'user-1',
				role: ROLE.Member,
				isOwner: false,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
			});
		});

		it('should show project admin empty state with add button', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByText(/Add a secrets store/)).toBeInTheDocument();
				expect(screen.getByText('Add secrets store')).toBeInTheDocument();
			});
		});
	});

	describe('Provider List', () => {
		beforeEach(() => {
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(mockProviders);
		});

		it('should render table when providers exist', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
			});
		});

		it('should display provider type names in headers', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByText('AWS Secrets Manager')).toBeInTheDocument();
				expect(screen.getByText('Azure Key Vault')).toBeInTheDocument();
			});
		});

		it('should have correct table headers', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByText('Secret name')).toBeInTheDocument();
				expect(screen.getByText('Secrets store')).toBeInTheDocument();
				expect(screen.getByText('Used in credentials')).toBeInTheDocument();
			});
		});
	});

	describe('Search Functionality', () => {
		beforeEach(() => {
			// Create 6 providers to trigger search input (threshold is 5)
			const manyProviders = Array.from({ length: 6 }, (_, i) => ({
				...mockProviders[0],
				name: `provider-${i}`,
			}));
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(manyProviders);
		});

		it('should show search input when there are 5 or more providers', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByTestId('secrets-providers-search')).toBeInTheDocument();
			});
		});

		it('should have correct search placeholder text', async () => {
			renderComponent();

			await vi.waitFor(() => {
				const searchInput = screen.getByTestId('secrets-providers-search').querySelector('input');
				expect(searchInput).toHaveAttribute('placeholder', 'Search secrets...');
			});
		});
	});

	describe('Pagination', () => {
		beforeEach(() => {
			// Create 7 providers to test pagination (default page size is 5)
			const manyProviders = Array.from({ length: 7 }, (_, i) => ({
				...mockProviders[0],
				name: `provider-${i}`,
				secrets: [],
			}));
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(manyProviders);
		});

		it('should show pagination when items exceed page size', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByTestId('pagination')).toBeInTheDocument();
			});
		});
	});

	describe('Modal Interactions', () => {
		beforeEach(() => {
			// Start with empty providers so we see the "Add secrets store" button
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue([]);
			// Make sure the user is a project admin (not instance admin)
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				id: 'user-1',
				role: ROLE.Member,
				isOwner: false,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
			});
		});

		it('should open connection modal when add button is clicked', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			renderComponent();
			const user = userEvent.setup();

			await vi.waitFor(() => {
				expect(screen.getByText('Add secrets store')).toBeInTheDocument();
			});

			const addButton = screen.getByText('Add secrets store');
			await user.click(addButton);

			expect(openModalSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					name: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: expect.objectContaining({
						projectId: 'project-1',
					}),
				}),
			);
		});

		it('should pass project ID when opening modal', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			renderComponent();
			const user = userEvent.setup();

			await vi.waitFor(() => {
				expect(screen.getByText('Add secrets store')).toBeInTheDocument();
			});

			const addButton = screen.getByText('Add secrets store');
			await user.click(addButton);

			expect(openModalSpy).toHaveBeenCalled();
			const modalData = openModalSpy.mock.calls[0][0].data;
			expect(modalData).toHaveProperty('projectId', 'project-1');
		});
	});

	describe('Error Handling', () => {
		it('should show error toast when API call fails', async () => {
			const { useToast } = await import('@/app/composables/useToast');
			const showErrorSpy = vi.fn();
			vi.mocked(useToast).mockReturnValue({
				showError: showErrorSpy,
				showMessage: vi.fn(),
			} as unknown as ReturnType<typeof useToast>);

			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockRejectedValue(
				new Error('API Error'),
			);

			renderComponent();

			await vi.waitFor(() => {
				expect(showErrorSpy).toHaveBeenCalled();
			});
		});

		it('should not fetch data when feature is disabled', async () => {
			const { useEnvFeatureFlag } = await import(
				'@/features/shared/envFeatureFlag/useEnvFeatureFlag'
			);
			vi.mocked(useEnvFeatureFlag).mockReturnValue({
				check: {
					value: vi.fn(() => false),
				},
			} as unknown as ReturnType<typeof useEnvFeatureFlag>);

			const fetchSpy = vi.spyOn(projectsStore, 'getProjectSecretProviders');

			renderComponent();

			await vi.waitFor(() => {
				expect(fetchSpy).not.toHaveBeenCalled();
			});
		});
	});
});
