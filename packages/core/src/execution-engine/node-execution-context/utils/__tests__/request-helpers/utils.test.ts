import type { AxiosRequestConfig } from 'axios';

import { createHttpProxyAgent, createHttpsProxyAgent } from '@/http-proxy';

import {
	buildTargetUrl,
	getUrlFromProxyConfig,
	setAxiosAgents,
	tryParseUrl,
} from '../../request-helpers/utils';

jest.mock('@/http-proxy', () => ({
	createHttpProxyAgent: jest.fn().mockReturnValue('http-agent'),
	createHttpsProxyAgent: jest.fn().mockReturnValue('https-agent'),
}));

describe('tryParseUrl', () => {
	it('should return URL object for valid URL', () => {
		const result = tryParseUrl('https://example.com/path');
		expect(result).toBeInstanceOf(URL);
		expect(result?.href).toBe('https://example.com/path');
	});

	it('should return null for invalid URL', () => {
		expect(tryParseUrl('not-a-url')).toBeNull();
	});

	it('should return null for empty string', () => {
		expect(tryParseUrl('')).toBeNull();
	});
});

describe('getUrlFromProxyConfig', () => {
	it('should return valid string proxy as-is', () => {
		expect(getUrlFromProxyConfig('http://proxy.example.com:8080')).toBe(
			'http://proxy.example.com:8080',
		);
	});

	it('should return null for invalid string proxy', () => {
		expect(getUrlFromProxyConfig('not-a-url')).toBeNull();
	});

	it('should return null for empty string', () => {
		expect(getUrlFromProxyConfig('')).toBeNull();
	});

	it('should build URL from object proxy config', () => {
		expect(getUrlFromProxyConfig({ host: 'proxy.example.com', port: 8080 })).toBe(
			'http://proxy.example.com:8080/',
		);
	});

	it('should use specified protocol', () => {
		expect(
			getUrlFromProxyConfig({ protocol: 'https', host: 'proxy.example.com', port: 9443 }),
		).toBe('https://proxy.example.com:9443/');
	});

	it('should strip trailing colon from protocol', () => {
		expect(
			getUrlFromProxyConfig({ protocol: 'https:', host: 'proxy.example.com', port: 9443 }),
		).toBe('https://proxy.example.com:9443/');
	});

	it('should include auth credentials', () => {
		const result = getUrlFromProxyConfig({
			host: 'proxy.example.com',
			port: 8080,
			auth: { username: 'user', password: 'pass' },
		});
		expect(result).toBe('http://user:pass@proxy.example.com:8080/');
	});

	it('should return null when host is missing', () => {
		expect(getUrlFromProxyConfig({ host: '', port: 8080 })).toBeNull();
	});

	it('should return null for undefined proxy config', () => {
		expect(getUrlFromProxyConfig(undefined as unknown as string)).toBeNull();
	});
});

describe('buildTargetUrl', () => {
	it('should return url as-is when no baseURL', () => {
		expect(buildTargetUrl('https://example.com/path')).toBe('https://example.com/path');
	});

	it('should resolve relative url against baseURL', () => {
		expect(buildTargetUrl('/path', 'https://example.com')).toBe('https://example.com/path');
	});

	it('should return undefined for falsy url', () => {
		expect(buildTargetUrl(undefined)).toBeUndefined();
		expect(buildTargetUrl('')).toBeUndefined();
	});

	it('should return undefined for invalid URL combination', () => {
		expect(buildTargetUrl('not valid', 'also not valid')).toBeUndefined();
	});

	it('should prefer absolute url over baseURL', () => {
		expect(buildTargetUrl('https://other.com/path', 'https://example.com')).toBe(
			'https://other.com/path',
		);
	});
});

describe('setAxiosAgents', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should set httpAgent and httpsAgent on config', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com/api' };

		setAxiosAgents(config);

		expect(config.httpAgent).toBe('http-agent');
		expect(config.httpsAgent).toBe('https-agent');
		expect(createHttpProxyAgent).toHaveBeenCalledWith(null, 'https://example.com/api', undefined);
		expect(createHttpsProxyAgent).toHaveBeenCalledWith(null, 'https://example.com/api', undefined);
	});

	it('should not override existing agents', () => {
		const existingAgent = {};
		const config: AxiosRequestConfig = {
			url: 'https://example.com',
			httpAgent: existingAgent,
		};

		setAxiosAgents(config);

		expect(config.httpAgent).toBe(existingAgent);
		expect(createHttpProxyAgent).not.toHaveBeenCalled();
	});

	it('should not set agents when url is missing', () => {
		const config: AxiosRequestConfig = {};

		setAxiosAgents(config);

		expect(config.httpAgent).toBeUndefined();
		expect(config.httpsAgent).toBeUndefined();
	});

	it('should pass proxy URL to agent factories', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };

		setAxiosAgents(config, undefined, 'http://proxy:8080');

		expect(createHttpProxyAgent).toHaveBeenCalledWith(
			'http://proxy:8080',
			'https://example.com',
			undefined,
		);
	});

	it('should inject secureLookup when no proxy is configured', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };
		const secureLookup = jest.fn();

		setAxiosAgents(config, {}, undefined, secureLookup as never);

		expect(createHttpProxyAgent).toHaveBeenCalledWith(null, 'https://example.com', {
			lookup: secureLookup,
		});
	});

	it('should not inject secureLookup when proxy is configured', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };
		const secureLookup = jest.fn();

		setAxiosAgents(config, {}, 'http://proxy:8080', secureLookup as never);

		expect(createHttpProxyAgent).toHaveBeenCalledWith(
			'http://proxy:8080',
			'https://example.com',
			{},
		);
	});
});
