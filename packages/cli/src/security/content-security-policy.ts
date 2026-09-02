import type { Logger } from '@n8n/backend-common';
import type {
	ContentSecurityPolicyReportOnlySetting,
	ContentSecurityPolicySetting,
} from '@n8n/config';
import { DEFAULT_CONTENT_SECURITY_POLICY, isLegacyBooleanSetting } from '@n8n/config';
import { NONCE_PLACEHOLDER } from '@n8n/constants';

export type ContentSecurityPolicies = {
	/** Policy for the `Content-Security-Policy` header, or `undefined` to not send it. */
	enforced?: string;
	/** Policy for the `Content-Security-Policy-Report-Only` header, or `undefined` to not send it. */
	reportOnly?: string;
};

/**
 * Decide which CSP headers to send from the two parsed settings. `@n8n/config` has
 * already read each variable on its own; the only decision left is the one that needs
 * both, namely the boolean the report-only variable used to hold.
 *
 * Only the report-only variable carries a policy by default, so a new instance reports
 * violations but cannot break on them.
 */
export const resolveContentSecurityPolicies = (
	policy: ContentSecurityPolicySetting,
	reportOnly: ContentSecurityPolicyReportOnlySetting,
	logger: Pick<Logger, 'warn'>,
): ContentSecurityPolicies => {
	if (isLegacyBooleanSetting(reportOnly)) {
		logger.warn(
			'N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY is deprecated as a boolean: the variable now holds the policy to report on, in the same formats as N8N_CONTENT_SECURITY_POLICY. Honoring the old meaning for now - set it to a policy, or to `{}` to report on nothing.',
		);

		// Read as a policy, `true` would start enforcing a policy that the instance
		// deliberately kept report-only.
		return reportOnly.legacyBoolean
			? { reportOnly: policy ?? DEFAULT_CONTENT_SECURITY_POLICY }
			: { enforced: policy, reportOnly: DEFAULT_CONTENT_SECURITY_POLICY };
	}

	return { enforced: policy, reportOnly };
};

export const renderContentSecurityPolicy = (policy: string, nonce: string) =>
	policy.replaceAll(NONCE_PLACEHOLDER, `'nonce-${nonce}'`);
