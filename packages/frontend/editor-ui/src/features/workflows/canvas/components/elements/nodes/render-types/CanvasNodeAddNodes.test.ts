import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { TEMPLATES_URLS, VIEWS, EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useUIStore } from '@/app/stores/ui.store';
import { TemplateClickSource, trackTemplatesClick } from '@/experiments/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
import { setActivePinia } from 'pinia';
import * as vueRouter from 'vue-router';
import CanvasNodeAddNodes from './CanvasNodeAddNodes.vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({
			params: {},
			location: {},
		}),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: vi.fn(() => 'variant'),
	})),
}));

vi.mock('@/experiments/utils', async (importOriginal) => {
	const actual = await importOriginal<object>();

	return {
		...actual,
		isExtraTemplateLinksExperimentEnabled: vi.fn(() => true),
		trackTemplatesClick: vi.fn(),
	};
});

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

let settingsStore: ReturnType<typeof useSettingsStore>;
let templatesStore: ReturnType<typeof useTemplatesStore>;
let uiStore: ReturnType<typeof useUIStore>;
let templatesDataQualityStore: ReturnType<typeof useTemplatesDataQualityStore>;
let router: ReturnType<typeof vueRouter.useRouter>;

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

		router = vueRouter.useRouter();
		settingsStore = useSettingsStore();
		templatesStore = useTemplatesStore();
		uiStore = useUIStore();
		templatesDataQualityStore = useTemplatesDataQualityStore();

		window.open = vi.fn();
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
			templatesDataQualityStore.isFeatureEnabled = vi.fn(() => false);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const link = getByTestId('canvas-template-link');
			await userEvent.click(link);

			expect(trackTemplatesClick).toHaveBeenCalledWith(TemplateClickSource.emptyWorkflowLink);
		});

		it('should open modal when templates data quality is enabled', async () => {
			settingsStore.settings.templates = { enabled: true, host: '' };
			templatesDataQualityStore.isFeatureEnabled = vi.fn(() => true);
			uiStore.openModal = vi.fn();
			Object.defineProperty(templatesStore, 'hasCustomTemplatesHost', {
				get: vi.fn(() => false),
			});

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const link = getByTestId('canvas-template-link');
			await userEvent.click(link);

			expect(uiStore.openModal).toHaveBeenCalledWith(EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY);
		});

		it('should navigate to templates view when custom host is configured', async () => {
			settingsStore.settings.templates = { enabled: true, host: 'https://custom.com' };
			Object.defineProperty(templatesStore, 'hasCustomTemplatesHost', {
				get: vi.fn(() => true),
			});

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const link = getByTestId('canvas-template-link');
			await userEvent.click(link);

			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.TEMPLATES });
		});

		it('should open window to template repository when no custom host and feature disabled', async () => {
			settingsStore.settings.templates = { enabled: true, host: '' };
			templatesDataQualityStore.isFeatureEnabled = vi.fn(() => false);
			Object.defineProperty(templatesStore, 'hasCustomTemplatesHost', {
				get: vi.fn(() => false),
			});
			Object.defineProperty(templatesStore, 'websiteTemplateRepositoryURL', {
				get: vi.fn(() => 'https://n8n.io/workflows'),
			});

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});

			const link = getByTestId('canvas-template-link');
			await userEvent.click(link);

			expect(window.open).toHaveBeenCalledWith('https://n8n.io/workflows', '_blank');
		});
	});
});
