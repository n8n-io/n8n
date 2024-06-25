import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { PROJECT_MOVE_RESOURCE_CONFIRM_MODAL } from '@/constants';
import ProjectMoveResourceModal from '@/components/Projects/ProjectMoveResourceModal.vue';
import { useTelemetry } from '@/composables/useTelemetry';

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
		setActivePinia(createPinia());
		telemetry = useTelemetry();
	});

	it('should send telemetry when mounted', async () => {
		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');

		const props = {
			modalName: PROJECT_MOVE_RESOURCE_CONFIRM_MODAL,
			data: {
				resourceType: 'workflow',
				resource: {
					id: '1',
				},
				projectId: '1',
			},
		};
		renderComponent({ props });
		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User clicked to move a workflow',
			expect.objectContaining({ workflow_id: '1' }),
		);
	});
});
