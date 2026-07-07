import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import BrowserUseSetupModal from '../BrowserUseSetupModal.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const { telemetryMock } = vi.hoisted(() => ({
	telemetryMock: {
		trackModalOpened: vi.fn(),
		trackInstallExtensionClicked: vi.fn(),
		trackOpenExtensionClicked: vi.fn(),
	},
}));

vi.mock('../../../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => telemetryMock,
}));

const settingsStoreMock = vi.fn();
vi.mock('../../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStoreMock(),
}));

function makeSettingsStore(overrides: Record<string, unknown> = {}) {
	return {
		browserConnected: false,
		browserConnectUrlExpiresAt: null,
		fetchBrowserStatus: vi.fn(),
		fetchBrowserConnectUrl: vi.fn().mockResolvedValue('https://connect.example/extension'),
		clearBrowserConnectUrl: vi.fn(),
		...overrides,
	};
}

const renderComponent = createComponentRenderer(BrowserUseSetupModal, {
	props: { modalName: 'browserUseSetup' },
	global: {
		stubs: {
			Modal: {
				template: '<div><slot name="content" /></div>',
			},
		},
	},
});

describe('BrowserUseSetupModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStoreMock.mockReturnValue(makeSettingsStore());
	});

	it('tracks the modal opening on mount', () => {
		renderComponent();
		expect(telemetryMock.trackModalOpened).toHaveBeenCalledTimes(1);
	});

	it('tracks the install extension button click', async () => {
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-install-extension'));

		expect(telemetryMock.trackInstallExtensionClicked).toHaveBeenCalledTimes(1);
	});

	it('tracks the open extension button click', async () => {
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));

		expect(telemetryMock.trackOpenExtensionClicked).toHaveBeenCalledTimes(1);
	});

	it('does not render the connect steps when already connected', () => {
		settingsStoreMock.mockReturnValue(makeSettingsStore({ browserConnected: true }));
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('browser-use-install-extension')).toBeNull();
		expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
	});
});
