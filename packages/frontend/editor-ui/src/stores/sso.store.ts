import type { SamlPreferences } from '@n8n/api-types';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as ssoApi from '@n8n/rest-api-client/api/sso';
import type { SamlPreferencesExtractedData } from '@n8n/rest-api-client/api/sso';
import * as ldapApi from '@n8n/rest-api-client/api/ldap';
import type { LdapConfig } from '@n8n/rest-api-client/api/ldap';
import type { IDataObject } from 'n8n-workflow';
import { UserManagementAuthenticationMethod } from '@/Interface';

export const useSSOStore = defineStore('sso', () => {
	const rootStore = useRootStore();

	const isLoading = ref(false);

	const authenticationMethod = ref<UserManagementAuthenticationMethod | undefined>(undefined);

	const initialize = (options: {
		authenticationMethod: UserManagementAuthenticationMethod;
		config: {
			ldap?: Pick<LdapConfig, 'loginLabel' | 'loginEnabled'>;
			saml?: Pick<SamlPreferences, 'loginLabel' | 'loginEnabled'>;
		};
		features: {
			saml: boolean;
			ldap: boolean;
		};
	}) => {
		authenticationMethod.value = options.authenticationMethod;

		isEnterpriseLdapEnabled.value = options.features.ldap;
		if (options.config.ldap) {
			ldap.value.loginEnabled = options.config.ldap.loginEnabled;
			ldap.value.loginLabel = options.config.ldap.loginLabel;
		}

		isEnterpriseSamlEnabled.value = options.features.saml;
		if (options.config.saml) {
			saml.value.loginEnabled = options.config.saml.loginEnabled;
			saml.value.loginLabel = options.config.saml.loginLabel;
		}
	};

	/**
	 * LDAP Configuration
	 */

	const ldap = ref<Pick<LdapConfig, 'loginLabel' | 'loginEnabled'>>({
		loginLabel: '',
		loginEnabled: false,
	});

	const isEnterpriseLdapEnabled = ref(false);

	const isLdapLoginEnabled = computed(() => ldap.value.loginEnabled);

	const ldapLoginLabel = computed(() => ldap.value.loginLabel);

	const getLdapConfig = async () => {
		const rootStore = useRootStore();
		return await ldapApi.getLdapConfig(rootStore.restApiContext);
	};

	const getLdapSynchronizations = async (pagination: { page: number }) => {
		const rootStore = useRootStore();
		return await ldapApi.getLdapSynchronizations(rootStore.restApiContext, pagination);
	};

	const testLdapConnection = async () => {
		const rootStore = useRootStore();
		return await ldapApi.testLdapConnection(rootStore.restApiContext);
	};

	const updateLdapConfig = async (ldapConfig: LdapConfig) => {
		const rootStore = useRootStore();
		return await ldapApi.updateLdapConfig(rootStore.restApiContext, ldapConfig);
	};

	const runLdapSync = async (data: IDataObject) => {
		const rootStore = useRootStore();
		return await ldapApi.runLdapSync(rootStore.restApiContext, data);
	};

	/**
	 * SAML Configuration
	 */

	const saml = ref<Pick<SamlPreferences, 'loginLabel' | 'loginEnabled'>>({
		loginLabel: '',
		loginEnabled: false,
	});

	const samlConfig = ref<(SamlPreferences & SamlPreferencesExtractedData) | undefined>(undefined);

	const setLoading = (loading: boolean) => {
		isLoading.value = loading;
	};

	const isDefaultAuthenticationSaml = computed(
		() => authenticationMethod.value === UserManagementAuthenticationMethod.Saml,
	);

	const isSamlLoginEnabled = computed({
		get: () => saml.value.loginEnabled,
		set: (value: boolean) => {
			saml.value.loginEnabled = value;
			void toggleLoginEnabled(value);
		},
	});

	const isEnterpriseSamlEnabled = ref(false);

	const showSsoLoginButton = computed(
		() =>
			isSamlLoginEnabled.value &&
			isEnterpriseSamlEnabled.value &&
			isDefaultAuthenticationSaml.value,
	);

	const getSSORedirectUrl = async (existingRedirect?: string) =>
		await ssoApi.initSSO(rootStore.restApiContext, existingRedirect);

	const toggleLoginEnabled = async (enabled: boolean) =>
		await ssoApi.toggleSamlConfig(rootStore.restApiContext, { loginEnabled: enabled });

	const getSamlMetadata = async () => await ssoApi.getSamlMetadata(rootStore.restApiContext);

	const getSamlConfig = async () => {
		const config = await ssoApi.getSamlConfig(rootStore.restApiContext);
		samlConfig.value = config;
		return config;
	};

	const saveSamlConfig = async (config: Partial<SamlPreferences>) =>
		await ssoApi.saveSamlConfig(rootStore.restApiContext, config);

	const testSamlConfig = async () => await ssoApi.testSamlConfig(rootStore.restApiContext);

	return {
		isLoading,
		authenticationMethod,
		showSsoLoginButton,
		setLoading,
		initialize,

		saml,
		samlConfig,
		isEnterpriseSamlEnabled,
		isDefaultAuthenticationSaml,
		isSamlLoginEnabled,
		getSSORedirectUrl,
		getSamlMetadata,
		getSamlConfig,
		saveSamlConfig,
		testSamlConfig,

		ldap,
		isLdapLoginEnabled,
		ldapLoginLabel,
		getLdapConfig,
		getLdapSynchronizations,
		testLdapConnection,
		updateLdapConfig,
		runLdapSync,
	};
});
