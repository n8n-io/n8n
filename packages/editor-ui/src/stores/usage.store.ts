import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { UsageState } from '@/Interface';
import * as usageApi from '@/api/usage';
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';

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
			executions: {
				limit: -1,
				value: 0,
				warningThreshold: 0.8,
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

	const state = reactive<UsageState>(DEFAULT_STATE);

	const planName = computed(() => state.data.license.planName || DEFAULT_PLAN_NAME);
	const planId = computed(() => state.data.license.planId);
	const executionLimit = computed(() => state.data.usage.executions.limit);
	const executionCount = computed(() => state.data.usage.executions.value);
	const executionPercentage = computed(() => (executionCount.value / executionLimit.value) * 100);
	const instanceId = computed(() => settingsStore.settings.instanceId);
	const managementToken = computed(() => state.data.managementToken);
	const appVersion = computed(() => settingsStore.settings.versionCli);
	const commonSubscriptionAppUrlQueryParams = computed(
		() => `instanceid=${instanceId.value}&version=${appVersion.value}`,
	);
	const subscriptionAppUrl = computed(() =>
		settingsStore.settings.license.environment === 'production'
			? 'https://subscription.n8n.io'
			: 'https://staging-subscription.n8n.io',
	);

	const setLoading = (loading: boolean) => {
		state.loading = loading;
	};

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	const getLicenseInfo = async () => {
		const data = await usageApi.getLicense(rootStore.restApiContext);
		setData(data);
	};

	const activateLicense = async (activationKey: string) => {
		const data = await usageApi.activateLicenseKey(rootStore.restApiContext, { activationKey });
		setData(data);
		await settingsStore.getSettings();
	};

	const refreshLicenseManagementToken = async () => {
		try {
			const data = await usageApi.renewLicense(rootStore.restApiContext);
			setData(data);
		} catch (error) {
			await getLicenseInfo();
		}
	};

	const requestEnterpriseLicenseTrial = async () => {
		await usageApi.requestLicenseTrial(rootStore.restApiContext);
	};

	const registerCommunityEdition = async (email: string) =>
		await usageApi.registerCommunityEdition(rootStore.restApiContext, { email });

	return {
		setLoading,
		getLicenseInfo,
		setData,
		activateLicense,
		refreshLicenseManagementToken,
		requestEnterpriseLicenseTrial,
		registerCommunityEdition,
		planName,
		planId,
		executionLimit,
		executionCount,
		executionPercentage,
		instanceId,
		managementToken,
		appVersion,
		isCloseToLimit: computed(() =>
			state.data.usage.executions.limit < 0
				? false
				: executionCount.value / executionLimit.value >=
					state.data.usage.executions.warningThreshold,
		),
		viewPlansUrl: computed(
			() => `${subscriptionAppUrl.value}?${commonSubscriptionAppUrlQueryParams.value}`,
		),
		managePlanUrl: computed(
			() =>
				`${subscriptionAppUrl.value}/manage?token=${managementToken.value}&${commonSubscriptionAppUrlQueryParams.value}`,
		),
		isLoading: computed(() => state.loading),
		telemetryPayload: computed<UsageTelemetry>(() => ({
			instance_id: instanceId.value,
			action: 'view_plans',
			plan_name_current: planName.value,
			usage: executionCount.value,
			quota: executionLimit.value,
		})),
	};
});
