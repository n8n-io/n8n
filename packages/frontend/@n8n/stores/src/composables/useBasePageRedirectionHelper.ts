import { useTelemetry } from '@n8n/composables/useTelemetry';
import { N8N_PRICING_PAGE_URL } from '@n8n/frontend-constants/urls';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import type { CloudUpdateLinkSourceType, UTMCampaign } from '../types/pageRedirection';
import { useUsersStore } from '../users.store';
import { useVersionsStore } from '../versions.store';

/**
 * Guard consulted before an upgrade redirect. Resolves `true` to proceed, `false`
 * to abort. Required and injected by the caller, so this composable carries no
 * feature dependency of its own (e.g. the AI builder streaming confirmation).
 */
export type UpgradeRedirectGuard = () => Promise<boolean>;

/**
 * Injectable page-redirection composable. The app-facing `usePageRedirectionHelper`
 * wraps this and supplies the guard, which keeps this base free of any feature
 * dependency.
 *
 * It lives in `@n8n/stores` rather than `@n8n/composables` because its body is
 * store orchestration end to end — all four stores it reads are in this package,
 * and `@n8n/composables` sits *below* the stores tier (see that package's
 * `packageBoundary.test.ts`), so it cannot reach them.
 */
export function useBasePageRedirectionHelper({ guard }: { guard: UpgradeRedirectGuard }) {
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const versionsStore = useVersionsStore();
	const telemetry = useTelemetry();
	const settingsStore = useSettingsStore();

	const canAutoLoginToCloudDashboard = () =>
		usersStore.isInstanceOwner && settingsStore.isCloudDeployment;

	/**
	 * `open` reserves the tab in the click so later navigation is not treated as a popup.
	 */
	const goToCloudDashboard = async ({
		redirectionPath,
		mode = 'redirect',
	}: {
		redirectionPath: string;
		mode?: 'open' | 'redirect';
	}): Promise<boolean> => {
		if (!canAutoLoginToCloudDashboard()) {
			return false;
		}

		if (mode === 'redirect') {
			location.href = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
				redirectionPath,
			});
			return true;
		}

		const tab = window.open('', '_blank');
		if (tab) tab.opener = null;
		try {
			const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
				redirectionPath,
			});
			if (tab) {
				tab.location.href = link;
			} else {
				location.href = link;
			}
		} catch (error) {
			tab?.close();
			throw error;
		}
		return true;
	};

	/**
	 * If the user is an instance owner in the cloud, it generates an auto-login link to the
	 * cloud dashboard that redirects the user to the /manage page where they can upgrade to a new n8n version.
	 * Otherwise, it redirect them to our docs.
	 */
	const goToVersions = async () => {
		if (!canAutoLoginToCloudDashboard()) {
			window.open(versionsStore.infoUrl, '_blank', 'noopener');
			return;
		}

		await goToCloudDashboard({ redirectionPath: '/manage' });
	};

	const goToDashboard = async () => {
		await goToCloudDashboard({ redirectionPath: '/dashboard' });
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
		const shouldProceed = await guard();
		if (!shouldProceed) return;

		const { usageLeft, trialDaysLeft, userIsTrialing } = cloudPlanStore;
		const { executionsLeft, workflowsLeft } = usageLeft;
		const deploymentType = settingsStore.deploymentType;

		telemetry.track('User clicked upgrade CTA', {
			source,
			isTrial: userIsTrialing,
			deploymentType,
			trialDaysLeft,
			executionsLeft,
			workflowsLeft,
		});

		const upgradeLink = await generateUpgradeLink(source, utm_campaign);

		if (mode === 'open') {
			window.open(upgradeLink, '_blank');
		} else {
			location.href = upgradeLink;
		}
	};

	const generateUpgradeLink = async (source: string, utm_campaign: string) => {
		let upgradeLink = N8N_PRICING_PAGE_URL;

		if (canAutoLoginToCloudDashboard()) {
			upgradeLink = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
				redirectionPath: '/account/change-plan',
			});
		}

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
		goToCloudDashboard,
		goToDashboard,
		goToVersions,
		goToUpgrade,
	};
}
