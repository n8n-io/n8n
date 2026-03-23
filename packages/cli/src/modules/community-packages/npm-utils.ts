import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';
import axios from 'axios';
import npa from 'npm-package-arg';
import { jsonParse, UnexpectedError, LoggerProxy } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { valid as isValidSemver } from 'semver';

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

function isDnsError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes('getaddrinfo') || message.includes('ENOTFOUND');
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

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
) {
	const url = `${sanitizeRegistryUrl(registryUrl)}/${encodeURIComponent(packageName)}`;

	try {
		const metadata = await axios.get<{ dist: { integrity?: string } }>(
			`${url}/${encodeURIComponent(version)}`,
			{
				timeout: REQUEST_TIMEOUT,
			},
		);

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

export async function resolvePackageVersionSpecOrThrow(
	packageName: string,
	versionSpec: string,
	registryUrl: string,
): Promise<string> {
	const url = `${sanitizeRegistryUrl(registryUrl)}/${encodeURIComponent(packageName)}`;
	let parsedSpec: ReturnType<typeof npa.resolve>;
	try {
		parsedSpec = npa.resolve(packageName, versionSpec);
	} catch {
		throw new UnexpectedError('Failed to check package version existence');
	}

	if (!parsedSpec.registry || (parsedSpec.type !== 'version' && parsedSpec.type !== 'tag')) {
		throw new UnexpectedError('Failed to check package version existence');
	}

	try {
		if (parsedSpec.type === 'version') {
			await axios.get(`${url}/${encodeURIComponent(versionSpec)}`, {
				timeout: REQUEST_TIMEOUT,
			});
			return versionSpec;
		}

		const metadata = await axios.get<{ 'dist-tags'?: Record<string, string> }>(url, {
			timeout: REQUEST_TIMEOUT,
		});

		const resolvedVersion = metadata.data?.['dist-tags']?.[versionSpec];
		if (resolvedVersion && isValidSemver(resolvedVersion)) {
			return resolvedVersion;
		}

		throw new UnexpectedError('Failed to check package version existence');
	} catch (error) {
		try {
			const stdout = await executeNpmCommand(
				[
					'view',
					`${packageName}@${versionSpec}`,
					'version',
					`--registry=${sanitizeRegistryUrl(registryUrl)}`,
					'--json',
				],
				{ doNotHandleError: true },
			);

			const versionInfo = jsonParse<string | string[]>(stdout);
			if (typeof versionInfo === 'string' && isValidSemver(versionInfo)) {
				if (parsedSpec.type === 'version' && versionInfo !== versionSpec) {
					throw new UnexpectedError('Failed to check package version existence');
				}

				return versionInfo;
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
