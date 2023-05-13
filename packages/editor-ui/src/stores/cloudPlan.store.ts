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

	const getOwnerCurrentPLan = async () => {
		const cloudUserId = settingsStore.settings.n8nMetadata?.userId;
		const hasCloudPlan =
			usersStore.currentUser?.isOwner && settingsStore.isCloudDeployment && cloudUserId;
		if (!hasCloudPlan) throw new Error('User does not have a cloud plan');
		return getCurrentPlan(rootStore.getRestCloudApiContext, cloudUserId as string);
	};

	const getInstanceCurrentUsage = async () => {
		return getCurrentUsage({ baseUrl: rootStore.getBaseUrl, sessionId: '' });
	};

	return {
		setData,
		setUsage,
		getOwnerCurrentPLan,
		getInstanceCurrentUsage,
		userIsTrialing,
		currentPlanData,
		currentUsageData,
		trialExpired,
		allExecutionsUsed,
	};
});
