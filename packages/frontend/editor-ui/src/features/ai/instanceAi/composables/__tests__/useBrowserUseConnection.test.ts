import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive, ref } from 'vue';

import { useBrowserUseConnection } from '../useBrowserUseConnection';
import { INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY as MODAL_KEY } from '../../constants';

const CONNECT_URL = 'chrome-extension://testextensionid/connect.html?mcpRelayUrl=wss%3A%2F%2Fx';

const settingsStore = reactive({
	browserConnected: false,
	fetchBrowserConnectUrl: vi.fn<() => Promise<string | null>>(),
});

const uiStore = reactive({
	activeModals: [] as string[],
	openModal: vi.fn((key: string) => {
		uiStore.activeModals.push(key);
	}),
	closeModal: vi.fn((key: string) => {
		uiStore.activeModals = uiStore.activeModals.filter((name) => name !== key);
	}),
});

const telemetryMock = { trackDirectConnectRequested: vi.fn(), trackModalOpened: vi.fn() };
const toastMock = { showMessage: vi.fn() };
const attemptMock = vi.fn<(connectUrl: string) => Promise<void>>();
const directConnectStatus = ref<'idle' | 'unsupported' | 'waiting' | 'connecting' | 'failed'>(
	'idle',
);
const isAttempting = ref(false);

/** Mirrors the real composable: the flag flips synchronously when a flow starts. */
async function attemptDouble(connectUrl: string): Promise<void> {
	isAttempting.value = true;
	directConnectStatus.value = 'idle';
	try {
		await attemptMock(connectUrl);
	} finally {
		isAttempting.value = false;
	}
}

vi.mock('../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStore,
}));
// Keep the real `listenForModalChanges` — the double only stands in for the store.
vi.mock('@/app/stores/ui.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/ui.store')>()),
	useUIStore: () => uiStore,
}));
vi.mock('../../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => telemetryMock,
}));
vi.mock('../useExtensionDirectConnect', () => ({
	beginConnectFlow: () => () => {},
	useExtensionDirectConnect: () => ({
		status: directConnectStatus,
		isAttempting,
		attempt: attemptDouble,
	}),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toastMock }));
vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	settingsStore.browserConnected = false;
	settingsStore.fetchBrowserConnectUrl.mockResolvedValue(CONNECT_URL);
	attemptMock.mockResolvedValue(undefined);
	directConnectStatus.value = 'idle';
	isAttempting.value = false;
	uiStore.activeModals = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe('useBrowserUseConnection', () => {
	it('resolves immediately when the browser is already connected', async () => {
		settingsStore.browserConnected = true;

		await expect(useBrowserUseConnection().ensureConnected('input_menu')).resolves.toBe(true);

		expect(uiStore.openModal).not.toHaveBeenCalled();
		expect(attemptMock).not.toHaveBeenCalled();
		// Nothing changed, so there is nothing to announce.
		expect(toastMock.showMessage).not.toHaveBeenCalled();
	});

	it('skips the modal when the extension reports it needs no confirmation', async () => {
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'connecting';
			settingsStore.browserConnected = true;
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		await expect(result).resolves.toBe(true);
		// The flash this whole path exists to avoid.
		expect(uiStore.openModal).not.toHaveBeenCalled();
		expect(telemetryMock.trackDirectConnectRequested).toHaveBeenCalledTimes(1);
		// Without the modal there is nothing else on screen to confirm the connection.
		expect(toastMock.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success' }),
		);
	});

	it('falls back to the setup modal when the extension asks for confirmation', async () => {
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'waiting';
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		expect(uiStore.openModal).toHaveBeenCalledWith(MODAL_KEY);

		settingsStore.browserConnected = true;
		await vi.advanceTimersByTimeAsync(0);

		await expect(result).resolves.toBe(true);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_KEY);
		expect(toastMock.showMessage).toHaveBeenCalledTimes(1);
	});

	it('resolves when the browser attaches before the modal listeners are set up', async () => {
		// The extension asked for confirmation and the user approved it fast, so the state is
		// already true by the time the modal opens — a plain watch would never fire.
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'waiting';
			settingsStore.browserConnected = true;
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		await expect(result).resolves.toBe(true);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_KEY);
	});

	it('reports failure when the user dismisses the modal', async () => {
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'waiting';
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		uiStore.closeModal(MODAL_KEY);
		await vi.advanceTimersByTimeAsync(0);

		await expect(result).resolves.toBe(false);
		expect(toastMock.showMessage).not.toHaveBeenCalled();
	});

	it('does not mint a second link while a connect is already running', async () => {
		isAttempting.value = true;
		directConnectStatus.value = 'waiting';

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		// Minting rotates the relay token and would strand the running connect.
		expect(settingsStore.fetchBrowserConnectUrl).not.toHaveBeenCalled();
		expect(attemptMock).not.toHaveBeenCalled();
		expect(uiStore.openModal).toHaveBeenCalledWith(MODAL_KEY);

		uiStore.closeModal(MODAL_KEY);
		await vi.advanceTimersByTimeAsync(0);
		await expect(result).resolves.toBe(false);
	});

	it('starts a clean flow when an earlier one already failed', async () => {
		// A stale terminal status must not short-circuit the grace window into a modal flash.
		directConnectStatus.value = 'failed';
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'connecting';
			settingsStore.browserConnected = true;
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		await expect(result).resolves.toBe(true);
		expect(uiStore.openModal).not.toHaveBeenCalled();
	});

	it('opens the modal at once when the extension cannot help', async () => {
		attemptMock.mockImplementation(async () => {
			directConnectStatus.value = 'unsupported';
		});

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		// No point sitting out the grace window for a connect that already gave up.
		expect(uiStore.openModal).toHaveBeenCalledWith(MODAL_KEY);

		uiStore.closeModal(MODAL_KEY);
		await vi.advanceTimersByTimeAsync(0);
		await expect(result).resolves.toBe(false);
	});

	it('still opens the modal when no connect URL is available', async () => {
		settingsStore.fetchBrowserConnectUrl.mockResolvedValue(null);

		const result = useBrowserUseConnection().ensureConnected('input_menu');
		await vi.advanceTimersByTimeAsync(0);

		expect(attemptMock).not.toHaveBeenCalled();
		expect(uiStore.openModal).toHaveBeenCalledWith(MODAL_KEY);

		uiStore.closeModal(MODAL_KEY);
		await vi.advanceTimersByTimeAsync(0);
		await expect(result).resolves.toBe(false);
	});
});
