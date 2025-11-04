import { useUsersStore } from '@/features/settings/users/users.store';
import { useTelemetry } from './useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { CloudUpdateLinkSourceType, UTMCampaign } from '@/Interface';
import { N8N_PRICING_PAGE_URL } from '@/app/constants';

export function usePageRedirectionHelper() {
	const usersStore = useUsersStore();
	const telemetry = useTelemetry();
	const settingsStore = useSettingsStore();

	const goToDashboard = async () => {
		// Dashboard functionality removed
		return;
	};

	/**
	 * If the user is an instance owner in the cloud, it generates an auto-login link to the
	 * cloud dashboard that redirects the user to the /account/change-plan page where they upgrade/downgrade the current plan.
	 * Otherwise, it redirect them our website.
	 */

	const goToUpgrade = async (
		source: CloudUpdateLinkSourceType,
		utm_campaign: UTMCampaign,
		mode: 'open' | 'redirect' = 'open',
	) => {
		const deploymentType = settingsStore.deploymentType;

		telemetry.track('User clicked upgrade CTA', {
			source,
			deploymentType,
		});

		const upgradeLink = await generateUpgradeLink(source, utm_campaign);

		if (mode === 'open') {
			window.open(upgradeLink, '_blank');
		} else {
			location.href = upgradeLink;
		}
	};

	const generateUpgradeLink = async (source: string, utm_campaign: string) => {
		const upgradeLink = N8N_PRICING_PAGE_URL;

		const url = new URL(upgradeLink);

		if (utm_campaign) {
			url.searchParams.set('utm_campaign', utm_campaign);
		}

		if (source) {
			url.searchParams.set('source', source);
		}

		return url.toString();
	};

	return {
		goToDashboard,
		goToUpgrade,
	};
}
