import axios from 'axios';
import type { BinaryLike } from 'crypto';
import crypto from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

export async function verifyIntegrity(
	packageName: string,
	version: string,
	registryUrl: string,
	expectedIntegrity: string,
) {
	try {
		registryUrl = `${registryUrl}/${packageName.replace('/', '%2F')}`;
		const metadata = await axios.get<{ dist: { tarball: string } }>(`${registryUrl}/${version}`);

		const tarballUrl = metadata.data.dist.tarball;

		const { data } = await axios.get<BinaryLike>(tarballUrl, { responseType: 'arraybuffer' });

		const expected = expectedIntegrity.split('-')[1];
		const actualHash = crypto.createHash('sha512').update(data).digest('base64');

		if (actualHash !== expected) {
			throw new UnexpectedError('Checksum verification failed. Package integrity does not match.');
		}
	} catch (error) {
		throw new UnexpectedError('Checksum verification failed', { cause: error });
	}
}
