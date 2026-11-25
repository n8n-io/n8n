import { Bf as readonly, Nf as init_reactivity_esm_bundler, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Mi as isBrowserUseSupportedForBrowser, hC as useTelemetry, wy as TELEMETRY_EVENT } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/instanceAiBrowserUse.telemetry.ts
function useInstanceAiBrowserUseTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackModalOpened(source) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_MODAL_OPENED, {
				browser_supported: isBrowserUseSupportedForBrowser(),
				source
			});
		},
		trackInstallExtensionClicked() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_INSTALL_EXTENSION_CLICKED, {});
		},
		trackOpenExtensionClicked() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_OPEN_EXTENSION_CLICKED, {});
		},
		trackDirectConnectRequested() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_DIRECT_CONNECT_REQUESTED, {});
		}
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useExtensionDirectConnect.ts
init_reactivity_esm_bundler();
var DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS = 15e3;
function getExtensionRuntime() {
	const runtime = globalThis.chrome?.runtime;
	return typeof runtime?.sendMessage === "function" ? runtime : null;
}
function isRecord(value) {
	return value !== null && typeof value === "object";
}
async function sendToExtension(runtime, extensionId, message) {
	return await new Promise((resolve, reject) => {
		try {
			runtime.sendMessage(extensionId, message, (response) => {
				const error = runtime.lastError;
				if (error) reject(new Error(error.message ?? "Extension messaging failed"));
				else resolve(response);
			});
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}
async function timeout(ms) {
	return await new Promise((resolve) => setTimeout(() => resolve(void 0), ms));
}
var status = ref("idle");
var isAttempting = ref(false);
var isFlowActive = ref(false);
/** Marks an orchestrated flow as running; call the returned function when it settles. */
function beginConnectFlow() {
	isFlowActive.value = true;
	return () => {
		isFlowActive.value = false;
	};
}
/**
* Clears the shared flow state. A finished flow leaves a terminal status behind, which the
* next view to mount would otherwise inherit as a spinner for a connect that already ended.
*/
function resetExtensionDirectConnect() {
	status.value = "idle";
	isAttempting.value = false;
	isFlowActive.value = false;
}
/**
* Direct Browser Use connect flow: asks the installed extension (via
* `externally_connectable` messaging) to show its connect confirmation in an
* extension-owned popup, so the user only confirms once. `unsupported` means
* the extension did not open the popup — callers show the link-based flow.
*/
function useExtensionDirectConnect() {
	async function attempt(connectUrl) {
		if (isAttempting.value) return;
		isAttempting.value = true;
		status.value = "idle";
		try {
			await runAttempt(connectUrl);
		} finally {
			isAttempting.value = false;
		}
	}
	async function runAttempt(connectUrl) {
		const runtime = getExtensionRuntime();
		let extensionId = "";
		let relayUrl = null;
		try {
			const parsed = new URL(connectUrl);
			extensionId = parsed.hostname;
			relayUrl = parsed.searchParams.get("mcpRelayUrl");
		} catch {}
		if (!runtime || !extensionId || !relayUrl) {
			status.value = "unsupported";
			return;
		}
		let needsConfirmation = true;
		try {
			const response = await sendToExtension(runtime, extensionId, {
				type: "connect",
				relayUrl
			});
			if (!isRecord(response) || response.accepted !== true) {
				status.value = "unsupported";
				return;
			}
			needsConfirmation = response.confirmationRequired !== false;
		} catch {
			status.value = "unsupported";
			return;
		}
		status.value = needsConfirmation ? "waiting" : "connecting";
		let connected = false;
		try {
			const result = await Promise.race([sendToExtension(runtime, extensionId, {
				type: "connectResult",
				relayUrl
			}), timeout(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS)]);
			connected = isRecord(result) && result.connected === true;
		} catch {}
		status.value = connected ? "connected" : "failed";
	}
	return {
		status,
		isAttempting: readonly(isAttempting),
		isFlowActive: readonly(isFlowActive),
		attempt
	};
}
//#endregion
export { useInstanceAiBrowserUseTelemetry as i, resetExtensionDirectConnect as n, useExtensionDirectConnect as r, beginConnectFlow as t };
