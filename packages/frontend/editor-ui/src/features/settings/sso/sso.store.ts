import { AuthenticationMethod, type OidcConfigDto, type SamlPreferences } from '@n8n/api-types';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as ssoApi from '@n8n/rest-api-client/api/sso';
import type { SamlPreferencesExtractedData } from '@n8n/rest-api-client/api/sso';
import * as ldapApi from '@n8n/rest-api-client/api/ldap';
import type { LdapConfig } from '@n8n/rest-api-client/api/ldap';
import type { IDataObject } from 'n8n-workflow';

export const SupportedProtocols = {
	SAML: 'saml',
	OIDC: 'oidc',
} as const;

export type SupportedProtocolType = (typeof SupportedProtocols)[keyof typeof SupportedProtocols];

export const useSSOStore = defineStore('sso', () => {
	const rootStore = useRootStore();

	const authenticationMethod = ref<AuthenticationMethod | undefined>(undefined);
	const selectedAuthProtocol = ref<SupportedProtocolType | undefined>(undefined);
	const ssoManagedByEnv = ref(false);

	const showSsoLoginButton = computed(
		() =>
			(isSamlLoginEnabled.value &&
				isEnterpriseSamlEnabled.value &&
				isDefaultAuthenticationSaml.value) ||
			(isOidcLoginEnabled.value &&
				isEnterpriseOidcEnabled.value &&
				isDefaultAuthenticationOidc.value),
	);

	const getSSORedirectUrl = async (existingRedirect?: string) =>
		await ssoApi.initSSO(rootStore.restApiContext, existingRedirect);

	/**
	 * Browser URL that starts the login with the active SSO protocol. SAML asks the
	 * backend for its redirect; OIDC has a static login endpoint that takes the
	 * in-app destination as a query parameter and returns there after the callback.
	 */
	const getSsoLoginUrl = async (existingRedirect = ''): Promise<string> => {
		if (isDefaultAuthenticationSaml.value) {
			return await getSSORedirectUrl(existingRedirect);
		}

		const oidcLoginUrl = oidc.value.loginUrl;
		if (!oidcLoginUrl) {
			throw new Error('The OIDC login URL is not configured');
		}
		if (!existingRedirect) return oidcLoginUrl;

		const separator = oidcLoginUrl.includes('?') ? '&' : '?';
		return `${oidcLoginUrl}${separator}${new URLSearchParams({ redirect: existingRedirect })}`;
	};

	const initialize = (options: {
		authenticationMethod: AuthenticationMethod;
		managedByEnv?: boolean;
		config: {
			ldap?: Pick<LdapConfig, 'loginLabel' | 'loginEnabled'>;
			saml?: Pick<SamlPreferences, 'loginLabel' | 'loginEnabled'>;
			oidc?: Pick<OidcConfigDto, 'loginEnabled'> & {
				loginUrl?: string;
				callbackUrl?: string;
			};
		};
		features: {
			saml: boolean;
			ldap: boolean;
			oidc: boolean;
		};
	}) => {
		authenticationMethod.value = options.authenticationMethod;
		ssoManagedByEnv.value = options.managedByEnv ?? false;

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

		isEnterpriseOidcEnabled.value = options.features.oidc;
		if (options.config.oidc) {
			oidc.value.loginEnabled = options.config.oidc.loginEnabled;
			oidc.value.loginUrl = options.config.oidc.loginUrl || '';
			oidc.value.callbackUrl = options.config.oidc.callbackUrl || '';
		}
	};

	/**
	 * SAML
	 */

	const saml = ref<Pick<SamlPreferences, 'loginLabel' | 'loginEnabled'>>({
		loginLabel: '',
		loginEnabled: false,
	});

	const samlConfig = ref<SamlPreferences & SamlPreferencesExtractedData>();

	const isSamlLoginEnabled = computed({
		get: () => saml.value.loginEnabled,
		set: (value: boolean) => {
			saml.value.loginEnabled = value;
		},
	});

	const isEnterpriseSamlEnabled = ref(false);

	const isDefaultAuthenticationSaml = computed(
		() => authenticationMethod.value === AuthenticationMethod.Saml,
	);

	const getSamlMetadata = async () => await ssoApi.getSamlMetadata(rootStore.restApiContext);

	const getSamlConfig = async () => {
		const config = await ssoApi.getSamlConfig(rootStore.restApiContext);
		samlConfig.value = config;
		saml.value.loginEnabled = config.loginEnabled;
		saml.value.loginLabel = config.loginLabel;
		return config;
	};

	const saveSamlConfig = async (config: Partial<SamlPreferences>) =>
		await ssoApi.saveSamlConfig(rootStore.restApiContext, config);

	const testSamlConfig = async (config: Partial<SamlPreferences>) =>
		await ssoApi.testSamlConfig(rootStore.restApiContext, config);

	/**
	 * OIDC
	 */

	const oidc = ref<
		Pick<OidcConfigDto, 'loginEnabled'> & {
			loginUrl?: string;
			callbackUrl?: string;
		}
	>({
		loginUrl: '',
		loginEnabled: false,
		callbackUrl: '',
	});

	const oidcConfig = ref<OidcConfigDto | undefined>();

	const isEnterpriseOidcEnabled = ref(false);

	const getOidcConfig = async () => {
		const config = await ssoApi.getOidcConfig(rootStore.restApiContext);
		oidcConfig.value = config;
		oidc.value.loginEnabled = config.loginEnabled;
		return config;
	};

	const saveOidcConfig = async (config: OidcConfigDto) => {
		const savedConfig = await ssoApi.saveOidcConfig(rootStore.restApiContext, config);
		oidcConfig.value = savedConfig;
		return savedConfig;
	};

	const testOidcConfig = async () => await ssoApi.testOidcConfig(rootStore.restApiContext);

	const isOidcLoginEnabled = computed({
		get: () => oidc.value.loginEnabled,
		set: (value: boolean) => {
			oidc.value.loginEnabled = value;
		},
	});

	const isDefaultAuthenticationOidc = computed(
		() => authenticationMethod.value === AuthenticationMethod.Oidc,
	);

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

	const initializeSelectedProtocol = () => {
		if (selectedAuthProtocol.value) return;

		selectedAuthProtocol.value = isDefaultAuthenticationOidc.value
			? SupportedProtocols.OIDC
			: SupportedProtocols.SAML;
	};

	return {
		showSsoLoginButton,
		getSSORedirectUrl,
		getSsoLoginUrl,
		initialize,
		selectedAuthProtocol,
		initializeSelectedProtocol,
		ssoManagedByEnv,

		saml,
		samlConfig,
		isSamlLoginEnabled,
		isEnterpriseSamlEnabled,
		isDefaultAuthenticationSaml,
		getSamlMetadata,
		getSamlConfig,
		saveSamlConfig,
		testSamlConfig,

		oidc,
		oidcConfig,
		isOidcLoginEnabled,
		isEnterpriseOidcEnabled,
		isDefaultAuthenticationOidc,
		getOidcConfig,
		saveOidcConfig,
		testOidcConfig,

		ldap,
		isLdapLoginEnabled,
		isEnterpriseLdapEnabled,
		ldapLoginLabel,
		getLdapConfig,
		getLdapSynchronizations,
		testLdapConnection,
		updateLdapConfig,
		runLdapSync,
	};
});
