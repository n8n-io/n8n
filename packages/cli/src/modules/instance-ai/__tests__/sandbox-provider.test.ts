import { instanceAiSandboxProviderSchema } from '@n8n/api-types';
import { normalizeSandboxProvider as normalizeRuntimeSandboxProvider } from '@n8n/agents/sandbox';
import { OperationalError } from 'n8n-workflow';

import {
	N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE,
	normalizeSandboxProvider,
	requireN8nSandboxServiceUrl,
} from '../sandbox-provider';

describe('sandbox-provider', () => {
	describe('normalizeSandboxProvider', () => {
		it('stays aligned with runtime sandbox providers', () => {
			for (const provider of instanceAiSandboxProviderSchema.options) {
				expect(normalizeRuntimeSandboxProvider(provider)).toBe(provider);
			}
		});

		it('returns supported sandbox providers unchanged', () => {
			expect(normalizeSandboxProvider('n8n-sandbox')).toBe('n8n-sandbox');
			expect(normalizeSandboxProvider('daytona')).toBe('daytona');
		});

		it('falls back to n8n-sandbox for unsupported values', () => {
			expect(normalizeSandboxProvider('local')).toBe('n8n-sandbox');
			expect(normalizeSandboxProvider(undefined)).toBe('n8n-sandbox');
		});
	});

	describe('requireN8nSandboxServiceUrl', () => {
		it('trims and returns a configured service URL', () => {
			expect(requireN8nSandboxServiceUrl('  http://sandbox-api:8080  ')).toBe(
				'http://sandbox-api:8080',
			);
		});

		it('throws an operational error when the service URL is missing', () => {
			expect(() => requireN8nSandboxServiceUrl('   ')).toThrow(OperationalError);
			expect(() => requireN8nSandboxServiceUrl('   ')).toThrow(
				N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE,
			);
		});
	});
});
