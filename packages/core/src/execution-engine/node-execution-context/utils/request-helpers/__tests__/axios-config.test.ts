import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosHeaders } from 'axios';

import '../axios-config';

const getRequestInterceptor = () => {
	const { handlers } = axios.interceptors.request as unknown as {
		handlers: Array<{
			fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
		} | null>;
	};
	const handler = handlers.find((h) => h !== null);
	if (!handler) throw new Error('axios request interceptor not registered');
	return handler.fulfilled;
};

const buildConfig = (url: string, headers = new AxiosHeaders()): InternalAxiosRequestConfig =>
	({ url, headers }) as InternalAxiosRequestConfig;

describe('axios request interceptor', () => {
	const interceptor = getRequestInterceptor();
	const [vendorHeaderName, vendorHeaderValue] = Object.entries(
		Container.get(AiConfig).openAiDefaultHeaders,
	)[0];

	it('preserves AxiosHeaders instance when applying OpenAI vendor headers', () => {
		const config = buildConfig('https://api.openai.com/v1/models');

		interceptor(config);

		expect(config.headers).toBeInstanceOf(AxiosHeaders);
		expect(config.headers.get(vendorHeaderName)).toBe(vendorHeaderValue);
	});

	it('lets caller-provided headers win over vendor defaults', () => {
		const headers = new AxiosHeaders({ [vendorHeaderName]: 'caller-override' });
		const config = buildConfig('https://api.openai.com/v1/models', headers);

		interceptor(config);

		expect(config.headers.get(vendorHeaderName)).toBe('caller-override');
	});

	it('does not apply vendor headers to non-OpenAI URLs', () => {
		const config = buildConfig('https://example.com/api');

		interceptor(config);

		expect(config.headers.get(vendorHeaderName)).toBeFalsy();
	});
});
