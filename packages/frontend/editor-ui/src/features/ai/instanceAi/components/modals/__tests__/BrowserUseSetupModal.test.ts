import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import BrowserUseSetupContent from '../BrowserUseSetupContent.vue';
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

const CHROME_WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
const SAFARI_MACOS =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15';

function setUserAgent(userAgent: string) {
	Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
}

describe('BrowserUseSetupModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setUserAgent(CHROME_WINDOWS);
		settingsStoreMock.mockReturnValue(makeSettingsStore());
	});

	it('tracks the modal opening on mount', () => {
		renderComponent();
		expect(telemetryMock.trackModalOpened).toHaveBeenCalledTimes(1);
		expect(telemetryMock.trackModalOpened).toHaveBeenCalledWith(true);
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

	it('does not render the unsupported browser message on a Chromium browser', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('browser-use-unsupported-browser')).toBeNull();
	});

	describe('on an unsupported browser', () => {
		beforeEach(() => {
			setUserAgent(SAFARI_MACOS);
		});

		it('renders the unsupported browser message instead of the connect steps', () => {
			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('browser-use-unsupported-browser')).toBeInTheDocument();
			expect(queryByTestId('browser-use-install-extension')).toBeNull();
			expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
		});

		it('tracks the modal opening as unsupported', () => {
			renderComponent();
			expect(telemetryMock.trackModalOpened).toHaveBeenCalledWith(false);
		});

		it('closes the modal via the close button', async () => {
			const { getByTestId, emitted } = createComponentRenderer(BrowserUseSetupContent)();

			await fireEvent.click(getByTestId('browser-use-unsupported-close'));

			expect(emitted('close')).toHaveLength(1);
		});

		it('does not render the close button when embedded', () => {
			const { queryByTestId } = createComponentRenderer(BrowserUseSetupContent)({
				props: { embedded: true },
			});

			expect(queryByTestId('browser-use-unsupported-close')).toBeNull();
		});

		it('does not fetch the browser status or a connect URL', () => {
			const store = makeSettingsStore();
			settingsStoreMock.mockReturnValue(store);

			renderComponent();

			expect(store.fetchBrowserStatus).not.toHaveBeenCalled();
			expect(store.fetchBrowserConnectUrl).not.toHaveBeenCalled();
		});
	});
});
