import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/constants';
import ProjectMoveResourceModal from '@/components/Projects/ProjectMoveResourceModal.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/stores/projects.store';

const renderComponent = createComponentRenderer(ProjectMoveResourceModal, {
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

describe('ProjectMoveResourceModal', () => {
	beforeEach(() => {
		telemetry = useTelemetry();
	});

	it('should send telemetry when mounted', async () => {
		const pinia = createTestingPinia();
		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');

		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.projects = [
			{
				id: '1',
				name: 'My Project',
				type: 'personal',
				role: 'project:personalOwner',
				createdAt: '2021-01-01T00:00:00.000Z',
				updatedAt: '2021-01-01T00:00:00.000Z',
			},
		];

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
		renderComponent({ props, pinia });
		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User clicked to move a workflow',
			expect.objectContaining({ workflow_id: '1' }),
		);
	});
});
