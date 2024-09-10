import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { PROJECT_MOVE_RESOURCE_CONFIRM_MODAL } from '@/constants';
import ProjectMoveResourceConfirmModal from '@/components/Projects/ProjectMoveResourceConfirmModal.vue';
import { useProjectsStore } from '@/stores/projects.store';
import { useTelemetry } from '@/composables/useTelemetry';

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		modalsById: vi.fn().mockReturnValue(() => {
			open: true;
		}),
		closeModal: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(ProjectMoveResourceConfirmModal, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

let projectsStore: ReturnType<typeof useProjectsStore>;
let telemetry: ReturnType<typeof useTelemetry>;

describe('ProjectMoveResourceConfirmModal', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		projectsStore = useProjectsStore();
		telemetry = useTelemetry();
	});

	it('should send telemetry when resource moving is confirmed', async () => {
		vi.spyOn(projectsStore, 'moveResourceToProject').mockResolvedValue();

		const telemetryTrackSpy = vi.spyOn(telemetry, 'track');

		const props = {
			modalName: PROJECT_MOVE_RESOURCE_CONFIRM_MODAL,
			data: {
				resourceType: 'workflow',
				resource: {
					id: '1',
				},
				projectId: '1',
				projectName: 'My Project',
			},
		};
		const { getByRole, getAllByRole } = renderComponent({ props });
		const confirmBtn = getByRole('button', { name: /confirm/i });
		expect(confirmBtn).toBeDisabled();
		await Promise.all(
			getAllByRole('checkbox').map(async (checkbox) => await userEvent.click(checkbox)),
		);
		expect(confirmBtn).toBeEnabled();
		await userEvent.click(confirmBtn);
		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User successfully moved workflow',
			expect.objectContaining({ workflow_id: '1' }),
		);
	});
});
