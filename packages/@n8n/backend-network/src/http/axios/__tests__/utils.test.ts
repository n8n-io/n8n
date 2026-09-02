import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { mock } from 'vitest-mock-extended';

import { makeSsrfBridge } from '../../../ssrf/__tests__/mock-ssrf-bridge';
import { buildNodeAgents } from '../../node-agents';
import {
	buildAgentOptions,
	buildTargetUrl,
	createFormDataObject,
	digestAuthAxiosConfig,
	generateContentLengthHeader,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	getRedirectLocation,
	getUrlFromProxyConfig,
	isIgnoreStatusErrorConfig,
	isProxyPotentiallyActive,
	isRedirectStatus,
	resolveLegacyRequestTarget,
	resolveLegacyRequestUrl,
	searchForHeader,
	setAxiosAgents,
	throwIfDomainNotAllowed,
	tryParseUrl,
	validateProxySsrf,
} from '../utils';

// Agent construction is owned by `buildNodeAgents` (./factory).
// SSRF lookup injection is exercised there; here we only assert the transport
// policy (proxy + ssrf option) that the axios utils forward to it.
vi.mock('../../node-agents', () => ({
	buildNodeAgents: vi.fn((_proxy, _ssrf, opts?: Record<string, unknown>) => ({
		httpAgent: { type: 'http', ...opts },
		httpsAgent: { type: 'https', ...opts },
	})),
	isSupportedProxyUrl: (value: string | null | undefined) =>
		typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')),
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

describe('throwIfDomainNotAllowed', () => {
	test('should not throw when the host is on the allowlist', () => {
		expect(() =>
			throwIfDomainNotAllowed({ url: 'https://example.com/api' }, 'example.com'),
		).not.toThrow();
	});

	test('should not throw when no allowlist is configured', () => {
		expect(() => throwIfDomainNotAllowed({ url: 'https://other.com/api' })).not.toThrow();
	});

	test('should throw when the host is off the allowlist', () => {
		expect(() => throwIfDomainNotAllowed({ url: 'https://other.com/api' }, 'example.com')).toThrow(
			'Domain not allowed: This credential is restricted from accessing other.com. Only the following domains are allowed: example.com',
		);
	});

	test('should exclude query parameters from the message', () => {
		expect(() =>
			throwIfDomainNotAllowed(
				{ url: 'https://other.com/api', params: { api_key: 'query-param-value' } },
				'example.com',
			),
		).not.toThrow(/query-param-value/);
	});

	test('should exclude a query string already present on the url', () => {
		expect(() =>
			throwIfDomainNotAllowed({ url: 'https://other.com/api?api_key=inline-value' }, 'example.com'),
		).not.toThrow(/inline-value/);
	});

	test('should resolve the target against baseURL', () => {
		expect(() =>
			throwIfDomainNotAllowed({ baseURL: 'https://example.com', url: '/api' }, 'example.com'),
		).not.toThrow();

		expect(() =>
			throwIfDomainNotAllowed(
				{ baseURL: 'https://other.com', url: '/api', params: { api_key: 'base-url-value' } },
				'example.com',
			),
		).not.toThrow(/base-url-value/);
	});

	test('should accept a plain url string', () => {
		expect(() => throwIfDomainNotAllowed('https://example.com/api', 'example.com')).not.toThrow();
		expect(() => throwIfDomainNotAllowed('https://other.com/api', 'example.com')).toThrow(
			'Domain not allowed',
		);
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
			validateRedirectSync: vi.fn(),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
			validateIp: vi.fn(),
			validateUrl: vi.fn(),
			validateConnectionHost: vi.fn(),
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

	test('should resolve proxy URL from proxyConfig and pass it to buildNodeAgents', () => {
		vi.mocked(buildNodeAgents).mockClear();

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

		expect(buildNodeAgents).toHaveBeenCalledWith(
			'http://proxy:8080',
			'disabled',
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

describe('validateProxySsrf', () => {
	const denyingBridge = (deniedHostname: string, error: Error) =>
		makeSsrfBridge({
			validateUrl: vi.fn(async (url: string | URL) => {
				const hostname = typeof url === 'string' ? new URL(url).hostname : url.hostname;
				return await Promise.resolve(
					hostname === deniedHostname
						? { ok: false as const, error }
						: { ok: true as const, result: undefined },
				);
			}),
		});

	it.each([
		['a proxy URL string', 'http://proxy.example.com:8080'],
		['a proxy config object', { host: 'proxy.example.com', port: 8080 }],
	])('throws when the policy denies the host of %s', async (_label, proxyConfig) => {
		const error = new Error('The proxy host is not permitted by policy');

		await expect(
			validateProxySsrf(proxyConfig, denyingBridge('proxy.example.com', error)),
		).rejects.toBe(error);
	});

	it('validates the URL composed from a proxy config object', async () => {
		const bridge = makeSsrfBridge();

		await validateProxySsrf(
			{
				protocol: 'https',
				host: 'proxy.example.com',
				port: 9443,
				auth: { username: 'user', password: 'pass' },
			},
			bridge,
		);

		expect(bridge.validateUrl).toHaveBeenCalledWith(
			expect.objectContaining({ href: 'https://user:pass@proxy.example.com:9443/' }),
		);
	});

	it.each([
		['no proxy is configured', undefined],
		['the proxy config has no host', { host: '', port: 8080 }],
		['the proxy scheme is not supported', 'socks5://proxy.example.com:1080'],
		['the proxy value is not a URL', 'not-a-url'],
	])('does not consult the policy when %s', async (_label, proxyConfig) => {
		const bridge = makeSsrfBridge();

		await validateProxySsrf(proxyConfig, bridge);

		expect(bridge.validateUrl).not.toHaveBeenCalled();
	});

	it('does not consult the policy when no bridge is provided', async () => {
		await expect(validateProxySsrf('http://proxy.example.com:8080')).resolves.toBeUndefined();
	});
});

describe('buildTargetUrl', () => {
	it('should return url as-is when no baseURL', () => {
		expect(buildTargetUrl('https://example.com/path')).toBe('https://example.com/path');
	});

	it('should resolve relative url against baseURL', () => {
		expect(buildTargetUrl('/path', 'https://example.com')).toBe('https://example.com/path');
	});

	it('should return undefined for falsy url without a baseURL', () => {
		expect(buildTargetUrl(undefined)).toBeUndefined();
		expect(buildTargetUrl('')).toBeUndefined();
	});

	it('should fall back to baseURL for a falsy url', () => {
		expect(buildTargetUrl(undefined, 'https://example.com/path')).toBe('https://example.com/path');
		expect(buildTargetUrl('', 'https://example.com/path')).toBe('https://example.com/path');
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

describe('resolveLegacyRequestTarget', () => {
	it('should return the url', () => {
		expect(resolveLegacyRequestTarget({ url: 'https://example.com/path' })).toBe(
			'https://example.com/path',
		);
	});

	it('should return the uri when no url is set', () => {
		expect(resolveLegacyRequestTarget({ uri: 'https://example.com/path' })).toBe(
			'https://example.com/path',
		);
	});

	it('should prefer url over uri when both are set', () => {
		expect(
			resolveLegacyRequestTarget({
				uri: 'https://uri.example.com/path',
				url: 'https://url.example.com/path',
			}),
		).toBe('https://url.example.com/path');
	});

	it('should return undefined when neither url nor uri is set', () => {
		expect(resolveLegacyRequestTarget({})).toBeUndefined();
	});
});

describe('resolveLegacyRequestUrl', () => {
	it('should prefer url over uri when both are set', () => {
		expect(
			resolveLegacyRequestUrl({
				uri: 'https://uri.example.com/path',
				url: 'https://url.example.com/path',
			}),
		).toBe('https://url.example.com/path');
	});

	it('should resolve a relative target against the baseURL', () => {
		expect(resolveLegacyRequestUrl({ url: '/path', baseURL: 'https://example.com' })).toBe(
			'https://example.com/path',
		);
	});

	it('should resolve to the baseURL when no target is set', () => {
		expect(resolveLegacyRequestUrl({ baseURL: 'https://example.com/path' })).toBe(
			'https://example.com/path',
		);
	});
});

describe('setAxiosAgents', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should set httpAgent and httpsAgent on config (env proxy by default)', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com/api' };

		setAxiosAgents(config);

		expect(config.httpAgent).toEqual({ type: 'http' });
		expect(config.httpsAgent).toEqual({ type: 'https' });
		expect(buildNodeAgents).toHaveBeenCalledWith('env', 'disabled', undefined);
	});

	it('should not override existing agents', () => {
		const existingAgent = {};
		const config: AxiosRequestConfig = {
			url: 'https://example.com',
			httpAgent: existingAgent,
		};

		setAxiosAgents(config);

		expect(config.httpAgent).toBe(existingAgent);
		expect(buildNodeAgents).not.toHaveBeenCalled();
	});

	it('should not set agents when url is missing', () => {
		const config: AxiosRequestConfig = {};

		setAxiosAgents(config);

		expect(config.httpAgent).toBeUndefined();
		expect(config.httpsAgent).toBeUndefined();
	});

	it('should pass a custom proxy URL through to buildNodeAgents', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };

		setAxiosAgents(config, undefined, 'http://proxy:8080');

		expect(buildNodeAgents).toHaveBeenCalledWith('http://proxy:8080', 'disabled', undefined);
	});

	it('should forward the ssrf option to buildNodeAgents when no proxy is configured', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };
		const ssrf = makeSsrfBridge();

		setAxiosAgents(config, {}, undefined, ssrf);

		// SSRF lookup injection is buildNodeAgents' responsibility (env path
		// applies it to direct connections only).
		expect(buildNodeAgents).toHaveBeenCalledWith('env', ssrf, {});
	});

	it('should forward the ssrf option to buildNodeAgents when a proxy is configured', () => {
		const config: AxiosRequestConfig = { url: 'https://example.com' };
		const ssrf = makeSsrfBridge();

		setAxiosAgents(config, {}, 'http://proxy:8080', ssrf);

		// Behind a proxy, buildNodeAgents omits the lookup; the proxy validates
		// the final target.
		expect(buildNodeAgents).toHaveBeenCalledWith('http://proxy:8080', ssrf, {});
	});

	it('should fall back to env proxy and warn on an unsupported proxy URL', () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const config: AxiosRequestConfig = { url: 'https://example.com' };

		setAxiosAgents(config, undefined, 'socks5://proxy:1080');

		expect(buildNodeAgents).toHaveBeenCalledWith('env', 'disabled', undefined);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('socks5://proxy:1080'));
	});
});

describe('isRedirectStatus', () => {
	// Mirrors follow-redirects: any 3xx is in range (the `Location` check happens at the follow site).
	it.each([300, 301, 302, 303, 304, 305, 307, 308, 399])(
		'treats %i as in the 3xx range',
		(status) => {
			expect(isRedirectStatus(status)).toBe(true);
		},
	);

	it.each([200, 204, 299, 400, 500])('treats %i as not a redirect', (status) => {
		expect(isRedirectStatus(status)).toBe(false);
	});
});

describe('getRedirectLocation', () => {
	it('returns the Location header when present', () => {
		const response = {
			headers: { location: 'https://example.com/next' },
		} as unknown as AxiosResponse;
		expect(getRedirectLocation(response)).toBe('https://example.com/next');
	});

	it('returns undefined when the Location header is absent', () => {
		const response = { headers: {} } as unknown as AxiosResponse;
		expect(getRedirectLocation(response)).toBeUndefined();
	});

	it('returns undefined when the Location header is not a string', () => {
		const response = { headers: { location: ['a', 'b'] } } as unknown as AxiosResponse;
		expect(getRedirectLocation(response)).toBeUndefined();
	});
});

describe('isProxyPotentiallyActive', () => {
	const isProxyVar = (key: string) => /proxy/i.test(key);
	const originalProxyEnv = Object.fromEntries(
		Object.entries(process.env).filter(([key]) => isProxyVar(key)),
	);

	const stripProxyEnv = () => {
		for (const key of Object.keys(process.env)) {
			if (isProxyVar(key)) delete process.env[key];
		}
	};

	beforeEach(stripProxyEnv);

	afterEach(() => {
		stripProxyEnv();
		Object.assign(process.env, originalProxyEnv);
	});

	it('is true for an explicit proxy object regardless of the environment', () => {
		expect(isProxyPotentiallyActive({ host: 'proxy', port: 8080 })).toBe(true);
	});

	it('is true for an explicit supported proxy URL', () => {
		expect(isProxyPotentiallyActive('http://proxy:8080')).toBe(true);
	});

	it('falls back to the environment for an unsupported proxy URL', () => {
		expect(isProxyPotentiallyActive('socks5://proxy:1080')).toBe(false);
		process.env.HTTPS_PROXY = 'http://env-proxy:3128';
		expect(isProxyPotentiallyActive('socks5://proxy:1080')).toBe(true);
	});

	it('is true when a proxy environment variable is set and no explicit proxy is given', () => {
		process.env.HTTP_PROXY = 'http://env-proxy:3128';
		expect(isProxyPotentiallyActive()).toBe(true);
	});

	it('ignores empty proxy environment variables', () => {
		process.env.HTTP_PROXY = '';
		expect(isProxyPotentiallyActive()).toBe(false);
	});

	it('falls through an empty variable to a later set one', () => {
		process.env.HTTP_PROXY = '';
		process.env.HTTPS_PROXY = 'http://env-proxy:3128';
		expect(isProxyPotentiallyActive()).toBe(true);
	});

	it('is false with neither an explicit proxy nor environment configuration', () => {
		expect(isProxyPotentiallyActive()).toBe(false);
	});
});

describe('buildAgentOptions', () => {
	it('sets servername from the request host', () => {
		const options = buildAgentOptions({ method: 'GET', url: 'https://api.example.com/v1' });
		expect(options.servername).toBe('api.example.com');
	});

	it('disables certificate validation when skipSslCertificateValidation is set', () => {
		const options = buildAgentOptions({
			method: 'GET',
			url: 'https://api.example.com',
			skipSslCertificateValidation: true,
		});
		expect(options.rejectUnauthorized).toBe(false);
	});

	it('passes through provided agentOptions', () => {
		const options = buildAgentOptions({
			method: 'GET',
			url: 'https://api.example.com',
			agentOptions: { keepAlive: true },
		});
		expect(options.keepAlive).toBe(true);
		expect(options.servername).toBe('api.example.com');
	});

	// SNI takes a hostname, never an IP literal (RFC 6066 §3).
	it.each([
		['IPv4', 'https://185.90.154.8/v1'],
		['IPv6', 'https://[2001:db8::1]/v1'],
	])('sets no servername when the host is an %s literal', (_label, url) => {
		const options = buildAgentOptions({ method: 'GET', url });

		expect(options.servername).toBeUndefined();
	});
});
