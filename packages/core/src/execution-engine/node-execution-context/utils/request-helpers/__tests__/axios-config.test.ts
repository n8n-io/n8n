import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosHeaders } from 'axios';

import '../axios-config';

const getRequestInterceptor = () => {
	const handlers = (
		axios.interceptors.request as unknown as {
			handlers: Array<{ fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig } | null>;
		}
	).handlers;
	const handler = handlers.find((h) => h !== null);
	if (!handler) throw new Error('axios request interceptor not registered');
	return handler.fulfilled;
};

const buildConfig = (
	overrides: Partial<InternalAxiosRequestConfig> = {},
): InternalAxiosRequestConfig => ({
	headers: new AxiosHeaders(),
	...overrides,
}) as InternalAxiosRequestConfig;

describe('axios request interceptor', () => {
	describe('applyVendorHeaders for api.openai.com', () => {
		const [vendorHeaderName, vendorHeaderValue] = Object.entries(
			Container.get(AiConfig).openAiDefaultHeaders,
		)[0];

		it('keeps config.headers as an AxiosHeaders instance so the interceptor is re-runnable', () => {
			const interceptor = getRequestInterceptor();
			const config = buildConfig({ url: 'https://api.openai.com/v1/models' });

			interceptor(config);

			expect(() => interceptor(config)).not.toThrow();
			expect(config.headers).toBeInstanceOf(AxiosHeaders);
		});

		it('applies vendor headers to api.openai.com requests', () => {
			const interceptor = getRequestInterceptor();
			const config = buildConfig({ url: 'https://api.openai.com/v1/models' });

			interceptor(config);

			expect(new AxiosHeaders(config.headers).get(vendorHeaderName)).toBe(vendorHeaderValue);
		});

		it('lets caller-provided headers win over vendor defaults', () => {
			const interceptor = getRequestInterceptor();
			const headers = new AxiosHeaders();
			headers.set(vendorHeaderName, 'caller-override');
			const config = buildConfig({ url: 'https://api.openai.com/v1/models', headers });

			interceptor(config);

			expect(new AxiosHeaders(config.headers).get(vendorHeaderName)).toBe('caller-override');
		});

		it('does not apply vendor headers to non-OpenAI URLs', () => {
			const interceptor = getRequestInterceptor();
			const config = buildConfig({ url: 'https://example.com/api' });

			interceptor(config);

			expect(new AxiosHeaders(config.headers).get(vendorHeaderName)).toBeFalsy();
		});
	});
});
