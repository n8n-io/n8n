import { effectScope, watch } from 'vue';
import { until } from '@vueuse/core';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import { INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY } from '../constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import type { BrowserUseModalSource } from '../instanceAiBrowserUse.telemetry';
import { useInstanceAiBrowserUseTelemetry } from '../instanceAiBrowserUse.telemetry';
import { beginConnectFlow, useExtensionDirectConnect } from './useExtensionDirectConnect';

/** Safety net only — the extension answers in milliseconds, or not at all. */
const EXTENSION_REPLY_TIMEOUT_MS = 5_000;

// Module-scoped: a second caller must join the running flow rather than start its own,
// because minting a link rotates the relay token and would strand the first one.
let inFlight: Promise<boolean> | null = null;

/**
 * The one way to get Browser Use connected. Whether the setup modal is needed, and whether
 * the extension can connect on its own, is decided here — no call site has to.
 */
export function useBrowserUseConnection() {
	const i18n = useI18n();
	const toast = useToast();
	const uiStore = useUIStore();
	const settingsStore = useInstanceAiSettingsStore();
	const telemetry = useInstanceAiBrowserUseTelemetry();
	const { status, isAttempting, attempt } = useExtensionDirectConnect();

	/** Resolves true once the browser is attached, false if the user backed out. */
	async function ensureConnected(source: BrowserUseModalSource): Promise<boolean> {
		if (inFlight === null) {
			const endFlow = beginConnectFlow();
			inFlight = run(source).finally(() => {
				inFlight = null;
				endFlow();
			});
		}
		return await inFlight;
	}

	async function run(source: BrowserUseModalSource): Promise<boolean> {
		if (settingsStore.browserConnected) return true;

		if (!isAttempting.value) {
			const connectUrl = await settingsStore.fetchBrowserConnectUrl();
			if (connectUrl) {
				telemetry.trackDirectConnectRequested();
				void attempt(connectUrl);
			}
		}

		if (isAttempting.value) {
			// The extension says which kind of connect this is, so the modal decision is its
			// answer rather than a guess at how long a relay round trip should take.
			await until(() => status.value !== 'idle').toBe(true, {
				timeout: EXTENSION_REPLY_TIMEOUT_MS,
				throwOnTimeout: false,
			});
			// An already-allowed host attaches with no prompt — a modal would only flash.
			if (status.value === 'connecting' && (await waitForSilentConnect())) {
				return announceConnected();
			}
		}

		// The attempt stays in flight; the modal shares its state rather than starting its own.
		telemetry.trackModalOpened(source);
		uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		if (!(await waitForConnectedOrDismissed())) return false;
		uiStore.closeModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		return announceConnected();
	}

	/** Not the modal's job: a remembered instance never opens it, so its toast would go unseen. */
	function announceConnected(): true {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.browserUse.connected'),
			message: i18n.baseText('instanceAi.browserUse.connected.toastMessage'),
		});
		return true;
	}

	/**
	 * Bounded by the attempt landing on `failed`. Not bounded when the extension reports
	 * success but the backend push never arrives — see the follow-up on adding a timeout.
	 */
	async function waitForSilentConnect(): Promise<boolean> {
		await until(() => settingsStore.browserConnected || status.value === 'failed').toBe(true, {
			throwOnTimeout: false,
		});
		return settingsStore.browserConnected;
	}

	async function waitForConnectedOrDismissed(): Promise<boolean> {
		// Level-triggered: the browser may have attached during the setup work above, and a
		// plain `watch` would never fire for a value that is already true.
		if (settingsStore.browserConnected) return true;

		// The flow outlives the surface that started it, so these can't rely on it staying mounted.
		const listeners = effectScope(true);
		return await new Promise<boolean>((resolve) => {
			listeners.run(() => {
				const settle = (connected: boolean) => {
					listeners.stop();
					resolve(connected);
				};
				watch(
					() => settingsStore.browserConnected,
					(connected) => connected && settle(true),
				);
				listenForModalChanges({
					store: uiStore,
					onModalClosed: (name) => {
						if (name === INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY) {
							settle(settingsStore.browserConnected);
						}
					},
				});
			});
		});
	}

	return { ensureConnected };
}
