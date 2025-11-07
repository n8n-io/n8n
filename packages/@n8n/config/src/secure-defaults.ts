/**
 * Secure configuration defaults for n8n
 * These are recommended security settings for production deployments
 */

export const SECURE_DEFAULTS = {
	/**
	 * Content Security Policy
	 * Strict CSP to prevent XSS attacks
	 */
	csp: {
		'default-src': ["'self'"],
		'script-src': ["'self'"],
		'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some UI components
		'img-src': ["'self'", 'data:', 'https:'],
		'font-src': ["'self'", 'data:'],
		'connect-src': ["'self'"],
		'frame-ancestors': ["'none'"],
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'frame-src': ["'none'"],
		'object-src': ["'none'"],
	},

	/**
	 * Security headers
	 */
	headers: {
		'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
		'X-Frame-Options': 'DENY',
		'X-Content-Type-Options': 'nosniff',
		'X-XSS-Protection': '1; mode=block',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy':
			'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
	},

	/**
	 * Rate limiting defaults
	 */
	rateLimit: {
		// General API endpoints
		general: {
			windowMs: 60000, // 1 minute
			max: 100, // 100 requests per minute
		},
		// Authentication endpoints
		auth: {
			windowMs: 900000, // 15 minutes
			max: 5, // 5 login attempts per 15 minutes
		},
		// Password reset endpoints
		passwordReset: {
			windowMs: 3600000, // 1 hour
			max: 3, // 3 password reset requests per hour
		},
		// Webhook endpoints
		webhook: {
			windowMs: 60000, // 1 minute
			max: 300, // 300 requests per minute
		},
	},

	/**
	 * Session configuration
	 */
	session: {
		accessTokenExpiration: '15m', // 15 minutes
		refreshTokenExpiration: '7d', // 7 days
		cookieSecure: true, // HTTPS only
		cookieHttpOnly: true, // No JavaScript access
		cookieSameSite: 'strict' as const, // CSRF protection
	},

	/**
	 * Password policy
	 */
	password: {
		minLength: 12,
		requireUppercase: true,
		requireLowercase: true,
		requireNumbers: true,
		requireSpecial: true,
		maxAge: 90, // days
		historyCount: 5, // Remember last 5 passwords
	},

	/**
	 * File access restrictions
	 */
	fileAccess: {
		blockN8nFiles: true,
		maxUploadSize: 16 * 1024 * 1024, // 16 MB
		allowedExtensions: [
			'.json',
			'.csv',
			'.txt',
			'.xml',
			'.yaml',
			'.yml',
			'.pdf',
			'.png',
			'.jpg',
			'.jpeg',
			'.gif',
			'.svg',
		],
	},

	/**
	 * Workflow execution limits
	 */
	execution: {
		maxExecutionTime: 3600000, // 1 hour in milliseconds
		maxWorkflowSize: 1024 * 1024, // 1 MB
		maxNodeCount: 1000,
		saveDataErrorExecution: 'all' as const,
		saveDataSuccessExecution: 'all' as const,
		saveExecutionProgress: true,
	},

	/**
	 * Database security
	 */
	database: {
		ssl: true,
		poolMin: 2,
		poolMax: 10,
		connectionTimeout: 30000, // 30 seconds
	},

	/**
	 * Logging configuration
	 */
	logging: {
		level: 'info',
		outputs: ['file'],
		maxFiles: 100,
		maxSize: '20m',
		excludeSensitiveData: true,
	},

	/**
	 * Audit logging
	 */
	audit: {
		enabled: true,
		events: [
			'user.login',
			'user.logout',
			'user.login.failed',
			'user.created',
			'user.deleted',
			'user.updated',
			'credential.created',
			'credential.updated',
			'credential.deleted',
			'credential.accessed',
			'workflow.created',
			'workflow.updated',
			'workflow.deleted',
			'workflow.activated',
			'workflow.deactivated',
			'workflow.executed',
			'settings.updated',
		],
	},

	/**
	 * External secrets
	 */
	externalSecrets: {
		enabled: false, // Enable when using external secret management
		updateInterval: 300, // 5 minutes
	},

	/**
	 * Node execution
	 */
	nodes: {
		allowBuiltin: ['crypto', 'buffer', 'querystring', 'url', 'string_decoder'],
		allowExternal: [], // Explicitly list allowed external packages
		excludeNodes: [], // List of node types to disable
	},

	/**
	 * Webhook security
	 */
	webhooks: {
		maxPayloadSize: '16mb',
		timeout: 120000, // 2 minutes
		disableHtmlSandboxing: false,
	},

	/**
	 * Security audit
	 */
	securityAudit: {
		daysAbandonedWorkflow: 90,
		enabled: true,
	},

	/**
	 * CORS configuration
	 */
	cors: {
		enabled: false,
		origin: [], // Explicitly list allowed origins
		credentials: true,
	},

	/**
	 * API configuration
	 */
	api: {
		disabled: false,
		path: 'api',
		rateLimit: true,
	},

	/**
	 * Metrics and monitoring
	 */
	metrics: {
		enabled: true,
		prefix: 'n8n_',
		includeDefaultMetrics: true,
		includeWorkflowIdLabel: true,
		includeNodeTypeLabel: true,
		includeCredentialTypeLabel: false, // Don't expose credential types
	},
} as const;

/**
 * Get secure defaults with optional overrides
 */
export function getSecureDefaults<T extends keyof typeof SECURE_DEFAULTS>(
	category?: T,
): typeof SECURE_DEFAULTS | (typeof SECURE_DEFAULTS)[T] {
	if (category) {
		return SECURE_DEFAULTS[category];
	}
	return SECURE_DEFAULTS;
}

/**
 * Validate that current configuration meets security standards
 */
export function validateSecurityConfiguration(config: Record<string, unknown>): {
	valid: boolean;
	warnings: string[];
	errors: string[];
} {
	const warnings: string[] = [];
	const errors: string[] = [];

	// Check CSP
	if (!config.csp || config.csp === '{}') {
		warnings.push('Content Security Policy is not configured or empty');
	}

	// Check HTTPS
	if (config.protocol !== 'https') {
		warnings.push('HTTPS is not enabled. This is required for production deployments');
	}

	// Check JWT secret
	if (!config.jwtSecret || (config.jwtSecret as string).length < 32) {
		errors.push('JWT secret is not configured or too weak');
	}

	// Check file access restrictions
	if (!config.blockN8nFiles) {
		warnings.push('File access to n8n files is not blocked');
	}

	// Check rate limiting
	if (!config.rateLimitEnabled) {
		warnings.push('Rate limiting is not enabled');
	}

	return {
		valid: errors.length === 0,
		warnings,
		errors,
	};
}
