import { UnexpectedError } from 'n8n-workflow';
import nock from 'nock';

const mockAsyncExec = jest.fn();
jest.mock('node:util', () => ({
	promisify: jest.fn(() => mockAsyncExec),
}));

import { verifyIntegrity, isVersionExists } from '../npm-utils';

describe('verifyIntegrity', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	const integrity = 'sha512-hash==';

	beforeEach(() => {
		jest.clearAllMocks();
	});

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

	it('should throw error if metadata request fails and CLI fallback also fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		mockAsyncExec.mockRejectedValue(new Error('CLI command failed'));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should throw UnexpectedError and preserve original error as cause when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockRejectedValue(new Error('CLI command failed'));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			new UnexpectedError('Checksum verification failed'),
		);
	});

	it('should return generic message for DNS getaddrinfo errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('getaddrinfo ENOTFOUND internal.registry.local');

		mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			new UnexpectedError(
				'Checksum verification failed. Please check your network connection and try again.',
			),
		);
	});

	it('should return generic message for DNS ENOTFOUND errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('ENOTFOUND some.internal.registry');

		mockAsyncExec.mockRejectedValue(new Error('ENOTFOUND registry.npmjs.org'));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			new UnexpectedError(
				'Checksum verification failed. Please check your network connection and try again.',
			),
		);
	});

	describe('CLI fallback functionality', () => {
		it('should fallback to npm CLI when HTTP request fails and succeed', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(integrity),
				stderr: '',
			});

			await expect(
				verifyIntegrity(packageName, version, registryUrl, integrity),
			).resolves.not.toThrow();

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				`npm view test-package@1.0.0 dist.integrity --registry=${registryUrl} --json`,
			);
		});

		it('should fallback to npm CLI and throw error when integrity does not match', async () => {
			const wrongIntegrity = 'sha512-wronghash==';

			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(wrongIntegrity),
				stderr: '',
			});

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError('Checksum verification failed'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should sanitize shell arguments in npm CLI command', async () => {
			const maliciousPackageName = 'test-package; rm -rf /';
			const maliciousVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(maliciousPackageName)}/${maliciousVersion}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(integrity),
				stderr: '',
			});

			await verifyIntegrity(maliciousPackageName, maliciousVersion, registryUrl, integrity);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				`npm view test-package\\; rm -rf /@1.0.0 \\&\\& echo \\\"hacked\\\" dist.integrity --registry=${registryUrl} --json`,
			);
		});

		it('should handle DNS errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle npm errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(
				new Error('npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package'),
			);

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle generic CLI errors', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('Some other error'));

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError('Checksum verification failed'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});
	});
});

describe('isVersionExists', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';

	beforeEach(() => {
		jest.clearAllMocks();
	});

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

	it('should throw UnexpectedError when package version does not exist (404) and CLI fallback also fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		mockAsyncExec.mockRejectedValue(new Error('E404 Not Found'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Package version does not exist'),
		);
	});

	it('should throw UnexpectedError with proper message on 404 when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		mockAsyncExec.mockRejectedValue(new Error('Some error'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for network failures when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockRejectedValue(new Error('CLI network failure'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for server errors (500) when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		mockAsyncExec.mockRejectedValue(new Error('CLI error'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should return generic message for DNS getaddrinfo errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('getaddrinfo ENOTFOUND internal.registry.local');

		mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError(
				'The community nodes service is temporarily unreachable. Please try again later.',
			),
		);
	});

	it('should return generic message for DNS ENOTFOUND errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('ENOTFOUND some.internal.registry');

		mockAsyncExec.mockRejectedValue(new Error('ENOTFOUND registry.npmjs.org'));

		await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError(
				'The community nodes service is temporarily unreachable. Please try again later.',
			),
		);
	});

	describe('CLI fallback functionality', () => {
		it('should fallback to npm CLI when HTTP request fails and return true', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(version),
				stderr: '',
			});

			const result = await isVersionExists(packageName, version, registryUrl);
			expect(result).toBe(true);
			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				`npm view test-package@1.0.0 version --registry=${registryUrl} --json`,
			);
		});

		it('should fallback to npm CLI and return false when version does not match', async () => {
			const differentVersion = '2.0.0';

			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(differentVersion),
				stderr: '',
			});

			const result = await isVersionExists(packageName, version, registryUrl);
			expect(result).toBe(false);
			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should sanitize shell arguments in npm CLI command for isVersionExists', async () => {
			const maliciousPackageName = 'test-package; rm -rf /';
			const maliciousVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(maliciousPackageName)}/${maliciousVersion}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(maliciousVersion),
				stderr: '',
			});

			const result = await isVersionExists(maliciousPackageName, maliciousVersion, registryUrl);
			expect(result).toBe(true);
			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				`npm view test-package\\; rm -rf /@1.0.0 \\&\\& echo \\\"hacked\\\" version --registry=${registryUrl} --json`,
			);
		});

		it('should handle 404 errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(
				new Error('E404 Not Found - GET https://registry.npmjs.org/nonexistent-package'),
			);

			await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Package version does not exist'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle DNS errors in CLI fallback for isVersionExists', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

			await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle npm errors in CLI fallback for isVersionExists', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('npm ERR! 500 Internal Server Error'));

			await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle generic CLI errors for isVersionExists', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('Some other error'));

			await expect(isVersionExists(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Failed to check package version existence'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});
	});

	describe('Helper functions', () => {
		it('should sanitize registry URL by removing trailing slashes', async () => {
			const registryWithSlashes = 'https://registry.npmjs.org///';

			nock('https://registry.npmjs.org')
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.reply(200, {
					name: packageName,
					version,
				});

			const result = await isVersionExists(packageName, version, registryWithSlashes);
			expect(result).toBe(true);
		});
	});
});
