import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

export const GATEWAY_OPPORTUNITY_CALLOUT_KEY = 'gateway-credits-opportunity';
export const GATEWAY_OPPORTUNITY_OPT_OUT_KEY = 'gateway-credits-opportunity-opt-out';

/**
 * Tracks whether to nudge the user, after a manual workflow run, that some
 * nodes in the workflow could switch to Gateway credits. Two server-persisted
 * callout keys back the two user decisions: dismiss (may show again later)
 * and never show again (opt out for good). Whether the nudge already showed
 * this session is in-memory only, so it never persists across reloads.
 */
export const useGatewayOpportunityNudgeStore = defineStore(STORES.GATEWAY_OPPORTUNITY_NUDGE, () => {
	const usersStore = useUsersStore();
	const telemetry = useTelemetry();

	const isOptedOut = computed(() => usersStore.isCalloutDismissed(GATEWAY_OPPORTUNITY_OPT_OUT_KEY));

	// In-memory and keyed by workflow, never persisted: the nudge shows at most
	// once for each workflow in an editor session. A per-session cap would let
	// the first workflow the user opens silence every other one.
	const shownThisSession = ref(new Set<string>());

	function shouldShow(opportunityCount: number, workflowId: string): boolean {
		if (isOptedOut.value) return false;
		if (shownThisSession.value.has(workflowId)) return false;
		if (opportunityCount === 0) return false;
		return true;
	}

	function markShown(opportunityCount: number, workflowId: string) {
		shownThisSession.value.add(workflowId);
		telemetry.track(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_SHOWN, {
			workflow_id: workflowId,
			opportunity_count: opportunityCount,
		});
	}

	async function dismiss(workflowId: string) {
		usersStore.setCalloutDismissed(GATEWAY_OPPORTUNITY_CALLOUT_KEY);
		telemetry.track(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
			workflow_id: workflowId,
			method: 'dismiss',
		});
		// The spread is mandatory: updateUserSettings does a shallow Object.assign
		// server-side, so sending only this key would wipe every other dismissed callout.
		await usersStore.updateUserSettings({
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[GATEWAY_OPPORTUNITY_CALLOUT_KEY]: true,
			},
		});
	}

	/**
	 * Tracks the CTA that opens the switch modal. Unlike dismiss/neverShowAgain,
	 * this does not persist a dismissed callout: the user engaged with the
	 * nudge, so there is nothing to opt out of.
	 */
	function actionReviewAndSwitch(workflowId: string, offeredCount: number) {
		telemetry.track(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
			workflow_id: workflowId,
			method: 'review_and_switch',
			offered_count: offeredCount,
		});
	}

	async function neverShowAgain(workflowId: string) {
		usersStore.setCalloutDismissed(GATEWAY_OPPORTUNITY_OPT_OUT_KEY);
		telemetry.track(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
			workflow_id: workflowId,
			method: 'never_show_again',
		});
		// See the comment in dismiss() above: the spread is mandatory here too.
		await usersStore.updateUserSettings({
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[GATEWAY_OPPORTUNITY_OPT_OUT_KEY]: true,
			},
		});
	}

	return {
		isOptedOut,
		shouldShow,
		markShown,
		dismiss,
		neverShowAgain,
		actionReviewAndSwitch,
	};
});
