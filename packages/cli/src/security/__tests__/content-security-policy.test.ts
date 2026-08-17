import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { DEFAULT_CONTENT_SECURITY_POLICY } from '@n8n/config';

import type { ContentSecurityPolicies } from '../content-security-policy';
import {
	DEFAULT_POLICY_KEYWORD,
	NO_POLICY_KEYWORD,
	NONCE_PLACEHOLDER,
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

		// In helmet.js `null` switches a directive off, so an instance using it to drop one
		// must not end up with the directive present and empty - `script-src` with nothing
		// allowed refuses every script on the page.
		it('should drop a directive set to null, as helmet.js does', () => {
			expect(parse('{"frame-ancestors":["\'none\'"],"script-src":null}')).toBe(
				"frame-ancestors 'none'",
			);
		});

		it('should return undefined when every directive is null', () => {
			expect(parse('{"script-src":null}')).toBeUndefined();
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

	/** What each variable holds when the operator has not set it. */
	const UNSET_POLICY = '{}';
	const UNSET_REPORT_ONLY = DEFAULT_CONTENT_SECURITY_POLICY;

	const A = "script-src <nonce> 'strict-dynamic' 'unsafe-eval'";
	const B = "script-src <nonce> 'strict-dynamic'";

	describe('the documented configuration matrix', () => {
		type Row = [
			name: string,
			policy: string,
			reportOnly: string,
			expected: ContentSecurityPolicies,
		];

		const rows: Row[] = [
			[
				'neither set: report on the default policy, enforce nothing',
				UNSET_POLICY,
				UNSET_REPORT_ONLY,
				{ enforced: undefined, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
			[
				'report-only set: report on that policy, enforce nothing',
				UNSET_POLICY,
				B,
				{ enforced: undefined, reportOnly: B },
			],
			[
				'policy set: enforce it, keep reporting on the default',
				A,
				UNSET_REPORT_ONLY,
				{ enforced: A, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
			['both set: enforce one, report on the other', A, B, { enforced: A, reportOnly: B }],
			[
				'policy set, reporting off: enforce only',
				A,
				NO_POLICY_KEYWORD,
				{ enforced: A, reportOnly: undefined },
			],
			[
				'both off: no CSP headers at all',
				UNSET_POLICY,
				NO_POLICY_KEYWORD,
				{ enforced: undefined, reportOnly: undefined },
			],
			[
				'keyword to enforce the default policy',
				DEFAULT_POLICY_KEYWORD,
				NO_POLICY_KEYWORD,
				{ enforced: DEFAULT_CONTENT_SECURITY_POLICY, reportOnly: undefined },
			],
			[
				'keyword in both: enforce and report on the default policy',
				DEFAULT_POLICY_KEYWORD,
				DEFAULT_POLICY_KEYWORD,
				{
					enforced: DEFAULT_CONTENT_SECURITY_POLICY,
					reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
				},
			],
			[
				'keyword enforced, stricter candidate reported',
				DEFAULT_POLICY_KEYWORD,
				B,
				{ enforced: DEFAULT_CONTENT_SECURITY_POLICY, reportOnly: B },
			],
			[
				'legacy `true`: the configured policy stays report-only',
				A,
				'true',
				{ enforced: undefined, reportOnly: A },
			],
			[
				'legacy `false`: the configured policy is enforced',
				A,
				'false',
				{ enforced: A, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
		];

		test.each(rows)('%s', (_name, policy, reportOnly, expected) => {
			expect(resolve(policy, reportOnly)).toEqual(expected);
		});
	});

	describe('the default-policy keyword', () => {
		it.each(['default', 'DEFAULT', ' Default '])('should accept "%s"', (value) => {
			expect(resolve(value, NO_POLICY_KEYWORD).enforced).toBe(DEFAULT_CONTENT_SECURITY_POLICY);
		});

		it('should resolve to a policy carrying the nonce placeholder', () => {
			expect(resolve(DEFAULT_POLICY_KEYWORD, NO_POLICY_KEYWORD).enforced).toContain(
				NONCE_PLACEHOLDER,
			);
		});

		it('should not warn - it is a supported value, not a fallback', () => {
			resolve(DEFAULT_POLICY_KEYWORD, DEFAULT_POLICY_KEYWORD);
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('switching a header off', () => {
		it.each(['{}', '', '   '])('should send no report-only header for "%s"', (value) => {
			expect(resolve(UNSET_POLICY, value)).toEqual({
				enforced: undefined,
				reportOnly: undefined,
			});
		});
	});

	// The helmet.js format predates this feature. These cases pin its behaviour so the
	// backwards-compatible path cannot drift.
	describe('with a policy configured as a helmet.js directives object', () => {
		const helmetJson = '{"frame-ancestors":["http://localhost:3000"]}';
		const policy = 'frame-ancestors http://localhost:3000';

		it('should enforce exactly the configured directives', () => {
			expect(resolve(helmetJson, UNSET_REPORT_ONLY).enforced).toBe(policy);
		});

		it('should report on exactly the configured directives', () => {
			expect(resolve(UNSET_POLICY, helmetJson).reportOnly).toBe(policy);
		});

		it('should not add the default policy or a nonce to it', () => {
			const { enforced } = resolve(helmetJson, UNSET_REPORT_ONLY);
			expect(enforced).not.toContain('nonce');
			expect(enforced).not.toContain('script-src');
		});
	});

	describe('with an unusable value', () => {
		it('should fall back to the default policy for the report-only header', () => {
			expect(resolve(UNSET_POLICY, '{"nope":')).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY'),
			);
		});

		it('should enforce nothing rather than guess at a policy to enforce', () => {
			expect(resolve('{"nope":', UNSET_REPORT_ONLY)).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
		});
	});

	describe('with the report-only var set to a legacy boolean', () => {
		it.each(['true', 'TRUE', '1'])('should warn for "%s"', (value) => {
			resolve(A, value);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is deprecated'));
		});

		it.each(['false', 'FALSE', '0'])('should warn for "%s"', (value) => {
			resolve(A, value);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is deprecated'));
		});

		it('should report on the default policy when no policy is configured', () => {
			expect(resolve(UNSET_POLICY, 'true')).toEqual({
				enforced: undefined,
				reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
			});
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is deprecated'));
		});

		it('should never read a boolean as a policy', () => {
			const { enforced, reportOnly } = resolve(UNSET_POLICY, 'true');
			expect(enforced).not.toBe('true');
			expect(reportOnly).not.toBe('true');
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
