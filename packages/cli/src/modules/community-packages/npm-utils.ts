import axios from 'axios';
import { UnexpectedError } from 'n8n-workflow';

function isDnsError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes('getaddrinfo') || message.includes('ENOTFOUND');
}

const REQUEST_TIMEOUT = 30000;

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
) {
	const timeoutOption = { timeout: REQUEST_TIMEOUT };

	try {
		const url = `${registryUrl.replace(/\/+$/, '')}/${encodeURIComponent(packageName)}`;
		const metadata = await axios.get<{ dist: { integrity: string } }>(
			`${url}/${version}`,
			timeoutOption,
		);

		if (metadata?.data?.dist?.integrity !== expectedIntegrity) {
			throw new UnexpectedError('Checksum verification failed. Package integrity does not match.');
		}
	} catch (error) {
		if (isDnsError(error)) {
			throw new UnexpectedError(
				'Checksum verification failed. Please check your network connection and try again.',
			);
		}
		throw new UnexpectedError('Checksum verification failed', { cause: error });
	}
}

export async function isVersionExists(
	packageName: string,
	version: string,
	registryUrl: string,
): Promise<boolean> {
	const timeoutOption = { timeout: REQUEST_TIMEOUT };

	try {
		const url = `${registryUrl.replace(/\/+$/, '')}/${encodeURIComponent(packageName)}`;
		await axios.get(`${url}/${version}`, timeoutOption);
		return true;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			throw new UnexpectedError('Package version does not exist', {
				cause: error,
			});
		}
		if (isDnsError(error)) {
			throw new UnexpectedError(
				'The community nodes service is temporarily unreachable. Please try again later.',
			);
		}
		throw new UnexpectedError('Failed to check package version existence', { cause: error });
	}
}
