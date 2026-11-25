import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Tf as watch, fd as until, jf as effectScope } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, Jg as useUIStore, dC as useToast, jN as useI18n, qg as listenForModalChanges, xc as INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY } from "./app-D5flEmb-.js";
import { i as useInstanceAiBrowserUseTelemetry, r as useExtensionDirectConnect, t as beginConnectFlow } from "./useExtensionDirectConnect-DyzoSYRV.js";
//#region src/features/ai/instanceAi/composables/useBrowserUseConnection.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/** Safety net only — the extension answers in milliseconds, or not at all. */
var EXTENSION_REPLY_TIMEOUT_MS = 5e3;
var inFlight = null;
/**
* The one way to get Browser Use connected. Whether the setup modal is needed, and whether
* the extension can connect on its own, is decided here — no call site has to.
*/
function useBrowserUseConnection() {
	const i18n = useI18n();
	const toast = useToast();
	const uiStore = useUIStore();
	const settingsStore = useInstanceAiSettingsStore();
	const telemetry = useInstanceAiBrowserUseTelemetry();
	const { status, isAttempting, attempt } = useExtensionDirectConnect();
	/** Resolves true once the browser is attached, false if the user backed out. */
	async function ensureConnected(source) {
		if (inFlight === null) {
			const endFlow = beginConnectFlow();
			inFlight = run(source).finally(() => {
				inFlight = null;
				endFlow();
			});
		}
		return await inFlight;
	}
	async function run(source) {
		if (settingsStore.browserConnected) return true;
		if (!isAttempting.value) {
			const connectUrl = await settingsStore.fetchBrowserConnectUrl();
			if (connectUrl) {
				telemetry.trackDirectConnectRequested();
				attempt(connectUrl);
			}
		}
		if (isAttempting.value) {
			await until(() => status.value !== "idle").toBe(true, {
				timeout: EXTENSION_REPLY_TIMEOUT_MS,
				throwOnTimeout: false
			});
			if (status.value === "connecting" && await waitForSilentConnect()) return announceConnected();
		}
		telemetry.trackModalOpened(source);
		uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		if (!await waitForConnectedOrDismissed()) return false;
		uiStore.closeModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		return announceConnected();
	}
	/** Not the modal's job: a remembered instance never opens it, so its toast would go unseen. */
	function announceConnected() {
		toast.showMessage({
			type: "success",
			title: i18n.baseText("instanceAi.browserUse.connected"),
			message: i18n.baseText("instanceAi.browserUse.connected.toastMessage")
		});
		return true;
	}
	/**
	* Bounded by the attempt landing on `failed`. Not bounded when the extension reports
	* success but the backend push never arrives — see the follow-up on adding a timeout.
	*/
	async function waitForSilentConnect() {
		await until(() => settingsStore.browserConnected || status.value === "failed").toBe(true, { throwOnTimeout: false });
		return settingsStore.browserConnected;
	}
	async function waitForConnectedOrDismissed() {
		if (settingsStore.browserConnected) return true;
		const listeners = effectScope(true);
		return await new Promise((resolve) => {
			listeners.run(() => {
				const settle = (connected) => {
					listeners.stop();
					resolve(connected);
				};
				watch(() => settingsStore.browserConnected, (connected) => connected && settle(true));
				listenForModalChanges({
					store: uiStore,
					onModalClosed: (name) => {
						if (name === "instanceAiBrowserUseSetup") settle(settingsStore.browserConnected);
					}
				});
			});
		});
	}
	return { ensureConnected };
}
//#endregion
export { useBrowserUseConnection as t };
