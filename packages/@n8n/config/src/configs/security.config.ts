import z from 'zod';

import { Config, Env } from '../decorators';

const crossOriginOpenerPolicySchema = z.enum(['same-origin', 'same-origin-allow-popups']);

// Mirrors the `Resolvers` union in nodes-base (`system-credentials-utils.ts`);
// kept in sync manually since @n8n/config cannot import from nodes-base.
const awsSystemCredentialSources = [
	'environment',
	'roleForServiceAccount',
	'podIdentity',
	'containerMetadata',
	'instanceMetadata',
] as const;

const awsSystemCredentialsSdkSourcesSchema = z.string().refine(
	(value) => {
		const raw = value.trim();
		if (raw === '' || raw === 'all' || raw === 'none') return true;
		return raw
			.split(',')
			.map((source) => source.trim())
			.filter((source) => source !== '')
			.every((source) => (awsSystemCredentialSources as readonly string[]).includes(source));
	},
	{
		message: `Must be 'all', 'none', or a comma-separated list of: ${awsSystemCredentialSources.join(', ')}`,
	},
);

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
	 * Regex patterns for files and folders that `ReadWriteFile` and `ReadBinaryFiles` nodes cannot access.
	 * Separate multiple patterns with semicolons. Default blocks `.git`. Set to empty to disable pattern-based blocking.
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
	 * Configuration for the `Cross-Origin-Opener-Policy` header.
	 */
	@Env('N8N_CROSS_ORIGIN_OPENER_POLICY', crossOriginOpenerPolicySchema)
	crossOriginOpenerPolicy: z.infer<typeof crossOriginOpenerPolicySchema> =
		'same-origin-allow-popups';

	/**
	 * Whether to disable HTML sandboxing for webhooks. The sandboxing mechanism uses CSP headers now,
	 * but the name is kept for backwards compatibility.
	 */
	@Env('N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX')
	disableWebhookHtmlSandboxing: boolean = false;

	/**
	 * Whether to disable CSP sandboxing for form pages (Form Trigger, Send and Wait).
	 *
	 * WARNING: Disabling CSP protection leaves the instance vulnerable to attacks where a
	 * malicious user can build a workflow that makes requests using other users' credentials.
	 * The correct way to prevent this is to configure forms to be served from a different
	 * (sub)domain instead of disabling the sandbox.
	 */
	@Env('N8N_INSECURE_DISABLE_FORM_HTML_SANDBOX')
	disableFormHtmlSandboxing: boolean = false;

	/**
	 * Whether to disable bare repositories support in the Git node.
	 */
	@Env('N8N_GIT_NODE_DISABLE_BARE_REPOS')
	disableBareRepos: boolean = true;

	/** Whether to allow access to AWS system credentials, e.g. in awsAssumeRole credentials */
	@Env('N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED')
	awsSystemCredentialsAccess: boolean = false;

	/**
	 * Which AWS system-credential sources resolve via the AWS SDK instead of the legacy
	 * hand-rolled HTTP resolver. Accepts `all`, `none`, or a comma-separated subset of:
	 * `environment`, `roleForServiceAccount`, `podIdentity`, `containerMetadata`, `instanceMetadata`.
	 * Transitional switch-back flag; removed one release after the SDK migration is complete.
	 *
	 * @example N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES=environment,instanceMetadata
	 */
	@Env('N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES', awsSystemCredentialsSdkSourcesSchema)
	awsSystemCredentialsSdkSources: string = 'all';

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
