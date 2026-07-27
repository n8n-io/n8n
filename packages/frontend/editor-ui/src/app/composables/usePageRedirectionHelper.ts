import { confirmIfBuilderStreaming } from '@/features/ai/assistant/composables/useBuilderStreamingGuard';
import { usePageRedirectionHelper as useBasePageRedirectionHelper } from './usePageRedirectionHelper.core';

export type { UpgradeRedirectGuard } from './usePageRedirectionHelper.core';

/**
 * App-facing `usePageRedirectionHelper`, pre-bound with the AI builder streaming
 * guard so every upgrade CTA confirms before discarding an in-flight build.
 *
 * The guard lives in the feature layer; binding it here keeps the underlying
 * composable free of that dependency (it moves to `@n8n/composables` in N8N-71).
 */
export function usePageRedirectionHelper() {
	return useBasePageRedirectionHelper({ guard: confirmIfBuilderStreaming });
}
