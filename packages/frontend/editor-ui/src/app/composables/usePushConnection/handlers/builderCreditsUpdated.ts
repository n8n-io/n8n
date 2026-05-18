import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';

export function useBuilderCreditsUpdated() {
	const builderStore = useBuilderStore();

	async function builderCreditsUpdated(event: BuilderCreditsPushMessage): Promise<void> {
		// Update the builder store with new credits values
		builderStore.updateBuilderCredits(event.data.creditsQuota, event.data.creditsClaimed);
	}

	return { builderCreditsUpdated };
}
