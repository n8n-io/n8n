import { CLOUD_BASE_URL_PRODUCTION, CLOUD_BASE_URL_STAGING, STORES } from '@/constants';
import type { RootState } from '@/Interface';
import { randomString, setGlobalState } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const { VUE_APP_URL_BASE_API } = import.meta.env;

export const useRootStore = defineStore(STORES.ROOT, () => {
	const state = ref({
		baseUrl: VUE_APP_URL_BASE_API ?? window.BASE_PATH,
		restEndpoint:
			!window.REST_ENDPOINT || window.REST_ENDPOINT === '{{REST_ENDPOINT}}'
				? 'rest'
				: window.REST_ENDPOINT,
		defaultLocale: 'en',
		endpointForm: 'form',
		endpointFormTest: 'form-test',
		endpointFormWaiting: 'form-waiting',
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		endpointWebhookWaiting: 'webhook-waiting',
		timezone: 'America/New_York',
		executionTimeout: -1,
		maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
		versionCli: '0.0.0',
		oauthCallbackUrls: {},
		n8nMetadata: {},
		pushRef: randomString(10).toLowerCase(),
		urlBaseWebhook: 'http://localhost:5678/',
		urlBaseEditor: 'http://localhost:5678',
		instanceId: '',
		binaryDataMode: 'default',
	});

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const baseUrl = computed(() => state.value.baseUrl);

	const formUrl = computed(() => `${state.value.urlBaseWebhook}${state.value.endpointForm}`);

	const formTestUrl = computed(() => `${state.value.urlBaseEditor}${state.value.endpointFormTest}`);

	const formWaitingUrl = computed(
		() => `${state.value.urlBaseEditor}${state.value.endpointFormWaiting}`,
	);

	const webhookUrl = computed(() => `${state.value.urlBaseWebhook}${state.value.endpointWebhook}`);

	const webhookWaitingUrl = computed(
		() => `${state.value.urlBaseEditor}${state.value.endpointWebhookWaiting}`,
	);

	const pushRef = computed(() => state.value.pushRef);

	const binaryDataMode = computed(() => state.value.binaryDataMode);

	const defaultLocale = computed(() => state.value.defaultLocale);

	const urlBaseEditor = computed(() => state.value.urlBaseEditor);

	const instanceId = computed(() => state.value.instanceId);

	const versionCli = computed(() => state.value.versionCli);

	const OAuthCallbackUrls = computed(() => state.value.oauthCallbackUrls);

	const webhookTestUrl = computed(
		() => `${state.value.urlBaseEditor}${state.value.endpointWebhookTest}`,
	);

	const restUrl = computed(() => `${state.value.baseUrl}${state.value.restEndpoint}`);

	const executionTimeout = computed(() => state.value.executionTimeout);

	const maxExecutionTimeout = computed(() => state.value.maxExecutionTimeout);

	const timezone = computed(() => state.value.timezone);

	const restCloudApiContext = computed(() => ({
		baseUrl: window.location.host.includes('stage-app.n8n.cloud')
			? CLOUD_BASE_URL_STAGING
			: CLOUD_BASE_URL_PRODUCTION,
		pushRef: '',
	}));

	const restApiContext = computed(() => ({
		baseUrl: restUrl.value,
		pushRef: state.value.pushRef,
	}));

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const setUrlBaseWebhook = (urlBaseWebhook: string) => {
		const url = urlBaseWebhook.endsWith('/') ? urlBaseWebhook : `${urlBaseWebhook}/`;
		state.value.urlBaseWebhook = url;
	};

	const setUrlBaseEditor = (urlBaseEditor: string) => {
		const url = urlBaseEditor.endsWith('/') ? urlBaseEditor : `${urlBaseEditor}/`;
		state.value.urlBaseEditor = url;
	};

	const setEndpointForm = (endpointForm: string) => {
		state.value.endpointForm = endpointForm;
	};

	const setEndpointFormTest = (endpointFormTest: string) => {
		state.value.endpointFormTest = endpointFormTest;
	};

	const setEndpointFormWaiting = (endpointFormWaiting: string) => {
		state.value.endpointFormWaiting = endpointFormWaiting;
	};

	const setEndpointWebhook = (endpointWebhook: string) => {
		state.value.endpointWebhook = endpointWebhook;
	};

	const setEndpointWebhookTest = (endpointWebhookTest: string) => {
		state.value.endpointWebhookTest = endpointWebhookTest;
	};

	const setEndpointWebhookWaiting = (endpointWebhookWaiting: string) => {
		state.value.endpointWebhookWaiting = endpointWebhookWaiting;
	};

	const setTimezone = (timezone: string) => {
		state.value.timezone = timezone;
		setGlobalState({ defaultTimezone: timezone });
	};

	const setExecutionTimeout = (executionTimeout: number) => {
		state.value.executionTimeout = executionTimeout;
	};

	const setMaxExecutionTimeout = (maxExecutionTimeout: number) => {
		state.value.maxExecutionTimeout = maxExecutionTimeout;
	};

	const setVersionCli = (version: string) => {
		state.value.versionCli = version;
	};

	const setInstanceId = (instanceId: string) => {
		state.value.instanceId = instanceId;
	};

	const setOauthCallbackUrls = (urls: RootState['oauthCallbackUrls']) => {
		state.value.oauthCallbackUrls = urls;
	};

	const setN8nMetadata = (metadata: RootState['n8nMetadata']) => {
		state.value.n8nMetadata = metadata;
	};

	const setDefaultLocale = (locale: string) => {
		state.value.defaultLocale = locale;
	};

	const setBinaryDataMode = (binaryDataMode: string) => {
		state.value.binaryDataMode = binaryDataMode;
	};

	// #endregion

	return {
		baseUrl,
		formUrl,
		formTestUrl,
		formWaitingUrl,
		webhookUrl,
		webhookTestUrl,
		webhookWaitingUrl,
		restUrl,
		restCloudApiContext,
		restApiContext,
		urlBaseEditor,
		versionCli,
		instanceId,
		pushRef,
		defaultLocale,
		binaryDataMode,
		OAuthCallbackUrls,
		executionTimeout,
		maxExecutionTimeout,
		timezone,
		setUrlBaseWebhook,
		setUrlBaseEditor,
		setEndpointForm,
		setEndpointFormTest,
		setEndpointFormWaiting,
		setEndpointWebhook,
		setEndpointWebhookTest,
		setEndpointWebhookWaiting,
		setTimezone,
		setExecutionTimeout,
		setMaxExecutionTimeout,
		setVersionCli,
		setInstanceId,
		setOauthCallbackUrls,
		setN8nMetadata,
		setDefaultLocale,
		setBinaryDataMode,
	};
});
