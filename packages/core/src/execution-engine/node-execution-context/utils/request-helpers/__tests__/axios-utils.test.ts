import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';

import { createHttpProxyAgent, createHttpsProxyAgent } from '@/http-proxy';

import {
	buildTargetUrl,
	createFormDataObject,
	digestAuthAxiosConfig,
	generateContentLengthHeader,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	getUrlFromProxyConfig,
	isIgnoreStatusErrorConfig,
	searchForHeader,
	setAxiosAgents,
	tryParseUrl,
} from '../axios-utils';

jest.mock('@/http-proxy', () => ({
	createHttpProxyAgent: jest.fn((_proxy, _url, opts) => ({ type: 'http', ...opts })),
	createHttpsProxyAgent: jest.fn((_proxy, _url, opts) => ({ type: 'https', ...opts })),
}));

describe('isIgnoreStatusErrorConfig', () => {
	test('should return true for valid IgnoreStatusErrorConfig', () => {
		expect(isIgnoreStatusErrorConfig({ ignore: true, except: [401] })).toBe(true);
		expect(isIgnoreStatusErrorConfig({ ignore: true })).toBe(true);
	});

	test('should return false when ignore is not true', () => {
		expect(isIgnoreStatusErrorConfig({ ignore: false })).toBe(false);
	});

	test('should return false for non-object values', () => {
		expect(isIgnoreStatusErrorConfig(true)).toBe(false);
		expect(isIgnoreStatusErrorConfig(null)).toBe(false);
		expect(isIgnoreStatusErrorConfig(undefined)).toBe(false);
		expect(isIgnoreStatusErrorConfig('string')).toBe(false);
	});
});

describe('searchForHeader', () => {
	test('should find header case-insensitively', () => {
		const config: AxiosRequestConfig = {
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
		};
		expect(searchForHeader(config, 'content-type')).toBe('Content-Type');
		expect(searchForHeader(config, 'AUTHORIZATION')).toBe('Authorization');
	});

	test('should return undefined when header is not found', () => {
		const config: AxiosRequestConfig = { headers: { 'Content-Type': 'application/json' } };
		expect(searchForHeader(config, 'Authorization')).toBeUndefined();
	});

	test('should return undefined when headers are undefined', () => {
		expect(searchForHeader({}, 'Content-Type')).toBeUndefined();
	});
});

describe('getHostFromRequestObject', () => {
	test('should extract hostname from url', () => {
		expect(getHostFromRequestObject({ url: 'https://example.com/path' })).toBe('example.com');
	});

	test('should extract hostname from uri', () => {
		expect(getHostFromRequestObject({ uri: 'https://example.com/path' })).toBe('example.com');
	});

	test('should resolve relative url with baseURL', () => {
		expect(getHostFromRequestObject({ url: '/path', baseURL: 'https://example.com' })).toBe(
			'example.com',
		);
	});

	test('should return null for invalid URLs', () => {
		expect(getHostFromRequestObject({ url: 'not-a-url' })).toBeNull();
		expect(getHostFromRequestObject({})).toBeNull();
	});
});

describe('getBeforeRedirectFn', () => {
	const agentOptions = { rejectUnauthorized: true };
	const axiosConfig: AxiosRequestConfig = {
		url: 'https://example.com/api',
		headers: { Authorization: 'Bearer token' },
		auth: { username: 'user', password: 'pass' },
	};

	test('should copy auth headers on same-origin redirect', () => {
		const beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig, undefined, false);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://example.com/other',
			hostname: 'example.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect((redirectedRequest.headers as Record<string, string>).Authorization).toBe(
			'Bearer token',
		);
		expect(redirectedRequest.auth).toBe('user:pass');
	});

	test('should not copy auth headers on cross-origin redirect when disabled', () => {
		const beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig, undefined, false);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://other.com/api',
			hostname: 'other.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect((redirectedRequest.headers as Record<string, string>).Authorization).toBeUndefined();
		expect(redirectedRequest.auth).toBeUndefined();
	});

	test('should copy auth headers on cross-origin redirect when enabled', () => {
		const beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig, undefined, true);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://other.com/api',
			hostname: 'other.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect((redirectedRequest.headers as Record<string, string>).Authorization).toBe(
			'Bearer token',
		);
	});

	test('should call ssrfBridge.validateRedirectSync when provided', () => {
		const ssrfBridge = {
			validateRedirectSync: jest.fn(),
			createSecureLookup: jest.fn().mockReturnValue(jest.fn()),
			validateIp: jest.fn(),
			validateUrl: jest.fn(),
		};

		const beforeRedirect = getBeforeRedirectFn(
			agentOptions,
			axiosConfig,
			undefined,
			false,
			undefined,
			ssrfBridge,
		);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://example.com/other',
			hostname: 'example.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect(ssrfBridge.validateRedirectSync).toHaveBeenCalledWith('https://example.com/other');
	});

	test('should resolve proxy URL from proxyConfig and pass it to agent factories', () => {
		const { createHttpProxyAgent, createHttpsProxyAgent } = jest.requireMock('@/http-proxy');
		createHttpProxyAgent.mockClear();
		createHttpsProxyAgent.mockClear();

		const beforeRedirect = getBeforeRedirectFn(
			agentOptions,
			axiosConfig,
			'http://proxy:8080',
			false,
		);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://example.com/other',
			hostname: 'example.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect(createHttpProxyAgent).toHaveBeenCalledWith(
			'http://proxy:8080',
			'https://example.com/other',
			expect.objectContaining({ servername: 'example.com' }),
		);
		expect(createHttpsProxyAgent).toHaveBeenCalledWith(
			'http://proxy:8080',
			'https://example.com/other',
			expect.objectContaining({ servername: 'example.com' }),
		);
	});

	test('should set https agent for https redirects', () => {
		const beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig, undefined, false);
		const redirectedRequest: Record<string, unknown> = {
			href: 'https://example.com/other',
			hostname: 'example.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect((redirectedRequest.agent as { type: string }).type).toBe('https');
	});

	test('should set http agent for http redirects', () => {
		const configWithHttp: AxiosRequestConfig = { url: 'http://example.com/api' };
		const beforeRedirect = getBeforeRedirectFn(agentOptions, configWithHttp, undefined, false);
		const redirectedRequest: Record<string, unknown> = {
			href: 'http://example.com/other',
			hostname: 'example.com',
			headers: {} as Record<string, string>,
			agents: {},
		};

		beforeRedirect(redirectedRequest);

		expect((redirectedRequest.agent as { type: string }).type).toBe('http');
	});
});

describe('digestAuthAxiosConfig', () => {
	test('should build a Digest Authorization header', () => {
		const axiosConfig: AxiosRequestConfig = {
			method: 'GET',
			url: 'https://example.com/protected',
		};
		const response = {
			headers: {
				'www-authenticate':
					'Digest realm="test-realm", nonce="test-nonce", qop="auth", opaque="test-opaque"',
			},
		} as unknown as AxiosResponse;
		const auth = { username: 'user', password: 'pass' };

		const result = digestAuthAxiosConfig(axiosConfig, response, auth);

		expect(result.headers?.authorization).toMatch(
			/^Digest username="user",realm="test-realm",nonce="test-nonce"/,
		);
		expect(result.headers?.authorization).toContain('opaque="test-opaque"');
		expect(result.headers?.authorization).toContain('algorithm="MD5"');
	});

	test('should omit opaque when not present in challenge', () => {
		const axiosConfig: AxiosRequestConfig = {
			method: 'GET',
			url: 'https://example.com/protected',
		};
		const response = {
			headers: {
				'www-authenticate': 'Digest realm="test-realm", nonce="test-nonce", qop="auth"',
			},
		} as unknown as AxiosResponse;
		const auth = { username: 'user', password: 'pass' };

		const result = digestAuthAxiosConfig(axiosConfig, response, auth);

		expect(result.headers?.authorization).not.toContain('opaque=');
	});
});

describe('createFormDataObject', () => {
	/** Collects all buffered entries from a FormData instance into a flat list. */
	const getFormDataEntries = (formData: FormData) => {
		// Access the internal _streams array that form-data uses to buffer appended values.
		// Each append produces 3 consecutive entries: header string, value, and footer string.
		// @ts-expect-error accessing internal field
		const streams: unknown[] = formData._streams as unknown[];
		const entries: Array<{ key: string; value: string | Buffer }> = [];
		for (let i = 0; i < streams.length; i += 3) {
			const header = String(streams[i]);
			const nameMatch = header.match(/name="([^"]+)"/);
			if (nameMatch) {
				entries.push({ key: nameMatch[1], value: streams[i + 1] as string | Buffer });
			}
		}
		return entries;
	};

	test('should create FormData with simple key-value pairs', () => {
		const data = { key1: 'value1', key2: 'value2' };
		const formData = createFormDataObject(data);

		const entries = getFormDataEntries(formData);
		expect(entries).toEqual([
			{ key: 'key1', value: 'value1' },
			{ key: 'key2', value: 'value2' },
		]);
	});

	test('should handle array values', () => {
		const data = { files: ['file1.txt', 'file2.txt'] };
		const formData = createFormDataObject(data);

		const entries = getFormDataEntries(formData);
		expect(entries).toEqual([
			{ key: 'files', value: 'file1.txt' },
			{ key: 'files', value: 'file2.txt' },
		]);
	});

	test('should handle complex form data with options', () => {
		const data = {
			file: {
				value: Buffer.from('test content'),
				options: {
					filename: 'test.txt',
					contentType: 'text/plain',
				},
			},
		};

		const formData = createFormDataObject(data);

		const entries = getFormDataEntries(formData);
		expect(entries).toHaveLength(1);
		expect(entries[0].key).toBe('file');
		expect(Buffer.isBuffer(entries[0].value)).toBe(true);
		expect((entries[0].value as Buffer).toString()).toBe('test content');

		// Verify the options were passed through (filename appears in the header)
		// @ts-expect-error accessing internal field
		const streams: unknown[] = formData._streams as unknown[];
		const header = String(streams[0]);
		expect(header).toContain('filename="test.txt"');
		expect(header).toContain('Content-Type: text/plain');
	});
});

describe('generateContentLengthHeader', () => {
	test('should set content-length header for FormData', async () => {
		const formData = new FormData();
		formData.append('key', 'value');

		const config: AxiosRequestConfig = { data: formData, headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers!['content-length']).toBeGreaterThan(0);
	});

	test('should skip non-FormData bodies', async () => {
		const config: AxiosRequestConfig = { data: { key: 'value' }, headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers!['content-length']).toBeUndefined();
	});
});

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

		expect(config.httpAgent).toEqual({ type: 'http' });
		expect(config.httpsAgent).toEqual({ type: 'https' });
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
