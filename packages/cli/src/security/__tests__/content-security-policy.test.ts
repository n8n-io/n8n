import type { Logger } from '@n8n/backend-common';
import type {
	ContentSecurityPolicyReportOnlySetting,
	ContentSecurityPolicySetting,
} from '@n8n/config';
import { DEFAULT_CONTENT_SECURITY_POLICY } from '@n8n/config';
import { NONCE_PLACEHOLDER } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { ContentSecurityPolicies } from '../content-security-policy';
import {
	renderContentSecurityPolicy,
	resolveContentSecurityPolicies,
} from '../content-security-policy';

const logger = mock<Logger>();

beforeEach(() => {
	vi.clearAllMocks();
});

// `@n8n/config` turns each env var into these settings on its own; see
// `packages/@n8n/config/test/content-security-policy.test.ts` for that half.
describe('resolveContentSecurityPolicies', () => {
	const resolve = (
		policy: ContentSecurityPolicySetting,
		reportOnly: ContentSecurityPolicyReportOnlySetting,
	) => resolveContentSecurityPolicies(policy, reportOnly, logger);

	/** What each setting holds when the operator sets neither variable. */
	const UNSET_POLICY = DEFAULT_CONTENT_SECURITY_POLICY;
	const UNSET_REPORT_ONLY = DEFAULT_CONTENT_SECURITY_POLICY;

	/** What a setting holds when the operator turns that header off with `{}`. */
	const NO_POLICY = undefined;

	const A = "script-src <nonce> 'strict-dynamic' 'unsafe-eval'";
	const B = "script-src <nonce> 'strict-dynamic'";

	describe('the documented configuration matrix', () => {
		type Row = [
			name: string,
			policy: ContentSecurityPolicySetting,
			reportOnly: ContentSecurityPolicyReportOnlySetting,
			expected: ContentSecurityPolicies,
		];

		const rows: Row[] = [
			[
				'neither set: enforce the default policy, send no redundant report-only copy',
				UNSET_POLICY,
				UNSET_REPORT_ONLY,
				{ enforced: DEFAULT_CONTENT_SECURITY_POLICY, reportOnly: undefined },
			],
			[
				'report-only set: enforce the default policy, report on the other',
				UNSET_POLICY,
				B,
				{ enforced: DEFAULT_CONTENT_SECURITY_POLICY, reportOnly: B },
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
				NO_POLICY,
				{ enforced: A, reportOnly: undefined },
			],
			[
				'enforcement off: report on the default policy, enforce nothing',
				NO_POLICY,
				UNSET_REPORT_ONLY,
				{ enforced: undefined, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
			[
				'both off: no CSP headers at all',
				NO_POLICY,
				NO_POLICY,
				{ enforced: undefined, reportOnly: undefined },
			],
			['the same policy in both: enforce it once', A, A, { enforced: A, reportOnly: undefined }],
			[
				'legacy `true`: the configured policy stays report-only',
				A,
				{ legacyBoolean: true },
				{ enforced: undefined, reportOnly: A },
			],
			[
				'legacy `true` with neither policy configured: report on the default, enforce nothing',
				UNSET_POLICY,
				{ legacyBoolean: true },
				{ enforced: undefined, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
			[
				'legacy `true` with enforcement off: no CSP headers at all',
				NO_POLICY,
				{ legacyBoolean: true },
				{ enforced: undefined, reportOnly: undefined },
			],
			[
				'legacy `false`: the configured policy is enforced',
				A,
				{ legacyBoolean: false },
				{ enforced: A, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY },
			],
			[
				'legacy `false` with no policy configured: enforce the default policy',
				UNSET_POLICY,
				{ legacyBoolean: false },
				{ enforced: DEFAULT_CONTENT_SECURITY_POLICY, reportOnly: undefined },
			],
		];

		test.each(rows)('%s', (_name, policy, reportOnly, expected) => {
			expect(resolve(policy, reportOnly)).toEqual(expected);
		});
	});

	it('should serve a configured policy verbatim, adding no default and no nonce', () => {
		const policy = 'frame-ancestors http://localhost:3000';
		const { enforced } = resolve(policy, UNSET_REPORT_ONLY);

		expect(enforced).toBe(policy);
		expect(enforced).not.toContain('nonce');
		expect(enforced).not.toContain('script-src');
	});

	it('should not warn for a policy, which is a supported value rather than a fallback', () => {
		resolve(DEFAULT_CONTENT_SECURITY_POLICY, DEFAULT_CONTENT_SECURITY_POLICY);

		expect(logger.warn).not.toHaveBeenCalled();
	});

	describe('with the report-only setting holding a legacy boolean', () => {
		it.each([true, false])('should warn for %s', (legacyBoolean) => {
			resolve(A, { legacyBoolean });

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is deprecated'));
		});

		it('should never read a boolean as a policy', () => {
			const { enforced, reportOnly } = resolve(UNSET_POLICY, { legacyBoolean: true });

			expect(enforced).not.toBe('true');
			expect(reportOnly).not.toBe('true');
		});

		// The variable was the only way to keep the policy report-only, so honoring `true`
		// has to beat the enforced default an upgrade now brings in.
		it('should enforce nothing for `true`, whatever the enforced setting holds', () => {
			expect(resolve(UNSET_POLICY, { legacyBoolean: true }).enforced).toBeUndefined();
			expect(resolve(A, { legacyBoolean: true }).enforced).toBeUndefined();
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
		expect(DEFAULT_CONTENT_SECURITY_POLICY).toContain(NONCE_PLACEHOLDER);
		expect(renderContentSecurityPolicy(DEFAULT_CONTENT_SECURITY_POLICY, 'abc123')).toBe(
			"script-src 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'; object-src 'none'; base-uri 'none'",
		);
	});
});
