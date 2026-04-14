import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';
import axios from 'axios';
import { jsonParse, UnexpectedError, LoggerProxy } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

const asyncExecFile = promisify(execFile);

const REQUEST_TIMEOUT = 30000;

const WINDOWS_NPM_CLI_RELATIVE_PATHS = [
	'node_modules/npm/bin/npm-cli.js',
	'../node_modules/npm/bin/npm-cli.js',
	'../lib/node_modules/npm/bin/npm-cli.js',
];

let windowsNpmCliPath: string | undefined;

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

async function resolveWindowsNpmCliPath(): Promise<string> {
	if (windowsNpmCliPath) {
		console.log('cached');
		return windowsNpmCliPath;
	}

	const npmExecPath = process.env.npm_execpath;
	console.log('npm_execpath', npmExecPath);
	if (
		typeof npmExecPath === 'string' &&
		npmExecPath.length > 0 &&
		isAbsolute(npmExecPath) &&
		basename(npmExecPath).toLowerCase() === 'npm-cli.js' &&
		(await pathExists(npmExecPath))
	) {
		windowsNpmCliPath = npmExecPath;
		console.log('using npm_execpath');
		return windowsNpmCliPath;
	}

	const nodeDirectory = dirname(process.execPath);
	console.log('nodeDirectory', nodeDirectory);
	for (const relativePath of WINDOWS_NPM_CLI_RELATIVE_PATHS) {
		const candidatePath = join(nodeDirectory, relativePath);
		console.log('trying ', candidatePath);
		if (await pathExists(candidatePath)) {
			console.log(candidatePath, ' worked');
			windowsNpmCliPath = candidatePath;
			return windowsNpmCliPath;
		}
	}

	console.log('fail');
	throw new UnexpectedError('Failed to locate npm CLI. Please ensure npm is installed.');
}

async function executeNpmCli(args: string[], cwd?: string): Promise<string> {
	if (process.platform === 'win32') {
		console.log('is win');
		const npmCliPath = await resolveWindowsNpmCliPath();
		const { stdout } = await asyncExecFile(
			process.execPath,
			[npmCliPath, ...args],
			cwd ? { cwd } : undefined,
		);
		return typeof stdout === 'string' ? stdout : stdout.toString();
	}

	console.log('not win', process.env.npm_execpath, process.execPath);
	const { stdout } = await asyncExecFile('npm', args, cwd ? { cwd } : undefined);
	return typeof stdout === 'string' ? stdout : stdout.toString();
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
		return await executeNpmCli(args, cwd);
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

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
) {
	const url = `${sanitizeRegistryUrl(registryUrl)}/${encodeURIComponent(packageName)}`;

	try {
		const metadata = await axios.get<{ dist: { integrity?: string } }>(`${url}/${version}`, {
			timeout: REQUEST_TIMEOUT,
		});

		const integrity = metadata?.data?.dist?.integrity;
		if (integrity !== expectedIntegrity) {
			throw new UnexpectedError(
				'Checksum verification failed. Package integrity does not match. Try restarting n8n and attempting the installation again.',
			);
		}
		return;
	} catch (error) {
		try {
			const stdout = await executeNpmCommand(
				[
					'view',
					`${packageName}@${version}`,
					'dist.integrity',
					`--registry=${sanitizeRegistryUrl(registryUrl)}`,
					'--json',
				],
				{ doNotHandleError: true },
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
): Promise<true> {
	const url = `${sanitizeRegistryUrl(registryUrl)}/${encodeURIComponent(packageName)}`;

	try {
		await axios.get(`${url}/${version}`, { timeout: REQUEST_TIMEOUT });
		return true;
	} catch (error) {
		try {
			const stdout = await executeNpmCommand(
				[
					'view',
					`${packageName}@${version}`,
					'version',
					`--registry=${sanitizeRegistryUrl(registryUrl)}`,
					'--json',
				],
				{ doNotHandleError: true },
			);

			const versionInfo = jsonParse(stdout);
			if (versionInfo === version) {
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
