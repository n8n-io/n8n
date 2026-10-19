import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useOtelStore } from '@n8n/frontend-module-otel';

import { useLogStreamingStore } from '@/features/integrations/logStreaming.ee/logStreaming.store';

import SettingsObservabilityView from './SettingsObservabilityView.vue';

const push = vi.fn();
const pages = vi.hoisted(() => ({ logStreaming: true, openTelemetry: true }));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('../useObservabilityPages', () => ({
	useObservabilityPages: () => ({
		canOpenLogStreaming: computed(() => pages.logStreaming),
		canOpenOpenTelemetry: computed(() => pages.openTelemetry),
	}),
}));

const renderView = createComponentRenderer(SettingsObservabilityView);

describe('SettingsObservabilityView', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
		pages.logStreaming = true;
		pages.openTelemetry = true;

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive = (id: string) => id === 'log-streaming' || id === 'otel';

		const logStreamingStore = mockedStore(useLogStreamingStore);
		logStreamingStore.fetchDestinations.mockResolvedValue([]);

		const otelStore = mockedStore(useOtelStore);
		otelStore.fetchSettings.mockResolvedValue(undefined);
	});

	it('links to the docs section that covers logs and monitoring', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-page-header-docs')).toHaveAttribute(
			'href',
			'https://docs.n8n.io/administer/observe-and-log',
		);
	});

	it('lists Log streaming and OpenTelemetry', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-observability-log-streaming-row')).toBeInTheDocument();
		expect(getByTestId('settings-observability-opentelemetry-row')).toBeInTheDocument();
	});

	it('shows how many destinations are set up, and Configure while there are none', async () => {
		const logStreamingStore = mockedStore(useLogStreamingStore);
		logStreamingStore.fetchDestinations.mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);

		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('settings-observability-log-streaming-row')).toHaveTextContent(
				'2 destinations',
			),
		);
	});

	it('keeps Configure while no destination is set up', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => expect(useLogStreamingStore().fetchDestinations).toHaveBeenCalled());
		expect(getByTestId('settings-observability-log-streaming-row')).toHaveTextContent('Configure');
	});

	it('does not ask for destinations while log streaming is unlicensed', () => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive = (id: string) => id === 'otel';

		renderView();

		expect(useLogStreamingStore().fetchDestinations).not.toHaveBeenCalled();
	});

	it.each([
		[true, 'Enabled'],
		[false, 'Disabled'],
	])('shows tracing as enabled=%s → "%s"', async (enabled, expected) => {
		const otelStore = mockedStore(useOtelStore);
		otelStore.settings = { ...otelStore.settings, enabled };

		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('settings-observability-opentelemetry-row')).toHaveTextContent(expected),
		);
	});

	it('opens each page when its row is clicked', async () => {
		const { getByTestId } = renderView();

		await userEvent.click(getByTestId('settings-observability-log-streaming-row'));
		expect(push).toHaveBeenLastCalledWith({ name: 'LogStreamingSettingsView' });

		await userEvent.click(getByTestId('settings-observability-opentelemetry-row'));
		expect(push).toHaveBeenLastCalledWith({ name: 'SettingsOpenTelemetryView' });
	});

	it('hides rows the user cannot open', () => {
		pages.openTelemetry = false;

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('settings-observability-log-streaming-row')).toBeInTheDocument();
		expect(queryByTestId('settings-observability-opentelemetry-row')).not.toBeInTheDocument();
	});
});
