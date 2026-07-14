/* eslint-disable @typescript-eslint/naming-convention */

import { validateOriginHeaders } from '../origin-validator';

describe('validateOriginHeaders', () => {
	const host = 'example.com';

	describe('basic validation', () => {
		test('should return invalid for missing origin', () => {
			const result = validateOriginHeaders({});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header is missing or malformed');
		});

		test('should return invalid for empty origin', () => {
			const result = validateOriginHeaders({ origin: '' });
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

		test('should reject mismatched hosts', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': 'wrong-host.com',
			});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header does not match expected host');
		});
	});

	describe('host normalization behavior', () => {
		test('should normalize HTTPS default ports (443)', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': `${host}:443`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should normalize HTTP default ports (80)', () => {
			const result = validateOriginHeaders({
				origin: `http://${host}`,
				'x-forwarded-host': `${host}:80`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should preserve non-default ports', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}:8080`,
				'x-forwarded-host': `${host}:8080`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(`${host}:8080`);
		});

		test('should reject mismatched ports', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}:8080`,
				'x-forwarded-host': `${host}:9000`,
			});
			expect(result.isValid).toBe(false);
		});

		test('should handle IPv6 addresses correctly', () => {
			const result = validateOriginHeaders({
				origin: 'https://[::1]:443',
				'x-forwarded-host': '[::1]:443',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe('::1');
		});

		test('should handle IPv6 with non-default ports', () => {
			const result = validateOriginHeaders({
				origin: 'http://[2001:db8::1]:8080',
				'x-forwarded-host': '[2001:db8::1]:8080',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe('2001:db8::1:8080');
		});

		test('should handle complex domain names', () => {
			const complexHost = 'sub.domain.example-site.com';
			const result = validateOriginHeaders({
				origin: `https://${complexHost}:443`,
				'x-forwarded-host': `${complexHost}:443`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(complexHost);
		});

		test('should handle invalid URL formats gracefully', () => {
			const result = validateOriginHeaders({
				origin: 'https://example.com',
				'x-forwarded-host': 'invalid[host',
			});
			expect(result.isValid).toBe(false);
			expect(result.expectedHost).toBe('invalid[host');
		});
	});

	describe('origin parsing behavior', () => {
		test('should reject non-HTTP/HTTPS protocols', () => {
			const result = validateOriginHeaders({
				origin: 'ftp://example.com',
				host: 'example.com',
			});
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Origin header is missing or malformed');
		});

		test('should reject websocket protocols', () => {
			const result = validateOriginHeaders({
				origin: 'ws://example.com',
				host: 'example.com',
			});
			expect(result.isValid).toBe(false);
		});

		test('should reject chrome-extension protocols', () => {
			const result = validateOriginHeaders({
				origin: 'chrome-extension://example.com',
				host: 'example.com',
			});
			expect(result.isValid).toBe(false);
		});

		test('should handle mixed case protocols', () => {
			const result = validateOriginHeaders({
				origin: `HTTPS://${host}`,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo?.protocol).toBe('https');
		});

		test('should parse HTTP origins correctly', () => {
			const result = validateOriginHeaders({
				origin: `http://${host}`,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo).toEqual({
				protocol: 'http',
				host,
			});
		});

		test('should parse HTTPS origins correctly', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo).toEqual({
				protocol: 'https',
				host,
			});
		});

		test('should reject malformed URLs that throw during parsing', () => {
			const result = validateOriginHeaders({
				origin: '://malformed',
				host: 'example.com',
			});
			expect(result.isValid).toBe(false);
		});
	});

	describe('header precedence and processing', () => {
		test('should handle Forwarded header with precedence over x-forwarded-*', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=https;host=${host}`,
				'x-forwarded-host': 'wrong-host.com', // Should be ignored
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should parse RFC 7239 Forwarded header with quoted values', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto="https";host="${host}"`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should parse Forwarded header with single quotes', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto='https';host='${host}'`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle multiple Forwarded entries (use first)', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=https;host=${host}, proto=http;host=other.com`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle Forwarded header with spaces around values', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `  proto = https ; host = ${host}  `,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should ignore unknown parameters in Forwarded header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `for=192.0.2.60;proto=https;host=${host};by=proxy.com`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should fallback to X-Forwarded-* when Forwarded header incomplete', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: 'for=192.0.2.60', // Missing host and proto
				'x-forwarded-host': host,
				'x-forwarded-proto': 'https',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle array x-forwarded-host headers (use first)', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': [host, 'other-host.com'],
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle array x-forwarded-proto headers (use first)', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
				'x-forwarded-proto': ['https', 'http'],
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https');
		});

		test('should handle comma-separated x-forwarded-proto (use first)', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
				'x-forwarded-proto': 'https, http',
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https');
		});

		test('should fallback to Host header when no proxy headers exist', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});
	});

	describe('protocol validation behavior', () => {
		test('should handle valid protocols in Forwarded header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=https;host=${host}`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https');
		});

		test('should ignore invalid protocols in Forwarded header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: `proto=ftp;host=${host}`, // Invalid protocol should be ignored
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https'); // Falls back to origin protocol
		});

		test('should ignore invalid protocols in X-Forwarded-Proto header', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
				'x-forwarded-proto': 'websocket', // Invalid protocol
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https'); // Falls back to origin protocol
		});

		test('should handle comma-separated X-Forwarded-Proto with invalid first value', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': host,
				'x-forwarded-proto': 'ftp,https', // Invalid first, valid second
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedProtocol).toBe('https'); // Falls back to origin protocol
		});

		test('should handle protocol change via Forwarded header', () => {
			const result = validateOriginHeaders({
				origin: `http://${host}`,
				forwarded: `proto=http;host=${host}:80`,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
			expect(result.expectedProtocol).toBe('http');
		});
	});

	describe('edge cases and error handling', () => {
		test('should handle missing host header when no proxy headers exist', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				// No host, x-forwarded-host, or forwarded headers
			});
			expect(result.isValid).toBe(false);
			expect(result.expectedHost).toBe('');
		});

		test('should handle empty forwarded header gracefully', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: '',
				'x-forwarded-host': host,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle invalid forwarded header format', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				forwarded: 'invalid-format',
				'x-forwarded-host': host,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host);
		});

		test('should handle empty x-forwarded-host array', () => {
			const result = validateOriginHeaders({
				origin: `https://${host}`,
				'x-forwarded-host': [],
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(host); // Falls back to host header
		});

		test('should handle numeric IP addresses correctly', () => {
			const ipHost = '192.168.1.100:3000';
			const result = validateOriginHeaders({
				origin: `https://${ipHost}`,
				'x-forwarded-host': ipHost,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(ipHost);
		});

		test('should handle localhost correctly', () => {
			const localhostHost = 'localhost:8080';
			const result = validateOriginHeaders({
				origin: `http://${localhostHost}`,
				'x-forwarded-host': localhostHost,
			});
			expect(result.isValid).toBe(true);
			expect(result.expectedHost).toBe(localhostHost);
		});

		test('should allow origins with query parameters when host matches', () => {
			const queryOrigin = `https://${host}?query=param#fragment`;
			const result = validateOriginHeaders({
				origin: queryOrigin,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo?.host).toBe(host);
		});

		test('should allow origins with path components when host matches', () => {
			const pathOrigin = `https://${host}/path/to/resource`;
			const result = validateOriginHeaders({
				origin: pathOrigin,
				host,
			});
			expect(result.isValid).toBe(true);
			expect(result.originInfo?.host).toBe(host);
		});
	});
});
