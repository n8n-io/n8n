/**
 * Shared Databricks validation utilities for all Databricks LangChain nodes.
 */

/**
 * Validates and sanitizes a Databricks host URL.
 * Ensures HTTPS protocol and strips trailing slashes.
 * @throws Error if the host is not a valid HTTPS URL
 */
export function validateDatabricksHost(host: string): string {
	const sanitized = host.replace(/\/+$/, '');

	if (!sanitized.startsWith('https://')) {
		throw new Error(
			'Databricks host must use HTTPS. Please update your credentials to use https://.',
		);
	}

	// Block requests to localhost, loopback, and metadata endpoints
	const url = new URL(sanitized);
	const hostname = url.hostname.toLowerCase();

	const isPrivate172 =
		hostname.startsWith('172.') &&
		(() => {
			const secondOctet = parseInt(hostname.split('.')[1], 10);
			return secondOctet >= 16 && secondOctet <= 31;
		})();

	if (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '0.0.0.0' ||
		hostname === '169.254.169.254' ||
		hostname.startsWith('10.') ||
		hostname.startsWith('192.168.') ||
		isPrivate172 ||
		hostname === '[::1]'
	) {
		throw new Error(
			'Databricks host must be a public Databricks workspace URL, not a local or private address.',
		);
	}

	return sanitized;
}

/**
 * Validates that a Databricks resource name (endpoint name, index name segment)
 * is safe for use in URL path construction.
 * Allowed characters: alphanumeric, hyphens, underscores, dots.
 * @throws Error if the name contains path traversal or injection characters
 */
export function validateResourceName(name: string, resourceType: string): string {
	if (!name || name.trim().length === 0) {
		throw new Error(`${resourceType} name cannot be empty.`);
	}

	// Allow three-level namespace format for index names: catalog.schema.index_name
	// and simple names for endpoints: my-endpoint-name
	const safePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

	if (!safePattern.test(name)) {
		throw new Error(
			`${resourceType} name "${name}" contains invalid characters. Only alphanumeric, hyphens, underscores, and dots are allowed.`,
		);
	}

	// Block path traversal attempts
	if (name.includes('..') || name.includes('//')) {
		throw new Error(`${resourceType} name "${name}" contains path traversal characters.`);
	}

	return name;
}

/**
 * Truncates an error response body to prevent leaking verbose server internals.
 */
export function sanitizeErrorMessage(rawError: string, maxLength: number = 500): string {
	if (rawError.length <= maxLength) return rawError;
	return rawError.substring(0, maxLength) + '... (truncated)';
}
