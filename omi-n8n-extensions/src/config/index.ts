/**
 * OmiGroup n8n Extensions - Configuration
 *
 * All configuration is loaded from environment variables.
 * No n8n core code is modified.
 *
 * Cookie config is read from n8n's own env vars to ensure
 * our auth cookies are 100% compatible with n8n's middleware.
 */

export interface OmiConfig {
	/** Google OAuth2 */
	google: {
		clientId: string;
		clientSecret: string;
		callbackUrl: string;
	};

	/** Domain whitelist */
	domainWhitelist: {
		/** Comma-separated list of allowed email domains */
		domains: string[];
		/** Whether to enforce domain whitelist (if false, any Google account can sign in) */
		enforced: boolean;
	};

	/** Admin configuration */
	admin: {
		/** Comma-separated list of admin email addresses */
		emails: string[];
	};

	/** n8n internal configuration (auto-detected) */
	n8n: {
		/** Base URL of the n8n instance */
		baseUrl: string;
		/** JWT secret used by n8n (must match N8N_USER_MANAGEMENT_JWT_SECRET) */
		jwtSecret: string;
		/** n8n REST endpoint prefix */
		restEndpoint: string;
	};

	/**
	 * Cookie configuration — must match n8n's auth cookie settings.
	 * n8n reads from N8N_AUTH_COOKIE_SECURE and sameSite from config.
	 */
	cookie: {
		/** Whether cookies should have Secure flag */
		secure: boolean;
		/** SameSite attribute for cookies */
		sameSite: 'lax' | 'none' | 'strict';
	};

	/** Database */
	database: {
		/** Path to the SQLite file for OmiGroup extension data */
		sqlitePath: string;
	};

	/** Template Hub */
	templates: {
		/** Whether template hub is enabled */
		enabled: boolean;
		/** Whether templates require admin approval before being public */
		requireApproval: boolean;
	};

	/** Usage stats */
	stats: {
		/** Whether to collect usage statistics */
		enabled: boolean;
		/** How long to keep detailed stats (days) */
		retentionDays: number;
	};
}

function getEnvOrThrow(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`[OmiGroup] Missing required environment variable: ${key}`);
	}
	return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
	return process.env[key] ?? defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
	const value = process.env[key];
	if (value === undefined) return defaultValue;
	return value === 'true' || value === '1';
}

function getEnvInt(key: string, defaultValue: number): number {
	const value = process.env[key];
	if (value === undefined) return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Detect cookie secure/sameSite settings.
 *
 * n8n's GlobalConfig reads:
 *   auth.cookie.secure = N8N_AUTH_COOKIE_SECURE (default: auto-detect from protocol)
 *   auth.cookie.sameSite = 'lax' (for http) or 'none' (for https with secure)
 *
 * We mirror this logic to ensure our cookies are compatible.
 */
function detectCookieConfig(baseUrl: string): { secure: boolean; sameSite: 'lax' | 'none' | 'strict' } {
	// Check explicit env var first (n8n uses N8N_SECURE_COOKIE historically)
	const explicitSecure = process.env.N8N_SECURE_COOKIE ?? process.env.N8N_AUTH_COOKIE_SECURE;
	if (explicitSecure !== undefined) {
		const secure = explicitSecure === 'true' || explicitSecure === '1';
		return {
			secure,
			sameSite: secure ? 'none' : 'lax',
		};
	}

	// Auto-detect from base URL protocol
	const isHttps = baseUrl.startsWith('https');
	return {
		secure: isHttps,
		sameSite: isHttps ? 'none' : 'lax',
	};
}

let _config: OmiConfig | null = null;

export function loadConfig(): OmiConfig {
	if (_config) return _config;

	const baseUrl = getEnvOrDefault('N8N_EDITOR_BASE_URL', 'http://localhost:5678');

	_config = {
		google: {
			clientId: getEnvOrThrow('OMI_GOOGLE_CLIENT_ID'),
			clientSecret: getEnvOrThrow('OMI_GOOGLE_CLIENT_SECRET'),
			callbackUrl: getEnvOrDefault(
				'OMI_GOOGLE_CALLBACK_URL',
				`${baseUrl}/omi/auth/google/callback`,
			),
		},
		domainWhitelist: {
			domains: getEnvOrDefault('OMI_DOMAIN_WHITELIST', '')
				.split(',')
				.map((d) => d.trim().toLowerCase())
				.filter(Boolean),
			enforced: getEnvBool('OMI_DOMAIN_WHITELIST_ENFORCED', true),
		},
		admin: {
			emails: getEnvOrDefault('OMI_ADMIN_EMAILS', '')
				.split(',')
				.map((e) => e.trim().toLowerCase())
				.filter(Boolean),
		},
		n8n: {
			baseUrl,
			jwtSecret: getEnvOrThrow('N8N_USER_MANAGEMENT_JWT_SECRET'),
			restEndpoint: getEnvOrDefault('N8N_REST_ENDPOINT', 'rest'),
		},
		cookie: detectCookieConfig(baseUrl),
		database: {
			sqlitePath: getEnvOrDefault('OMI_SQLITE_PATH', '/home/node/.n8n/omi-extensions.sqlite'),
		},
		templates: {
			enabled: getEnvBool('OMI_TEMPLATES_ENABLED', true),
			requireApproval: getEnvBool('OMI_TEMPLATES_REQUIRE_APPROVAL', false),
		},
		stats: {
			enabled: getEnvBool('OMI_STATS_ENABLED', true),
			retentionDays: getEnvInt('OMI_STATS_RETENTION_DAYS', 90),
		},
	};

	return _config;
}

export function getConfig(): OmiConfig {
	if (!_config) {
		throw new Error('[OmiGroup] Config not loaded yet. Call loadConfig() first.');
	}
	return _config;
}
