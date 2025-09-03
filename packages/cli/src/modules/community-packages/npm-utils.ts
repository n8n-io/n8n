import axios from 'axios';
import { UnexpectedError } from 'n8n-workflow';

const REQUEST_TIMEOUT = 30000;

export type NpmRegistryPackage = {
	name: string;
	version: string;
	description?: string;
	dist?: {
		integrity: string;
		shasum: string;
		tarball: string;
		fileCount?: number;
		unpackedSize?: number;
		signatures?: Array<Record<string, string>>;
	};
};

export async function getNpmPackage(
	packageName: string,
	version: string,
	registryUrl: string,
): Promise<NpmRegistryPackage> {
	const timeoutOption = { timeout: REQUEST_TIMEOUT };

	try {
		const url = new URL([packageName, version].join('/'), registryUrl);
		return (await axios.get(url.toString(), timeoutOption)).data;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			throw new UnexpectedError('Package version does not exist', {
				cause: error,
			});
		}
		throw new UnexpectedError('Failed to check package version existence', { cause: error });
	}
}

export function verifyIntegrity(npmPackage: NpmRegistryPackage, expectedIntegrity: string) {
	if (npmPackage?.dist?.integrity !== expectedIntegrity) {
		throw new UnexpectedError('Checksum verification failed. Package integrity does not match.');
	}
}
