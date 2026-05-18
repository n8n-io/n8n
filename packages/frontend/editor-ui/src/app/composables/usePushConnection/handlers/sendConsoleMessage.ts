import type { SendConsoleMessage } from '@n8n/api-types/push/debug';

/**
 * Handles the 'sendConsoleMessage' event from the push connection, which indicates
 * that a console message should be sent.
 */
export function useSendConsoleMessage() {
	async function sendConsoleMessage({ data }: SendConsoleMessage) {
		console.log(data.source, ...data.messages);
	}

	return { sendConsoleMessage };
}
