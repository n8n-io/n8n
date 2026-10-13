import { readonly, ref, type Ref } from 'vue';

export const DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS = 15_000;

/**
 * `waiting` needs the user to act on a popup; `connecting` is attaching with no prompt.
 * `connected` and `failed` are terminal — the flow is over and nothing more will change it.
 */
export type DirectConnectStatus =
	| 'idle'
	| 'unsupported'
	| 'waiting'
	| 'connecting'
	| 'connected'
	| 'failed';

interface ExtensionRuntime {
	sendMessage: (
		extensionId: string,
		message: unknown,
		callback: (response: unknown) => void,
	) => void;
	lastError?: { message?: string };
}

function getExtensionRuntime(): ExtensionRuntime | null {
	const runtime = (globalThis as { chrome?: { runtime?: ExtensionRuntime } }).chrome?.runtime;
	return typeof runtime?.sendMessage === 'function' ? runtime : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

async function sendToExtension(
	runtime: ExtensionRuntime,
	extensionId: string,
	message: unknown,
): Promise<unknown> {
	return await new Promise((resolve, reject) => {
		try {
			runtime.sendMessage(extensionId, message, (response) => {
				const error = runtime.lastError;
				if (error) reject(new Error(error.message ?? 'Extension messaging failed'));
				else resolve(response);
			});
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}

async function timeout(ms: number): Promise<undefined> {
	return await new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

// Module-scoped because a flow outlives the component that starts it: the credential card
// kicks off an attempt and the setup modal mounts mid-flight. Sharing lets that modal show
// the live status instead of firing a second request the extension would throttle.
const status: Ref<DirectConnectStatus> = ref('idle');
const isAttempting = ref(false);
// `isAttempting` only spans the extension round trip. An orchestrated flow outlives it —
// it runs until the browser attaches — so anything asking "is a connect already under way?"
// must read this instead, or it will start a second one in the gap.
const isFlowActive = ref(false);

/** Marks an orchestrated flow as running; call the returned function when it settles. */
export function beginConnectFlow(): () => void {
	isFlowActive.value = true;
	return () => {
		isFlowActive.value = false;
	};
}

/**
 * Clears the shared flow state. A finished flow leaves a terminal status behind, which the
 * next view to mount would otherwise inherit as a spinner for a connect that already ended.
 */
export function resetExtensionDirectConnect(): void {
	status.value = 'idle';
	isAttempting.value = false;
	isFlowActive.value = false;
}

/**
 * Direct Browser Use connect flow: asks the installed extension (via
 * `externally_connectable` messaging) to show its connect confirmation in an
 * extension-owned popup, so the user only confirms once. `unsupported` means
 * the extension did not open the popup — callers show the link-based flow.
 */
export function useExtensionDirectConnect() {
	async function attempt(connectUrl: string): Promise<void> {
		if (isAttempting.value) return;
		isAttempting.value = true;
		// Before any await, so a caller watching this doesn't read the last flow's outcome.
		status.value = 'idle';
		try {
			await runAttempt(connectUrl);
		} finally {
			isAttempting.value = false;
		}
	}

	async function runAttempt(connectUrl: string): Promise<void> {
		const runtime = getExtensionRuntime();
		let extensionId = '';
		let relayUrl: string | null = null;
		try {
			const parsed = new URL(connectUrl);
			extensionId = parsed.hostname;
			relayUrl = parsed.searchParams.get('mcpRelayUrl');
		} catch {}
		if (!runtime || !extensionId || !relayUrl) {
			status.value = 'unsupported';
			return;
		}

		let needsConfirmation = true;
		try {
			const response = await sendToExtension(runtime, extensionId, { type: 'connect', relayUrl });
			if (!isRecord(response) || response.accepted !== true) {
				status.value = 'unsupported';
				return;
			}
			// Older extensions omit the flag; assume the popup was shown.
			needsConfirmation = response.confirmationRequired !== false;
		} catch {
			status.value = 'unsupported';
			return;
		}

		status.value = needsConfirmation ? 'waiting' : 'connecting';

		let connected = false;
		try {
			const result = await Promise.race([
				sendToExtension(runtime, extensionId, { type: 'connectResult', relayUrl }),
				timeout(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS),
			]);
			connected = isRecord(result) && result.connected === true;
		} catch {}
		// Land on a terminal state either way. Leaving a finished flow on an in-progress
		// status makes every later reader believe a connect is still running.
		status.value = connected ? 'connected' : 'failed';
	}

	return {
		status,
		isAttempting: readonly(isAttempting),
		isFlowActive: readonly(isFlowActive),
		attempt,
	};
}
