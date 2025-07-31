import { UnexpectedError } from 'n8n-workflow';
import nock from 'nock';

import { verifyIntegrity, isVersionExists } from '../npm-utils';

describe('verifyIntegrity', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	const integrity = 'sha512-hash==';

	afterEach(() => {
		nock.cleanAll();
	});

	it('should verify integrity successfully', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { integrity },
			});

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity),
		).resolves.not.toThrow();
	});

	it('should throw error if checksum does not match', async () => {
		const wrongHash = 'sha512-nottherighthash==';

		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { integrity },
			});

		await expect(verifyIntegrity(packageName, version, registryUrl, wrongHash)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should throw error if metadata request fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

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

describe('isVersionExists', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';

	afterEach(() => {
		nock.cleanAll();
	});

	it('should return true when package version exists', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				name: packageName,
				version,
			});

		const result = await isVersionExists(packageName, version, registryUrl);
		expect(result).toBe(true);
	});

	it('should throw UnexpectedError when package version does not exist (404)', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should throw UnexpectedError with proper message on 404', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		try {
			await isVersionExists(packageName, version, registryUrl);
			throw new Error('Expected error was not thrown');
		} catch (error: any) {
			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error.message).toBe('Package version does not exist');
			expect(error.cause).toBeDefined();
		}
	});

	it('should throw UnexpectedError for network failures', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		try {
			await isVersionExists(packageName, version, registryUrl);
			throw new Error('Expected error was not thrown');
		} catch (error: any) {
			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error.message).toBe('Failed to check package version existence');
			expect(error.cause).toBeDefined();
			expect(error.cause.message).toContain('Network failure');
		}
	});

	it('should throw UnexpectedError for server errors (500)', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			UnexpectedError,
		);
	});
});
