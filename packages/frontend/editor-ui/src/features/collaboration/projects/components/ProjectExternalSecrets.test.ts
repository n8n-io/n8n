import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { SecretProviderConnection } from '@n8n/api-types';
import ProjectExternalSecrets from './ProjectExternalSecrets.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '../projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { ROLE } from '@n8n/api-types';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY } from '@/app/constants';
import { useRBACStore } from '@/app/stores/rbac.store';

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

const mockGetConnection = vi.fn();
vi.mock(
	'@/features/integrations/secretsProviders.ee/composables/useSecretsProviderConnection.ee',
	() => ({
		useSecretsProviderConnection: vi.fn(() => ({
			getConnection: mockGetConnection,
			connectionState: { value: 'connected' },
			connectionError: { value: undefined },
			isLoading: { value: false },
			isTesting: { value: false },
			createConnection: vi.fn(),
			updateConnection: vi.fn(),
			testConnection: vi.fn(),
		})),
	}),
);

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		moduleSettings: {
			'external-secrets': {
				multipleConnections: true,
				forProjects: true,
			},
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
		secretsCount: 3,
		state: 'connected',
		secrets: [
			{ name: 'API_KEY', credentialsCount: 2 },
			{ name: 'DATABASE_PASSWORD', credentialsCount: 1 },
			{ name: 'SECRET_TOKEN', credentialsCount: 0 },
		],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: '2',
		name: 'azure-dev',
		type: 'azureKeyVault',
		projects: [{ id: 'project-1', name: 'Test Project' }],
		settings: {},
		secretsCount: 1,
		state: 'connected',
		secrets: [{ name: 'DEV_API_KEY', credentialsCount: 1 }],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectExternalSecrets', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let rbacStore: ReturnType<typeof useRBACStore>;

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
		uiStore = useUIStore();
		rbacStore = useRBACStore(pinia);

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
			expect(screen.getByTestId('external-secrets-section')).toBeInTheDocument();
		});

		it('should show empty state when no providers exist', () => {
			renderComponent();
			expect(screen.getByTestId('external-secrets-empty-state-project-admin')).toBeInTheDocument();
		});
	});

	describe('Empty States - Project Admin', () => {
		beforeEach(() => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);
		});

		it('should show project admin empty state with add button', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(
					screen.getByTestId('external-secrets-empty-state-project-admin'),
				).toBeInTheDocument();
				expect(
					document
						.querySelector('[data-test-id="external-secrets-empty-state-project-admin"]')
						?.querySelector('button'),
				).toBeInTheDocument();
			});
		});
	});

	describe('Provider List', () => {
		beforeEach(() => {
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(mockProviders);
			mockGetConnection.mockImplementation((name: string) => {
				const provider = mockProviders.find((p) => p.name === name);
				return provider ?? { secrets: [] };
			});
		});

		it('should render table when providers exist', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
			});
		});

		it('should display connection names in grouped header rows', async () => {
			renderComponent();

			await vi.waitFor(() => {
				expect(screen.getByText('aws-prod')).toBeInTheDocument();
				expect(screen.getByText('azure-dev')).toBeInTheDocument();
			});
		});

		it('should display secrets when a connection row is expanded', async () => {
			renderComponent();
			const user = userEvent.setup();

			await vi.waitFor(() => {
				expect(screen.getByText('aws-prod')).toBeInTheDocument();
			});

			const expandButton = screen.getAllByTestId('external-secrets-expand-button')[0];
			await user.click(expandButton);

			await vi.waitFor(() => {
				expect(screen.getByText('API_KEY')).toBeInTheDocument();
				expect(screen.getByText('DATABASE_PASSWORD')).toBeInTheDocument();
				expect(screen.getByText('SECRET_TOKEN')).toBeInTheDocument();
			});
		});
	});

	describe('Search Functionality', () => {
		beforeEach(() => {
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(mockProviders);
			mockGetConnection.mockImplementation((name: string) => {
				const provider = mockProviders.find((p) => p.name === name);
				return provider ?? { secrets: [] };
			});
		});

		it('should show search input when providers exist', async () => {
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

		it('should filter secrets by name', async () => {
			renderComponent();
			const user = userEvent.setup();

			await vi.waitFor(() => {
				expect(screen.getByTestId('secrets-providers-search')).toBeInTheDocument();
			});

			const searchInput = screen.getByTestId('secrets-providers-search').querySelector('input');
			if (!searchInput) throw new Error('Search input not found');

			await user.type(searchInput, 'api_key');

			const expandButton = screen.getAllByTestId('external-secrets-expand-button')[0];
			await user.click(expandButton);

			await vi.waitFor(() => {
				expect(screen.getByText('API_KEY')).toBeInTheDocument();
				expect(screen.queryByText('DATABASE_PASSWORD')).not.toBeInTheDocument();
				expect(screen.queryByText('SECRET_TOKEN')).not.toBeInTheDocument();
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

	describe('Adding project scoped secrets store', () => {
		beforeEach(() => {
			vi.spyOn(projectsStore, 'getProjectSecretProviders').mockResolvedValue(mockProviders);
			mockGetConnection.mockImplementation((name: string) => {
				const provider = mockProviders.find((p) => p.name === name);
				return provider ?? { secrets: [] };
			});
		});

		it('should not show add button when user has no project external secrets create permission', async () => {
			vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
				id: 'project-1',
				name: 'Test Project',
				type: 'team',
				scopes: ['externalSecretsProvider:list'],
				icon: null,
				createdAt: '',
				updatedAt: '',
				relations: [],
			});
			const { queryByTestId } = renderComponent();
			await vi.waitFor(() => {
				expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
			});
			expect(queryByTestId('external-secrets-add-button')).not.toBeInTheDocument();
		});

		it('should open connection modal when add button is clicked', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const { getByTestId } = renderComponent();
			const user = userEvent.setup();

			let addButton!: HTMLElement;
			await vi.waitFor(() => {
				addButton = getByTestId('external-secrets-add-button');
			});

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
			const { getByTestId } = renderComponent();
			const user = userEvent.setup();

			let addButton!: HTMLElement;
			await vi.waitFor(() => {
				addButton = getByTestId('external-secrets-add-button');
			});

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
			const { useSettingsStore } = await import('@/app/stores/settings.store');
			vi.mocked(useSettingsStore).mockReturnValue({
				moduleSettings: {
					'external-secrets': {
						multipleConnections: true,
						forProjects: false,
					},
				},
			} as unknown as ReturnType<typeof useSettingsStore>);

			const fetchSpy = vi.spyOn(projectsStore, 'getProjectSecretProviders');

			renderComponent();

			await vi.waitFor(() => {
				expect(fetchSpy).not.toHaveBeenCalled();
			});
		});
	});
});
