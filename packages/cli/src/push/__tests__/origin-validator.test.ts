import {
	validateOriginHeaders,
	normalizeHost,
	parseOrigin,
	parseForwardedHeader,
	getFirstHeaderValue,
	stripIPv6Brackets,
	validateProtocol,
} from '../origin-validator';

describe('origin-validator', () => {
	describe('normalizeHost', () => {
		test('should return original host if empty', () => {
			expect(normalizeHost('', 'https')).toBe('');
			expect(normalizeHost('', 'http')).toBe('');
		});

		test('should normalize HTTPS hosts by removing default port 443', () => {
			expect(normalizeHost('example.com:443', 'https')).toBe('example.com');
			expect(normalizeHost('example.com', 'https')).toBe('example.com');
		});

		test('should normalize HTTP hosts by removing default port 80', () => {
			expect(normalizeHost('example.com:80', 'http')).toBe('example.com');
			expect(normalizeHost('example.com', 'http')).toBe('example.com');
		});

		test('should preserve non-default ports', () => {
			expect(normalizeHost('example.com:8080', 'https')).toBe('example.com:8080');
			expect(normalizeHost('example.com:3000', 'http')).toBe('example.com:3000');
		});

		test('should handle IPv6 hosts correctly', () => {
			// IPv6 hosts should have brackets stripped for consistency
			expect(normalizeHost('[::1]:443', 'https')).toBe('::1');
			expect(normalizeHost('[::1]:80', 'http')).toBe('::1');
			// Non-default ports preserve the full format but strip brackets
			expect(normalizeHost('[::1]:8080', 'https')).toBe('::1:8080');
		});

		test('should handle complex domain names', () => {
			expect(normalizeHost('sub.domain.example-site.com:443', 'https')).toBe(
				'sub.domain.example-site.com',
			);
			expect(normalizeHost('test-server.local:3000', 'http')).toBe('test-server.local:3000');
		});

		test('should fallback to original host on invalid URL', () => {
			// Invalid host formats that would cause URL constructor to throw
			expect(normalizeHost('invalid[host', 'https')).toBe('invalid[host');
			expect(normalizeHost('://malformed', 'http')).toBe('://malformed');
			expect(normalizeHost('space host.com', 'https')).toBe('space host.com');
		});
	});

	describe('parseOrigin', () => {
		test('should return null for invalid origins', () => {
			expect(parseOrigin('')).toBeNull();
			expect(parseOrigin(null as any)).toBeNull();
			expect(parseOrigin(undefined as any)).toBeNull();
			expect(parseOrigin(123 as any)).toBeNull();
		});

		test('should return null for non-HTTP/HTTPS protocols', () => {
			expect(parseOrigin('ftp://example.com')).toBeNull();
			expect(parseOrigin('ws://example.com')).toBeNull();
			expect(parseOrigin('file://example.com')).toBeNull();
			expect(parseOrigin('chrome-extension://example.com')).toBeNull();
		});

		test('should return null for malformed URLs', () => {
			expect(parseOrigin('not-a-url')).toBeNull();
			expect(parseOrigin('://malformed')).toBeNull();
			expect(parseOrigin('https://')).toBeNull();
			expect(parseOrigin('https://[invalid')).toBeNull();
		});

		test('should parse valid HTTP origins', () => {
			const result = parseOrigin('http://example.com');
			expect(result).toEqual({
				protocol: 'http',
				host: 'example.com',
			});
		});

		test('should parse valid HTTPS origins', () => {
			const result = parseOrigin('https://example.com');
			expect(result).toEqual({
				protocol: 'https',
				host: 'example.com',
			});
		});

		test('should normalize ports in origins', () => {
			// Default ports should be removed
			expect(parseOrigin('https://example.com:443')).toEqual({
				protocol: 'https',
				host: 'example.com',
			});

			expect(parseOrigin('http://example.com:80')).toEqual({
				protocol: 'http',
				host: 'example.com',
			});

			// Non-default ports should be preserved
			expect(parseOrigin('https://example.com:8080')).toEqual({
				protocol: 'https',
				host: 'example.com:8080',
			});

			expect(parseOrigin('http://example.com:3000')).toEqual({
				protocol: 'http',
				host: 'example.com:3000',
			});
		});

		test('should handle IPv6 origins', () => {
			// IPv6 with default port: brackets should be stripped for consistency
			expect(parseOrigin('https://[::1]:443')).toEqual({
				protocol: 'https',
				host: '::1',
			});

			// IPv6 with non-default port: brackets should be stripped but port preserved
			expect(parseOrigin('http://[2001:db8::1]:8080')).toEqual({
				protocol: 'http',
				host: '2001:db8::1:8080',
			});
		});

		test('should handle mixed case protocols', () => {
			expect(parseOrigin('HTTPS://example.com')).toEqual({
				protocol: 'https',
				host: 'example.com',
			});

			expect(parseOrigin('Http://example.com')).toEqual({
				protocol: 'http',
				host: 'example.com',
			});
		});
	});

	describe('parseForwardedHeader', () => {
		test('should parse simple forwarded header', () => {
			const result = parseForwardedHeader('proto=https;host=example.com');
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should parse forwarded header with quoted values', () => {
			const result = parseForwardedHeader('proto="https";host="example.com"');
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should parse forwarded header with single quotes', () => {
			const result = parseForwardedHeader("proto='https';host='example.com'");
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should handle multiple entries (use first)', () => {
			const result = parseForwardedHeader(
				'proto=https;host=example.com, proto=http;host=other.com',
			);
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should handle spaces around values', () => {
			const result = parseForwardedHeader('  proto = https ; host = example.com  ');
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should ignore unknown parameters', () => {
			const result = parseForwardedHeader(
				'for=192.0.2.60;proto=https;host=example.com;by=proxy.com',
			);
			expect(result).toEqual({ proto: 'https', host: 'example.com' });
		});

		test('should return null for invalid header', () => {
			expect(parseForwardedHeader('')).toBeNull();
			expect(parseForwardedHeader('invalid')).toEqual({});
		});

		test('should return null for non-string input', () => {
			expect(parseForwardedHeader(null as any)).toBeNull();
			expect(parseForwardedHeader(undefined as any)).toBeNull();
		});

		test('should handle partial parameters', () => {
			expect(parseForwardedHeader('proto=https')).toEqual({ proto: 'https' });
			expect(parseForwardedHeader('host=example.com')).toEqual({ host: 'example.com' });
		});
	});

	describe('getFirstHeaderValue', () => {
		test('should return string as-is', () => {
			expect(getFirstHeaderValue('test')).toBe('test');
		});

		test('should return first element from array', () => {
			expect(getFirstHeaderValue(['first', 'second'])).toBe('first');
		});

		test('should return undefined for undefined input', () => {
			expect(getFirstHeaderValue(undefined)).toBe(undefined);
		});

		test('should return undefined for empty array', () => {
			expect(getFirstHeaderValue([])).toBe(undefined);
		});
	});

	describe('stripIPv6Brackets', () => {
		test('should strip brackets from IPv6 addresses', () => {
			expect(stripIPv6Brackets('[::1]')).toBe('::1');
			expect(stripIPv6Brackets('[2001:db8::1]')).toBe('2001:db8::1');
		});

		test('should strip brackets from IPv6 addresses with ports', () => {
			expect(stripIPv6Brackets('[::1]:8080')).toBe('::1:8080');
			expect(stripIPv6Brackets('[2001:db8::1]:443')).toBe('2001:db8::1:443');
		});

		test('should leave non-bracketed strings unchanged', () => {
			expect(stripIPv6Brackets('example.com')).toBe('example.com');
			expect(stripIPv6Brackets('192.168.1.1')).toBe('192.168.1.1');
			expect(stripIPv6Brackets('::1')).toBe('::1');
			expect(stripIPv6Brackets('example.com:8080')).toBe('example.com:8080');
		});

		test('should handle partial brackets', () => {
			expect(stripIPv6Brackets('[incomplete')).toBe('[incomplete');
			expect(stripIPv6Brackets('incomplete]')).toBe('incomplete]');
		});
	});

	describe('validateProtocol', () => {
		test('should return http for valid http', () => {
			expect(validateProtocol('http')).toBe('http');
			expect(validateProtocol('HTTP')).toBe('http');
			expect(validateProtocol('  http  ')).toBe('http');
		});

		test('should return https for valid https', () => {
			expect(validateProtocol('https')).toBe('https');
			expect(validateProtocol('HTTPS')).toBe('https');
			expect(validateProtocol('  https  ')).toBe('https');
		});

		test('should return undefined for invalid protocols', () => {
			expect(validateProtocol('ftp')).toBe(undefined);
			expect(validateProtocol('websocket')).toBe(undefined);
			expect(validateProtocol('')).toBe(undefined);
			expect(validateProtocol(undefined)).toBe(undefined);
		});
	});

	describe('validateOriginHeaders', () => {
		const host = 'example.com';

		test('should return invalid for missing origin', () => {
			const result = validateOriginHeaders({});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header is missing or malformed');
		});

		test('should return invalid for malformed origin', () => {
			const result = validateOriginHeaders({ origin: 'invalid-origin' });
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header is missing or malformed');
		});

		test('should validate matching hosts with host header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo).toEqual({ protocol: 'https', host });
			expect(result.expectedHost).toBe(host);
			expect(result.expectedProtocol).toBe('https');
		});

		test('should validate matching hosts with x-forwarded-host header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle default port normalization with x-forwarded-host', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': `${host}:443`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle non-default ports', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}:8080`,
				'x-forwarded-host': `${host}:8080`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(`${host}:8080`);
		});

		test('should reject mismatched hosts', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': 'wrong-host.com',
			});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header does not match expected host');
		});

		test('should handle Forwarded header with precedence over x-forwarded-*', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=https;host=${host}`,
				'x-forwarded-host': 'wrong-host.com', // Should be ignored
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle Forwarded header with protocol change', () => {
			const result = validateOriginHeaders({
				origin: `http://${host}`,
				forwarded: `proto=http;host=${host}:80`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
			expect(result.expectedProtocol).toBe('http');
		});

		test('should handle array headers', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': [host, 'other-host.com'],
				'x-forwarded-proto': ['https', 'http'],
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle comma-separated x-forwarded-proto', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
				'x-forwarded-proto': 'https, http',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https');
		});

		test('should handle IPv6 addresses', () => {
			const result = validateOriginHeaders({
				origin: 'https://[::1]:443',
				'x-forwarded-host': '[::1]:443',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe('::1');
		});

		test('should fallback protocol validation gracefully', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=ftp;host=${host}`, // Invalid protocol should be ignored
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https'); // Falls back to origin protocol
		});
	});
});
