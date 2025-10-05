import axios from 'axios';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const asyncExecFile = promisify(execFile);

const REQUEST_TIMEOUT = 30000;

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
			throw new UnexpectedError('Checksum verification failed. Package integrity does not match.');
		}
		return;
	} catch (error) {
		try {
			const { stdout } = await asyncExecFile('npm', [
				'view',
				`${packageName}@${version}`,
				'dist.integrity',
				`--registry=${sanitizeRegistryUrl(registryUrl)}`,
				'--json',
			]);

			const integrity = jsonParse(stdout);
			if (integrity !== expectedIntegrity) {
				throw new UnexpectedError(
					'Checksum verification failed. Package integrity does not match.',
				);
			}
			return;
		} catch (cliError) {
			if (isDnsError(cliError) || isNpmError(cliError)) {
				throw new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				);
			}
			throw new UnexpectedError('Checksum verification failed');
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
			const { stdout } = await asyncExecFile('npm', [
				'view',
				`${packageName}@${version}`,
				'version',
				`--registry=${sanitizeRegistryUrl(registryUrl)}`,
				'--json',
			]);

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
