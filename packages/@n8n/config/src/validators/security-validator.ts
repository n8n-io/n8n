/**
 * Security configuration validator
 * Ensures security-critical configurations are set properly
 */

import { UserError } from '@n8n/workflow-error';

export interface SecurityValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export class SecurityValidator {
	/**
	 * Validates Content Security Policy configuration
	 */
	static validateCSP(csp: string, reportOnly: boolean): SecurityValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Limit input size to prevent DoS
		if (csp.length > 10000) {
			errors.push('CSP configuration is too large (max 10KB)');
			return { valid: false, errors, warnings };
		}

		try {
			// Parse JSON safely - will throw on prototype pollution attempts
			const policy = JSON.parse(csp);
			
			// Verify it's a plain object
			if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
				errors.push('CSP must be a JSON object');
				return { valid: false, errors, warnings };
			}
			
			// Prevent prototype pollution
			if ('__proto__' in policy || 'constructor' in policy || 'prototype' in policy) {
				errors.push('CSP contains forbidden properties');
				return { valid: false, errors, warnings };
			}

			// Check for unsafe directives
			if (policy['script-src']?.includes("'unsafe-eval'")) {
				warnings.push(
					"CSP contains 'unsafe-eval' in script-src which may allow code injection",
				);
			}

			if (policy['script-src']?.includes("'unsafe-inline'")) {
				warnings.push(
					"CSP contains 'unsafe-inline' in script-src which reduces XSS protection",
				);
			}

			// Recommend default-src
			if (!policy['default-src']) {
				warnings.push(
					'CSP should include default-src directive as a fallback for other directives',
				);
			}

			// Check for frame-ancestors to prevent clickjacking
			if (!policy['frame-ancestors']) {
				warnings.push(
					"CSP should include frame-ancestors directive to prevent clickjacking attacks",
				);
			}

			// If in report-only mode, warn about it
			if (reportOnly) {
				warnings.push(
					'CSP is in report-only mode. Set N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY=false to enforce',
				);
			}
		} catch (error) {
			errors.push(`Invalid CSP JSON format: ${(error as Error).message}`);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates file access restrictions configuration
	 */
	static validateFileAccessRestrictions(
		restrictTo: string,
		blockN8nFiles: boolean,
	): SecurityValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!restrictTo && !blockN8nFiles) {
			warnings.push(
				'No file access restrictions configured. Consider setting N8N_RESTRICT_FILE_ACCESS_TO or N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true',
			);
		}

		if (restrictTo) {
			const paths = restrictTo.split(';').filter((p) => p.trim());

			for (const path of paths) {
				// Check for path traversal attempts in configuration
				if (path.includes('..')) {
					errors.push(`File access path contains path traversal sequence: ${path}`);
				}

				// Warn about overly broad restrictions
				if (path === '/' || path === '/*') {
					warnings.push(
						`File access path '${path}' allows access to entire filesystem. Consider being more restrictive.`,
					);
				}
			}
		}

		if (!blockN8nFiles) {
			warnings.push(
				'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES is disabled. This may allow workflows to access sensitive n8n configuration files.',
			);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates JWT secret configuration
	 */
	static validateJWTSecret(secret: string): SecurityValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!secret) {
			warnings.push(
				'No JWT secret configured. n8n will generate one, but it should be set explicitly in production',
			);
		} else {
			// Check secret strength
			if (secret.length < 32) {
				errors.push(
					'JWT secret should be at least 32 characters long for adequate security',
				);
			}

			// Check for weak secrets
			const weakSecrets = ['secret', 'password', '123456', 'changeme', 'n8n'];
			if (weakSecrets.some((weak) => secret.toLowerCase().includes(weak))) {
				errors.push('JWT secret appears to be weak or contains common patterns');
			}

			// Check character diversity
			const hasNumbers = /\d/.test(secret);
			const hasLowercase = /[a-z]/.test(secret);
			const hasUppercase = /[A-Z]/.test(secret);
			const hasSpecial = /[^a-zA-Z0-9]/.test(secret);

			const diversity = [hasNumbers, hasLowercase, hasUppercase, hasSpecial].filter(
				Boolean,
			).length;

			if (diversity < 3) {
				warnings.push(
					'JWT secret should include a mix of uppercase, lowercase, numbers, and special characters',
				);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates database password configuration
	 */
	static validateDatabasePassword(password: string, dbType: string): SecurityValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (dbType === 'postgresdb' || dbType === 'mysqldb' || dbType === 'mariadb') {
			if (!password) {
				errors.push(
					`Database password is required for ${dbType} but not configured. This is a critical security issue.`,
				);
			} else if (password.length < 12) {
				warnings.push('Database password should be at least 12 characters long');
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates rate limiting configuration
	 */
	static validateRateLimiting(enabled: boolean, windowMs: number, max: number): SecurityValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!enabled) {
			warnings.push(
				'Rate limiting is disabled. This may make the application vulnerable to brute-force attacks',
			);
		} else {
			if (windowMs < 1000) {
				warnings.push('Rate limit window is very short (< 1 second)');
			}

			if (max > 1000) {
				warnings.push(
					'Rate limit max requests is very high (> 1000). Consider lowering for better protection',
				);
			}

			if (windowMs > 3600000) {
				// > 1 hour
				warnings.push('Rate limit window is very long (> 1 hour). Consider shortening');
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates all security configurations
	 */
	static validateAllSecuritySettings(config: {
		csp?: string;
		cspReportOnly?: boolean;
		restrictFileAccessTo?: string;
		blockN8nFiles?: boolean;
		jwtSecret?: string;
		dbPassword?: string;
		dbType?: string;
		rateLimitEnabled?: boolean;
		rateLimitWindowMs?: number;
		rateLimitMax?: number;
	}): SecurityValidationResult {
		const allErrors: string[] = [];
		const allWarnings: string[] = [];

		// Validate CSP
		if (config.csp !== undefined) {
			const cspResult = this.validateCSP(config.csp, config.cspReportOnly ?? false);
			allErrors.push(...cspResult.errors);
			allWarnings.push(...cspResult.warnings);
		}

		// Validate file access restrictions
		if (config.restrictFileAccessTo !== undefined || config.blockN8nFiles !== undefined) {
			const fileAccessResult = this.validateFileAccessRestrictions(
				config.restrictFileAccessTo ?? '',
				config.blockN8nFiles ?? true,
			);
			allErrors.push(...fileAccessResult.errors);
			allWarnings.push(...fileAccessResult.warnings);
		}

		// Validate JWT secret
		if (config.jwtSecret !== undefined) {
			const jwtResult = this.validateJWTSecret(config.jwtSecret);
			allErrors.push(...jwtResult.errors);
			allWarnings.push(...jwtResult.warnings);
		}

		// Validate database password
		if (config.dbPassword !== undefined && config.dbType !== undefined) {
			const dbPasswordResult = this.validateDatabasePassword(config.dbPassword, config.dbType);
			allErrors.push(...dbPasswordResult.errors);
			allWarnings.push(...dbPasswordResult.warnings);
		}

		// Validate rate limiting
		if (
			config.rateLimitEnabled !== undefined ||
			config.rateLimitWindowMs !== undefined ||
			config.rateLimitMax !== undefined
		) {
			const rateLimitResult = this.validateRateLimiting(
				config.rateLimitEnabled ?? false,
				config.rateLimitWindowMs ?? 60000,
				config.rateLimitMax ?? 100,
			);
			allErrors.push(...rateLimitResult.errors);
			allWarnings.push(...rateLimitResult.warnings);
		}

		return {
			valid: allErrors.length === 0,
			errors: allErrors,
			warnings: allWarnings,
		};
	}

	/**
	 * Throws an error if security validation fails
	 */
	static enforceSecuritySettings(validationResult: SecurityValidationResult): void {
		if (!validationResult.valid) {
			throw new UserError(
				`Security configuration validation failed:\n${validationResult.errors.join('\n')}`,
			);
		}
	}

	/**
	 * Logs security warnings to console
	 */
	static logSecurityWarnings(validationResult: SecurityValidationResult): void {
		if (validationResult.warnings.length > 0) {
			console.warn('Security Configuration Warnings:');
			for (const warning of validationResult.warnings) {
				console.warn(`  - ${warning}`);
			}
		}
	}
}
