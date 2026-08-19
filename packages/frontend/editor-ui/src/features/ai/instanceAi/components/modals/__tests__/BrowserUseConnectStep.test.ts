import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import BrowserUseConnectStep from '../BrowserUseConnectStep.vue';

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
		const { getByTestId } = renderComponent();
		await flushPromises();

		delete (globalThis as { chrome?: unknown }).chrome;
		await fireEvent.click(getByTestId('browser-use-direct-connect-retry'));
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
	});

	it('opens the connect page as a popup on the manual connect button', async () => {
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));

		expect(telemetryMock.trackOpenExtensionClicked).toHaveBeenCalledTimes(1);
		expect(openSpy).toHaveBeenCalledWith(
			CONNECT_URL,
			'n8n-browser-use-connect',
			expect.stringMatching(/^popup,width=620,height=640,left=\d+,top=\d+$/),
		);

		openSpy.mockRestore();
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
