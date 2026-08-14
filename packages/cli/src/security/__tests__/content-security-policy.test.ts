import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { DEFAULT_CONTENT_SECURITY_POLICY } from '@n8n/config';

import {
	parseContentSecurityPolicy,
	renderContentSecurityPolicy,
	resolveContentSecurityPolicies,
} from '../content-security-policy';

const logger = mock<Logger>();

const parse = (value: string) =>
	parseContentSecurityPolicy(value, 'N8N_CONTENT_SECURITY_POLICY', logger);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('parseContentSecurityPolicy', () => {
	test.each([
		['empty', ''],
		['whitespace', '   '],
		['empty directives object', '{}'],
	])('should return undefined for %s', (_name, value) => {
		expect(parse(value)).toBeUndefined();
	});

	describe('helmet.js directives object', () => {
		it('should serialize directives the way helmet.js does', () => {
			expect(parse('{"frame-ancestors":["http://localhost:3000"]}')).toBe(
				'frame-ancestors http://localhost:3000',
			);
		});

		it('should serialize multiple directives and values', () => {
			expect(
				parse('{"script-src":["\'self\'","https://cdn.example.com"],"object-src":["\'none\'"]}'),
			).toBe("script-src 'self' https://cdn.example.com; object-src 'none'");
		});

		it('should convert camelCase directive names to kebab-case, as helmet.js does', () => {
			expect(parse('{"frameAncestors":["\'none\'"],"upgradeInsecureRequests":[]}')).toBe(
				"frame-ancestors 'none'; upgrade-insecure-requests",
			);
		});

		it('should accept a single value instead of an array', () => {
			expect(parse('{"frame-ancestors":"\'none\'"}')).toBe("frame-ancestors 'none'");
		});

		it('should warn and return undefined for invalid JSON', () => {
			expect(parse('{"script-src":')).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Ignoring N8N_CONTENT_SECURITY_POLICY'),
			);
		});
	});

	describe('policy string', () => {
		it('should pass a policy string through untouched', () => {
			expect(parse("script-src <nonce> 'strict-dynamic'; report-uri https://csp.example.com")).toBe(
				"script-src <nonce> 'strict-dynamic'; report-uri https://csp.example.com",
			);
		});

		it('should trim surrounding whitespace', () => {
			expect(parse('  script-src <nonce>  ')).toBe('script-src <nonce>');
		});
	});
});

describe('resolveContentSecurityPolicies', () => {
	const resolve = (policy: string, reportOnly: string) =>
		resolveContentSecurityPolicies(policy, reportOnly, logger);

	const DEFAULTS = { policy: '{}', reportOnly: DEFAULT_CONTENT_SECURITY_POLICY };

	describe('with neither var set', () => {
		it('should report on the default policy and enforce nothing', () => {
			expect(resolve(DEFAULTS.policy, DEFAULTS.reportOnly)).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
		});
	});

	describe('with a policy to enforce', () => {
		it('should enforce it and keep reporting on the default', () => {
			expect(resolve('script-src <nonce>', DEFAULTS.reportOnly)).toEqual({
				enforced: 'script-src <nonce>',
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
		});

		it('should enforce one policy while reporting on another', () => {
			expect(resolve('script-src <nonce>', "script-src <nonce> 'strict-dynamic'")).toEqual({
				enforced: 'script-src <nonce>',
				reportOnly: "script-src <nonce> 'strict-dynamic'",
			});
		});
	});

	// The helmet.js format predates this feature. These cases pin its behaviour so the
	// backwards-compatible path cannot drift.
	describe('with a policy configured as a helmet.js directives object', () => {
		const helmetJson = '{"frame-ancestors":["http://localhost:3000"]}';
		const policy = 'frame-ancestors http://localhost:3000';

		it('should enforce exactly the configured directives', () => {
			expect(resolve(helmetJson, DEFAULTS.reportOnly).enforced).toBe(policy);
		});

		it('should report on exactly the configured directives', () => {
			expect(resolve(DEFAULTS.policy, helmetJson).reportOnly).toBe(policy);
		});

		it('should not add the default policy or a nonce to it', () => {
			const { enforced } = resolve(helmetJson, DEFAULTS.reportOnly);
			expect(enforced).not.toContain('nonce');
			expect(enforced).not.toContain('script-src');
		});
	});

	describe('switching a header off', () => {
		it.each(['{}', '', '   '])('should send no report-only header for "%s"', (value) => {
			expect(resolve(DEFAULTS.policy, value)).toEqual({
				enforced: undefined,
				reportOnly: undefined,
			});
		});

		it('should still enforce a policy when reporting is off', () => {
			expect(resolve('script-src <nonce>', '{}')).toEqual({
				enforced: 'script-src <nonce>',
				reportOnly: undefined,
			});
		});
	});

	describe('with an unusable value', () => {
		it('should fall back to the default policy for the report-only header', () => {
			expect(resolve(DEFAULTS.policy, '{"nope":')).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY'),
			);
		});

		it('should enforce nothing rather than guess at a policy to enforce', () => {
			expect(resolve('{"nope":', DEFAULTS.reportOnly)).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
		});
	});

	describe('with the report-only var set to a legacy boolean', () => {
		it.each(['true', 'TRUE', '1', 'false', '0'])('should warn and ignore "%s"', (value) => {
			expect(resolve(DEFAULTS.policy, value)).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no longer takes'));
		});

		it('should keep enforcing the policy that is set', () => {
			expect(resolve('script-src <nonce>', 'true')).toEqual({
				enforced: 'script-src <nonce>',
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
		});
	});
});

describe('renderContentSecurityPolicy', () => {
	it('should substitute every nonce placeholder', () => {
		expect(renderContentSecurityPolicy('script-src <nonce>; style-src <nonce>', 'abc123')).toBe(
			"script-src 'nonce-abc123'; style-src 'nonce-abc123'",
		);
	});

	it('should leave a policy without a placeholder untouched', () => {
		expect(renderContentSecurityPolicy("script-src 'self'", 'abc123')).toBe("script-src 'self'");
	});

	it('should render the default policy with the nonce', () => {
		expect(renderContentSecurityPolicy(DEFAULT_CONTENT_SECURITY_POLICY, 'abc123')).toBe(
			"script-src 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'; object-src 'none'; base-uri 'none'",
		);
	});
});
