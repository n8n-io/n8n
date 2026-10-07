import { computed, reactive, ref } from 'vue';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { commandBarEventBus } from '@/features/shared/commandBar/commandBar.eventBus';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import AppCommandBar from './AppCommandBar.vue';

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => reactive({ name: 'WorkflowView' }),
}));

vi.mock('@/features/shared/commandBar/composables/useCommandBar', () => ({
	useCommandBar: () => ({
		initialize: vi.fn(),
		items: computed(() => []),
		placeholder: computed(() => ''),
		context: computed(() => undefined),
		isLoading: ref(false),
		onCommandBarChange: vi.fn(),
		onCommandBarNavigateTo: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(AppCommandBar, {
	global: {
		stubs: {
			N8nCommandBar: {
				props: ['open'],
				template: '<div data-test-id="command-bar-stub" :data-open="String(open)" />',
			},
		},
	},
});

let settingsStore: MockedStore<typeof useSettingsStore>;
let pinia: ReturnType<typeof createTestingPinia>;

describe('AppCommandBar', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = defaultSettings;
	});

	it('renders the command bar by default', () => {
		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('command-bar-stub')).toBeInTheDocument();
	});

	it('opens the command bar on an open:request bus event', async () => {
		const { getByTestId } = renderComponent({ pinia });

		expect(getByTestId('command-bar-stub').dataset.open).toBe('false');

		commandBarEventBus.emit('open:request');
		await waitFor(() => expect(getByTestId('command-bar-stub').dataset.open).toBe('true'));
	});

	it('closes the command bar on Cmd+F and refocuses the canvas', async () => {
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');
		const { getByTestId } = renderComponent({ pinia });

		commandBarEventBus.emit('open:request');
		await waitFor(() => expect(getByTestId('command-bar-stub').dataset.open).toBe('true'));

		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'f', metaKey: true, cancelable: true }),
		);

		await waitFor(() => expect(getByTestId('command-bar-stub').dataset.open).toBe('false'));
		await waitFor(() => expect(emitSpy).toHaveBeenCalledWith('focus'));
	});

	it('does not render the command bar in canvas-only mode', () => {
		settingsStore.settings = { ...defaultSettings, canvasOnly: true };

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('command-bar-stub')).not.toBeInTheDocument();
	});
});
