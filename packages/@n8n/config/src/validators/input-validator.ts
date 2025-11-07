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
	 * Uses path.resolve() to handle all encoding variations
	 */
	static sanitizeFilePath(filePath: string, allowedBasePaths: string[] = []): string {
		// Import path module for proper resolution
		const path = require('path');

		// Decode URI components to catch encoded path traversal attempts
		let decodedPath = filePath;
		try {
			decodedPath = decodeURIComponent(filePath);
		} catch {
			throw new UserError('Invalid URL encoding in file path');
		}

		// Remove null bytes
		if (decodedPath.includes('\0')) {
			throw new UserError('Null bytes detected in file path');
		}

		// Resolve the path to get absolute canonical path
		// This handles all path traversal variations including encoded ones
		const resolvedPath = path.resolve(decodedPath);

		// Check if resolved path is within allowed directories
		if (allowedBasePaths.length > 0) {
			const isAllowed = allowedBasePaths.some((basePath) => {
				const resolvedBasePath = path.resolve(basePath);
				// Check if the resolved path starts with the base path
				// and is not the exact base path (prevents accessing base directory itself)
				return (
					resolvedPath.startsWith(resolvedBasePath + path.sep) ||
					resolvedPath === resolvedBasePath
				);
			});

			if (!isAllowed) {
				throw new UserError(`Access to path outside allowed directories is forbidden`);
			}
		}

		return resolvedPath;
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

			// Check for localhost - use exact matching to prevent bypasses
			if (blockLocalhost) {
				const hostname = parsedUrl.hostname.toLowerCase();
				const localhostPatterns = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]'];
				
				// Exact match for localhost patterns
				if (localhostPatterns.includes(hostname)) {
					throw new UserError('Localhost URLs are not allowed');
				}
				
				// Check for loopback IP range (127.0.0.0/8)
				if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
					throw new UserError('Loopback addresses are not allowed');
				}
			}

			// Check for private IP ranges (comprehensive list)
			if (blockPrivateIPs) {
				const hostname = parsedUrl.hostname.toLowerCase();

				// IPv4 private and reserved ranges (RFC 3330, RFC 1918, etc.)
				const privateIPv4Ranges = [
					/^0\./, // Current network (RFC 1122)
					/^10\./, // Private (RFC 1918)
					/^127\./, // Loopback (RFC 1122)
					/^169\.254\./, // Link-local (RFC 3927)
					/^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private (RFC 1918)
					/^192\.0\.0\./, // IETF Protocol Assignments (RFC 5736)
					/^192\.0\.2\./, // TEST-NET-1 (RFC 5737)
					/^192\.168\./, // Private (RFC 1918)
					/^198\.1[8-9]\./, // Benchmarking (RFC 2544)
					/^198\.51\.100\./, // TEST-NET-2 (RFC 5737)
					/^203\.0\.113\./, // TEST-NET-3 (RFC 5737)
					/^224\./, // Multicast (RFC 5771)
					/^240\./, // Reserved (RFC 1112)
					/^255\.255\.255\.255$/, // Broadcast
				];

				if (privateIPv4Ranges.some((pattern) => pattern.test(hostname))) {
					throw new UserError('Private or reserved IP addresses are not allowed');
				}

				// IPv6 private and reserved ranges
				// Remove brackets if present
				const cleanHostname = hostname.replace(/^\[|\]$/g, '');
				
				// Check for various IPv6 private/reserved ranges
				const ipv6PrivatePatterns = [
					/^::1$/, // Loopback
					/^::$/, // Unspecified
					/^::ffff:/, // IPv4-mapped
					/^fe[89ab][0-9a-f]:/i, // Link-local (fe80::/10)
					/^fec0:/i, // Site-local (deprecated)
					/^f[cd][0-9a-f]{2}:/i, // Unique local (fc00::/7)
					/^ff[0-9a-f]{2}:/i, // Multicast
					/^2001:db8:/i, // Documentation (RFC 3849)
					/^2001:10:/i, // ORCHID (RFC 4843)
					/^2002:/i, // 6to4
				];

				if (ipv6PrivatePatterns.some((pattern) => pattern.test(cleanHostname))) {
					throw new UserError('Private or reserved IPv6 addresses are not allowed');
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
	 * NOTE: This is a basic implementation. For production use, consider using
	 * a well-tested library like DOMPurify or the Sanitizer API.
	 * This implementation should only be used for simple cases where you control
	 * the input format and need basic sanitization.
	 */
	static sanitizeHTML(html: string): string {
		// WARNING: Regex-based HTML sanitization is difficult to implement securely
		// and can often be bypassed. This implementation provides basic protection
		// but should not be relied upon for untrusted input.
		// 
		// For production use cases with untrusted HTML:
		// - Use DOMPurify: https://github.com/cure53/DOMPurify
		// - Use the Sanitizer API when available: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API
		// - Strip all HTML and only allow plain text
		
		// For basic use cases, strip all HTML tags
		let sanitized = html.replace(/<[^>]*>/g, '');
		
		// Decode HTML entities to prevent encoded XSS
		sanitized = sanitized
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#x27;/g, "'")
			.replace(/&#x2F;/g, '/')
			.replace(/&amp;/g, '&');
		
		// Remove any script-related content
		sanitized = sanitized.replace(/javascript:/gi, '');
		sanitized = sanitized.replace(/on\w+\s*=/gi, '');
		
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
	 * NOTE: This only validates the format, not the signature or expiration
	 */
	static validateJWTFormat(token: string): boolean {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new UserError('Invalid JWT format: must have exactly 3 parts');
		}

		// Check that each part is valid base64url and has minimum length
		const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
		
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			
			// Each part must have content
			if (part.length === 0) {
				throw new UserError(`Invalid JWT: part ${i + 1} is empty`);
			}
			
			// Must be valid base64url
			if (!base64UrlPattern.test(part)) {
				throw new UserError(`Invalid JWT: part ${i + 1} contains invalid characters`);
			}
			
			// Header and payload should have minimum length (base64 of minimal JSON)
			if (i < 2 && part.length < 4) {
				throw new UserError(`Invalid JWT: part ${i + 1} is too short`);
			}
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
