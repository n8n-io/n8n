import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { createComponentRenderer } from '@/__tests__/render';
import { TEMPLATES_URLS } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { TemplateClickSource } from '@/utils/experiments';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import CanvasNodeAddNodes from './CanvasNodeAddNodes.vue';

vi.mock('@/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: vi.fn(() => 'variant'),
	})),
}));

vi.mock('@/utils/experiments', async (importOriginal) => {
	const actual = await importOriginal<object>();

	return {
		...actual,
		isExtraTemplateLinksExperimentEnabled: vi.fn(() => true),
	};
});

const mockTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

let settingsStore: ReturnType<typeof useSettingsStore>;

const renderComponent = createComponentRenderer(CanvasNodeAddNodes, {
	global: {
		provide: {
			...createCanvasProvide(),
		},
	},
});

describe('CanvasNodeAddNodes', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render node correctly', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('canvas-add-button')).toMatchSnapshot();
	});

	describe('template link', () => {
		it.each([
			{
				host: 'https://example.com',
				type: 'custom',
			},
			{
				host: TEMPLATES_URLS.DEFAULT_API_HOST,
				type: 'default',
			},
		])('should render with $type template store', ({ host }) => {
			settingsStore.settings.templates = { enabled: true, host };

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			expect(getByTestId('canvas-template-link')).toBeDefined();
		});

		it('should track user click', async () => {
			settingsStore.settings.templates = { enabled: true, host: '' };

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const link = getByTestId('canvas-template-link');
			await userEvent.click(link);

			expect(mockTrack).toHaveBeenCalledWith(
				'User clicked on templates',
				expect.objectContaining({
					source: TemplateClickSource.emptyWorkflowLink,
				}),
			);
		});
	});
});
