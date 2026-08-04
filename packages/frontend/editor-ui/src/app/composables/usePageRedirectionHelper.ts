import { useBasePageRedirectionHelper } from '@n8n/stores/composables/useBasePageRedirectionHelper';

import { confirmIfBuilderStreaming } from '@/features/ai/assistant/composables/useBuilderStreamingGuard';

export type { UpgradeRedirectGuard } from '@n8n/stores/composables/useBasePageRedirectionHelper';

/**
 * App-facing `usePageRedirectionHelper`, pre-bound with the AI builder streaming
 * guard so every upgrade CTA confirms before discarding an in-flight build.
 *
 * This wrapper is permanent, not a migration shim: the guard lives in the feature
 * layer, and `@n8n/stores` — where the base composable now lives — must not reach
 * into `features/ai/assistant`. Binding it here is what keeps that boundary clean.
 */
export function usePageRedirectionHelper() {
	return useBasePageRedirectionHelper({ guard: confirmIfBuilderStreaming });
}
