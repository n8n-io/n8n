import { setDefaultUpgradeRedirectGuard } from '@n8n/stores/registries/upgradeRedirectGuard';

/**
 * The upgrade-CTA guard, for callers that cannot import it themselves — a module
 * package must not reach into `features/`. Without this registration the registry
 * fails open and an upgrade CTA raised from a module skips the confirmation.
 *
 * The guard body loads on the click, not here: it reads the AI builder store, and
 * importing that eagerly would put the builder in the boot chunk.
 */
export const registerUpgradeRedirectGuard = () => {
	setDefaultUpgradeRedirectGuard(async () => {
		const { confirmIfBuilderStreaming } = await import(
			'@/features/ai/assistant/composables/useBuilderStreamingGuard'
		);
		return await confirmIfBuilderStreaming();
	});
};
