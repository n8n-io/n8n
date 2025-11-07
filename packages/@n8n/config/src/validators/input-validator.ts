/**
 * Enhanced input validation utilities
 * Provides comprehensive validation for common security-sensitive inputs
 */

import { UserError } from '@n8n/workflow-error';

export class InputValidator {
	/**
	 * Validates email addresses
	 */
	static validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) && email.length <= 254;
	}

	/**
	 * Validates and sanitizes file paths to prevent path traversal
	 */
	static sanitizeFilePath(path: string, allowedBasePaths: string[] = []): string {
		// Normalize path separators
		const normalizedPath = path.replace(/\\/g, '/');

		// Check for path traversal attempts
		if (normalizedPath.includes('..')) {
			throw new UserError('Path traversal detected in file path');
		}

		// Check for absolute paths outside allowed directories
		if (allowedBasePaths.length > 0) {
			const isAllowed = allowedBasePaths.some((basePath) =>
				normalizedPath.startsWith(basePath),
			);

			if (!isAllowed) {
				throw new UserError(`Access to path outside allowed directories is forbidden`);
			}
		}

		// Remove any null bytes
		const sanitized = normalizedPath.replace(/\0/g, '');

		return sanitized;
	}

	/**
	 * Validates URL to prevent SSRF attacks
	 */
	static validateUrl(
		url: string,
		options: {
			allowedProtocols?: string[];
			blockPrivateIPs?: boolean;
			blockLocalhost?: boolean;
		} = {},
	): boolean {
		const {
			allowedProtocols = ['http', 'https'],
			blockPrivateIPs = true,
			blockLocalhost = true,
		} = options;

		try {
			const parsedUrl = new URL(url);

			// Check protocol
			const protocol = parsedUrl.protocol.replace(':', '');
			if (!allowedProtocols.includes(protocol)) {
				throw new UserError(`Protocol '${protocol}' is not allowed`);
			}

			// Check for localhost
			if (blockLocalhost) {
				const localhostPatterns = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
				if (localhostPatterns.some((pattern) => parsedUrl.hostname.includes(pattern))) {
					throw new UserError('Localhost URLs are not allowed');
				}
			}

			// Check for private IP ranges
			if (blockPrivateIPs) {
				const hostname = parsedUrl.hostname;

				// IPv4 private ranges
				const privateIPv4Ranges = [
					/^10\./,
					/^172\.(1[6-9]|2[0-9]|3[0-1])\./,
					/^192\.168\./,
					/^169\.254\./, // Link-local
				];

				if (privateIPv4Ranges.some((pattern) => pattern.test(hostname))) {
					throw new UserError('Private IP addresses are not allowed');
				}

				// IPv6 private ranges
				if (hostname.startsWith('fc') || hostname.startsWith('fd')) {
					throw new UserError('Private IPv6 addresses are not allowed');
				}
			}

			return true;
		} catch (error) {
			if (error instanceof UserError) {
				throw error;
			}
			throw new UserError(`Invalid URL format: ${(error as Error).message}`);
		}
	}

	/**
	 * Sanitizes SQL identifiers (table names, column names)
	 */
	static sanitizeSQLIdentifier(identifier: string): string {
		// Only allow alphanumeric characters and underscores
		if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
			throw new UserError('SQL identifier contains invalid characters');
		}

		// Check length
		if (identifier.length > 64) {
			throw new UserError('SQL identifier is too long (max 64 characters)');
		}

		return identifier;
	}

	/**
	 * Validates numeric input within range
	 */
	static validateNumber(
		value: unknown,
		options: {
			min?: number;
			max?: number;
			allowFloat?: boolean;
		} = {},
	): number {
		const { min, max, allowFloat = true } = options;

		const num = Number(value);

		if (isNaN(num)) {
			throw new UserError('Value must be a valid number');
		}

		if (!allowFloat && !Number.isInteger(num)) {
			throw new UserError('Value must be an integer');
		}

		if (min !== undefined && num < min) {
			throw new UserError(`Value must be at least ${min}`);
		}

		if (max !== undefined && num > max) {
			throw new UserError(`Value must be at most ${max}`);
		}

		return num;
	}

	/**
	 * Validates string length and content
	 */
	static validateString(
		value: string,
		options: {
			minLength?: number;
			maxLength?: number;
			pattern?: RegExp;
			allowEmpty?: boolean;
		} = {},
	): string {
		const { minLength, maxLength, pattern, allowEmpty = false } = options;

		if (!allowEmpty && value.length === 0) {
			throw new UserError('Value cannot be empty');
		}

		if (minLength !== undefined && value.length < minLength) {
			throw new UserError(`Value must be at least ${minLength} characters long`);
		}

		if (maxLength !== undefined && value.length > maxLength) {
			throw new UserError(`Value must be at most ${maxLength} characters long`);
		}

		if (pattern && !pattern.test(value)) {
			throw new UserError('Value does not match required pattern');
		}

		return value;
	}

	/**
	 * Sanitizes HTML to prevent XSS
	 */
	static sanitizeHTML(html: string): string {
		// Remove script tags and their content
		let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

		// Remove event handlers
		sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

		// Remove javascript: protocol
		sanitized = sanitized.replace(/javascript:/gi, '');

		// Remove data: protocol (can be used for XSS)
		sanitized = sanitized.replace(/data:text\/html/gi, '');

		return sanitized;
	}

	/**
	 * Validates array input
	 */
	static validateArray<T>(
		value: unknown,
		options: {
			minLength?: number;
			maxLength?: number;
			itemValidator?: (item: unknown) => T;
		} = {},
	): T[] {
		if (!Array.isArray(value)) {
			throw new UserError('Value must be an array');
		}

		const { minLength, maxLength, itemValidator } = options;

		if (minLength !== undefined && value.length < minLength) {
			throw new UserError(`Array must contain at least ${minLength} items`);
		}

		if (maxLength !== undefined && value.length > maxLength) {
			throw new UserError(`Array must contain at most ${maxLength} items`);
		}

		if (itemValidator) {
			return value.map((item, index) => {
				try {
					return itemValidator(item);
				} catch (error) {
					throw new UserError(
						`Invalid item at index ${index}: ${(error as Error).message}`,
					);
				}
			});
		}

		return value as T[];
	}

	/**
	 * Validates object structure
	 */
	static validateObject<T>(
		value: unknown,
		schema: Record<string, (val: unknown) => unknown>,
	): T {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new UserError('Value must be an object');
		}

		const result: Record<string, unknown> = {};
		const obj = value as Record<string, unknown>;

		for (const [key, validator] of Object.entries(schema)) {
			if (!(key in obj)) {
				throw new UserError(`Missing required field: ${key}`);
			}

			try {
				result[key] = validator(obj[key]);
			} catch (error) {
				throw new UserError(`Invalid value for field '${key}': ${(error as Error).message}`);
			}
		}

		// Check for unexpected fields
		for (const key of Object.keys(obj)) {
			if (!(key in schema)) {
				throw new UserError(`Unexpected field: ${key}`);
			}
		}

		return result as T;
	}

	/**
	 * Validates enum value
	 */
	static validateEnum<T>(value: unknown, allowedValues: T[]): T {
		if (!allowedValues.includes(value as T)) {
			throw new UserError(
				`Value must be one of: ${allowedValues.map((v) => JSON.stringify(v)).join(', ')}`,
			);
		}

		return value as T;
	}

	/**
	 * Validates JWT token format (basic structure check)
	 */
	static validateJWTFormat(token: string): boolean {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new UserError('Invalid JWT format');
		}

		// Check that each part is base64url encoded
		const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
		if (!parts.every((part) => base64UrlPattern.test(part))) {
			throw new UserError('Invalid JWT encoding');
		}

		return true;
	}

	/**
	 * Validates ISO 8601 date string
	 */
	static validateISODate(dateString: string): Date {
		const date = new Date(dateString);

		if (isNaN(date.getTime())) {
			throw new UserError('Invalid date format');
		}

		// Check if it's a valid ISO 8601 string
		const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
		if (!isoPattern.test(dateString)) {
			throw new UserError('Date must be in ISO 8601 format');
		}

		return date;
	}

	/**
	 * Validates and sanitizes workflow name
	 */
	static validateWorkflowName(name: string): string {
		const sanitized = this.validateString(name, {
			minLength: 1,
			maxLength: 255,
			allowEmpty: false,
		});

		// Check for potentially dangerous characters
		if (/<|>|&|"|'/.test(sanitized)) {
			throw new UserError('Workflow name contains invalid characters');
		}

		return sanitized;
	}

	/**
	 * Validates password strength
	 */
	static validatePasswordStrength(
		password: string,
		options: {
			minLength?: number;
			requireUppercase?: boolean;
			requireLowercase?: boolean;
			requireNumbers?: boolean;
			requireSpecial?: boolean;
		} = {},
	): boolean {
		const {
			minLength = 12,
			requireUppercase = true,
			requireLowercase = true,
			requireNumbers = true,
			requireSpecial = true,
		} = options;

		if (password.length < minLength) {
			throw new UserError(`Password must be at least ${minLength} characters long`);
		}

		if (requireUppercase && !/[A-Z]/.test(password)) {
			throw new UserError('Password must contain at least one uppercase letter');
		}

		if (requireLowercase && !/[a-z]/.test(password)) {
			throw new UserError('Password must contain at least one lowercase letter');
		}

		if (requireNumbers && !/\d/.test(password)) {
			throw new UserError('Password must contain at least one number');
		}

		if (requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
			throw new UserError('Password must contain at least one special character');
		}

		// Check for common weak passwords
		const weakPasswords = [
			'password',
			'123456',
			'12345678',
			'admin',
			'letmein',
			'welcome',
			'monkey',
			'qwerty',
		];

		if (weakPasswords.some((weak) => password.toLowerCase().includes(weak))) {
			throw new UserError('Password is too weak (contains common patterns)');
		}

		return true;
	}
}
