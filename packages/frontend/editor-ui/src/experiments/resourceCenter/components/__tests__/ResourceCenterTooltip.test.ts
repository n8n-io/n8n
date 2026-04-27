import { createComponentRenderer } from '@/__tests__/render';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ResourceCenterTooltip from '../ResourceCenterTooltip.vue';

const mocks = vi.hoisted(() => ({
	trackView: vi.fn(),
	trackDismiss: vi.fn(),
	markDismissed: vi.fn(),
}));

vi.mock('../../stores/resourceCenter.store', () => ({
	useResourceCenterStore: () => ({
		shouldShowResourceCenterTooltip: true,
		trackResourceCenterTooltipView: mocks.trackView,
		trackResourceCenterTooltipDismiss: mocks.trackDismiss,
		markResourceCenterTooltipDismissed: mocks.markDismissed,
	}),
}));

vi.mock('@/app/composables/useSidebarLayout', () => ({
	useSidebarLayout: () => ({
		isCollapsed: false,
	}),
}));

const renderComponent = createComponentRenderer(ResourceCenterTooltip, {
	global: {
		stubs: {
			N8nTooltip: {
				template: '<div><slot name="content" /><slot /></div>',
			},
			N8nIcon: true,
		},
	},
});

describe('ResourceCenterTooltip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('tracks a tooltip view when it becomes visible', async () => {
		renderComponent();

		await waitFor(() => expect(mocks.trackView).toHaveBeenCalledTimes(1));
		expect(screen.getByText('Get inspired and learn with use cases')).toBeInTheDocument();
	});

	it('tracks dismissal and persists the dismissed state', async () => {
		renderComponent();

		await userEvent.click(await screen.findByRole('button', { name: 'Dismiss tooltip' }));

		expect(mocks.trackDismiss).toHaveBeenCalledTimes(1);
		expect(mocks.markDismissed).toHaveBeenCalledTimes(1);
	});
});
