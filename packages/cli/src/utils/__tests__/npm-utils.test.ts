import crypto from 'crypto';
import { UnexpectedError } from 'n8n-workflow';
import nock from 'nock';

import { verifyIntegrity } from '../npm-utils';

describe('verifyIntegrity', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	const tarballPath = '/tarballs/test-package-1.0.0.tgz';
	const tarballUrl = `${registryUrl}${tarballPath}`;
	const fakeTarball = Buffer.from('this is a test tarball');

	afterEach(() => {
		nock.cleanAll();
	});

	it('should verify integrity successfully', async () => {
		const hash = crypto.createHash('sha512').update(fakeTarball).digest('base64');
		const integrity = `sha512-${hash}`;

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { tarball: tarballUrl },
			});

		nock(registryUrl).get(tarballPath).reply(200, fakeTarball);

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity),
		).resolves.not.toThrow();
	});

	it('should throw error if checksum does not match', async () => {
		const wrongHash = 'sha512-nottherighthash==';

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { tarball: tarballUrl },
			});

		nock(registryUrl).get(tarballPath).reply(200, fakeTarball);

		await expect(verifyIntegrity(packageName, version, registryUrl, wrongHash)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should throw error if metadata request fails', async () => {
		const integrity = 'sha512-somerandomhash==';

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow();
	});

	it('should throw error if tarball download fails', async () => {
		const integrity = 'sha512-somerandomhash==';

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { tarball: tarballUrl },
			});

		nock(registryUrl).get(tarballPath).reply(404);

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow();
	});

	it('should throw UnexpectedError and preserve original error as cause', async () => {
		const integrity = 'sha512-somerandomhash==';

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		try {
			await verifyIntegrity(packageName, version, registryUrl, integrity);
			throw new Error('Expected error was not thrown');
		} catch (error: any) {
			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error.message).toBe('Checksum verification failed');
			expect(error.cause).toBeDefined();
			expect(error.cause.message).toContain('Network failure');
		}
	});
});
