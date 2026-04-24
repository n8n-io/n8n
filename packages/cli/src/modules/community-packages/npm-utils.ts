import axios from 'axios';
import { jsonParse, UnexpectedError, LoggerProxy } from 'n8n-workflow';
import { valid } from 'semver';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';

const asyncExecFile = promisify(execFile);

const REQUEST_TIMEOUT = 30000;

const WINDOWS_NPM_CLI_RELATIVE_PATH = 'node_modules/npm/bin/npm-cli.js';
const WINDOWS_NPM_CLI_CANDIDATE_PATHS = [
	WINDOWS_NPM_CLI_RELATIVE_PATH,
	`../${WINDOWS_NPM_CLI_RELATIVE_PATH}`,
];
const WINDOWS_NPM_PREFIX_SCRIPT_RELATIVE_PATH = 'node_modules/npm/bin/npm-prefix.js';

let cachedWindowsNpmCliPath: string | undefined;

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
	registry?: string;
	authToken?: string;
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

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function stdoutToString(stdout: string | Buffer, trim = false): string {
	const value = typeof stdout === 'string' ? stdout : stdout.toString();
	return trim ? value.trim() : value;
}

async function resolveWindowsDefaultNpmCliPath(nodeDirectory: string): Promise<string | undefined> {
	for (const relativePath of WINDOWS_NPM_CLI_CANDIDATE_PATHS) {
		const candidatePath = join(nodeDirectory, relativePath);
		if (await pathExists(candidatePath)) {
			return candidatePath;
		}
	}

	return undefined;
}

async function resolveWindowsPrefixNpmCliPath(nodeDirectory: string): Promise<string | undefined> {
	const npmPrefixScriptPath = join(nodeDirectory, WINDOWS_NPM_PREFIX_SCRIPT_RELATIVE_PATH);
	if (!(await pathExists(npmPrefixScriptPath))) {
		return undefined;
	}

	try {
		const { stdout } = await asyncExecFile(process.execPath, [npmPrefixScriptPath]);
		const globalPrefix = stdoutToString(stdout, true);
		if (!globalPrefix) {
			return undefined;
		}

		const globalPrefixNpmCliPath = join(globalPrefix, WINDOWS_NPM_CLI_RELATIVE_PATH);
		if (isAbsolute(globalPrefixNpmCliPath) && (await pathExists(globalPrefixNpmCliPath))) {
			return globalPrefixNpmCliPath;
		}
	} catch {
		// Skip if failed to get prefix
	}

	return undefined;
}

async function resolveWindowsNpmCliPath(): Promise<string> {
	if (cachedWindowsNpmCliPath) {
		return cachedWindowsNpmCliPath;
	}

	const nodeDirectory = dirname(process.execPath);
	const prefixNpmCliPath = await resolveWindowsPrefixNpmCliPath(nodeDirectory);
	if (prefixNpmCliPath) {
		cachedWindowsNpmCliPath = prefixNpmCliPath;
		return cachedWindowsNpmCliPath;
	}

	const defaultNpmCliPath = await resolveWindowsDefaultNpmCliPath(nodeDirectory);
	if (defaultNpmCliPath) {
		cachedWindowsNpmCliPath = defaultNpmCliPath;
		return cachedWindowsNpmCliPath;
	}

	throw new UnexpectedError('Failed to locate npm CLI. Please ensure npm is installed.');
}

async function executeNpmCli(args: string[], cwd?: string): Promise<string> {
	if (process.platform === 'win32') {
		const npmCliPath = await resolveWindowsNpmCliPath();
		const { stdout } = await asyncExecFile(
			process.execPath,
			[npmCliPath, ...args],
			cwd ? { cwd } : undefined,
		);
		return stdoutToString(stdout);
	}

	const { stdout } = await asyncExecFile('npm', args, cwd ? { cwd } : undefined);
	return stdoutToString(stdout);
}

function redactAuthTokens(text: string): string {
	return text.replace(/_authToken=\S+/g, '_authToken=*****');
}

function registryAuthKey(registryUrl: string): string {
	const url = new URL(registryUrl);
	const pathname = url.pathname.replace(/\/+$/, '');
	return `${url.host}${pathname}`;
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
	const { cwd, doNotHandleError, registry, authToken } = options;

	const registryArgs: string[] = [];
	if (registry) {
		const sanitized = sanitizeRegistryUrl(registry);
		registryArgs.push(`--registry=${sanitized}`);
		if (authToken) registryArgs.push(`--//${registryAuthKey(sanitized)}/:_authToken=${authToken}`);
	}

	const fullArgs = [...args, ...registryArgs];
	LoggerProxy.debug('Executing npm command', {
		args: fullArgs.map((a) => (a.includes('_authToken=') ? a.replace(/=.+$/, '=*****') : a)),
		cwd,
	});

	try {
		return await executeNpmCli(fullArgs, cwd);
	} catch (error) {
		if (authToken && error instanceof Error) {
			error.message = redactAuthTokens(error.message);
		}

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

	const redactedHeaders = authToken
		? { ...headers, Authorization: 'Bearer *****' }
		: { ...headers };
	LoggerProxy.debug('Executing npm registry request', { url, headers: redactedHeaders, timeout });

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

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
	authToken?: string,
) {
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
			const stdout = await executeNpmCommand(
				['view', `${packageName}@${version}`, 'dist.integrity', '--json'],
				{ doNotHandleError: true, registry: registryUrl, authToken },
			);

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
	const path = `${encodeURIComponent(packageName)}/${version}`;

	try {
		await executeNpmRequest(registryUrl, path, { authToken });
		return true;
	} catch (error) {
		try {
			const stdout = await executeNpmCommand(
				['view', `${packageName}@${version}`, 'version', '--json'],
				{ doNotHandleError: true, registry: registryUrl, authToken },
			);

			// npm resolves dist-tags (e.g. "latest") to an actual version string,
			// so any non-empty return value means the tag/version is resolvable.
			const resolvedVersion = jsonParse<string>(stdout);
			const isResolvedSemver =
				typeof resolvedVersion === 'string' && valid(resolvedVersion) !== null;
			const isExactSemver = valid(version) !== null;

			if (isResolvedSemver && (!isExactSemver || resolvedVersion)) {
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
