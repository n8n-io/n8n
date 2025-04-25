import axios from 'axios';
import type { BinaryLike } from 'crypto';
import crypto from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

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
		const metadata = await axios.get<{ dist: { tarball: string } }>(
			`${url}/${version}`,
			timeoutOption,
		);

		const tarballUrl = metadata.data.dist.tarball;
		const { data } = await axios.get<BinaryLike>(tarballUrl, {
			responseType: 'arraybuffer',
			...timeoutOption,
		});

		const algorithm = 'sha512';
		const hash = crypto.createHash(algorithm).update(data).digest('base64');
		const actualIntegrity = `${algorithm}-${hash}`;

		if (actualIntegrity !== expectedIntegrity) {
			throw new UnexpectedError('Checksum verification failed. Package integrity does not match.');
		}
	} catch (error) {
		throw new UnexpectedError('Checksum verification failed', { cause: error });
	}
}
