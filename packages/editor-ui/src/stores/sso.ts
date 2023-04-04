import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import * as ssoApi from '@/api/sso';
import { SamlPreferences } from '@/Interface';

export const useSSOStore = defineStore('sso', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const state = reactive({
		loading: false,
	});

	const isLoading = computed(() => state.loading);

	const setLoading = (loading: boolean) => {
		state.loading = loading;
	};

	const isSamlLoginEnabled = computed({
		get: () => settingsStore.isSamlLoginEnabled,
		set: (value: boolean) => {
			settingsStore.setSettings({
				...settingsStore.settings,
				sso: {
					...settingsStore.settings.sso,
					saml: {
						...settingsStore.settings.sso.saml,
						loginEnabled: value,
					},
				},
			});
			toggleLoginEnabled(value);
		},
	});
	const isEnterpriseSamlEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Saml),
	);
	const isDefaultAuthenticationSaml = computed(() => settingsStore.isDefaultAuthenticationSaml);
	const showSsoLoginButton = computed(
		() =>
			isSamlLoginEnabled.value &&
			isEnterpriseSamlEnabled.value &&
			isDefaultAuthenticationSaml.value,
	);

	const getSSORedirectUrl = () => ssoApi.initSSO(rootStore.getRestApiContext);

	const toggleLoginEnabled = (enabled: boolean) =>
		ssoApi.toggleSamlConfig(rootStore.getRestApiContext, { loginEnabled: enabled });

	const getSamlMetadata = () => ssoApi.getSamlMetadata(rootStore.getRestApiContext);
	const getSamlConfig = () => ssoApi.getSamlConfig(rootStore.getRestApiContext);
	const saveSamlConfig = (config: SamlPreferences) =>
		ssoApi.saveSamlConfig(rootStore.getRestApiContext, config);
	const testSamlConfig = () => ssoApi.testSamlConfig(rootStore.getRestApiContext);

	return {
		isLoading,
		setLoading,
		isSamlLoginEnabled,
		isEnterpriseSamlEnabled,
		showSsoLoginButton,
		getSSORedirectUrl,
		getSamlMetadata,
		getSamlConfig,
		saveSamlConfig,
		testSamlConfig,
	};
});
