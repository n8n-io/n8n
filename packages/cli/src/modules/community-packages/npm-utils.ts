import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';
import axios from 'axios';
import { jsonParse, UnexpectedError, LoggerProxy } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const asyncExecFile = promisify(execFile);

const REQUEST_TIMEOUT = 30000;

const NPM_ERROR_PATTERNS = {
	PACKAGE_NOT_FOUND: [NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR],
	NO_VERSION_AVAILABLE: [NPM_COMMAND_TOKENS.NPM_NO_VERSION_AVAILABLE],
	PACKAGE_VERSION_NOT_FOUND: [NPM_COMMAND_TOKENS.NPM_PACKAGE_VERSION_NOT_FOUND_ERROR],
	DISK_NO_SPACE: [NPM_COMMAND_TOKENS.NPM_DISK_NO_SPACE],
	DISK_INSUFFICIENT_SPACE: [NPM_COMMAND_TOKENS.NPM_DISK_INSUFFICIENT_SPACE],
} as const;

interface NpmCommandOptions {
	cwd?: string;
	doNotHandleError?: boolean;
}

interface NpmRequestOptions {
	authToken?: string;
	headers?: Record<string, string>;
	timeout?: number;
}

function isDnsError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes('getaddrinfo') || message.includes('ENOTFOUND');
}

/**
 * Type guard for errors thrown by `executeNpmCommand` with `doNotHandleError: true`
 * (e.g. npm outdated exits with code 1 when updates exist).
 */
export function isNpmExecErrorWithStdout(
	error: unknown,
): error is { code: number; stdout: string } {
	return typeof error === 'object' && error !== null && 'code' in error && 'stdout' in error;
}

function isNpmError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes('npm ERR!') ||
		message.includes('E404') ||
		message.includes('404 Not Found') ||
		message.includes('ENOTFOUND')
	);
}

function sanitizeRegistryUrl(registryUrl: string): string {
	return registryUrl.replace(/\/+$/, '');
}

function matchesErrorPattern(message: string, patterns: readonly string[]): boolean {
	return patterns.some((pattern) => message.includes(pattern));
}

/**
 * Executes an npm command with proper error handling.
 * @param args - Array of npm command arguments
 * @param options - Execution options (cwd, throwOnError)
 * @returns The stdout from the npm command
 * @throws {UnexpectedError} When the command fails and throwOnError is true
 */
export async function executeNpmCommand(
	args: string[],
	options: NpmCommandOptions = {},
): Promise<string> {
	const { cwd, doNotHandleError } = options;

	try {
		const { stdout } = await asyncExecFile('npm', args, cwd ? { cwd } : undefined);
		return typeof stdout === 'string' ? stdout : stdout.toString();
	} catch (error) {
		if (doNotHandleError) {
			throw error;
		}

		const errorMessage = error instanceof Error ? error.message : String(error);

		LoggerProxy.warn('Failed to execute npm command', { errorMessage });

		// Check for specific error patterns
		if (matchesErrorPattern(errorMessage, NPM_ERROR_PATTERNS.PACKAGE_NOT_FOUND)) {
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);
		}

		if (matchesErrorPattern(errorMessage, NPM_ERROR_PATTERNS.NO_VERSION_AVAILABLE)) {
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);
		}

		if (matchesErrorPattern(errorMessage, NPM_ERROR_PATTERNS.PACKAGE_VERSION_NOT_FOUND)) {
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_VERSION_NOT_FOUND);
		}

		if (
			matchesErrorPattern(errorMessage, NPM_ERROR_PATTERNS.DISK_NO_SPACE) ||
			matchesErrorPattern(errorMessage, NPM_ERROR_PATTERNS.DISK_INSUFFICIENT_SPACE)
		) {
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL);
		}

		if (isDnsError(error)) {
			throw new UnexpectedError(
				'Network error: Unable to reach npm registry. Please check your internet connection.',
			);
		}

		throw new UnexpectedError('Failed to execute npm command', { cause: error });
	}
}

/**
 * Executes an HTTP GET request against an npm registry with proper defaults and error logging.
 * @param registryUrl - Base registry URL (trailing slashes are stripped)
 * @param path - Path to append after the registry URL (e.g. `${encodeURIComponent(pkg)}/${version}`)
 * @param options - Optional authToken, extra headers, and timeout override
 * @returns Parsed response body
 * @throws The original axios error after logging, so callers can fall back to the npm CLI
 */
export async function executeNpmRequest<T = unknown>(
	registryUrl: string,
	path: string,
	options: NpmRequestOptions = {},
): Promise<T> {
	const { authToken, headers: extraHeaders, timeout = REQUEST_TIMEOUT } = options;
	const url = `${sanitizeRegistryUrl(registryUrl)}/${path}`;
	const authHeaders = authToken ? { ['Authorization']: `Bearer ${authToken}` } : {};
	const headers = { ...extraHeaders, ...authHeaders };

	LoggerProxy.debug('Executing npm registry request', { url, headers });

	try {
		const { data } = await axios.get<T>(url, {
			timeout,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		});
		return data;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		LoggerProxy.warn('Failed to execute npm registry request', { url, errorMessage });
		throw error;
	}
}

export async function getNpmConfigValue(key: string): Promise<string | undefined> {
	try {
		const stdout = await executeNpmCommand(['config', 'get', key], { doNotHandleError: true });
		const value = stdout.trim();
		return value && value !== 'undefined' && value !== 'null' ? value : undefined;
	} catch {
		return undefined;
	}
}

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
	authToken?: string,
) {
	const registrySanitized = sanitizeRegistryUrl(registryUrl);
	const path = `${encodeURIComponent(packageName)}/${version}`;

	try {
		const metadata = await executeNpmRequest<{ dist: { integrity?: string } }>(registryUrl, path, {
			authToken,
		});

		const integrity = metadata?.dist?.integrity;
		if (integrity !== expectedIntegrity) {
			throw new UnexpectedError(
				'Checksum verification failed. Package integrity does not match. Try restarting n8n and attempting the installation again.',
			);
		}
		return;
	} catch (error) {
		try {
			const cliArgs = [
				'view',
				`${packageName}@${version}`,
				'dist.integrity',
				`--registry=${registrySanitized}`,
				'--json',
			];
			if (authToken) {
				cliArgs.push(`--//${new URL(registrySanitized).host}/:_authToken=${authToken}`);
			}
			const stdout = await executeNpmCommand(cliArgs, { doNotHandleError: true });

			const integrity = jsonParse(stdout);
			if (integrity !== expectedIntegrity) {
				throw new UnexpectedError(
					'Checksum verification failed. Package integrity does not match. Try restarting n8n and attempting the installation again.',
				);
			}
			return;
		} catch (cliError) {
			if (isDnsError(cliError) || isNpmError(cliError)) {
				throw new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				);
			}
			throw new UnexpectedError(
				'Checksum verification failed. Try restarting n8n and attempting the installation again.',
			);
		}
	}
}

export async function checkIfVersionExistsOrThrow(
	packageName: string,
	version: string,
	registryUrl: string,
	authToken?: string,
): Promise<true> {
	const registrySanitized = sanitizeRegistryUrl(registryUrl);
	const path = `${encodeURIComponent(packageName)}/${version}`;

	try {
		await executeNpmRequest(registryUrl, path, { authToken });
		return true;
	} catch (error) {
		try {
			const cliArgs = [
				'view',
				`${packageName}@${version}`,
				'version',
				`--registry=${registrySanitized}`,
				'--json',
			];
			if (authToken) {
				cliArgs.push(`--//${new URL(registrySanitized).host}/:_authToken=${authToken}`);
			}
			const stdout = await executeNpmCommand(cliArgs, { doNotHandleError: true });

			// npm resolves dist-tags (e.g. "latest") to an actual version string,
			// so any non-empty return value means the tag/version is resolvable.
			const versionInfo = jsonParse<string>(stdout);
			if (versionInfo) {
				return true;
			}

			throw new UnexpectedError('Failed to check package version existence');
		} catch (cliError) {
			const message = cliError instanceof Error ? cliError.message : String(cliError);

			if (message.includes('E404') || message.includes('404 Not Found')) {
				throw new UnexpectedError('Package version does not exist');
			}

			if (isDnsError(cliError) || isNpmError(cliError)) {
				throw new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				);
			}

			throw new UnexpectedError('Failed to check package version existence');
		}
	}
}
