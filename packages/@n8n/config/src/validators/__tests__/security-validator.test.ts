/**
 * Tests for SecurityValidator
 */

import { SecurityValidator } from '../security-validator';

describe('SecurityValidator', () => {
	describe('validateCSP', () => {
		it('should pass for valid CSP', () => {
			const csp = JSON.stringify({
				'default-src': ["'self'"],
				'frame-ancestors': ["'none'"],
			});
			const result = SecurityValidator.validateCSP(csp, false);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should warn about unsafe-eval', () => {
			const csp = JSON.stringify({
				'script-src': ["'self'", "'unsafe-eval'"],
			});
			const result = SecurityValidator.validateCSP(csp, false);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"CSP contains 'unsafe-eval' in script-src which may allow code injection",
			);
		});

		it('should warn about unsafe-inline', () => {
			const csp = JSON.stringify({
				'script-src': ["'self'", "'unsafe-inline'"],
			});
			const result = SecurityValidator.validateCSP(csp, false);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"CSP contains 'unsafe-inline' in script-src which reduces XSS protection",
			);
		});

		it('should warn about missing default-src', () => {
			const csp = JSON.stringify({
				'script-src': ["'self'"],
			});
			const result = SecurityValidator.validateCSP(csp, false);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'CSP should include default-src directive as a fallback for other directives',
			);
		});

		it('should warn about report-only mode', () => {
			const csp = JSON.stringify({
				'default-src': ["'self'"],
			});
			const result = SecurityValidator.validateCSP(csp, true);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'CSP is in report-only mode. Set N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY=false to enforce',
			);
		});

		it('should fail for invalid JSON', () => {
			const csp = 'invalid json';
			const result = SecurityValidator.validateCSP(csp, false);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe('validateFileAccessRestrictions', () => {
		it('should warn when no restrictions are set', () => {
			const result = SecurityValidator.validateFileAccessRestrictions('', false);
			expect(result.valid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should fail for path traversal in config', () => {
			const result = SecurityValidator.validateFileAccessRestrictions('/home/../etc', true);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'File access path contains path traversal sequence: /home/../etc',
			);
		});

		it('should warn about overly broad restrictions', () => {
			const result = SecurityValidator.validateFileAccessRestrictions('/', true);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"File access path '/' allows access to entire filesystem. Consider being more restrictive.",
			);
		});

		it('should warn when n8n files are not blocked', () => {
			const result = SecurityValidator.validateFileAccessRestrictions('/home/user', false);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES is disabled. This may allow workflows to access sensitive n8n configuration files.',
			);
		});

		it('should pass for valid restrictive configuration', () => {
			const result = SecurityValidator.validateFileAccessRestrictions('/home/user/data', true);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateJWTSecret', () => {
		it('should warn when no secret is provided', () => {
			const result = SecurityValidator.validateJWTSecret('');
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'No JWT secret configured. n8n will generate one, but it should be set explicitly in production',
			);
		});

		it('should fail for short secrets', () => {
			const result = SecurityValidator.validateJWTSecret('short');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'JWT secret should be at least 32 characters long for adequate security',
			);
		});

		it('should fail for weak secrets', () => {
			const result = SecurityValidator.validateJWTSecret(
				'thisisasecretbutitcontainspassword',
			);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('JWT secret appears to be weak or contains common patterns');
		});

		it('should warn about lack of character diversity', () => {
			const result = SecurityValidator.validateJWTSecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'JWT secret should include a mix of uppercase, lowercase, numbers, and special characters',
			);
		});

		it('should pass for strong secret', () => {
			const result = SecurityValidator.validateJWTSecret(
				'aB3$dF6!hJ9@kL0#mN2%pQ5^rS8&tU1*vW4',
			);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateDatabasePassword', () => {
		it('should fail when PostgreSQL password is missing', () => {
			const result = SecurityValidator.validateDatabasePassword('', 'postgresdb');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'Database password is required for postgresdb but not configured. This is a critical security issue.',
			);
		});

		it('should warn for short database password', () => {
			const result = SecurityValidator.validateDatabasePassword('short', 'postgresdb');
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain('Database password should be at least 12 characters long');
		});

		it('should pass for SQLite (no password required)', () => {
			const result = SecurityValidator.validateDatabasePassword('', 'sqlite');
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should pass for MySQL with strong password', () => {
			const result = SecurityValidator.validateDatabasePassword(
				'StrongPassword123!',
				'mysqldb',
			);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateRateLimiting', () => {
		it('should warn when rate limiting is disabled', () => {
			const result = SecurityValidator.validateRateLimiting(false, 60000, 100);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'Rate limiting is disabled. This may make the application vulnerable to brute-force attacks',
			);
		});

		it('should warn for very short window', () => {
			const result = SecurityValidator.validateRateLimiting(true, 500, 100);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain('Rate limit window is very short (< 1 second)');
		});

		it('should warn for very high max requests', () => {
			const result = SecurityValidator.validateRateLimiting(true, 60000, 2000);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				'Rate limit max requests is very high (> 1000). Consider lowering for better protection',
			);
		});

		it('should warn for very long window', () => {
			const result = SecurityValidator.validateRateLimiting(true, 7200000, 100);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain('Rate limit window is very long (> 1 hour). Consider shortening');
		});

		it('should pass for reasonable rate limiting', () => {
			const result = SecurityValidator.validateRateLimiting(true, 60000, 100);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateAllSecuritySettings', () => {
		it('should validate all settings and accumulate errors and warnings', () => {
			const config = {
				csp: '{}',
				cspReportOnly: false,
				restrictFileAccessTo: '/',
				blockN8nFiles: false,
				jwtSecret: 'short',
				dbPassword: '',
				dbType: 'postgresdb',
				rateLimitEnabled: false,
				rateLimitWindowMs: 60000,
				rateLimitMax: 100,
			};

			const result = SecurityValidator.validateAllSecuritySettings(config);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should pass for secure configuration', () => {
			const config = {
				csp: JSON.stringify({
					'default-src': ["'self'"],
					'frame-ancestors': ["'none'"],
				}),
				cspReportOnly: false,
				restrictFileAccessTo: '/home/user/n8n-data',
				blockN8nFiles: true,
				jwtSecret: 'aB3$dF6!hJ9@kL0#mN2%pQ5^rS8&tU1*vW4',
				dbPassword: 'StrongDatabasePassword123!',
				dbType: 'postgresdb',
				rateLimitEnabled: true,
				rateLimitWindowMs: 60000,
				rateLimitMax: 100,
			};

			const result = SecurityValidator.validateAllSecuritySettings(config);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('enforceSecuritySettings', () => {
		it('should throw error when validation fails', () => {
			const validationResult = {
				valid: false,
				errors: ['Critical error 1', 'Critical error 2'],
				warnings: [],
			};

			expect(() => {
				SecurityValidator.enforceSecuritySettings(validationResult);
			}).toThrow('Security configuration validation failed');
		});

		it('should not throw when validation passes', () => {
			const validationResult = {
				valid: true,
				errors: [],
				warnings: ['Just a warning'],
			};

			expect(() => {
				SecurityValidator.enforceSecuritySettings(validationResult);
			}).not.toThrow();
		});
	});

	describe('logSecurityWarnings', () => {
		let consoleWarnSpy: jest.SpyInstance;

		beforeEach(() => {
			consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		});

		afterEach(() => {
			consoleWarnSpy.mockRestore();
		});

		it('should log warnings to console', () => {
			const validationResult = {
				valid: true,
				errors: [],
				warnings: ['Warning 1', 'Warning 2'],
			};

			SecurityValidator.logSecurityWarnings(validationResult);

			expect(consoleWarnSpy).toHaveBeenCalledWith('Security Configuration Warnings:');
			expect(consoleWarnSpy).toHaveBeenCalledWith('  - Warning 1');
			expect(consoleWarnSpy).toHaveBeenCalledWith('  - Warning 2');
		});

		it('should not log when there are no warnings', () => {
			const validationResult = {
				valid: true,
				errors: [],
				warnings: [],
			};

			SecurityValidator.logSecurityWarnings(validationResult);

			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});
	});
});
