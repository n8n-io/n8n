import { useRootStore } from '@n8n/stores/useRootStore';

import { extractWebhookId } from '@/app/utils/webhookUrl';

/**
 * Returns a function that extracts the webhook path from a filter input,
 * using the current instance's configured endpoint URLs as prefixes.
 *
 * Components use this composable; the pure `extractWebhookId(value, prefixes)`
 * remains exported from `webhookUrl.ts` for unit tests and non-Vue callers.
 */
export function useExtractWebhookId() {
	const rootStore = useRootStore();

	return (value: string): string =>
		extractWebhookId(value, [
			rootStore.webhookUrl,
			rootStore.webhookTestUrl,
			rootStore.webhookWaitingUrl,
			rootStore.formUrl,
			rootStore.formTestUrl,
			rootStore.formWaitingUrl,
			rootStore.mcpUrl,
			rootStore.mcpTestUrl,
		]);
}
