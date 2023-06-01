import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { CloudPlanState } from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { getCurrentPlan, getCurrentUsage } from '@/api/cloudPlans';
import { DateTime } from 'luxon';

const DEFAULT_STATE: CloudPlanState = {
	data: null,
	usage: null,
	loadingPlan: false,
};

export const useCloudPlanStore = defineStore('cloudPlan', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const state = reactive<CloudPlanState>(DEFAULT_STATE);

	const setData = (data: CloudPlanState['data']) => {
		state.data = data;
	};

	const setUsage = (data: CloudPlanState['usage']) => {
		state.usage = data;
	};

	const userIsTrialing = computed(() => state.data?.metadata?.group === 'trial');

	const currentPlanData = computed(() => state.data);

	const currentUsageData = computed(() => state.usage);

	const trialExpired = computed(
		() =>
			state.data?.metadata?.group === 'trial' &&
			DateTime.now().toMillis() >= DateTime.fromISO(state.data?.expirationDate).toMillis(),
	);

	const allExecutionsUsed = computed(() => {
		if (!state.usage?.executions || !state.data?.monthlyExecutionsLimit) return false;
		return state.usage?.executions >= state.data?.monthlyExecutionsLimit;
	});

	const getOwnerCurrentPlan = async () => {
		const cloudUserId = settingsStore.settings.n8nMetadata?.userId;
		const hasCloudPlan =
			usersStore.currentUser?.isOwner && settingsStore.isCloudDeployment && cloudUserId;
		if (!hasCloudPlan) throw new Error('User does not have a cloud plan');
		state.loadingPlan = true;
		let plan;
		try {
			plan = await getCurrentPlan(rootStore.getRestCloudApiContext, `${cloudUserId}`);
			state.data = plan;
			state.loadingPlan = false;
		} catch (error) {
			state.loadingPlan = false;
			throw new Error(error);
		}

		return plan;
	};

	const getInstanceCurrentUsage = async () => {
		const usage = await getCurrentUsage({ baseUrl: rootStore.getBaseUrl, sessionId: '' });
		state.usage = usage;
		return usage;
	};

	const usageLeft = computed(() => {
		if (!state.data || !state.usage) return { workflowsLeft: -1, executionsLeft: -1 };

		return {
			workflowsLeft: state.data.activeWorkflowsLimit - state.usage.activeWorkflows,
			executionsLeft: state.data.monthlyExecutionsLimit - state.usage.executions,
		};
	});

	const trialDaysLeft = computed(() => {
		if (!state.data?.expirationDate) return -1;

		const differenceInMs = new Date().valueOf() - new Date(state.data.expirationDate).valueOf();

		const differenceInDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));

		return Math.ceil(differenceInDays);
	});

	return {
		state,
		getOwnerCurrentPlan,
		getInstanceCurrentUsage,
		usageLeft,
		trialDaysLeft,
		userIsTrialing,
		currentPlanData,
		currentUsageData,
		trialExpired,
		allExecutionsUsed,
	};
});
