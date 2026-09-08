import { MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { MCP_JSON_NUDGE_CALLOUT } from '@/experiments/mcpJsonNudge/constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';

const IMPRESSION_CAP = 2;

export function useMcpJsonNudgeEligibility() {
	const mcpStore = useMCPStore();
	const posthogStore = usePostHog();
	const usersStore = useUsersStore();
	const rootStore = useRootStore();

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

		if (usersStore.currentUser?.settings) {
			usersStore.currentUser.settings.mcpJsonNudge = { impressions };
		}

		await updateCurrentUserSettings(rootStore.restApiContext, {
			mcpJsonNudge: { impressions },
		});
	}

	async function dismissForever(): Promise<void> {
		usersStore.setCalloutDismissed(MCP_JSON_NUDGE_CALLOUT);

		await updateCurrentUserSettings(rootStore.restApiContext, {
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[MCP_JSON_NUDGE_CALLOUT]: true,
			},
		});
	}

	return { canShow, recordImpression, dismissForever };
}
