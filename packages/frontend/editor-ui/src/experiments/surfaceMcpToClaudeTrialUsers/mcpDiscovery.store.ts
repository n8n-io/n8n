import { mcpDiscoveryStateSchema, type McpDiscoveryState } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { makeRestApiRequest } from '@n8n/rest-api-client/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EXPERIMENTS_TO_TRACK, MCP_DISCOVERY_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import { pickedClaudeInOnboarding } from './onboarding';

export type McpDiscoveryPlacement = 'canvas' | 'sidebar' | 'footer' | 'create_menu';

export const useMcpDiscoveryStore = defineStore(STORES.EXPERIMENT_MCP_DISCOVERY, () => {
	const root = useRootStore();
	const settings = useSettingsStore();
	const users = useUsersStore();
	const cloudPlan = useCloudPlanStore();
	const posthog = usePostHog();
	const telemetry = useTelemetry();
	const state = ref<McpDiscoveryState>({ status: 'inactive', coachmarkDismissed: false });
	const loading = ref(false);
	let generation = 0;
	let exposureTracked = false;
	let pickedClaude: boolean | undefined;
	const viewed = new Set<McpDiscoveryPlacement>();
	const isEnabled = computed(() => users.isInstanceOwner && state.value.status === 'assigned');
	const currentVariant = computed(() =>
		isEnabled.value ? state.value.assignment?.variant : undefined,
	);
	const isTreatment = computed(() => currentVariant.value === MCP_DISCOVERY_EXPERIMENT.variant);
	const shouldShowEntryPoints = computed(() => isTreatment.value && !state.value.hasUsedClaudeMcp);
	const ctaStage = computed(() => {
		if (!settings.moduleSettings.mcp?.mcpAccessEnabled) return 'build';
		return state.value.hasConnectedClaude ? 'build_in_claude' : 'connect';
	});
	const coachmarkDismissed = computed(() => state.value.coachmarkDismissed);

	function reset() {
		generation++;
		state.value = { status: 'inactive', coachmarkDismissed: false };
		loading.value = false;
		exposureTracked = false;
		pickedClaude = undefined;
		viewed.clear();
		posthog.setMcpDiscoveryAssignment(null);
	}

	async function refresh() {
		const userId = users.currentUser?.id;
		if (!userId || !users.isInstanceOwner || loading.value) return;
		const requestGeneration = generation;
		loading.value = true;
		try {
			// Refresh the Cloud plan until assignment. License certificates can omit the plan name.
			let isTrial: boolean | undefined;
			if (state.value.status !== 'assigned') {
				// Let the server restore a saved assignment if the Cloud plan is unavailable.
				const plan = await cloudPlan.getOwnerCurrentPlan().catch(() => undefined);
				if (requestGeneration !== generation || users.currentUser?.id !== userId) return;
				const group = plan?.metadata?.group;
				isTrial = group ? group === 'trial' : undefined;
			}
			if (isTrial === true && pickedClaude === undefined) {
				let answer = pickedClaudeInOnboarding(cloudPlan.currentUserCloudInfo?.information);
				if (answer === undefined) {
					await cloudPlan.fetchUserCloudAccount();
					answer = pickedClaudeInOnboarding(cloudPlan.currentUserCloudInfo?.information);
				}
				if (requestGeneration !== generation || users.currentUser?.id !== userId) return;
				pickedClaude = answer;
			}
			const response = await makeRestApiRequest<unknown>(
				root.restApiContext,
				'POST',
				'/me/mcp-discovery/visit',
				{ pickedClaude, isTrial },
			);
			if (requestGeneration !== generation || users.currentUser?.id !== userId) return;
			const nextState = mcpDiscoveryStateSchema.parse(response);
			state.value = {
				...nextState,
				coachmarkDismissed: state.value.coachmarkDismissed || nextState.coachmarkDismissed,
			};
			posthog.setMcpDiscoveryAssignment(state.value.assignment?.variant ?? null);
			if (isEnabled.value && state.value.assignment && !exposureTracked) {
				exposureTracked = true;
				const concurrentExperiments: Record<string, string> = {};
				for (const name of EXPERIMENTS_TO_TRACK) {
					if (name === MCP_DISCOVERY_EXPERIMENT.name) continue;
					const variant = posthog.getVariant(name);
					if (typeof variant === 'string') concurrentExperiments[name] = variant;
				}
				telemetry.track(
					TELEMETRY_EVENT.MCP.DISCOVERY_EXPOSED,
					getExperimentTelemetryPayload(MCP_DISCOVERY_EXPERIMENT, state.value.assignment.variant, {
						assigned_at: state.value.assignment.assignedAt,
						eligible_at: state.value.eligibleAt,
						concurrent_experiments: concurrentExperiments,
					}),
				);
			}
		} catch {
			// Retry later. Do not infer eligibility from an unavailable API.
			if (requestGeneration === generation && !isEnabled.value) {
				state.value = { status: 'unknown', coachmarkDismissed: false };
			}
		} finally {
			if (requestGeneration === generation) loading.value = false;
		}
	}

	function trackEntry(placement: McpDiscoveryPlacement, action: 'viewed' | 'clicked') {
		const variant = currentVariant.value;
		if (!isTreatment.value || !variant) return;
		if (action === 'viewed' && viewed.has(placement)) return;
		if (action === 'viewed') viewed.add(placement);
		telemetry.track(
			action === 'viewed'
				? TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_VIEWED
				: TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_CLICKED,
			getExperimentTelemetryPayload(MCP_DISCOVERY_EXPERIMENT, variant, {
				surface: placement,
				cta_stage: ctaStage.value,
			}),
		);
	}

	async function dismissCoachmark() {
		if (!isTreatment.value) return;
		const userId = users.currentUser?.id;
		const requestGeneration = generation;
		await makeRestApiRequest(root.restApiContext, 'POST', '/me/mcp-discovery/dismiss');
		if (requestGeneration !== generation || users.currentUser?.id !== userId) return;
		state.value.coachmarkDismissed = true;
	}

	return {
		state,
		isEnabled,
		currentVariant,
		isTreatment,
		shouldShowEntryPoints,
		ctaStage,
		coachmarkDismissed,
		refresh,
		reset,
		trackEntry,
		dismissCoachmark,
	};
});
