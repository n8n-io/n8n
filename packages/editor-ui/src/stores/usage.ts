import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { UsageState } from '@/Interface';
import { activateLicenseKey, getLicense, renewLicense } from '@/api/usage';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from "@/stores/settings";
import { useUsersStore } from "@/stores/users";
import { i18n } from '@/plugins/i18n';

export type UsageTelemetry = {
	instance_id: string
	action: 'view_plans' | 'manage_plan' | 'add_activation_key' | 'contact_us'
	plan_name_current: string
	usage: number
	quota: number
};

const SUBSCRIPTION_APP_URL = 'https://staging-subscription.n8n.io';
const DEFAULT_PLAN_NAME = 'Community';
const DEFAULT_STATE: UsageState = {
	loading: true,
	error: {},
	success: {},
	data: {
		usage: {
			executions: {
				limit: -1,
				value: 0,
				warningThreshold: .8,
			},
		},
		license: {
			planId: '',
			planName: DEFAULT_PLAN_NAME,
		},
	},
};

export const useUsageStore = defineStore('usage', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const state = reactive<UsageState>(DEFAULT_STATE);

	const planName = computed(() => state.data.license.planName || DEFAULT_PLAN_NAME);
	const planId = computed(() => state.data.license.planId);
	const executionLimit = computed(() => state.data.usage.executions.limit);
	const executionCount = computed(() => state.data.usage.executions.value);
	const executionPercentage = computed(() => executionCount.value / executionLimit.value * 100);
	const instanceId = computed(() => settingsStore.settings.instanceId);
	const managementToken = computed(() => state.data.managementToken);
	const appVersion = computed(() => settingsStore.settings.versionCli);
	const commonSubscriptionAppUrlQueryParams = computed(() => `instanceid=${instanceId.value}&version=${appVersion.value}`);

	const setLoading = (loading: boolean) => {
		state.loading = loading;
	};

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	const getLicenseInfo = async () => {
		try {
			const data = await getLicense(rootStore.getRestApiContext);
			setData(data);
		} catch (error) {
			state.error = error;
		}
	};

	const activateLicense = async (activationKey: string) => {
		try {
			const data = await activateLicenseKey(rootStore.getRestApiContext, { activationKey });
			setData(data);
			state.success = {
				title: i18n.baseText('settings.usageAndPlan.license.activation.success.title'),
				message: i18n.baseText('settings.usageAndPlan.license.activation.success.message', {
					interpolate: {
						name: state.data.license.planName || DEFAULT_PLAN_NAME,
						type: planId.value ? i18n.baseText('settings.usageAndPlan.plan') : i18n.baseText('settings.usageAndPlan.edition'),
					},
				}),
			};
		} catch (error) {
			state.error = error;
			throw Error(error);
		}
	};

	const refreshLicenseManagementToken = async () => {
		try {
			const data = await renewLicense(rootStore.getRestApiContext);
			setData(data);
		} catch (error) {
			getLicenseInfo();
		}
	};

	return {
		setLoading,
		getLicenseInfo,
		setData,
		activateLicense,
		refreshLicenseManagementToken,
		planName,
		planId,
		executionLimit,
		executionCount,
		executionPercentage,
		instanceId,
		managementToken,
		appVersion,
		isCloseToLimit: computed(() => state.data.usage.executions.limit < 0 ? false :  executionCount.value / executionLimit.value >= state.data.usage.executions.warningThreshold),
		viewPlansUrl: computed(() => `${SUBSCRIPTION_APP_URL}?${commonSubscriptionAppUrlQueryParams.value}`),
		managePlanUrl: computed(() => `${SUBSCRIPTION_APP_URL}/manage?token=${managementToken.value}&${commonSubscriptionAppUrlQueryParams.value}`),
		canUserActivateLicense: computed(() => usersStore.canUserActivateLicense),
		isLoading: computed(() => state.loading),
		error: computed(() => state.error),
		success: computed(() => state.success),
		telemetryPayload: computed<UsageTelemetry>(() => ({
			instance_id: instanceId.value,
			action: 'view_plans',
			plan_name_current: planName.value,
			usage: executionCount.value,
			quota: executionLimit.value,
		})),
	};
});
