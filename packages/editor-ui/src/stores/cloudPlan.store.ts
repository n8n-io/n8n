import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { CloudPlanState } from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { getAdminPanelLoginCode, getCurrentPlan, getCurrentUsage } from '@/api/cloudPlans';
import { DateTime } from 'luxon';
import { CLOUD_TRIAL_CHECK_INTERVAL, STORES } from '@/constants';
import { hasPermission } from '@/rbac/permissions';

const DEFAULT_STATE: CloudPlanState = {
	initialized: false,
	data: null,
	usage: null,
	loadingPlan: false,
};

export const useCloudPlanStore = defineStore(STORES.CLOUD_PLAN, () => {
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

	const reset = () => {
		state.data = null;
		state.usage = null;
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

	const hasCloudPlan = computed(() => {
		const cloudUserId = settingsStore.settings.n8nMetadata?.userId;
		return hasPermission(['instanceOwner']) && settingsStore.isCloudDeployment && cloudUserId;
	});

	const getUserCloudAccount = async () => {
		if (!hasCloudPlan.value) throw new Error('User does not have a cloud plan');
		try {
			await usersStore.fetchUserCloudAccount();
			if (!usersStore.currentUserCloudInfo?.confirmed && !userIsTrialing.value) {
				useUIStore().pushBannerToStack('EMAIL_CONFIRMATION');
			}
		} catch (error) {
			throw new Error(error.message);
		}
	};

	const getAutoLoginCode = async (): Promise<{ code: string }> => {
		return await getAdminPanelLoginCode(rootStore.getRestApiContext);
	};

	const getOwnerCurrentPlan = async () => {
		if (!hasCloudPlan.value) throw new Error('User does not have a cloud plan');
		state.loadingPlan = true;
		let plan;
		try {
			plan = await getCurrentPlan(rootStore.getRestApiContext);
			state.data = plan;
			state.loadingPlan = false;

			if (userIsTrialing.value) {
				if (trialExpired.value) {
					useUIStore().pushBannerToStack('TRIAL_OVER');
				} else {
					useUIStore().pushBannerToStack('TRIAL');
				}
			}
		} catch (error) {
			state.loadingPlan = false;
			throw new Error(error);
		}

		return plan;
	};

	const getInstanceCurrentUsage = async () => {
		const usage = await getCurrentUsage({ baseUrl: rootStore.getBaseUrl, pushRef: '' });
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

	const startPollingInstanceUsageData = () => {
		const interval = setInterval(async () => {
			try {
				await getInstanceCurrentUsage();
				if (trialExpired.value || allExecutionsUsed.value) {
					clearTimeout(interval);
					return;
				}
			} catch {}
		}, CLOUD_TRIAL_CHECK_INTERVAL);
	};

	const checkForCloudPlanData = async (): Promise<void> => {
		try {
			await getOwnerCurrentPlan();
			if (!userIsTrialing.value) return;
			await getInstanceCurrentUsage();
			startPollingInstanceUsageData();
		} catch (e) {
			throw new Error(e.message);
		}
	};

	const fetchUserCloudAccount = async () => {
		try {
			await getUserCloudAccount();
		} catch (e) {
			throw new Error(e.message);
		}
	};

	const redirectToDashboard = async () => {
		const adminPanelHost = new URL(window.location.href).host.split('.').slice(1).join('.');
		const { code } = await getAutoLoginCode();
		window.location.href = `https://${adminPanelHost}/login?code=${code}`;
	};

	const initialize = async () => {
		if (state.initialized) {
			return;
		}

		try {
			await checkForCloudPlanData();
		} catch (error) {
			console.warn('Error checking for cloud plan data:', error);
		}

		try {
			await fetchUserCloudAccount();
		} catch (error) {
			console.warn('Error fetching user cloud account:', error);
		}

		state.initialized = true;
	};

	return {
		state,
		initialize,
		getOwnerCurrentPlan,
		getInstanceCurrentUsage,
		usageLeft,
		trialDaysLeft,
		userIsTrialing,
		currentPlanData,
		currentUsageData,
		trialExpired,
		allExecutionsUsed,
		reset,
		checkForCloudPlanData,
		fetchUserCloudAccount,
		getAutoLoginCode,
		redirectToDashboard,
	};
});
