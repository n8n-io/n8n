import { MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { MCP_JSON_NUDGE_CALLOUT } from '@/experiments/mcpJsonNudge/constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@n8n/stores/users.store';

const IMPRESSION_CAP = 2;

export function useMcpJsonNudgeEligibility() {
	const mcpStore = useMCPStore();
	const posthogStore = usePostHog();
	const usersStore = useUsersStore();

	function canShow(): boolean {
		const impressions = usersStore.currentUser?.settings?.mcpJsonNudge?.impressions ?? 0;

		return (
			!mcpStore.mcpAccessEnabled &&
			posthogStore.isFeatureEnabled(MCP_JSON_NUDGE_EXPERIMENT.name) &&
			impressions < IMPRESSION_CAP &&
			!usersStore.isCalloutDismissed(MCP_JSON_NUDGE_CALLOUT)
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

	return { canShow, recordImpression, dismissForever };
}
