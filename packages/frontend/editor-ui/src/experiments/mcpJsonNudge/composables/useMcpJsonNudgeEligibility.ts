import { useUsersStore } from '@n8n/stores/users.store';

import { MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { MCP_JSON_NUDGE_CALLOUT } from '@/experiments/mcpJsonNudge/constants';
import { useMCPStore } from '@n8n/frontend-module-mcp';

const IMPRESSION_CAP = 2;

export function useMcpJsonNudgeEligibility() {
	const mcpStore = useMCPStore();
	const posthogStore = usePostHog();
	const usersStore = useUsersStore();

	/**
	 * Every condition except the experiment arm: this user would see the nudge if
	 * they were in the enabled arm, which makes them part of the experiment's
	 * exposed population, control included. Deliberately does not read the flag,
	 * because the trigger reports exposure off this and exposure must not depend
	 * on which arm the user landed in.
	 */
	function isEligibleApartFromExperiment(): boolean {
		const impressions = usersStore.currentUser?.settings?.mcpJsonNudge?.impressions ?? 0;

		return (
			!mcpStore.mcpAccessEnabled &&
			impressions < IMPRESSION_CAP &&
			!usersStore.isCalloutDismissed(MCP_JSON_NUDGE_CALLOUT)
		);
	}

	function canShow(): boolean {
		return (
			isEligibleApartFromExperiment() &&
			posthogStore.isVariantEnabled(
				MCP_JSON_NUDGE_EXPERIMENT.name,
				MCP_JSON_NUDGE_EXPERIMENT.variant,
			)
		);
	}

	async function recordImpression(): Promise<void> {
		const impressions = (usersStore.currentUser?.settings?.mcpJsonNudge?.impressions ?? 0) + 1;

		// Write locally first: the caller does not await this, and canShow() must see
		// the new count if the user exports again before the request comes back.
		if (usersStore.currentUser?.settings) {
			usersStore.currentUser.settings.mcpJsonNudge = { impressions };
		}

		await usersStore.updateUserSettings({ mcpJsonNudge: { impressions } });
	}

	async function dismissForever(): Promise<void> {
		usersStore.setCalloutDismissed(MCP_JSON_NUDGE_CALLOUT);

		// updateUserSettings mirrors the response back into currentUser.settings, which
		// also covers fresh users whose settings are still null (setCalloutDismissed
		// above no-ops for them).
		await usersStore.updateUserSettings({
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[MCP_JSON_NUDGE_CALLOUT]: true,
			},
		});
	}

	return { canShow, isEligibleApartFromExperiment, recordImpression, dismissForever };
}
