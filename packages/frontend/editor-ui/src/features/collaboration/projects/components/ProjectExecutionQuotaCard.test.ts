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
		});

		renderComponent();

		await vi.waitFor(() => {
			expect(screen.getByText('12 / ∞')).toBeInTheDocument();
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
});
