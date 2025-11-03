import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { UsageState } from '@n8n/api-types';
import { useSettingsStore } from '@/app/stores/settings.store';

export type UsageTelemetry = {
	instance_id: string;
	action: 'view_plans' | 'manage_plan' | 'add_activation_key' | 'desktop_view_plans';
	plan_name_current: string;
	usage: number;
	quota: number;
};

const DEFAULT_PLAN_NAME = 'Community';
const DEFAULT_STATE: UsageState = {
	loading: true,
	data: {
		usage: {
			activeWorkflowTriggers: {
				limit: -1,
				value: 0,
				warningThreshold: 0.8,
			},
			workflowsHavingEvaluations: {
				value: 0,
				limit: 0,
			},
		},
		license: {
			planId: '',
			planName: DEFAULT_PLAN_NAME,
		},
	},
};

export const useUsageStore = defineStore('usage', () => {
	const settingsStore = useSettingsStore();

	const state = reactive<UsageState>({ ...DEFAULT_STATE });

	const planName = computed(() => state.data.license.planName || DEFAULT_PLAN_NAME);
	const planId = computed(() => state.data.license.planId);
	const activeWorkflowTriggersLimit = computed(() => state.data.usage.activeWorkflowTriggers.limit);
	const activeWorkflowTriggersCount = computed(() => state.data.usage.activeWorkflowTriggers.value);
	const workflowsWithEvaluationsLimit = computed(
		() => state.data.usage.workflowsHavingEvaluations.limit,
	);
	const workflowsWithEvaluationsCount = computed(
		() => state.data.usage.workflowsHavingEvaluations.value,
	);
	const executionPercentage = computed(
		() => (activeWorkflowTriggersCount.value / activeWorkflowTriggersLimit.value) * 100,
	);
	const instanceId = computed(() => settingsStore.settings.instanceId);
	const managementToken = computed(() => state.data.managementToken);
	const appVersion = computed(() => settingsStore.settings.versionCli);
	// Subscription URLs removed - no longer needed without license system

	const setLoading = (loading: boolean) => {
		state.loading = loading;
	};

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	// License system has been removed - no API calls needed
	// System now uses default values only

	return {
		setLoading,
		setData,
		planName,
		planId,
		activeWorkflowTriggersLimit,
		activeWorkflowTriggersCount,
		workflowsWithEvaluationsLimit,
		workflowsWithEvaluationsCount,
		executionPercentage,
		instanceId,
		managementToken,
		appVersion,
		isCloseToLimit: computed(() =>
			state.data.usage.activeWorkflowTriggers.limit < 0
				? false
				: activeWorkflowTriggersCount.value / activeWorkflowTriggersLimit.value >=
					state.data.usage.activeWorkflowTriggers.warningThreshold,
		),
		// Plan URLs removed - subscriptions no longer needed
		viewPlansUrl: computed(() => ''),
		managePlanUrl: computed(() => ''),
		isLoading: computed(() => state.loading),
		telemetryPayload: computed<UsageTelemetry>(() => ({
			instance_id: instanceId.value,
			action: 'view_plans',
			plan_name_current: planName.value,
			usage: activeWorkflowTriggersCount.value,
			quota: activeWorkflowTriggersLimit.value,
		})),
	};
});
