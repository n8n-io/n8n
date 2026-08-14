import { onBeforeUnmount, ref, type Ref } from 'vue';

export const DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS = 60_000;

export type DirectConnectStatus = 'idle' | 'unsupported' | 'waiting' | 'failed';

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

/**
 * Direct Browser Use connect flow: asks the installed extension (via
 * `externally_connectable` messaging) to show its connect confirmation in an
 * extension-owned popup, so the user only confirms once. Falls back to
 * `unsupported` when the extension is missing, outdated, or the page can't
 * message it — callers keep the link-based flow for that case.
 */
export function useExtensionDirectConnect() {
	const status: Ref<DirectConnectStatus> = ref('idle');
	let confirmationTimer: ReturnType<typeof setTimeout> | undefined;

	function clearConfirmationTimer(): void {
		if (confirmationTimer) {
			clearTimeout(confirmationTimer);
			confirmationTimer = undefined;
		}
	}

	/**
	 * Request a connection for the given extension connect URL
	 * (`chrome-extension://<id>/connect.html?mcpRelayUrl=…`). Returns true when
	 * the extension accepted the request and we are waiting for the user to
	 * confirm in the extension popup.
	 */
	async function attempt(connectUrl: string): Promise<boolean> {
		clearConfirmationTimer();

		const runtime = getExtensionRuntime();
		if (!runtime) {
			status.value = 'unsupported';
			return false;
		}

		let extensionId: string;
		let relayUrl: string | null;
		try {
			const parsed = new URL(connectUrl);
			extensionId = parsed.hostname;
			relayUrl = parsed.searchParams.get('mcpRelayUrl');
		} catch {
			status.value = 'unsupported';
			return false;
		}
		if (!extensionId || !relayUrl) {
			status.value = 'unsupported';
			return false;
		}

		// Ping failing means no listener (extension missing or outdated); a
		// failure after a successful ping is a genuine connect error.
		let pinged = false;
		try {
			const pong = await sendToExtension(runtime, extensionId, { type: 'ping' });
			if (!isRecord(pong) || pong.pong !== true) {
				status.value = 'unsupported';
				return false;
			}
			pinged = true;

			const response = await sendToExtension(runtime, extensionId, {
				type: 'connect',
				relayUrl,
			});
			if (!isRecord(response) || response.accepted !== true) {
				status.value = 'failed';
				return false;
			}
		} catch {
			status.value = pinged ? 'failed' : 'unsupported';
			return false;
		}

		status.value = 'waiting';
		confirmationTimer = setTimeout(() => {
			status.value = 'failed';
		}, DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS);
		return true;
	}

	onBeforeUnmount(clearConfirmationTimer);

	return { status, attempt };
}
