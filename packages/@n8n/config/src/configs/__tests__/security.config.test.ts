import { Container } from '@n8n/di';

import { DEFAULT_CONTENT_SECURITY_POLICY } from '../content-security-policy';
import { SecurityConfig } from '../security.config';

describe('SecurityConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	describe('awsSystemCredentialsSdkSources', () => {
		test('defaults to "all"', () => {
			process.env = {};
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe('all');
		});

		// Leading/trailing whitespace is trimmed before parsing; inner whitespace is
		// preserved and handled by the consumer (`usesSdk` trims per source).
		test.each([
			['all', 'all'],
			['none', 'none'],
			['environment', 'environment'],
			['environment,instanceMetadata', 'environment,instanceMetadata'],
			[' environment , podIdentity ', 'environment , podIdentity'],
			['environment,', 'environment,'],
		])('accepts valid value %p', (value, expected) => {
			process.env = { N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES: value };
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe(expected);
		});

		test('falls back to the default and warns on an unknown source', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			process.env = { N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES: 'enviroment' };
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe('all');
			expect(consoleWarnSpy).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});

	describe('the Content-Security-Policy variables', () => {
		// A policy no HTTP header can carry used to reach `res.setHeader`, which threw while
		// serving every HTML page. It has to warn and leave the declared default instead.
		const unservable = `script-src 'self'${String.fromCharCode(10)}X-Injected: yes`;

		test('warns and enforces nothing when the enforced policy is unservable', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			process.env = { N8N_CONTENT_SECURITY_POLICY: unservable };
			expect(Container.get(SecurityConfig).contentSecurityPolicy).toBeUndefined();
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('N8N_CONTENT_SECURITY_POLICY'),
			);

			consoleWarnSpy.mockRestore();
		});

		test("warns and keeps n8n's own policy when the report-only policy is unservable", () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			process.env = { N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY: unservable };
			expect(Container.get(SecurityConfig).contentSecurityPolicyReportOnly).toBe(
				DEFAULT_CONTENT_SECURITY_POLICY,
			);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY'),
			);

			consoleWarnSpy.mockRestore();
		});
	});
});
