import { ref, type Ref } from 'vue';

export const DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS = 15_000;

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

async function timeout(ms: number): Promise<undefined> {
	return await new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

/**
 * Direct Browser Use connect flow: asks the installed extension (via
 * `externally_connectable` messaging) to show its connect confirmation in an
 * extension-owned popup, so the user only confirms once. `unsupported` means
 * the extension did not open the popup — callers show the link-based flow.
 */
export function useExtensionDirectConnect() {
	const status: Ref<DirectConnectStatus> = ref('idle');
	let isAttempting = false;

	async function attempt(connectUrl: string): Promise<void> {
		if (isAttempting) return;
		isAttempting = true;
		try {
			await runAttempt(connectUrl);
		} finally {
			isAttempting = false;
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

		try {
			const response = await sendToExtension(runtime, extensionId, { type: 'connect', relayUrl });
			if (!isRecord(response) || response.accepted !== true) {
				status.value = 'unsupported';
				return;
			}
		} catch {
			status.value = 'unsupported';
			return;
		}

		status.value = 'waiting';

		let connected = false;
		try {
			const result = await Promise.race([
				sendToExtension(runtime, extensionId, { type: 'connectResult', relayUrl }),
				timeout(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS),
			]);
			connected = isRecord(result) && result.connected === true;
		} catch {}
		if (!connected) {
			status.value = 'failed';
		}
	}

	return { status, attempt };
}
