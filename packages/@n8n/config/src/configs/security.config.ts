import { Config, Env } from '../decorators';

@Config
export class SecurityConfig {
	/**
	 * Which directories to limit n8n's access to. Separate multiple dirs with semicolon `;`.
	 *
	 * @example N8N_RESTRICT_FILE_ACCESS_TO=/home/user/.n8n;/home/user/n8n-data
	 */
	@Env('N8N_RESTRICT_FILE_ACCESS_TO')
	restrictFileAccessTo: string = '';

	/**
	 * Whether to block access to all files at:
	 * - the ".n8n" directory,
	 * - the static cache dir at ~/.cache/n8n/public, and
	 * - user-defined config files.
	 */
	@Env('N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES')
	blockFileAccessToN8nFiles: boolean = true;

	/**
	 * In a [security audit](https://docs.n8n.io/hosting/securing/security-audit/), how many days for a workflow to be considered abandoned if not executed.
	 */
	@Env('N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW')
	daysAbandonedWorkflow: number = 90;

	/**
	 * Set [Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) headers as [helmet.js](https://helmetjs.github.io/#content-security-policy) nested directives object.
	 * Example: { "frame-ancestors": ["http://localhost:3000"] }
	 */
	// TODO: create a new type that parses and validates this string into a strongly-typed object
	@Env('N8N_CONTENT_SECURITY_POLICY')
	contentSecurityPolicy: string = '{}';

	/**
	 * Whether to set the `Content-Security-Policy-Report-Only` header instead of `Content-Security-Policy`.
	 */
	@Env('N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY')
	contentSecurityPolicyReportOnly: boolean = false;

	/**
	 * Whether to disable HTML sandboxing for webhooks. The sandboxing mechanism uses CSP headers now,
	 * but the name is kept for backwards compatibility.
	 */
	@Env('N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX')
	disableWebhookHtmlSandboxing: boolean = false;
}
