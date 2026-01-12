import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { FrontendSettings } from '@n8n/api-types';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore, getDropdownItems } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowShareModal from './WorkflowShareModal.ee.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsEEStore } from '@/app/stores/workflows.ee.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRolesStore } from '@/app/stores/roles.store';

const mockRouteQuery = reactive<Record<string, string>>({});
vi.mock('vue-router', async (importOriginal) => {
	return {
		...(await importOriginal()),
		useRoute: () => ({
			query: mockRouteQuery,
		}),
	};
});
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: vi.fn().mockResolvedValue(true),
	}),
}));
const saveAsNewWorkflowMock = vi.fn().mockResolvedValue('abc123');
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveAsNewWorkflow: saveAsNewWorkflowMock,
	}),
}));
vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({
		workflow: { share: true },
	}),
}));
vi.mock('@n8n/utils/event-bus', () => ({
	createEventBus: () => ({
		emit: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(WorkflowShareModal, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

let settingsStore: MockedStore<typeof useSettingsStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsEEStore: MockedStore<typeof useWorkflowsEEStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let rolesStore: MockedStore<typeof useRolesStore>;

describe('WorkflowShareModal.ee.vue', () => {
	beforeEach(() => {
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsEEStore = mockedStore(useWorkflowsEEStore);
		projectsStore = mockedStore(useProjectsStore);
		rolesStore = mockedStore(useRolesStore);

		// Reset route query
		Object.keys(mockRouteQuery).forEach((key) => delete mockRouteQuery[key]);

		// Set up default store state
		settingsStore.settings.enterprise = { sharing: true } as FrontendSettings['enterprise'];
		workflowsEEStore.getWorkflowOwnerName = vi.fn(() => 'Owner Name');
		projectsStore.personalProjects = [createProjectListItem()];
		rolesStore.processedWorkflowRoles = [
			{
				displayName: 'Editor',
				slug: 'workflow:editor',
				scopes: [],
				licensed: false,
				description: 'Editor',
				systemRole: true,
				roleType: 'workflow',
			},
			{
				displayName: 'Owner',
				slug: 'workflow:owner',
				scopes: [],
				licensed: false,
				description: 'Owner',
				systemRole: true,
				roleType: 'workflow',
			},
		];

		saveAsNewWorkflowMock.mockClear();
	});

	it('should share new, unsaved workflow after saving it first', async () => {
		// Set route query to indicate new workflow
		mockRouteQuery.new = 'true';

		workflowsStore.workflow = {
			id: '',
			name: 'My workflow',
			active: false,
			activeVersionId: null,
			isArchived: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			versionId: '',
			scopes: [],
			nodes: [],
			connections: {},
		};

		const saveWorkflowSharedWithSpy = vi.spyOn(workflowsEEStore, 'saveWorkflowSharedWith');

		const props = {
			data: { id: '' },
		};
		const { getByTestId, getByRole, getByText } = renderComponent({ props });

		expect(getByRole('button', { name: 'Save' })).toBeDisabled();

		const projectSelect = getByTestId('project-sharing-select');
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);

		expect(getByText('You made changes')).toBeVisible();
		expect(getByRole('button', { name: 'Save' })).toBeEnabled();

		await userEvent.click(getByRole('button', { name: 'Save' }));
		await waitFor(() => {
			expect(saveAsNewWorkflowMock).toHaveBeenCalled();
			expect(saveWorkflowSharedWithSpy).toHaveBeenCalledWith({
				workflowId: 'abc123',
				sharedWithProjects: [projectsStore.personalProjects[0]],
			});
		});
	});
});
