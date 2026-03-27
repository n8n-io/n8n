import * as os from 'node:os';
import { describe, it, expect } from 'vitest';

import { contextNameFromUrl, uniqueContextName } from '../config';

describe('Login helpers', () => {
	describe('URL defaults', () => {
		it('should derive context name from URL hostname (dots replaced with dashes)', () => {
			expect(contextNameFromUrl('https://my-n8n.example.com')).toBe('my-n8n-example-com');
			expect(contextNameFromUrl('http://localhost:5678')).toBe('localhost');
			expect(contextNameFromUrl('https://n8n.internal.corp:443')).toBe('n8n-internal-corp');
		});

		it('should make context names unique when duplicates exist', () => {
			expect(uniqueContextName('localhost', [])).toBe('localhost');
			expect(uniqueContextName('localhost', ['localhost'])).toBe('localhost-2');
			expect(uniqueContextName('localhost', ['localhost', 'localhost-2'])).toBe('localhost-3');
		});
	});

	describe('device metadata', () => {
		it('should strip common domain suffixes from hostname', () => {
			const stripSuffix = (hostname: string) =>
				hostname.replace(/\.(local|lan|localdomain|home)$/i, '');

			expect(stripSuffix('Mac-119.lan')).toBe('Mac-119');
			expect(stripSuffix('ricardos-macbook.local')).toBe('ricardos-macbook');
			expect(stripSuffix('server.localdomain')).toBe('server');
			expect(stripSuffix('myhost.home')).toBe('myhost');
			expect(stripSuffix('prod-server')).toBe('prod-server');
			expect(stripSuffix('machine.example.com')).toBe('machine.example.com');
		});

		it('should map platform to friendly OS name', () => {
			const osNames: Record<string, string> = {
				darwin: 'macOS',
				win32: 'Windows',
				linux: 'Linux',
				freebsd: 'FreeBSD',
			};
			const getOsName = (platform: string) => osNames[platform] ?? platform;

			expect(getOsName('darwin')).toBe('macOS');
			expect(getOsName('win32')).toBe('Windows');
			expect(getOsName('linux')).toBe('Linux');
			expect(getOsName('freebsd')).toBe('FreeBSD');
			expect(getOsName('sunos')).toBe('sunos');
		});

		it('should get hostname from os module', () => {
			const hostname = os.hostname();
			expect(typeof hostname).toBe('string');
			expect(hostname.length).toBeGreaterThan(0);
		});
	});

	describe('default URL resolution', () => {
		it('should use localhost:5678 as the default URL', () => {
			const DEFAULT_URL = 'http://localhost:5678';
			const getDefaultUrl = (currentContextUrl?: string) => currentContextUrl ?? DEFAULT_URL;

			expect(getDefaultUrl()).toBe('http://localhost:5678');
			expect(getDefaultUrl('https://saved.example.com')).toBe('https://saved.example.com');
		});
	});

	describe('loopback URI validation', () => {
		// This is the validation used on the server side for redirect URIs
		function isValidLoopbackRedirectUri(redirectUri: string): boolean {
			try {
				const url = new URL(redirectUri);
				if (url.protocol !== 'http:') return false;
				const hostname = url.hostname;
				return hostname === '127.0.0.1' || hostname === 'localhost';
			} catch {
				return false;
			}
		}

		it('should accept valid loopback URIs', () => {
			expect(isValidLoopbackRedirectUri('http://127.0.0.1:12345/callback')).toBe(true);
			expect(isValidLoopbackRedirectUri('http://localhost:8080/callback')).toBe(true);
			expect(isValidLoopbackRedirectUri('http://127.0.0.1/callback')).toBe(true);
		});

		it('should reject non-loopback URIs', () => {
			expect(isValidLoopbackRedirectUri('https://127.0.0.1/callback')).toBe(false);
			expect(isValidLoopbackRedirectUri('http://example.com/callback')).toBe(false);
			expect(isValidLoopbackRedirectUri('http://192.168.1.1/callback')).toBe(false);
			expect(isValidLoopbackRedirectUri('not-a-url')).toBe(false);
		});
	});

	describe('PKCE generation', () => {
		it('should generate valid PKCE parameters', async () => {
			const { createHash, randomBytes } = await import('node:crypto');

			const codeVerifier = randomBytes(32).toString('base64url');
			const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

			// RFC 7636: verifier should be 43-128 chars
			expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
			expect(codeVerifier.length).toBeLessThanOrEqual(128);

			// Challenge should be base64url encoded SHA256
			expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);

			// Verifying the challenge matches
			const recomputed = createHash('sha256').update(codeVerifier).digest('base64url');
			expect(recomputed).toBe(codeChallenge);
		});

		it('should generate unique values each time', async () => {
			const { randomBytes } = await import('node:crypto');

			const v1 = randomBytes(32).toString('base64url');
			const v2 = randomBytes(32).toString('base64url');

			expect(v1).not.toBe(v2);
		});
	});
});
