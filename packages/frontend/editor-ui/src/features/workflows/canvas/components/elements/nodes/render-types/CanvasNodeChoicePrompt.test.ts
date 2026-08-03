import { computed, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CanvasNodeChoicePrompt from './CanvasNodeChoicePrompt.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { EditorEnabledFeaturesKey, WorkflowIdKey } from '@/app/constants/injectionKeys';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, name: '' }),
	RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('@/experiments/utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/experiments/utils')>()),
	isExtraTemplateLinksExperimentEnabled: () => false,
}));

const renderComponent = createComponentRenderer(CanvasNodeChoicePrompt, {
	global: {
		provide: {
			[WorkflowIdKey]: computed(() => 'wf-1'),
		},
	},
});

describe('CanvasNodeChoicePrompt', () => {
	const setupStores = ({ isAiBuilderEnabled }: { isAiBuilderEnabled: boolean }) => {
		const testingPinia = createTestingPinia();
		setActivePinia(testingPinia);
		mockedStore(useSettingsStore).isAiBuilderEnabled = isAiBuilderEnabled;
		return testingPinia;
	};

	it('shows the Build with AI option when the AI builder is available', () => {
		const { getByTestId } = renderComponent({
			pinia: setupStores({ isAiBuilderEnabled: true }),
		});

		expect(getByTestId('canvas-add-first-step-button')).toBeInTheDocument();
		expect(getByTestId('canvas-build-with-ai-button')).toBeInTheDocument();
	});

	it('hides the Build with AI option when the editor host disables the AI builder', () => {
		// NOTE: no `merge: true` — lodash merge drops Symbol keys, which would
		// silently discard the EditorEnabledFeaturesKey provide. The default
		// (spread) path preserves symbols and the renderer-level provide.
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: setupStores({ isAiBuilderEnabled: true }),
			global: {
				provide: {
					[EditorEnabledFeaturesKey]: ref({
						aiAssistant: false,
						aiBuilder: false,
						askAi: false,
					}),
				},
			},
		});

		expect(getByTestId('canvas-add-first-step-button')).toBeInTheDocument();
		expect(queryByTestId('canvas-build-with-ai-button')).not.toBeInTheDocument();
	});

	it('hides the Build with AI option when the instance has the AI builder disabled', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: setupStores({ isAiBuilderEnabled: false }),
		});

		expect(getByTestId('canvas-add-first-step-button')).toBeInTheDocument();
		expect(queryByTestId('canvas-build-with-ai-button')).not.toBeInTheDocument();
	});

	it('renders the assistant sparkles icon on the Build with AI tile', () => {
		const { getByTestId } = renderComponent({
			pinia: setupStores({ isAiBuilderEnabled: true }),
		});

		expect(
			getByTestId('canvas-build-with-ai-button').querySelector('[data-icon="sparkles"]'),
		).toBeInTheDocument();
	});
});
