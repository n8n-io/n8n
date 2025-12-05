import type { SendConsoleMessage } from '@n8n/api-types/push/debug';
import { useLogsStore } from '@/app/stores/logs.store';

/**
 * Handles the 'sendConsoleMessage' event from the push connection, which indicates
 * that a console message should be sent.
 */
export async function sendConsoleMessage({ data }: SendConsoleMessage) {
	const logsStore = useLogsStore();
	logsStore.addConsoleMessage(data.source, data.messages, data.level ?? 'info');

	console.log(data.source, ...data.messages);
}
