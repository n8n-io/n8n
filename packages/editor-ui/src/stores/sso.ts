import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import { initSSO } from '@/api/sso';

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

	const isSamlLoginEnabled = computed(() => settingsStore.isSamlLoginEnabled);
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

	const getSSORedirectUrl = () => initSSO(rootStore.getRestApiContext);

	return {
		isLoading,
		setLoading,
		showSsoLoginButton,
		getSSORedirectUrl,
	};
});
