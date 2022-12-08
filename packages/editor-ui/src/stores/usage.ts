import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { UsageState } from '@/Interface';
import { getLicense } from '@/api/usage';
import { useRootStore } from '@/stores/n8nRootStore';

export const useUsageStore = defineStore('usageAndPlan', () => {
	const rootStore = useRootStore();

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
		planName: computed(() => state.data.license.planName),
		executionLimit: computed(() => state.data.usage.executions.limit),
		executionCount: computed(() => state.data.usage.executions.value),
		isCloseToLimit: computed(() => state.data.usage.executions.limit < 0 ? false :  state.data.usage.executions.value / state.data.usage.executions.limit >= state.data.usage.executions.warningThreshold),
	};
});
