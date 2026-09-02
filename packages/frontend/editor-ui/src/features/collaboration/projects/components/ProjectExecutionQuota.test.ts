import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import ProjectExecutionQuota from './ProjectExecutionQuota.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '../projects.store';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectExecutionQuota', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		projectsStore = useProjectsStore();

		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 100,
			periodUnit: 'day',
			consumed: 42,
			remaining: 58,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});
		vi.spyOn(projectsStore, 'updateExecutionQuota').mockResolvedValue(undefined);

		renderComponent = createComponentRenderer(ProjectExecutionQuota, {
			props: {
				projectId: 'project-1',
				canManage: true,
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the section and loads the current quota', async () => {
		renderComponent();

		await vi.waitFor(() => {
			expect(projectsStore.getExecutionQuota).toHaveBeenCalledWith('project-1');
			expect(screen.getByTestId('project-execution-quota')).toBeInTheDocument();
		});
	});

	it('shows editable controls when the user can manage the quota', async () => {
		renderComponent();

		await vi.waitFor(() => {
			expect(screen.getByTestId('execution-quota-limit')).toBeInTheDocument();
			expect(screen.getByTestId('execution-quota-period')).toBeInTheDocument();
			expect(screen.getByTestId('execution-quota-save')).toBeInTheDocument();
		});
	});

	it('shows a read-only consumption line when the user cannot manage the quota', async () => {
		renderComponent({ props: { projectId: 'project-1', canManage: false } });

		await vi.waitFor(() => {
			expect(screen.getByTestId('execution-quota-readonly')).toBeInTheDocument();
			expect(screen.queryByTestId('execution-quota-limit')).not.toBeInTheDocument();
			expect(screen.queryByTestId('execution-quota-save')).not.toBeInTheDocument();
		});
	});

	it('saves the updated limit and period', async () => {
		renderComponent();
		const user = userEvent.setup();

		let saveButton!: HTMLElement;
		await vi.waitFor(() => {
			saveButton = screen.getByTestId('execution-quota-save');
		});

		await user.click(saveButton);

		await vi.waitFor(() => {
			expect(projectsStore.updateExecutionQuota).toHaveBeenCalledWith('project-1', {
				limit: 100,
				periodUnit: 'day',
			});
		});
	});

	it('shows an error toast when loading the quota fails', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockRejectedValue(new Error('API Error'));
		const { useToast } = await import('@n8n/composables/useToast');
		const showErrorSpy = vi.fn();
		vi.mocked(useToast).mockReturnValue({
			showError: showErrorSpy,
			showMessage: vi.fn(),
		} as unknown as ReturnType<typeof useToast>);

		renderComponent();

		await vi.waitFor(() => {
			expect(showErrorSpy).toHaveBeenCalled();
		});
	});
});
