import type { SendConsoleMessage } from '@n8n/api-types/push/debug';

export async function sendConsoleMessage({ data }: SendConsoleMessage) {
	console.log(data.source, ...data.messages);
}
