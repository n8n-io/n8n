import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createProjectListItem } from '@/__tests__/data/projects';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import type { MockedStore } from '@/__tests__/utils';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/constants';
import ProjectMoveResourceModal from '@/components/Projects/ProjectMoveResourceModal.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useProjectsStore } from '@/stores/projects.store';

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

describe('ProjectMoveResourceModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		telemetry = useTelemetry();
		projectsStore = mockedStore(useProjectsStore);
	});

	it('should send telemetry when mounted', async () => {
		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');

		projectsStore.availableProjects = [createProjectListItem()];

		const props = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				resource: {
					id: '1',
					homeProject: {
						id: '2',
						name: 'My Project',
					},
				},
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

		const props = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				resource: {
					id: '1',
					homeProject: {
						id: '2',
						name: 'My Project',
					},
				},
			},
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/Currently there are not any projects or users available/)).toBeVisible();
	});

	it('should not hide project select if filter has no result', async () => {
		const projects = Array.from({ length: 5 }, createProjectListItem);
		projectsStore.availableProjects = projects;

		const props = {
			modalName: PROJECT_MOVE_RESOURCE_MODAL,
			data: {
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				resource: {
					id: '1',
					homeProject: {
						id: projects[0].id,
						name: projects[0].name,
					},
				},
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
});
