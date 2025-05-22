import type { SamlPreferences } from '@n8n/api-types';
import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import * as ssoApi from '@/api/sso';
import type { SamlPreferencesExtractedData } from '@/Interface';
import { updateCurrentUser } from '@/api/users';
import { useUsersStore } from '@/stores/users.store';

export const useSSOStore = defineStore('sso', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const route = useRoute();

	const state = reactive({
		loading: false,
		samlConfig: undefined as (SamlPreferences & SamlPreferencesExtractedData) | undefined,
	});

	const isLoading = computed(() => state.loading);

	const samlConfig = computed(() => state.samlConfig);

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
			void toggleLoginEnabled(value);
		},
	});
	const isEnterpriseSamlEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Saml],
	);
	const isDefaultAuthenticationSaml = computed(() => settingsStore.isDefaultAuthenticationSaml);
	const showSsoLoginButton = computed(
		() =>
			isSamlLoginEnabled.value &&
			isEnterpriseSamlEnabled.value &&
			isDefaultAuthenticationSaml.value,
	);

	const getSSORedirectUrl = async () =>
		await ssoApi.initSSO(
			rootStore.restApiContext,
			typeof route.query?.redirect === 'string' ? route.query.redirect : '',
		);

	const toggleLoginEnabled = async (enabled: boolean) =>
		await ssoApi.toggleSamlConfig(rootStore.restApiContext, { loginEnabled: enabled });

	const getSamlMetadata = async () => await ssoApi.getSamlMetadata(rootStore.restApiContext);
	const getSamlConfig = async () => {
		const samlConfig = await ssoApi.getSamlConfig(rootStore.restApiContext);
		state.samlConfig = samlConfig;
		return samlConfig;
	};
	const saveSamlConfig = async (config: Partial<SamlPreferences>) =>
		await ssoApi.saveSamlConfig(rootStore.restApiContext, config);
	const testSamlConfig = async () => await ssoApi.testSamlConfig(rootStore.restApiContext);

	const updateUser = async (params: { firstName: string; lastName: string }) =>
		await updateCurrentUser(rootStore.restApiContext, {
			email: usersStore.currentUser!.email!,
			...params,
		});

	const userData = computed(() => usersStore.currentUser);

	return {
		isLoading,
		setLoading,
		isSamlLoginEnabled,
		isEnterpriseSamlEnabled,
		isDefaultAuthenticationSaml,
		showSsoLoginButton,
		samlConfig,
		getSSORedirectUrl,
		getSamlMetadata,
		getSamlConfig,
		saveSamlConfig,
		testSamlConfig,
		updateUser,
		userData,
	};
});
