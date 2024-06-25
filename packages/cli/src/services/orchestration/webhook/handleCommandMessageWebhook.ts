import { handleCommandMessageMain } from '../main/handleCommandMessageMain';

export async function handleCommandMessageWebhook(messageString: string) {
	// currently webhooks handle commands the same way as the main instance
	return await handleCommandMessageMain(messageString);
}
