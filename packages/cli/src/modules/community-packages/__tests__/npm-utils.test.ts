import spawn from 'cross-spawn';
import { UnexpectedError } from 'n8n-workflow';
import nock from 'nock';

import { checkIfVersionExistsOrThrow, executeNpmCommand, verifyIntegrity } from '../npm-utils';
import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';

jest.mock('cross-spawn');

// Helper to simulate child process behavior
function createMockProcess(
	stdout: string | Buffer = '',
	stderr = '',
	exitCode = 0,
	eventError?: Error | string | null,
) {
	const mockProcess = {
		stdout: {
			on: (event: string, cb: (data: Buffer) => void) => {
				if (event === 'data' && stdout) cb(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
			},
		},
		stderr: {
			on: (event: string, cb: (data: Buffer) => void) => {
				if (event === 'data' && stderr) cb(Buffer.from(stderr));
			},
		},
		on: (event: string, cb: (arg?: any) => void) => {
			if (event === 'error' && eventError) {
				cb(typeof eventError === 'string' ? new Error(eventError) : eventError);
			}
			if (event === 'close' && !eventError) {
				cb(exitCode);
			}
		},
		once: (event: string, cb: (arg?: any) => void) => {
			if (event === 'error' && eventError) {
				cb(typeof eventError === 'string' ? new Error(eventError) : eventError);
			}
			if (event === 'close' && !eventError) {
				cb(exitCode);
			}
		},
	};
	return mockProcess;
}

describe('executeNpmCommand', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(spawn as unknown as jest.Mock).mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('successful execution', () => {
		it('should execute npm command and return stdout as string', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('command output', '', 0));

			const result = await executeNpmCommand(['install', 'some-package']);

			expect(result).toBe('command output');
			expect(spawn).toHaveBeenCalledWith('npm', ['install', 'some-package'], expect.any(Object));
		});

		it('should execute npm command with cwd option', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('command output', '', 0));

			const result = await executeNpmCommand(['install'], { cwd: '/some/path' });

			expect(result).toBe('command output');
			expect(spawn).toHaveBeenCalledWith(
				'npm',
				['install'],
				expect.objectContaining({ cwd: '/some/path' }),
			);
		});

		it('should convert Buffer stdout to string', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(Buffer.from('buffer output'), '', 0),
			);

			const result = await executeNpmCommand(['list']);

			expect(result).toBe('buffer output');
		});
	});

	describe('error handling', () => {
		it('should throw UnexpectedError for package not found (npm ERR! 404)', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					'npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package',
					1,
				),
			);

			await expect(executeNpmCommand(['install', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package not found (E404)', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					`${NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR} - GET https://registry.npmjs.org/nonexistent-package`,
					1,
				),
			);

			await expect(executeNpmCommand(['view', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package not found (404 Not Found)', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', '404 Not Found - package does not exist', 1),
			);

			await expect(executeNpmCommand(['install', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for no version available', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'No valid versions available for package', 1),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package version not found', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					`${NPM_COMMAND_TOKENS.NPM_PACKAGE_VERSION_NOT_FOUND_ERROR} package@1.2.3`,
					1,
				),
			);

			await expect(executeNpmCommand(['install', 'package@1.2.3'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_VERSION_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for disk full (ENOSPC)', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					`${NPM_COMMAND_TOKENS.NPM_DISK_NO_SPACE}: no space left on device`,
					1,
				),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL),
			);
		});

		it('should throw UnexpectedError for insufficient disk space', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'Error: insufficient space on device', 1),
			);

			await expect(executeNpmCommand(['install', 'large-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL),
			);
		});

		it('should throw UnexpectedError for DNS getaddrinfo errors', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'getaddrinfo ENOTFOUND registry.npmjs.org', 1),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(
					'Network error: Unable to reach npm registry. Please check your internet connection.',
				),
			);
		});

		it('should throw UnexpectedError for DNS ENOTFOUND errors', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'ENOTFOUND registry.npmjs.org', 1),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(
					'Network error: Unable to reach npm registry. Please check your internet connection.',
				),
			);
		});

		it('should throw generic UnexpectedError for unknown errors', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'Some unknown error', 1),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});

		it('should preserve the original error as cause', async () => {
			const originalError = new Error('Some unknown error');
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', '', 1, originalError));

			try {
				await executeNpmCommand(['install', 'some-package']);
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(UnexpectedError);
				expect((error as UnexpectedError).cause).toBe(originalError);
			}
		});
	});

	describe('doNotHandleError option', () => {
		it('should throw raw error when doNotHandleError is true', async () => {
			const rawError = new Error('Raw npm error');
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', '', 1, rawError));

			await expect(
				executeNpmCommand(['outdated', '--json'], { doNotHandleError: true }),
			).rejects.toThrow(rawError);
		});

		it('should not convert error to UnexpectedError when doNotHandleError is true', async () => {
			const rawError = new Error('npm ERR! 404 Not Found');
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', '', 1, rawError));

			try {
				await executeNpmCommand(['install', 'nonexistent'], { doNotHandleError: true });
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBe(rawError);
				expect(error).not.toBeInstanceOf(UnexpectedError);
			}
		});

		it('should handle errors normally when doNotHandleError is false', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'npm ERR! 404 Not Found', 1),
			);

			await expect(
				executeNpmCommand(['install', 'nonexistent'], { doNotHandleError: false }),
			).rejects.toThrow(new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND));
		});

		it('should handle errors normally when doNotHandleError is undefined (default)', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'npm ERR! 404 Not Found', 1),
			);

			await expect(executeNpmCommand(['install', 'nonexistent'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});
	});

	describe('command arguments', () => {
		it('should pass all arguments to npm command', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('success', '', 0));

			await executeNpmCommand([
				'install',
				'package-name@1.0.0',
				'--registry=https://custom-registry.com',
				'--json',
			]);

			expect(spawn).toHaveBeenCalledWith(
				'npm',
				['install', 'package-name@1.0.0', '--registry=https://custom-registry.com', '--json'],
				expect.any(Object),
			);
		});

		it('should handle empty arguments array', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('npm help output', '', 0));

			const result = await executeNpmCommand([]);

			expect(result).toBe('npm help output');
			expect(spawn).toHaveBeenCalledWith('npm', [], expect.any(Object));
		});
	});

	describe('edge cases', () => {
		it('should handle non-Error objects being thrown', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', '', 1, 'string error'));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});

		it('should handle errors with no message', async () => {
			const errorWithoutMessage = new Error();
			errorWithoutMessage.message = '';
			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', '', 1, errorWithoutMessage),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});

		it('should handle empty stdout', async () => {
			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', '', 0));

			const result = await executeNpmCommand(['prune']);

			expect(result).toBe('');
		});
	});
});

describe('verifyIntegrity', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	const integrity = 'sha512-hash==';

	beforeEach(() => {
		jest.clearAllMocks();
		(spawn as unknown as jest.Mock).mockReset();
	});

	afterEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
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

		(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'CLI command failed', 1));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should throw UnexpectedError and preserve original error as cause when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'CLI command failed', 1));

		await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
			new UnexpectedError(
				'Checksum verification failed. Try restarting n8n and attempting the installation again.',
			),
		);
	});

	it('should return generic message for DNS getaddrinfo errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('getaddrinfo ENOTFOUND internal.registry.local');

		(spawn as unknown as jest.Mock).mockReturnValue(
			createMockProcess('', 'getaddrinfo ENOTFOUND registry.npmjs.org', 1),
		);

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

		(spawn as unknown as jest.Mock).mockReturnValue(
			createMockProcess('', 'ENOTFOUND registry.npmjs.org', 1),
		);

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

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(integrity), '', 0),
			);

			await expect(
				verifyIntegrity(packageName, version, registryUrl, integrity),
			).resolves.not.toThrow();

			expect(spawn).toHaveBeenCalledTimes(1);
			expect(spawn).toHaveBeenCalledWith(
				'npm',
				[
					'view',
					`${packageName}@${version}`,
					'dist.integrity',
					`--registry=${registryUrl}`,
					'--json',
				],
				expect.any(Object),
			);
		});

		it('should fallback to npm CLI and throw error when integrity does not match', async () => {
			const wrongIntegrity = 'sha512-wronghash==';

			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(wrongIntegrity), '', 0),
			);

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Try restarting n8n and attempting the installation again.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle special characters in package name and version safely', async () => {
			const specialPackageName = 'test-package; rm -rf /';
			const specialVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(specialPackageName)}/${specialVersion}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(integrity), '', 0),
			);

			await verifyIntegrity(specialPackageName, specialVersion, registryUrl, integrity);

			expect(spawn).toHaveBeenCalledTimes(1);
			expect(spawn).toHaveBeenCalledWith(
				'npm',
				[
					'view',
					`${specialPackageName}@${specialVersion}`,
					'dist.integrity',
					`--registry=${registryUrl}`,
					'--json',
				],
				expect.any(Object),
			);
		});

		it('should handle DNS errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'getaddrinfo ENOTFOUND registry.npmjs.org', 1),
			);

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle npm errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					'npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package',
					1,
				),
			);

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Please check your network connection and try again.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle generic CLI errors', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'Some other error', 1));

			await expect(verifyIntegrity(packageName, version, registryUrl, integrity)).rejects.toThrow(
				new UnexpectedError(
					'Checksum verification failed. Try restarting n8n and attempting the installation again.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});
	});
});

describe('checkIfVersionExistsOrThrow', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';

	beforeEach(() => {
		jest.clearAllMocks();
		(spawn as unknown as jest.Mock).mockReset();
	});

	afterEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
	});

	it('should return true when package version exists', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				name: packageName,
				version,
			});

		const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl);
		expect(result).toBe(true);
	});

	it('should throw UnexpectedError when package version does not exist (404) and CLI fallback also fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'E404 Not Found', 1));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Package version does not exist'),
		);
	});

	it('should throw UnexpectedError with proper message on 404 when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'Some error', 1));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for network failures when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		(spawn as unknown as jest.Mock).mockReturnValue(
			createMockProcess('', 'CLI network failure', 1),
		);

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for server errors (500) when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'CLI error', 1));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should return generic message for DNS getaddrinfo errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('getaddrinfo ENOTFOUND internal.registry.local');

		(spawn as unknown as jest.Mock).mockReturnValue(
			createMockProcess('', 'getaddrinfo ENOTFOUND registry.npmjs.org', 1),
		);

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError(
				'The community nodes service is temporarily unreachable. Please try again later.',
			),
		);
	});

	it('should return generic message for DNS ENOTFOUND errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('ENOTFOUND some.internal.registry');

		(spawn as unknown as jest.Mock).mockReturnValue(
			createMockProcess('', 'ENOTFOUND registry.npmjs.org', 1),
		);

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
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

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(version), '', 0),
			);

			const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl);
			expect(result).toBe(true);
			expect(spawn).toHaveBeenCalledTimes(1);
			expect(spawn).toHaveBeenCalledWith(
				'npm',
				['view', `${packageName}@${version}`, 'version', `--registry=${registryUrl}`, '--json'],
				expect.any(Object),
			);
		});

		it('should fallback to npm CLI and throw error when version does not match', async () => {
			const differentVersion = '2.0.0';

			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(differentVersion), '', 0),
			);

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Failed to check package version existence'),
			);
			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle special characters in package name and version safely for checkIfVersionExistsOrThrow', async () => {
			const specialPackageName = 'test-package; rm -rf /';
			const specialVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(specialPackageName)}/${specialVersion}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(JSON.stringify(specialVersion), '', 0),
			);

			const result = await checkIfVersionExistsOrThrow(
				specialPackageName,
				specialVersion,
				registryUrl,
			);
			expect(result).toBe(true);
			expect(spawn).toHaveBeenCalledTimes(1);
			expect(spawn).toHaveBeenCalledWith(
				'npm',
				[
					'view',
					`${specialPackageName}@${specialVersion}`,
					'version',
					`--registry=${registryUrl}`,
					'--json',
				],
				expect.any(Object),
			);
		});

		it('should handle 404 errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess(
					'',
					'E404 Not Found - GET https://registry.npmjs.org/nonexistent-package',
					1,
				),
			);

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Package version does not exist'),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle DNS errors in CLI fallback for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'getaddrinfo ENOTFOUND registry.npmjs.org', 1),
			);

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle npm errors in CLI fallback for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(
				createMockProcess('', 'npm ERR! 500 Internal Server Error', 1),
			);

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it('should handle generic CLI errors for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			(spawn as unknown as jest.Mock).mockReturnValue(createMockProcess('', 'Some other error', 1));

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Failed to check package version existence'),
			);

			expect(spawn).toHaveBeenCalledTimes(1);
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

			const result = await checkIfVersionExistsOrThrow(packageName, version, registryWithSlashes);
			expect(result).toBe(true);
		});
	});
});
