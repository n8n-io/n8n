import { STORES } from '@/constants';
import type { IRestApiContext, RootState } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useNodeTypesStore } from './nodeTypes.store';

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

		getRestApiContext(): IRestApiContext {
			return {
				baseUrl: this.getRestUrl,
				sessionId: this.sessionId,
			};
		},
		/**
		 * Getter for node default names ending with a number: `'S3'`, `'Magento 2'`, etc.
		 */
		nativelyNumberSuffixedDefaults: (): string[] => {
			return useNodeTypesStore().allNodeTypes.reduce<string[]>((acc, cur) => {
				if (/\d$/.test(cur.defaults.name as string)) acc.push(cur.defaults.name as string);
				return acc;
			}, []);
		},
	},
	actions: {
		setUrlBaseWebhook(urlBaseWebhook: string): void {
			const url = urlBaseWebhook.endsWith('/') ? urlBaseWebhook : `${urlBaseWebhook}/`;
			Vue.set(this, 'urlBaseWebhook', url);
		},
		setUrlBaseEditor(urlBaseEditor: string): void {
			const url = urlBaseEditor.endsWith('/') ? urlBaseEditor : `${urlBaseEditor}/`;
			Vue.set(this, 'urlBaseEditor', url);
		},
		setEndpointWebhook(endpointWebhook: string): void {
			Vue.set(this, 'endpointWebhook', endpointWebhook);
		},
		setEndpointWebhookTest(endpointWebhookTest: string): void {
			Vue.set(this, 'endpointWebhookTest', endpointWebhookTest);
		},
		setTimezone(timezone: string): void {
			Vue.set(this, 'timezone', timezone);
		},
		setExecutionTimeout(executionTimeout: number): void {
			Vue.set(this, 'executionTimeout', executionTimeout);
		},
		setMaxExecutionTimeout(maxExecutionTimeout: number): void {
			Vue.set(this, 'maxExecutionTimeout', maxExecutionTimeout);
		},
		setVersionCli(version: string): void {
			Vue.set(this, 'versionCli', version);
		},
		setInstanceId(instanceId: string): void {
			Vue.set(this, 'instanceId', instanceId);
		},
		setOauthCallbackUrls(urls: IDataObject): void {
			Vue.set(this, 'oauthCallbackUrls', urls);
		},
		setN8nMetadata(metadata: IDataObject): void {
			Vue.set(this, 'n8nMetadata', metadata);
		},
		setDefaultLocale(locale: string): void {
			Vue.set(this, 'defaultLocale', locale);
		},
		setIsNpmAvailable(isNpmAvailable: boolean): void {
			Vue.set(this, 'isNpmAvailable', isNpmAvailable);
		},
	},
});
