import { CLOUD_BASE_URL_PRODUCTION, CLOUD_BASE_URL_STAGING, STORES } from '@/constants';
import type { IRestApiContext, RootState } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { defineStore } from 'pinia';

const { VUE_APP_URL_BASE_API } = import.meta.env;

export const useRootStore = defineStore(STORES.ROOT, {
	state: (): RootState => ({
		baseUrl:
			VUE_APP_URL_BASE_API ?? (window.BASE_PATH === '/{{BASE_PATH}}/' ? '/' : window.BASE_PATH),
		restEndpoint:
			!window.REST_ENDPOINT || window.REST_ENDPOINT === '{{REST_ENDPOINT}}'
				? 'rest'
				: window.REST_ENDPOINT,
		defaultLocale: 'en',
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		pushConnectionActive: true,
		timezone: 'America/New_York',
		executionTimeout: -1,
		maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
		versionCli: '0.0.0',
		oauthCallbackUrls: {},
		n8nMetadata: {},
		sessionId: Math.random().toString(36).substring(2, 15),
		urlBaseWebhook: 'http://localhost:5678/',
		urlBaseEditor: 'http://localhost:5678',
		isNpmAvailable: false,
		instanceId: '',
	}),
	getters: {
		getBaseUrl(): string {
			return this.baseUrl;
		},

		getWebhookUrl(): string {
			return `${this.urlBaseWebhook}${this.endpointWebhook}`;
		},

		getWebhookTestUrl(): string {
			return `${this.urlBaseEditor}${this.endpointWebhookTest}`;
		},

		getRestUrl(): string {
			return `${this.baseUrl}${this.restEndpoint}`;
		},

		getRestCloudApiContext(): IRestApiContext {
			return {
				baseUrl: window.location.host.includes('stage-app.n8n.cloud')
					? CLOUD_BASE_URL_STAGING
					: CLOUD_BASE_URL_PRODUCTION,
				sessionId: '',
			};
		},

		getRestApiContext(): IRestApiContext {
			return {
				baseUrl: this.getRestUrl,
				sessionId: this.sessionId,
			};
		},
	},
	actions: {
		setUrlBaseWebhook(urlBaseWebhook: string): void {
			const url = urlBaseWebhook.endsWith('/') ? urlBaseWebhook : `${urlBaseWebhook}/`;
			this.urlBaseWebhook = url;
		},
		setUrlBaseEditor(urlBaseEditor: string): void {
			const url = urlBaseEditor.endsWith('/') ? urlBaseEditor : `${urlBaseEditor}/`;
			this.urlBaseEditor = url;
		},
		setEndpointWebhook(endpointWebhook: string): void {
			this.endpointWebhook = endpointWebhook;
		},
		setEndpointWebhookTest(endpointWebhookTest: string): void {
			this.endpointWebhookTest = endpointWebhookTest;
		},
		setTimezone(timezone: string): void {
			this.timezone = timezone;
		},
		setExecutionTimeout(executionTimeout: number): void {
			this.executionTimeout = executionTimeout;
		},
		setMaxExecutionTimeout(maxExecutionTimeout: number): void {
			this.maxExecutionTimeout = maxExecutionTimeout;
		},
		setVersionCli(version: string): void {
			this.versionCli = version;
		},
		setInstanceId(instanceId: string): void {
			this.instanceId = instanceId;
		},
		setOauthCallbackUrls(urls: IDataObject): void {
			this.oauthCallbackUrls = urls;
		},
		setN8nMetadata(metadata: IDataObject): void {
			this.n8nMetadata = metadata as RootState['n8nMetadata'];
		},
		setDefaultLocale(locale: string): void {
			this.defaultLocale = locale;
		},
		setIsNpmAvailable(isNpmAvailable: boolean): void {
			this.isNpmAvailable = isNpmAvailable;
		},
	},
});
