import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { stringify } from 'qs';

import { setAxiosAgents } from './axios-utils';

// Global axios defaults

axios.defaults.timeout = 300000;
// Prevent axios from adding x-form-www-urlencoded headers by default
axios.defaults.headers.post = {};
axios.defaults.headers.put = {};
axios.defaults.headers.patch = {};
axios.defaults.paramsSerializer = (params) => {
	if (params instanceof URLSearchParams) {
		return params.toString();
	}
	return stringify(params, { arrayFormat: 'indices' });
};
// Disable axios proxy, we handle it ourselves
// Axios proxy option has problems: https://github.com/axios/axios/issues/4531
axios.defaults.proxy = false;

// Interceptor (side effect)
axios.interceptors.request.use((config) => {
	// If no content-type is set by us, prevent axios from force-setting the content-type to `application/x-www-form-urlencoded`
	if (config.data === undefined) {
		// axios may provide an AxiosHeaders instance which exposes `setContentType`.
		// However, callers can also supply plain objects for `config.headers`.
		// Guard the call to avoid "setContentType is not a function" errors.
		const headersAny = config.headers as any;
		if (headersAny && typeof headersAny.setContentType === 'function') {
			headersAny.setContentType(false, false);
		} else if (headersAny && typeof headersAny === 'object') {
			// Ensure there's no Content-Type header set (case-insensitive).
			for (const key of Object.keys(headersAny)) {
				if (key.toLowerCase() === 'content-type') {
					delete headersAny[key];
				}
			}
		}
	}

	setAxiosAgents(config);
	applyVendorHeaders(config);

	return config;
});

function applyVendorHeaders(config: AxiosRequestConfig) {
	if ([config.url, config.baseURL].some((url) => url?.startsWith('https://api.openai.com/'))) {
		config.headers = {
			...Container.get(AiConfig).openAiDefaultHeaders,
			...(config.headers ?? {}),
		};
	}
}
