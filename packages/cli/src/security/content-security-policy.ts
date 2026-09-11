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
 * Send one header when both policies are the same, as they are by default. A report-only
 * copy of the enforced policy reports the violations the enforced header already reports,
 * so it only adds bytes to every HTML response.
 */
const dropRedundantReportOnly = (policies: ContentSecurityPolicies): ContentSecurityPolicies =>
	policies.enforced !== undefined && policies.enforced === policies.reportOnly
		? { enforced: policies.enforced, reportOnly: undefined }
		: policies;

/**
 * Decide which CSP headers to send from the two parsed settings. `@n8n/config` has
 * already read each variable on its own; the decisions left are the ones that need
 * both: the boolean the report-only variable used to hold, and the pair being equal.
 *
 * Both variables carry the same policy by default, which the instance then enforces:
 * a new instance is protected without configuration.
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

		// `true` used to mean "report, never block". Enforcing the default policy here
		// would break an instance that deliberately asked for report-only.
		if (reportOnly.legacyBoolean) return { reportOnly: policy };

		return dropRedundantReportOnly({
			enforced: policy,
			reportOnly: DEFAULT_CONTENT_SECURITY_POLICY,
		});
	}

	return dropRedundantReportOnly({ enforced: policy, reportOnly });
};

export const renderContentSecurityPolicy = (policy: string, nonce: string) =>
	policy.replaceAll(NONCE_PLACEHOLDER, `'nonce-${nonce}'`);
