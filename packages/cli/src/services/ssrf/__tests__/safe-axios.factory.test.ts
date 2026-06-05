import { SsrfProtectionConfig } from '@n8n/config';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { mock } from 'jest-mock-extended';
import { createResultError, createResultOk } from 'n8n-workflow';

import { SafeAxiosFactory } from '../safe-axios.factory';
import type { SsrfProtectionService } from '../ssrf-protection.service';

function createConfig(overrides: Partial<SsrfProtectionConfig> = {}): SsrfProtectionConfig {
	const config = new SsrfProtectionConfig();
	Object.assign(config, overrides);
	return config;
}

/** Accesses the registered request interceptor's fulfilled handler. */
function getRequestInterceptor(instance: AxiosInstance) {
	const manager = instance.interceptors.request as unknown as {
		handlers: Array<{
			fulfilled: (config: AxiosRequestConfig) => Promise<AxiosRequestConfig>;
		} | null>;
	};
	return manager.handlers.filter((handler) => handler !== null);
}

describe('SafeAxiosFactory', () => {
	const ssrfProtectionService = mock<SsrfProtectionService>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('create', () => {
		it('registers a request interceptor when protection is enabled', () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);

			const instance = factory.create();

			expect(getRequestInterceptor(instance)).toHaveLength(1);
		});

		it('does not register a request interceptor when protection is disabled', () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: false }),
				ssrfProtectionService,
			);

			const instance = factory.create();

			expect(getRequestInterceptor(instance)).toHaveLength(0);
		});

		it('rejects the request when the target URL is blocked', async () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);
			const error = new Error('blocked');
			ssrfProtectionService.validateUrl.mockResolvedValue(createResultError(error));

			const instance = factory.create();
			const [interceptor] = getRequestInterceptor(instance);
			const config: AxiosRequestConfig = { url: 'http://169.254.169.254/latest' };

			await expect(interceptor.fulfilled(config)).rejects.toBe(error);
			expect(ssrfProtectionService.validateUrl).toHaveBeenCalledWith(
				'http://169.254.169.254/latest',
			);
		});

		it('applies secure agents to the request config when the URL is allowed', async () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);
			ssrfProtectionService.validateUrl.mockResolvedValue(createResultOk(undefined));
			ssrfProtectionService.createSecureLookup.mockReturnValue(jest.fn());

			const instance = factory.create();
			const [interceptor] = getRequestInterceptor(instance);
			const config: AxiosRequestConfig = { url: 'https://example.com/api' };

			const result = await interceptor.fulfilled(config);

			expect(result.httpsAgent).toBeDefined();
			expect(result.httpAgent).toBeDefined();
			expect(ssrfProtectionService.createSecureLookup).toHaveBeenCalled();
		});
	});

	describe('createUnsafe', () => {
		it('does not register the protection interceptor', () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);

			const instance = factory.createUnsafe();

			expect(getRequestInterceptor(instance)).toHaveLength(0);
		});
	});

	describe('validateUrl', () => {
		it('resolves without consulting the service when protection is disabled', async () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: false }),
				ssrfProtectionService,
			);

			await expect(factory.validateUrl('http://10.0.0.1')).resolves.toBeUndefined();
			expect(ssrfProtectionService.validateUrl).not.toHaveBeenCalled();
		});

		it('throws when the service reports the URL as blocked', async () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);
			const error = new Error('blocked');
			ssrfProtectionService.validateUrl.mockResolvedValue(createResultError(error));

			await expect(factory.validateUrl('http://10.0.0.1')).rejects.toBe(error);
		});
	});

	describe('secureLookup', () => {
		it('returns undefined when protection is disabled', () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: false }),
				ssrfProtectionService,
			);

			expect(factory.secureLookup()).toBeUndefined();
			expect(ssrfProtectionService.createSecureLookup).not.toHaveBeenCalled();
		});

		it('returns the secure lookup function when protection is enabled', () => {
			const factory = new SafeAxiosFactory(
				createConfig({ enabled: true }),
				ssrfProtectionService,
			);
			const lookup = jest.fn();
			ssrfProtectionService.createSecureLookup.mockReturnValue(lookup);

			expect(factory.secureLookup()).toBe(lookup);
		});
	});
});
