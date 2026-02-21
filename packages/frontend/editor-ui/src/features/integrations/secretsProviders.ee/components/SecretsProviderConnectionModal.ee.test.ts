import userEvent from '@testing-library/user-event';
import { getDropdownItems } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import SecretsProviderConnectionModal from './SecretsProviderConnectionModal.ee.vue';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import { vi } from 'vitest';
import { nextTick } from 'vue';
import type { SecretProviderConnection } from '@n8n/api-types';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import type { ConnectionProjectSummary } from '../composables/useConnectionModal.ee';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import orderBy from 'lodash/orderBy';

// Factory function for creating mock connection data
const createMockConnectionData = (overrides: Partial<SecretProviderConnection> = {}) => ({
	id: 'test-123',
	name: 'test-123',
	type: 'awsSecretsManager',
	settings: { region: 'us-east-1' },
	state: 'connected',
	isEnabled: true,
	projects: [],
	secretsCount: 0,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

// Create the mock object that will be returned
const mockConnection = {
	connectionState: { value: 'initializing' },
	connectionError: { value: undefined },
	isLoading: { value: false },
	isTesting: { value: false },
	getConnection: vi.fn(),
	createConnection: vi.fn(),
	updateConnection: vi.fn(),
	testConnection: vi.fn(),
};

const mockConnectionModal = {
	canSave: { value: true },
	saveConnection: vi.fn(),
	connectionName: { value: '' },
	connectionNameBlurred: { value: false },
	selectedProviderType: { value: { displayName: 'AWS', type: 'aws' } },
	isEditMode: { value: false },
	hasUnsavedChanges: { value: false },
	isSaving: { value: false },
	didSave: { value: false },
	providerSecretsCount: { value: 0 },
	providerKey: { value: '' },
	connection: {
		isLoading: { value: false },
		connectionState: { value: 'initializing' },
		connectionError: { value: undefined },
	},
	providerTypeOptions: { value: [] },
	connectionSettings: { value: {} },
	expressionExample: { value: '' },
	connectionNameError: { value: '' },
	connectionProjects: { value: [] as ConnectionProjectSummary[] },
	isSharedGlobally: { value: false },
	canUpdate: { value: true },
	canDelete: { value: true },
	canShareGlobally: { value: true },
	projectIds: { value: [] as string[] },
	sharedWithProjects: { value: [] as ProjectSharingData[] },
	selectProviderType: vi.fn(),
	updateSettings: vi.fn(),
	loadConnection: vi.fn(),
	shouldDisplayProperty: vi.fn(() => true),
	setScopeState: vi.fn(),
};

vi.mock('../composables/useSecretsProviderConnection.ee', () => ({
	useSecretsProviderConnection: vi.fn(() => mockConnection),
}));

vi.mock('../composables/useConnectionModal.ee', () => ({
	useConnectionModal: vi.fn((options) => {
		const isEditMode = !!options?.providerKey?.value;
		return {
			...mockConnectionModal,
			isEditMode: { value: isEditMode },
			connectionName: { value: isEditMode ? 'test-123' : '' },
			providerKey: { value: isEditMode ? 'test-123' : '' },
			canUpdate: { value: isEditMode }, // Edit mode requires update permission
			canDelete: { value: true },
		};
	}),
}));

// Stub the Modal component
const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const mockProjects = orderBy(
	Array.from({ length: 3 }, () => createProjectListItem('team')),
	// Sort by type and name as in ProjectSharing component
	['type', (project) => project.name?.toLowerCase()],
	['desc', 'asc'],
);

const mockProject = mockProjects[0];

const mockProjectsStore = {
	projects: mockProjects,
	teamProjects: mockProjects,
	fetchProject: vi.fn(),
	getAvailableProjects: vi.fn(),
};

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: vi.fn(() => mockProjectsStore),
}));

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(() => ({
		check: {
			value: vi.fn((flag: string) => flag === 'EXTERNAL_SECRETS_FOR_PROJECTS'),
		},
	})),
}));

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[SECRETS_PROVIDER_CONNECTION_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [SECRETS_PROVIDER_CONNECTION_MODAL_KEY],
	},
};

const renderComponent = createComponentRenderer(SecretsProviderConnectionModal, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('SecretsProviderConnectionModal', () => {
	const mockProviderTypes: SecretProviderTypeResponse[] = [
		{
			type: 'awsSecretsManager' as const,
			displayName: 'AWS Secrets Manager',
			icon: 'aws',
			properties: [],
		},
		{
			type: 'azureKeyVault' as const,
			displayName: 'Azure Key Vault',
			icon: 'azure',
			properties: [],
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockConnection.connectionState.value = 'initializing';
		mockConnection.isLoading.value = false;
		mockConnection.isTesting.value = false;
		mockConnectionModal.connectionProjects.value = [];
		mockConnectionModal.isSharedGlobally.value = false;
	});

	it('should load connection data', async () => {
		renderComponent({
			props: {
				modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
				data: {
					providerKey: 'test-123',
					providerTypes: mockProviderTypes,
				},
			},
		});

		await nextTick();

		expect(mockConnectionModal.loadConnection).toHaveBeenCalled();
	});

	describe('create mode', () => {
		it('should show provider type selector', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const providerTypeSelect = container.querySelector(
				'[data-test-id="provider-type-select"] input',
			);
			expect(providerTypeSelect).toBeInTheDocument();
			expect(providerTypeSelect).not.toHaveAttribute('disabled');
		});

		it('should show connection name input', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const nameInput = container.querySelector('[data-test-id="provider-name"]');
			expect(nameInput).toBeInTheDocument();
			expect(nameInput).not.toHaveAttribute('disabled');
		});

		it('should show save button', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const saveButton = container.querySelector(
				'[data-test-id="secrets-provider-connection-save-button"]',
			);

			expect(saveButton).toBeInTheDocument();
		});
	});

	describe('edit mode', () => {
		it('should render modal in edit mode', async () => {
			mockConnection.getConnection.mockResolvedValue(createMockConnectionData());

			const { container, getByDisplayValue } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			expect(getByDisplayValue('test-123')).toBeInTheDocument();
			const nameInput = container.querySelector('[data-test-id="provider-name"]');
			expect(nameInput).toHaveAttribute('disabled');
		});

		it('should show provider type selector in edit mode', async () => {
			mockConnection.getConnection.mockResolvedValue(createMockConnectionData());

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const providerTypeSelect = container.querySelector(
				'[data-test-id="provider-type-select"] input',
			);
			expect(providerTypeSelect).toBeInTheDocument();
			expect(providerTypeSelect).toHaveAttribute('disabled');
		});
	});

	describe('save action', () => {
		it('should call saveConnection', async () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const saveButton = container.querySelector(
				'[data-test-id="secrets-provider-connection-save-button"] button',
			) as HTMLElement;
			if (saveButton) {
				saveButton.click();
				await nextTick();
			}

			expect(mockConnectionModal.saveConnection).toHaveBeenCalled();
		});
	});

	describe('connection state display', () => {
		it('should show success message when connection is connected', async () => {
			mockConnectionModal.connection.connectionState.value = 'connected';

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const successCallout = container.querySelector('[data-test-id="connection-success-callout"]');
			expect(successCallout).toBeInTheDocument();
		});

		it('should show error message when connection has error', async () => {
			mockConnectionModal.connection.connectionState.value = 'error';

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const errorBanner = container.querySelector('[data-test-id="connection-error-banner"]');
			expect(errorBanner).toBeInTheDocument();
		});
	});

	describe('project sharing', () => {
		beforeEach(() => {
			mockConnectionModal.isEditMode.value = true;
		});

		it('should not fetch projects from store when projects are already in store', async () => {
			mockConnectionModal.connectionProjects.value = mockProjects.map((p) => ({
				id: p.id,
				name: p.name ?? '',
			}));
			mockProjectsStore.projects = mockProjects;

			renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			expect(mockProjectsStore.fetchProject).not.toHaveBeenCalled();
		});

		it('should display shared projects from composable', async () => {
			const projectId = 'project-999';
			mockConnectionModal.connectionProjects.value = [{ id: projectId, name: 'Test Project' }];
			mockConnectionModal.projectIds.value = [projectId];
			mockConnectionModal.sharedWithProjects.value = [
				{
					id: projectId,
					name: 'Test Project',
					type: 'team',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					icon: null,
				},
			];
			mockConnectionModal.isEditMode.value = true;

			renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						activeTab: 'sharing',
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			expect(mockConnectionModal.sharedWithProjects.value).toHaveLength(1);
			expect(mockConnectionModal.sharedWithProjects.value[0].id).toBe(projectId);
		});

		it('should update scope state when sharing with project', async () => {
			mockConnectionModal.connectionProjects.value = [];
			mockConnectionModal.projectIds.value = [];
			mockConnectionModal.isSharedGlobally.value = false;
			mockConnectionModal.canUpdate.value = true;
			mockConnectionModal.isEditMode.value = true;
			mockProjectsStore.projects = mockProjects;

			const { queryByTestId } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						activeTab: 'sharing',
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const projectSelect = queryByTestId('project-sharing-select');

			expect(projectSelect).toBeInTheDocument();

			await userEvent.click(projectSelect as HTMLElement);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect as HTMLElement);

			expect(projectSelectDropdownItems.length).toBeGreaterThan(1);
			// The first item is "All users" (global), so select the second item (team project)
			const teamProject = projectSelectDropdownItems[1];

			await userEvent.click(teamProject as HTMLElement);

			// Verify setScopeState was called with the selected project ID
			expect(mockConnectionModal.setScopeState).toHaveBeenCalledWith([mockProject.id], false);
		});

		it('should call setScopeState when sharing globally', async () => {
			// Ensure clean state for global sharing
			mockConnectionModal.connectionProjects.value = [];
			mockConnectionModal.projectIds.value = [];
			mockConnectionModal.isSharedGlobally.value = false;
			mockConnectionModal.canUpdate.value = true;
			mockProjectsStore.projects = mockProjects;

			const { queryByTestId } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						activeTab: 'sharing',
						providerKey: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const projectSelect = queryByTestId('project-sharing-select');

			expect(projectSelect).toBeInTheDocument();

			await userEvent.click(projectSelect as HTMLElement);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect as HTMLElement);

			expect(projectSelectDropdownItems.length).toBeGreaterThan(0);
			// The first item should be the "Global" option
			const globalOption = projectSelectDropdownItems[0];

			await userEvent.click(globalOption as HTMLElement);

			// Verify setScopeState was called with empty array and true for global sharing
			expect(mockConnectionModal.setScopeState).toHaveBeenCalledWith([], true);
		});
	});
});
