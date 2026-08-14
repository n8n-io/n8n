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

/**
 * Stub the extension messaging API so the direct connect flow is available.
 * `connectResponse` is what the extension replies to the connect request.
 */
function installExtensionMock(connectResponse: unknown): void {
	const runtime = {
		lastError: undefined as { message?: string } | undefined,
		sendMessage: (
			_extensionId: string,
			message: unknown,
			callback: (response: unknown) => void,
		) => {
			const type = (message as { type: string }).type;
			callback(type === 'ping' ? { pong: true } : connectResponse);
		},
	};
	(globalThis as { chrome?: unknown }).chrome = { runtime };
}

const renderComponent = createComponentRenderer(BrowserUseConnectStep);

describe('BrowserUseConnectStep', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStoreMock.mockReturnValue(makeSettingsStore());
	});

	afterEach(() => {
		delete (globalThis as { chrome?: unknown }).chrome;
	});

	it('shows the manual connect link when the extension cannot be messaged', async () => {
		const { getByTestId, queryByTestId } = renderComponent();
		await flushPromises();

		expect(getByTestId('browser-use-open-connect-page')).toBeVisible();
		expect(queryByTestId('browser-use-direct-connect-waiting')).toBeNull();
	});

	it('waits for confirmation once the extension accepts the request', async () => {
		installExtensionMock({ accepted: true });
		const { getByTestId, queryByTestId } = renderComponent();
		await flushPromises();

		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
		expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(1);
	});

	it('offers a retry that falls back to opening the connect page', async () => {
		installExtensionMock({ accepted: false, error: 'Too many connect requests.' });
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-direct-connect-retry'));
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(2);
		expect(openSpy).toHaveBeenCalledWith(
			CONNECT_URL,
			'n8n-browser-use-connect',
			expect.any(String),
		);

		openSpy.mockRestore();
	});

	it('tracks the manual connect link click', async () => {
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));

		expect(telemetryMock.trackOpenExtensionClicked).toHaveBeenCalledTimes(1);
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
