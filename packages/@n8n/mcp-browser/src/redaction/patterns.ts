// ---------------------------------------------------------------------------
// Built-in secret-shape patterns redacted from browser tool responses before
// they reach the LLM.
//
// Curation rule: deterministic prefix or fixed shape only. Length/entropy
// patterns (e.g. "any 40-char hex string") are deliberately excluded — they
// hit on commit SHAs, base64 data URLs, tracking params, and session IDs in
// normal browsing traces, violating the zero-false-positives bar required at
// this chokepoint. Heuristic / structural detection can come in a separate
// redaction layer.
//
// Sources: gitleaks v8 default config and GitHub's supported-secret-scanning
// patterns documentation.
//
// Patterns are stored without the /g flag so the same table is reusable by
// callers that want a single match. The redactor in ./redact.ts compiles a
// global-flagged copy on demand.
// ---------------------------------------------------------------------------

export interface SecretPattern {
	/** Stable slug used in the redaction marker, e.g. `[REDACTED:anthropic_api_key]`. */
	slug: string;
	pattern: RegExp;
}

export const BUILTIN_PATTERNS: readonly SecretPattern[] = [
	// --- Generic crypto material -------------------------------------------
	// OpenSSH is more specific than the generic PEM block — list it first so
	// the redaction marker carries the precise slug. Each pattern greedily
	// consumes the full BEGIN..END block (including the base64 body) so the
	// key material itself is removed. When a key is truncated and the END
	// footer is missing, the optional group falls back to header-only so we
	// at least redact the marker.
	{
		slug: 'openssh_private_key',
		pattern: /-----BEGIN OPENSSH PRIVATE KEY-----(?:[\s\S]*?-----END OPENSSH PRIVATE KEY-----)?/,
	},
	{
		slug: 'pem_private_key',
		pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)?/,
	},

	// --- AI providers ------------------------------------------------------
	{ slug: 'anthropic_api_key', pattern: /\bsk-ant-api03-[A-Za-z0-9_-]{93}AA\b/ },
	{ slug: 'anthropic_admin_key', pattern: /\bsk-ant-admin01-[A-Za-z0-9_-]{93}AA\b/ },
	{ slug: 'openai_api_key', pattern: /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{74,}\b/ },
	{ slug: 'openai_legacy_api_key', pattern: /\bsk-[A-Za-z0-9]{48}\b/ },
	{ slug: 'huggingface_token', pattern: /\bhf_[A-Za-z0-9]{34,40}\b/ },

	// --- Cloud platforms ---------------------------------------------------
	// Google: covers GCP API keys and Gemini AI Studio keys.
	{ slug: 'google_api_key', pattern: /\bAIza[\w-]{35}\b/ },
	// AWS: IAM (AKIA), STS (ASIA), Bedrock (ABIA), CloudFront (A3T*), Snow (ACCA).
	{
		slug: 'aws_access_key_id',
		pattern: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/,
	},
	{ slug: 'azure_ad_client_secret', pattern: /\b[A-Za-z0-9_~.]{3}\dQ~[A-Za-z0-9_~.-]{31,34}\b/ },

	// --- Source forges -----------------------------------------------------
	{ slug: 'github_pat', pattern: /\bghp_[0-9a-zA-Z]{36}\b/ },
	{ slug: 'github_fine_grained_pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
	{ slug: 'github_oauth', pattern: /\bgho_[0-9a-zA-Z]{36}\b/ },
	{ slug: 'github_app_token', pattern: /\b(?:ghu|ghs)_[0-9a-zA-Z]{36}\b/ },
	{ slug: 'github_refresh_token', pattern: /\bghr_[0-9a-zA-Z]{36}\b/ },
	{ slug: 'gitlab_pat', pattern: /\bglpat-[A-Za-z0-9_-]{20}\b/ },

	// --- Communications ----------------------------------------------------
	{ slug: 'slack_bot_token', pattern: /\bxoxb-\d{10,13}-\d{10,13}-[A-Za-z0-9-]{24,34}\b/ },
	{ slug: 'slack_user_token', pattern: /\bxox[apre]-(?:\d+-){2,3}[A-Za-z0-9-]{12,}\b/ },
	{
		slug: 'slack_webhook_url',
		pattern: /https?:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9+/]{43,}/,
	},
	{ slug: 'twilio_api_key_sid', pattern: /\bSK[0-9a-fA-F]{32}\b/ },
	{ slug: 'twilio_account_sid', pattern: /\bAC[0-9a-fA-F]{32}\b/ },

	// --- Payments ----------------------------------------------------------
	{ slug: 'stripe_secret_key', pattern: /\b(?:sk|rk)_(?:live|test|prod)_[A-Za-z0-9]{20,99}\b/ },
	{
		slug: 'square_access_token',
		pattern: /\b(?:EAAA[A-Za-z0-9_-]{60,}|sq0atp-[A-Za-z0-9_-]{22})\b/,
	},

	// --- Package registries ------------------------------------------------
	{ slug: 'npm_token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
	{ slug: 'pypi_token', pattern: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}\b/ },

	// --- Observability / dev tools -----------------------------------------
	{ slug: 'sentry_user_token', pattern: /\bsntryu_[a-f0-9]{64}\b/ },
	{ slug: 'grafana_api_key', pattern: /\beyJrIjoi[A-Za-z0-9]{70,}={0,3}\b/ },

	// --- Generic auth ------------------------------------------------------
	// JWT (RFC 7519 JWS compact form). Many web UIs render JWTs in cookie
	// inspectors / auth-header viewers; if real-world traces show false
	// positives we'll narrow this further. The pattern requires the canonical
	// `eyJ` (`{"`) base64url prefix on both header and payload.
	{
		slug: 'jwt',
		pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
	},
];
