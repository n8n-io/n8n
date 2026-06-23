import { computed, type ComputedRef } from 'vue';

import { useI18n } from '@n8n/i18n';

import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { CloudUpdateLinkSourceType, UTMCampaign } from '@/Interface';

/**
 * Features that have a gated/upgrade surface. Extend this union (and `UPGRADE_FEATURES`
 * below) as the remaining gated surfaces are migrated onto the standardized upgrade flow.
 */
export type UpgradeFeature = 'external-secrets';

interface UpgradeFeatureConfig {
	/** Telemetry source forwarded to `goToUpgrade`. */
	source: CloudUpdateLinkSourceType;
	/** UTM campaign forwarded to `goToUpgrade`. */
	campaign: UTMCampaign;
	/** Plan that unlocks the feature, by deployment type. */
	plan: {
		cloud: string;
		selfHosted: string;
	};
}

const UPGRADE_FEATURES: Record<UpgradeFeature, UpgradeFeatureConfig> = {
	'external-secrets': {
		source: 'external-secrets',
		campaign: 'upgrade-external-secrets',
		plan: {
			cloud: 'Enterprise',
			selfHosted: 'Enterprise',
		},
	},
};

export interface UseUpgradePromptReturn {
	/** Canonical, shared CTA label so every gated surface reads identically. */
	ctaLabel: ComputedRef<string>;
	/** Plan that unlocks the feature, aware of cloud vs self-hosted deployments. */
	planName: ComputedRef<string>;
	/** Routes the user to the upgrade flow, preserving telemetry and campaign metadata. */
	goToUpgrade: () => void;
}

/**
 * Standardizes gated/upgrade CTAs by wrapping {@link usePageRedirectionHelper}'s `goToUpgrade`
 * with a canonical CTA label and a plan name that adapts to the deployment type.
 */
export function useUpgradePrompt(feature: UpgradeFeature): UseUpgradePromptReturn {
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const pageRedirectionHelper = usePageRedirectionHelper();

	const config = UPGRADE_FEATURES[feature];

	const ctaLabel = computed(() => i18n.baseText('upgrade.viewPlans'));

	const planName = computed(() =>
		settingsStore.isCloudDeployment ? config.plan.cloud : config.plan.selfHosted,
	);

	const goToUpgrade = () => {
		void pageRedirectionHelper.goToUpgrade(config.source, config.campaign);
	};

	return { ctaLabel, planName, goToUpgrade };
}
