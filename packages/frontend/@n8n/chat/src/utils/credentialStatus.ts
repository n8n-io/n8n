import type { CredentialStatus } from '@n8n/chat/types';

/** Message `type` the hosted chat shell uses to signal credential readiness. */
export const CREDENTIAL_STATUS_MESSAGE_TYPE = 'n8n-chat:credential-status';

interface CredentialStatusMessageData {
	type: typeof CREDENTIAL_STATUS_MESSAGE_TYPE;
	ready: boolean;
	missingCount?: number;
	testMode?: boolean;
}

function isCredentialStatusMessageData(data: unknown): data is CredentialStatusMessageData {
	if (typeof data !== 'object' || data === null) return false;

	const candidate = data as Record<string, unknown>;
	return (
		candidate.type === CREDENTIAL_STATUS_MESSAGE_TYPE &&
		typeof candidate.ready === 'boolean' &&
		(candidate.missingCount === undefined ||
			(typeof candidate.missingCount === 'number' &&
				Number.isFinite(candidate.missingCount) &&
				Number.isInteger(candidate.missingCount) &&
				candidate.missingCount >= 0)) &&
		(candidate.testMode === undefined || typeof candidate.testMode === 'boolean')
	);
}

/**
 * Listens for the hosted chat page's credential-readiness signal and forwards
 * parsed updates to `onStatus`. Returns a function that stops listening.
 *
 * The widget may run inside a sandboxed, opaque-origin iframe (the hosted
 * chat shell), so `event.origin` can't be checked against an allowlist -
 * instead only messages sent by our own parent frame are accepted. This also
 * makes the listener a no-op when `@n8n/chat` is embedded directly on a
 * third-party page: with no surrounding frame, `window.parent === window`,
 * so no message from the page itself is ever mistaken for the host's signal.
 */
export function listenForCredentialStatus(
	onStatus: (status: CredentialStatus) => void,
): () => void {
	function handleMessage(event: MessageEvent) {
		if (window.parent === window || event.source !== window.parent) return;
		if (!isCredentialStatusMessageData(event.data)) return;

		onStatus({
			ready: event.data.ready,
			missingCount: event.data.missingCount ?? 0,
			testMode: event.data.testMode ?? false,
		});
	}

	window.addEventListener('message', handleMessage);

	return () => {
		window.removeEventListener('message', handleMessage);
	};
}
