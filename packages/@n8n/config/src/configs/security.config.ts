import { Config, Env } from '../decorators';

@Config
export class SecurityConfig {
	/**
	 * Dirs that the `ReadWriteFile` and `ReadBinaryFiles` nodes are allowed to access. Separate multiple dirs with semicolon `;`.
	 * Set to an empty string to disable restrictions (insecure, not recommended for production).
	 *
	 * @example N8N_RESTRICT_FILE_ACCESS_TO=/home/john/my-n8n-files
	 */
	@Env('N8N_RESTRICT_FILE_ACCESS_TO')
	restrictFileAccessTo: string = '~/.n8n-files';

	/**
	 * Whether to block nodes from accessing files at dirs internally used by n8n:
	 * - `~/.n8n`
	 * - `~/.cache/n8n/public`
	 * - any dirs specified by `N8N_CONFIG_FILES`, `N8N_CUSTOM_EXTENSIONS`, `N8N_BINARY_DATA_STORAGE_PATH`, `N8N_UM_EMAIL_TEMPLATES_INVITE`, and `UM_EMAIL_TEMPLATES_PWRESET`.
	 */
	@Env('N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES')
	blockFileAccessToN8nFiles: boolean = true;

	/**
	 * Blocked file and folder regular expression patterns that `ReadWriteFile` and `ReadBinaryFiles` nodes cant access. Separate multiple patterns with with semicolon `;`.
	 * - `^(.*\/)*\.git(\/.*)*$`
	 * Set to empty to not block based on file patterns.
	 */
	@Env('N8N_BLOCK_FILE_PATTERNS')
	blockFilePatterns: string = '^(.*\\/)*\\.git(\\/.*)*$';

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

	/**
	 * Whether to disable bare repositories support in the Git node.
	 */
	@Env('N8N_GIT_NODE_DISABLE_BARE_REPOS')
	disableBareRepos: boolean = true;

	/** Whether to allow access to AWS system credentials, e.g. in awsAssumeRole credentials */
	@Env('N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED')
	awsSystemCredentialsAccess: boolean = false;

	/**
	 * Whether to enable hooks (like pre-commit hooks) for the Git node.
	 */
	@Env('N8N_GIT_NODE_ENABLE_HOOKS')
	enableGitNodeHooks: boolean = false;

	/**
	 * Whether to enable arbitrary git config keys.
	 */
	@Env('N8N_GIT_NODE_ENABLE_ALL_CONFIG_KEYS')
	enableGitNodeAllConfigKeys: boolean = false;
}
