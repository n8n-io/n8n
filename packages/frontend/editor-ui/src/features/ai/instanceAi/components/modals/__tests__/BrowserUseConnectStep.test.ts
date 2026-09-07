import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import BrowserUseConnectStep from '../BrowserUseConnectStep.vue';
import { resetExtensionDirectConnect } from '../../../composables/useExtensionDirectConnect';

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
		trackDirectConnectRequested: vi.fn(),
	},
}));

vi.mock('../../../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => telemetryMock,
}));

const settingsStoreMock = vi.fn();
vi.mock('../../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStoreMock(),
}));

const RELAY_URL = 'wss://acme.app.n8n.cloud/browser-use/extension/session?token=bu_x';
const CONNECT_URL = `chrome-extension://testextensionid/connect.html?mcpRelayUrl=${encodeURIComponent(RELAY_URL)}`;

function makeSettingsStore(overrides: Record<string, unknown> = {}) {
	return {
		browserConnectUrl: null,
		browserConnectUrlExpiresAt: null,
		fetchBrowserConnectUrl: vi.fn().mockResolvedValue(CONNECT_URL),
		clearBrowserConnectUrl: vi.fn(),
		...overrides,
	};
}

function installExtensionMock(responses: Record<string, unknown>): void {
	const runtime = {
		lastError: undefined as { message?: string } | undefined,
		sendMessage: (
			_extensionId: string,
			message: unknown,
			callback: (response: unknown) => void,
		) => {
			const type = (message as { type: string }).type;
			if (type in responses) callback(responses[type]);
		},
	};
	(globalThis as { chrome?: unknown }).chrome = { runtime };
}

const renderComponent = createComponentRenderer(BrowserUseConnectStep, {
	props: { autoConnect: true },
});

describe('BrowserUseConnectStep', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetExtensionDirectConnect();
		settingsStoreMock.mockReturnValue(makeSettingsStore());
	});

	afterEach(() => {
		delete (globalThis as { chrome?: unknown }).chrome;
	});

	it('does not start a direct connect attempt when autoConnect is off', async () => {
		installExtensionMock({ connect: { accepted: true } });
		const { getByTestId, queryByTestId } = createComponentRenderer(BrowserUseConnectStep)();
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
		expect(queryByTestId('browser-use-direct-connect-waiting')).toBeNull();
		expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
	});

	it('shows the manual connect link when the extension cannot be messaged', async () => {
		const { getByTestId, queryByTestId } = renderComponent();
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
		expect(queryByTestId('browser-use-direct-connect-waiting')).toBeNull();
	});

	it('shows the manual connect link when the extension does not accept the request', async () => {
		installExtensionMock({ connect: { accepted: false } });
		const { getByTestId, queryByTestId } = renderComponent();
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
		expect(queryByTestId('browser-use-direct-connect-retry')).toBeNull();
	});

	it('waits for the connect result once the extension opened the popup', async () => {
		installExtensionMock({ connect: { accepted: true } });
		const { getByTestId, queryByTestId } = renderComponent();
		await flushPromises();

		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
		expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(1);
	});

	it('does not point at a popup when the host connects without one', async () => {
		installExtensionMock({ connect: { accepted: true, confirmationRequired: false } });
		const { getByTestId } = renderComponent();
		await flushPromises();

		const status = getByTestId('browser-use-direct-connect-waiting');
		expect(status).toHaveTextContent('instanceAi.browserUse.directConnect.connecting');
		expect(status).not.toHaveTextContent('instanceAi.browserUse.directConnect.waiting');
	});

	it('does not inherit the status of a flow that already finished', async () => {
		// A successful connect leaves the shared status at 'waiting'.
		installExtensionMock({ connect: { accepted: true }, connectResult: { connected: true } });
		const first = renderComponent();
		await flushPromises();
		first.unmount();

		const { getByTestId, queryByTestId } = createComponentRenderer(BrowserUseConnectStep)();
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
		expect(queryByTestId('browser-use-direct-connect-waiting')).toBeNull();
	});

	it('offers a retry when the connect did not succeed', async () => {
		installExtensionMock({ connect: { accepted: true }, connectResult: { connected: false } });
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-direct-connect-retry'));
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(2);
	});

	it('shows the manual connect link when the extension stops responding on retry', async () => {
		installExtensionMock({ connect: { accepted: true }, connectResult: { connected: false } });
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent();
		await flushPromises();

		delete (globalThis as { chrome?: unknown }).chrome;
		await fireEvent.click(getByTestId('browser-use-direct-connect-retry'));
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();

		openSpy.mockRestore();
	});

	it('lets the extension own the confirmation instead of opening a window', async () => {
		installExtensionMock({ connect: { accepted: true } });
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = createComponentRenderer(BrowserUseConnectStep)();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));
		await flushPromises();

		expect(openSpy).not.toHaveBeenCalled();
		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(1);
		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();

		openSpy.mockRestore();
	});

	it('falls back to opening the connect page when the extension cannot be messaged', async () => {
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));

		expect(telemetryMock.trackOpenExtensionClicked).toHaveBeenCalledTimes(1);
		expect(openSpy).toHaveBeenCalledWith(
			CONNECT_URL,
			'n8n-browser-use-connect',
			expect.stringMatching(/^popup,width=540,height=700,left=\d+,top=\d+$/),
		);

		openSpy.mockRestore();
	});

	it('reuses a live connect URL rather than minting one', async () => {
		// Minting rotates the relay token, killing a connect an outer caller already started.
		const store = makeSettingsStore({
			browserConnectUrl: CONNECT_URL,
			browserConnectUrlExpiresAt: new Date(Date.now() + 600_000).toISOString(),
		});
		settingsStoreMock.mockReturnValue(store);
		installExtensionMock({ connect: { accepted: true } });

		const { getByTestId } = renderComponent();
		await flushPromises();

		expect(store.fetchBrowserConnectUrl).not.toHaveBeenCalled();
		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
	});

	it('mints a connect URL when the stored one is about to expire', async () => {
		const store = makeSettingsStore({
			browserConnectUrl: CONNECT_URL,
			browserConnectUrlExpiresAt: new Date(Date.now() + 5_000).toISOString(),
		});
		settingsStoreMock.mockReturnValue(store);

		renderComponent();
		await flushPromises();

		expect(store.fetchBrowserConnectUrl).toHaveBeenCalledTimes(1);
	});

	it('clears the stored connect URL when unmounted', async () => {
		const store = makeSettingsStore();
		settingsStoreMock.mockReturnValue(store);

		const { unmount } = renderComponent();
		await flushPromises();
		unmount();

		expect(store.clearBrowserConnectUrl).toHaveBeenCalled();
	});
});
