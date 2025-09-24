import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import { useBuilderStore } from '@/stores/builder.store';

export async function builderCreditsUpdated(event: BuilderCreditsPushMessage): Promise<void> {
	const builderStore = useBuilderStore();

	// Update the builder store with new credits values
	builderStore.creditsQuota = event.data.creditsQuota;
	builderStore.creditsClaimed = event.data.creditsClaimed;

	// Regenerate the plans page URL with updated credits
	await builderStore.generatePlansPageUrl();
}
