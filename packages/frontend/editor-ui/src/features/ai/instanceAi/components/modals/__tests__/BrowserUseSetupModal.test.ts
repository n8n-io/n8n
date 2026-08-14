import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
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

const CONNECT_URL =
	'chrome-extension://testextensionid/connect.html?mcpRelayUrl=wss%3A%2F%2Facme.app.n8n.cloud%2Frelay';

function makeSettingsStore(overrides: Record<string, unknown> = {}) {
	return {
		browserConnected: false,
		browserConnectUrlExpiresAt: null,
		fetchBrowserStatus: vi.fn(),
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

	afterEach(() => {
		delete (globalThis as { chrome?: unknown }).chrome;
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

	it('keeps the install step visible while the connect step waits for confirmation', async () => {
		installExtensionMock({ accepted: true });
		const { getByTestId } = renderComponent();
		await flushPromises();

		// The direct connect flow is scoped to the connect step — the rest of the view stays put.
		expect(getByTestId('browser-use-install-extension')).toBeVisible();
		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
	});

	it('does not request a direct connection when already connected', async () => {
		installExtensionMock({ accepted: true });
		settingsStoreMock.mockReturnValue(makeSettingsStore({ browserConnected: true }));
		renderComponent();
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
	});

	it('does not request a direct connection when the status fetch reveals a live session', async () => {
		installExtensionMock({ accepted: true });
		// Store starts stale (disconnected); the status fetch corrects it. Requesting a
		// connection here would make the extension drop the live session.
		const store = reactive(makeSettingsStore());
		store.fetchBrowserStatus = vi.fn().mockImplementation(async () => {
			store.browserConnected = true;
		});
		settingsStoreMock.mockReturnValue(store);

		renderComponent();
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
		expect(store.fetchBrowserConnectUrl).not.toHaveBeenCalled();
	});
});
