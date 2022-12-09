import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { UsageState } from '@/Interface';
import { getLicense } from '@/api/usage';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from "@/stores/settings";

const DEFAULT_PLAN_ID = 'community';
const DEFAULT_PLAN_NAME = 'Community';
const SUBSCRIPTION_APP_URL = 'https://n8n-io.github.io/subscription-app';

export const useUsageStore = defineStore('usageAndPlan', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const state = reactive<UsageState>({
		loading: true,
		error: null,
		data: {
			usage: {
				executions: {
					limit: -1,
					value: 0,
					warningThreshold: .8,
				},
			},
			license: {
				planId: 'community',
				planName: 'Community',
			},
		},
	});

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	const getData = async () => {
		state.loading = true;
		try {
			const { data } = await getLicense(rootStore.getRestApiContext);
			setData(data);
		} catch (error) {
			state.error = error;
		}
		state.loading = false;
	};

	return {
		getData,
		setData,
		isLoading: computed(() => state.loading),
		planName: computed(() => state.data.license.planName || DEFAULT_PLAN_NAME),
		executionLimit: computed(() => state.data.usage.executions.limit),
		executionCount: computed(() => state.data.usage.executions.value),
		isCloseToLimit: computed(() => state.data.usage.executions.limit < 0 ? false :  state.data.usage.executions.value / state.data.usage.executions.limit >= state.data.usage.executions.warningThreshold),
		instanceId: computed(() => settingsStore.settings.instanceId),
		managementToken: computed(() => state.data.managementToken),
		viewPlansUrl: computed(() => `${SUBSCRIPTION_APP_URL}?instanceId=${settingsStore.settings.instanceId}`),
		managePlansUrl: computed(() => `${SUBSCRIPTION_APP_URL}/manage?token=${state.data.managementToken}`),
	};
});
