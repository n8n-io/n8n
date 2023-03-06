import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings';

export const useSSOStore = defineStore('sso', () => {
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

	return {
		isLoading,
		setLoading,
		showSsoLoginButton,
	};
});
