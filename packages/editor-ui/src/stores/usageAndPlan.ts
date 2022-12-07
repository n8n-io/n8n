import {computed, reactive} from "vue";
import {defineStore} from "pinia";

export type UsageAndPlanState = {
	loading: boolean;
	error: Error | null;
	data: {
		usage: {
			executions: {
				limit: number, // -1 for unlimited, from license
				value: number,
				warningThreshold: number, // hardcoded value in BE
			},
		},
		license: {
			planId: string, // community
			planName: string, // defaults to Community
		},
	}
};

export const useUsageAndPlanStore = defineStore('usageAndPlan', () => {
	const state = reactive<UsageAndPlanState>({
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

	const setData = (data: UsageAndPlanState['data']) => {
		state.data = data;
	};

	return {
		setData,
		planName: computed(() => state.data.license.planName),
		executionLimit: computed(() => state.data.usage.executions.limit),
		executionCount: computed(() => state.data.usage.executions.value),
		isCloseToLimit: computed(() => state.data.usage.executions.limit < 0 ? false :  state.data.usage.executions.value / state.data.usage.executions.limit >= state.data.usage.executions.warningThreshold),
	};
});
