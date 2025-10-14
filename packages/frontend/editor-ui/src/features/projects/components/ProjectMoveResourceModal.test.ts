import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { createProjectListItem } from '../__tests__/utils';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import type { MockedStore } from '@/__tests__/utils';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/constants';
import ProjectMoveResourceModal from './ProjectMoveResourceModal.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useProjectsStore } from '../projects.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ComponentProps } from 'vue-component-type-helpers';
import { ResourceType } from '../projects.utils';
import type { ProjectSharingData } from 'n8n-workflow';

const renderComponent = createComponentRenderer(ProjectMoveResourceModal, {
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

let telemetry: ReturnType<typeof useTelemetry>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let credentialsStore: MockedStore<typeof useCredentialsStore>;

describe('ProjectMoveResourceModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		telemetry = useTelemetry();
		projectsStore = mockedStore(useProjectsStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);
	});

	it('should send telemetry when mounted', async () => {
		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');

		projectsStore.availableProjects = [createProjectListItem()];
		workflowsStore.fetchWorkflow.mockResolvedValueOnce(createTestWorkflow());

		const props: ComponentProps<typeof ProjectMoveResourceModal> = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: ResourceType.Workflow,
				resourceTypeLabel: 'workflow',
				resource: createTestWorkflow({
					id: '1',
					name: 'My Workflow',
					homeProject: {
						id: '2',
						name: 'My Project',
					} as ProjectSharingData,
				}),
			},
		};
		renderComponent({ props });
		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User clicked to move a workflow',
			expect.objectContaining({ workflow_id: '1' }),
		);
	});

	it('should show no available projects message', async () => {
		projectsStore.availableProjects = [];
		workflowsStore.fetchWorkflow.mockResolvedValueOnce(createTestWorkflow());

		const props: ComponentProps<typeof ProjectMoveResourceModal> = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: ResourceType.Workflow,
				resourceTypeLabel: 'workflow',
				resource: createTestWorkflow({
					id: '1',
					name: 'My Workflow',
					homeProject: {
						id: '2',
						name: 'My Project',
					} as ProjectSharingData,
				}),
			},
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/Currently there are not any projects or users available/)).toBeVisible();
	});

	it('should not hide project select if filter has no result', async () => {
		const projects = Array.from({ length: 5 }, createProjectListItem);
		projectsStore.availableProjects = projects;

		const props: ComponentProps<typeof ProjectMoveResourceModal> = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: ResourceType.Workflow,
				resourceTypeLabel: 'Workflow',
				resource: createTestWorkflow({
					id: '1',
					name: 'My Workflow',
					homeProject: {
						id: projects[0].id,
						name: projects[0].name,
					} as ProjectSharingData,
				}),
			},
		};

		const { getByTestId, getByRole } = renderComponent({ props });

		const projectSelect = getByTestId('project-move-resource-modal-select');
		const projectSelectInput: HTMLInputElement = getByRole('combobox');
		expect(projectSelectInput).toBeVisible();
		expect(projectSelect).toBeVisible();

		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(projects.length - 1);

		await userEvent.click(projectSelectInput);
		await userEvent.type(projectSelectInput, 'non-existing project');

		expect(projectSelect).toBeVisible();
	});

	it('should not load workflow if the resource is a credential', async () => {
		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');
		projectsStore.availableProjects = [createProjectListItem()];

		const props: ComponentProps<typeof ProjectMoveResourceModal> = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: ResourceType.Credential,
				resourceTypeLabel: 'credential',
				resource: createTestWorkflow({
					id: '1',
					name: 'My credential',
					homeProject: {
						id: '2',
						name: 'My Project',
					} as ProjectSharingData,
				}),
			},
		};

		const { getByText } = renderComponent({ props });
		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User clicked to move a credential',
			expect.objectContaining({ credential_id: '1' }),
		);
		expect(workflowsStore.fetchWorkflow).not.toHaveBeenCalled();
		expect(getByText(/Moving will remove any existing sharing for this credential/)).toBeVisible();
	});

	it('should send credential IDs when workflow moved with used credentials and checkbox checked', async () => {
		const destinationProject = createProjectListItem();
		const currentProjectId = '123';
		const movedWorkflow = {
			...createTestWorkflow(),
			usedCredentials: [
				{
					id: '1',
					name: 'PG Credential',
					credentialType: 'postgres',
					currentUserHasAccess: true,
				},
				{
					id: '2',
					name: 'Notion Credential',
					credentialType: 'notion',
					currentUserHasAccess: true,
				},
			],
		};

		projectsStore.currentProjectId = currentProjectId;
		projectsStore.availableProjects = [destinationProject];
		workflowsStore.fetchWorkflow.mockResolvedValueOnce(movedWorkflow);
		credentialsStore.fetchAllCredentials.mockResolvedValueOnce([
			{
				id: '1',
				name: 'PG Credential',
				createdAt: '2021-01-01T00:00:00Z',
				updatedAt: '2021-01-01T00:00:00Z',
				type: 'postgres',
				scopes: ['credential:share'],
				isManaged: false,
			},
			{
				id: '2',
				name: 'Notion Credential',
				createdAt: '2021-01-01T00:00:00Z',
				updatedAt: '2021-01-01T00:00:00Z',
				type: 'notion',
				scopes: ['credential:share'],
				isManaged: false,
			},
			{
				id: '3',
				name: 'Another Credential',
				createdAt: '2021-01-01T00:00:00Z',
				updatedAt: '2021-01-01T00:00:00Z',
				type: 'another',
				scopes: ['credential:share'],
				isManaged: false,
			},
		]);

		const props: ComponentProps<typeof ProjectMoveResourceModal> = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: ResourceType.Workflow,
				resourceTypeLabel: 'workflow',
				resource: movedWorkflow,
			},
		};
		const { getByTestId, getByText } = renderComponent({ props });
		expect(getByTestId('project-move-resource-modal-button')).toBeDisabled();
		expect(getByText(/Moving will remove any existing sharing for this workflow/)).toBeVisible();

		const projectSelect = getByTestId('project-move-resource-modal-select');
		expect(projectSelect).toBeVisible();

		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);

		expect(getByTestId('project-move-resource-modal-button')).toBeEnabled();

		await userEvent.click(getByTestId('project-move-resource-modal-checkbox-all'));
		await userEvent.click(getByTestId('project-move-resource-modal-button'));

		expect(projectsStore.moveResourceToProject).toHaveBeenCalledWith(
			'workflow',
			movedWorkflow.id,
			destinationProject.id,
			undefined,
			['1', '2'],
		);
	});
});
