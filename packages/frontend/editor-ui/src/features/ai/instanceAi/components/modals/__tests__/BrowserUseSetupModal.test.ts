import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, reactive, ref, watch } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import BrowserUseSetupContent from '../BrowserUseSetupContent.vue';
import BrowserUseSetupModal from '../BrowserUseSetupModal.vue';
import type { BrowserUseExtensionState } from '../../../utils/browserUseExtension';

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

const { showMessageMock } = vi.hoisted(() => ({ showMessageMock: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock }),
}));

const { detectExtensionMock } = vi.hoisted(() => ({ detectExtensionMock: vi.fn() }));
vi.mock('../../../utils/browserUseExtension', () => ({
	detectBrowserUseExtension: detectExtensionMock,
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

async function renderWithExtensionState(state: BrowserUseExtensionState) {
	detectExtensionMock.mockResolvedValue(state);
	const rendered = renderComponent();
	await flushPromises();
	return rendered;
}

describe('BrowserUseSetupModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setUserAgent(CHROME_WINDOWS);
		settingsStoreMock.mockReturnValue(makeSettingsStore());
		detectExtensionMock.mockResolvedValue('unknown');
	});

	afterEach(() => {
		delete (globalThis as { chrome?: unknown }).chrome;
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
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent();
		await flushPromises();

		await fireEvent.click(getByTestId('browser-use-open-connect-page'));

		expect(telemetryMock.trackOpenExtensionClicked).toHaveBeenCalledTimes(1);

		openSpy.mockRestore();
	});

	it('replaces the connect step with an explanation when the extension is not installed', async () => {
		const { queryByTestId, queryByText } = await renderWithExtensionState('not-installed');

		expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
		expect(queryByText('instanceAi.browserUse.step.connect.description')).toBeNull();
		expect(queryByTestId('browser-use-extension-missing-note')).not.toBeNull();
	});

	it('drops the install step entirely when the extension is detected', async () => {
		const { queryByTestId, queryByText } = await renderWithExtensionState('installed');

		expect(queryByTestId('browser-use-install-extension')).toBeNull();
		expect(queryByText('instanceAi.browserUse.step.extension.title')).toBeNull();
		expect(queryByTestId('browser-use-open-connect-page')).not.toBeNull();
	});

	it.each(['not-installed', 'unknown'] as const)(
		'still offers the install step when the extension state is %s',
		async (state) => {
			const { queryByTestId } = await renderWithExtensionState(state);

			expect(queryByTestId('browser-use-install-extension')).not.toBeNull();
		},
	);

	it.each(['installed', 'unknown'] as const)(
		'offers the connect button when the extension state is %s',
		async (state) => {
			const { getByTestId, queryByTestId } = await renderWithExtensionState(state);

			expect(getByTestId('browser-use-open-connect-page')).not.toBeDisabled();
			expect(queryByTestId('browser-use-extension-missing-note')).toBeNull();
		},
	);

	it.each([
		['the tab becomes visible again', () => document.dispatchEvent(new Event('visibilitychange'))],
		['the window regains focus', () => window.dispatchEvent(new Event('focus'))],
	])('re-probes for the extension when %s', async (_label, triggerReturn) => {
		const { getByTestId, queryByTestId } = await renderWithExtensionState('not-installed');
		expect(queryByTestId('browser-use-extension-missing-note')).not.toBeNull();

		detectExtensionMock.mockResolvedValue('installed');
		triggerReturn();
		await flushPromises();

		expect(queryByTestId('browser-use-extension-missing-note')).toBeNull();
		expect(queryByTestId('browser-use-install-extension')).toBeNull();
		expect(getByTestId('browser-use-open-connect-page')).not.toBeDisabled();
	});

	it('probes once when both return triggers fire together', async () => {
		await renderWithExtensionState('not-installed');
		detectExtensionMock.mockClear();

		document.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('focus'));
		await flushPromises();

		expect(detectExtensionMock).toHaveBeenCalledTimes(1);
	});

	it('starts a fresh direct connect attempt once the extension gets installed', async () => {
		installExtensionMock({ connect: { accepted: true } });
		const { getByTestId, queryByTestId } = await renderWithExtensionState('not-installed');
		expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
		expect(queryByTestId('browser-use-direct-connect-waiting')).toBeNull();

		detectExtensionMock.mockResolvedValue('installed');
		window.dispatchEvent(new Event('focus'));
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(1);
		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
	});

	it('does not render the connect steps when already connected', () => {
		settingsStoreMock.mockReturnValue(makeSettingsStore({ browserConnected: true }));
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('browser-use-install-extension')).toBeNull();
		expect(queryByTestId('browser-use-open-connect-page')).toBeNull();
	});

	describe('once the browser connects', () => {
		async function renderContentAndConnect(props: Record<string, unknown>) {
			const store = reactive(makeSettingsStore());
			settingsStoreMock.mockReturnValue(store);
			const rendered = createComponentRenderer(BrowserUseSetupContent)({ props });
			await flushPromises();

			store.browserConnected = true;
			await flushPromises();

			return rendered;
		}

		it('closes the view and reports the success as a toast when auto-connecting', async () => {
			const { emitted } = await renderContentAndConnect({ autoConnect: true });

			expect(emitted('close')).toHaveLength(1);
			expect(showMessageMock).toHaveBeenCalledWith({
				type: 'success',
				title: 'instanceAi.browserUse.connected',
				message: 'instanceAi.browserUse.connected.toastMessage',
			});
		});

		it('keeps the connected status in place when not auto-connecting', async () => {
			const { emitted, getByText } = await renderContentAndConnect({ embedded: true });

			expect(emitted('close')).toBeUndefined();
			expect(showMessageMock).not.toHaveBeenCalled();
			expect(getByText('instanceAi.browserUse.connected')).toBeVisible();
		});

		// The credential setup flow watches the same connection state and closes the modal
		// itself, so the toast has to be reported before this view is torn down.
		it('reports the success even when an outside watcher closes the view first', async () => {
			const store = reactive(makeSettingsStore());
			settingsStoreMock.mockReturnValue(store);

			const host = defineComponent({
				setup() {
					const visible = ref(true);
					watch(
						() => store.browserConnected,
						(connected) => {
							if (connected) visible.value = false;
						},
					);
					return () => (visible.value ? h(BrowserUseSetupContent, { autoConnect: true }) : null);
				},
			});

			createComponentRenderer(host)();
			await flushPromises();

			store.browserConnected = true;
			await flushPromises();

			expect(showMessageMock).toHaveBeenCalledTimes(1);
		});
	});

	it('keeps the install step visible while the connect step waits for confirmation', async () => {
		installExtensionMock({ connect: { accepted: true } });
		const { getByTestId } = renderComponent();
		await flushPromises();

		// The direct connect flow is scoped to the connect step — the rest of the view stays put.
		expect(getByTestId('browser-use-install-extension')).toBeVisible();
		expect(getByTestId('browser-use-direct-connect-waiting')).toBeVisible();
	});

	it('does not request a direct connection when already connected', async () => {
		installExtensionMock({ connect: { accepted: true } });
		settingsStoreMock.mockReturnValue(makeSettingsStore({ browserConnected: true }));
		renderComponent();
		await flushPromises();

		expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
	});

	it('does not request a direct connection when the status fetch reveals a live session', async () => {
		installExtensionMock({ connect: { accepted: true } });
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

		it('does not request a direct connection even when the extension is present', async () => {
			installExtensionMock({ connect: { accepted: true } });
			renderComponent();
			await flushPromises();

			expect(telemetryMock.trackDirectConnectRequested).not.toHaveBeenCalled();
		});

		it('does not probe for the extension', async () => {
			renderComponent();
			await flushPromises();

			document.dispatchEvent(new Event('visibilitychange'));
			await flushPromises();

			expect(detectExtensionMock).not.toHaveBeenCalled();
		});
	});

	it('does not probe for the extension when already connected', async () => {
		settingsStoreMock.mockReturnValue(makeSettingsStore({ browserConnected: true }));
		renderComponent();
		await flushPromises();

		document.dispatchEvent(new Event('visibilitychange'));
		await flushPromises();

		expect(detectExtensionMock).not.toHaveBeenCalled();
	});
});
