import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';
import axios from 'axios';
import { jsonParse, UnexpectedError, LoggerProxy } from 'n8n-workflow';
import spawn from 'cross-spawn';

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
		const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
			const child = spawn('npm', args, { cwd });
			let stdoutData = '';
			let stderrData = '';

			child.stdout?.on('data', (data: Buffer) => {
				stdoutData += data.toString();
			});
			child.stderr?.on('data', (data: Buffer) => {
				stderrData += data.toString();
			});

			child.once('error', reject);
			child.once('close', (code) => {
				if (code === 0) {
					resolve({ stdout: stdoutData, stderr: stderrData });
				} else {
					// Build a verbose error with full command details for server-side logging only.
					// Do NOT include this message in user-facing errors as it may contain
					// sensitive data such as registry URLs with embedded credentials.
					const error = new Error(`Command failed: npm ${args.join(' ')}\n${stderrData}`);
					Object.assign(error, { stdout: stdoutData, stderr: stderrData, code });
					reject(error);
				}
			});
		});
		return stdout;
	} catch (error) {
		if (doNotHandleError) {
			throw error;
		}

		// Extract the full message for pattern matching and server-side logging only.
		// Never use this raw message in user-facing errors as it may contain
		// sensitive details like registry URLs with embedded credentials.
		const errorMessage = error instanceof Error ? error.message : String(error);

		LoggerProxy.warn('Failed to execute npm command', { error: errorMessage });

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

		// Fall-through: unknown error. Always throw a generic sanitized message.
		// The full verbose details are preserved in `cause` for server-side diagnostics/logs.
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
