import type { OidcConfigDto } from '@n8n/api-types';
import { type SamlPreferences } from '@n8n/api-types';
import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import * as ssoApi from '@n8n/rest-api-client/api/sso';
import type { SamlPreferencesExtractedData } from '@n8n/rest-api-client/api/sso';
import { updateCurrentUser } from '@/api/users';
import { useUsersStore } from '@/stores/users.store';

export const useSSOStore = defineStore('sso', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const route = useRoute();

	const state = reactive({
		samlConfig: undefined as (SamlPreferences & SamlPreferencesExtractedData) | undefined,
		oidcConfig: undefined as OidcConfigDto | undefined,
	});

	const samlConfig = computed(() => state.samlConfig);

	const oidcConfig = computed(() => state.oidcConfig);

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

	const isOidcLoginEnabled = computed({
		get: () => settingsStore.isOidcLoginEnabled,
		set: (value: boolean) => {
			settingsStore.setSettings({
				...settingsStore.settings,
				sso: {
					...settingsStore.settings.sso,
					oidc: {
						...settingsStore.settings.sso.oidc,
						loginEnabled: value,
					},
				},
			});
		},
	});

	const isEnterpriseSamlEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Saml],
	);

	const isEnterpriseOidcEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Oidc],
	);

	const isDefaultAuthenticationSaml = computed(() => settingsStore.isDefaultAuthenticationSaml);

	const isDefaultAuthenticationOidc = computed(() => settingsStore.isDefaultAuthenticationOidc);

	const showSsoLoginButton = computed(
		() =>
			(isSamlLoginEnabled.value &&
				isEnterpriseSamlEnabled.value &&
				isDefaultAuthenticationSaml.value) ||
			(isOidcLoginEnabled.value &&
				isEnterpriseOidcEnabled.value &&
				isDefaultAuthenticationOidc.value),
	);

	const getSSORedirectUrl = async () =>
		await ssoApi.initSSO(
			rootStore.restApiContext,
			typeof route.query?.redirect === 'string' ? route.query.redirect : '',
		);

	const toggleLoginEnabled = async (enabled: boolean) =>
		await ssoApi.toggleSamlConfig(rootStore.restApiContext, { loginEnabled: enabled });

	const getSamlMetadata = async () => await ssoApi.getSamlMetadata(rootStore.restApiContext);

	// const getOidcRedirectLUrl = async () => await ssoApi)

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

	const getOidcConfig = async () => {
		const oidcConfig = await ssoApi.getOidcConfig(rootStore.restApiContext);
		state.oidcConfig = oidcConfig;
		return oidcConfig;
	};

	const saveOidcConfig = async (config: OidcConfigDto) => {
		const savedConfig = await ssoApi.saveOidcConfig(rootStore.restApiContext, config);
		state.oidcConfig = savedConfig;
		return savedConfig;
	};

	return {
		isEnterpriseOidcEnabled,
		isSamlLoginEnabled,
		isOidcLoginEnabled,
		isEnterpriseSamlEnabled,
		isDefaultAuthenticationSaml,
		isDefaultAuthenticationOidc,
		showSsoLoginButton,
		samlConfig,
		oidcConfig,
		userData,
		getSSORedirectUrl,
		getSamlMetadata,
		getSamlConfig,
		saveSamlConfig,
		testSamlConfig,
		updateUser,
		getOidcConfig,
		saveOidcConfig,
	};
});
