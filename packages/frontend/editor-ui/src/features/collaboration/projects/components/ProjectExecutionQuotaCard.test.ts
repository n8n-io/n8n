import { screen } from '@testing-library/vue';
import { vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import ProjectExecutionQuotaCard from './ProjectExecutionQuotaCard.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '../projects.store';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectExecutionQuotaCard', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		projectsStore = useProjectsStore();

		renderComponent = createComponentRenderer(ProjectExecutionQuotaCard, {
			props: {
				projectId: 'project-1',
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('loads the quota for the given project and renders consumption', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 100,
			periodUnit: 'day',
			consumed: 42,
			remaining: 58,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			expect(projectsStore.getExecutionQuota).toHaveBeenCalledWith('project-1');
			expect(screen.getByTestId('project-execution-quota-card')).toBeInTheDocument();
			expect(screen.getByText('42 / 100')).toBeInTheDocument();
		});
	});

	it('renders an infinity symbol when the project has no limit', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 0,
			periodUnit: 'day',
			consumed: 12,
			remaining: null,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			expect(screen.getByText('12 / ∞')).toBeInTheDocument();
		});
	});

	it('renders a progress bar sized to the consumed/limit percentage, capped at 100%', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 100,
			periodUnit: 'day',
			consumed: 42,
			remaining: 58,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			const progress = screen.getByTestId('project-execution-quota-progress');
			expect(progress).toHaveAttribute('aria-valuenow', '42');
			expect(progress.firstElementChild).toHaveStyle({ width: '42%' });
		});
	});

	it('caps the progress bar at 100% when consumed exceeds the limit', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 10,
			periodUnit: 'day',
			consumed: 15,
			remaining: 0,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			const progress = screen.getByTestId('project-execution-quota-progress');
			expect(progress.firstElementChild).toHaveStyle({ width: '100%' });
		});
	});

	it('does not render a progress bar for an unlimited project', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 0,
			periodUnit: 'day',
			consumed: 12,
			remaining: null,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			expect(screen.getByText('12 / ∞')).toBeInTheDocument();
			expect(screen.queryByTestId('project-execution-quota-progress')).not.toBeInTheDocument();
		});
	});

	it('renders a reset countdown derived from resetsAt', async () => {
		vi.spyOn(projectsStore, 'getExecutionQuota').mockResolvedValue({
			limit: 100,
			periodUnit: 'day',
			consumed: 42,
			remaining: 58,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		renderComponent();

		await vi.waitFor(() => {
			expect(screen.getByTestId('project-execution-quota-resets-at')).toBeInTheDocument();
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
			expect(screen.queryByTestId('project-execution-quota-card')).not.toBeInTheDocument();
		});
	});

	// Regression test for: the card only fetched in onMounted, so switching
	// projects without a remount (the `/projects/:projectId/workflows` route
	// is shared across all projects) left it showing the previous project's
	// numbers. The fetch must be driven by a `projectId` watcher, not mount.
	it('re-fetches the quota when the projectId prop changes without a remount', async () => {
		const getExecutionQuota = vi.spyOn(projectsStore, 'getExecutionQuota');
		getExecutionQuota.mockResolvedValueOnce({
			limit: 100,
			periodUnit: 'day',
			consumed: 42,
			remaining: 58,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		const result = renderComponent();

		await vi.waitFor(() => {
			expect(getExecutionQuota).toHaveBeenCalledWith('project-1');
			expect(screen.getByText('42 / 100')).toBeInTheDocument();
		});

		getExecutionQuota.mockResolvedValueOnce({
			limit: 10,
			periodUnit: 'day',
			consumed: 3,
			remaining: 7,
			resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});

		await result.rerender({ projectId: 'project-2' });

		await vi.waitFor(() => {
			expect(getExecutionQuota).toHaveBeenCalledWith('project-2');
			expect(getExecutionQuota).toHaveBeenCalledTimes(2);
			expect(screen.getByText('3 / 10')).toBeInTheDocument();
			expect(screen.queryByText('42 / 100')).not.toBeInTheDocument();
		});
	});
});
