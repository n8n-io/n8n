import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';

import { useBuildManuallyByDefaultStore } from './stores/buildManuallyByDefault.store';

const FLAG_WAIT_TIMEOUT_MS = 2000;

/**
 * True once for each user in a canvas arm. The first landing then opens a new
 * workflow instead of the Assistant. Both landings call it: `/` and the n8n Cloud
 * onboarding link.
 */
export async function landOnCanvasOnce(): Promise<boolean> {
	await waitForFeatureFlagsWithTimeout(usePostHog(), FLAG_WAIT_TIMEOUT_MS);
	const store = useBuildManuallyByDefaultStore();
	if (!store.shouldLandOnCanvas) return false;
	store.markLandedOnCanvas();
	return true;
}
