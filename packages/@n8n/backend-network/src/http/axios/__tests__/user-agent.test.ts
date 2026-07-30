import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import * as nodePathActual from 'node:path';

import { buildRfcStyleUserAgent, getDefaultN8nOutboundUserAgent } from '../user-agent';

describe('outbound-user-agent', () => {
	const originalConfig = new HttpRequestConfig();

	afterEach(() => {
		Container.set(HttpRequestConfig, { ...originalConfig });
		vi.resetModules();
	});

	describe('buildRfcStyleUserAgent', () => {
		it('formats a conventional product token', () => {
			expect(buildRfcStyleUserAgent('1.2.3')).toBe(
				'Mozilla/5.0 (compatible; n8n/1.2.3; +https://n8n.io/)',
			);
		});
	});

	describe('getDefaultN8nOutboundUserAgent', () => {
		it('returns the legacy "n8n" value when the enforce flag is off', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: false,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultN8nOutboundUserAgent()).toBe('n8n');
		});

		it('returns the legacy "n8n" value even when a custom UA is set but the flag is off', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: false,
				globalUserAgentValue: 'some-custom-value',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultN8nOutboundUserAgent()).toBe('n8n');
		});

		it('returns the RFC-style UA with n8n version when the enforce flag is on', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultN8nOutboundUserAgent()).toMatch(
				/^Mozilla\/5\.0 \(compatible; n8n\/.+; \+https:\/\/n8n\.io\/\)$/,
			);
		});

		it('returns the custom UA verbatim when both the flag and custom value are set', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: 'AcmeCorp/1.0',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultN8nOutboundUserAgent()).toBe('AcmeCorp/1.0');
		});

		it('falls back to version "0.0.0" when the package.json cannot be resolved', async () => {
			vi.resetModules();
			vi.doMock('node:path', () => ({
				...nodePathActual,
				default: { ...nodePathActual, join: () => '/definitely/not/a/real/path/package.json' },
				join: () => '/definitely/not/a/real/path/package.json',
			}));

			const di = await import('@n8n/di');
			const config = await import('@n8n/config');
			const mod = await import('../user-agent.js');

			di.Container.set(config.HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(mod.getDefaultN8nOutboundUserAgent()).toBe(
				'Mozilla/5.0 (compatible; n8n/0.0.0; +https://n8n.io/)',
			);

			vi.doUnmock('node:path');
		});
	});
});
