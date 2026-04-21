import { UnexpectedError } from 'n8n-workflow';
import nock from 'nock';

const mockAsyncExec = jest.fn();

jest.mock('node:child_process', () => ({
	...jest.requireActual('node:child_process'),
	execFile: jest.fn(),
}));

jest.mock('node:util', () => {
	const actual = jest.requireActual('node:util');
	return {
		...actual,
		promisify: jest.fn((fn) => {
			if (fn === require('node:child_process').execFile) {
				return mockAsyncExec;
			}
			return actual.promisify(fn);
		}),
	};
});

import {
	executeNpmCommand,
	verifyIntegrity,
	checkIfVersionExistsOrThrow,
	executeNpmRequest,
} from '../npm-utils';
import { NPM_COMMAND_TOKENS, RESPONSE_ERROR_MESSAGES } from '@/constants';

describe('executeNpmCommand', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAsyncExec.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('successful execution', () => {
		it('should execute npm command and return stdout as string', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: 'command output',
				stderr: '',
			});

			const result = await executeNpmCommand(['install', 'some-package']);

			expect(result).toBe('command output');
			expect(mockAsyncExec).toHaveBeenCalledWith('npm', ['install', 'some-package'], undefined);
		});

		it('should execute npm command with cwd option', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: 'command output',
				stderr: '',
			});

			const result = await executeNpmCommand(['install'], { cwd: '/some/path' });

			expect(result).toBe('command output');
			expect(mockAsyncExec).toHaveBeenCalledWith('npm', ['install'], { cwd: '/some/path' });
		});

		it('should convert Buffer stdout to string', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: Buffer.from('buffer output'),
				stderr: '',
			});

			const result = await executeNpmCommand(['list']);

			expect(result).toBe('buffer output');
		});
	});

	describe('error handling', () => {
		it('should throw UnexpectedError for package not found (npm ERR! 404)', async () => {
			mockAsyncExec.mockRejectedValue(
				new Error('npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package'),
			);

			await expect(executeNpmCommand(['install', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package not found (E404)', async () => {
			mockAsyncExec.mockRejectedValue(
				new Error(
					`${NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR} - GET https://registry.npmjs.org/nonexistent-package`,
				),
			);

			await expect(executeNpmCommand(['view', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package not found (404 Not Found)', async () => {
			mockAsyncExec.mockRejectedValue(new Error('404 Not Found - package does not exist'));

			await expect(executeNpmCommand(['install', 'nonexistent-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for no version available', async () => {
			mockAsyncExec.mockRejectedValue(new Error('No valid versions available for package'));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for package version not found', async () => {
			mockAsyncExec.mockRejectedValue(
				new Error(`${NPM_COMMAND_TOKENS.NPM_PACKAGE_VERSION_NOT_FOUND_ERROR} package@1.2.3`),
			);

			await expect(executeNpmCommand(['install', 'package@1.2.3'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_VERSION_NOT_FOUND),
			);
		});

		it('should throw UnexpectedError for disk full (ENOSPC)', async () => {
			mockAsyncExec.mockRejectedValue(
				new Error(`${NPM_COMMAND_TOKENS.NPM_DISK_NO_SPACE}: no space left on device`),
			);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL),
			);
		});

		it('should throw UnexpectedError for insufficient disk space', async () => {
			mockAsyncExec.mockRejectedValue(new Error('Error: insufficient space on device'));

			await expect(executeNpmCommand(['install', 'large-package'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL),
			);
		});

		it('should throw UnexpectedError for DNS getaddrinfo errors', async () => {
			mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(
					'Network error: Unable to reach npm registry. Please check your internet connection.',
				),
			);
		});

		it('should throw UnexpectedError for DNS ENOTFOUND errors', async () => {
			mockAsyncExec.mockRejectedValue(new Error('ENOTFOUND registry.npmjs.org'));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError(
					'Network error: Unable to reach npm registry. Please check your internet connection.',
				),
			);
		});

		it('should throw generic UnexpectedError for unknown errors', async () => {
			mockAsyncExec.mockRejectedValue(new Error('Some unknown error'));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});

		it('should preserve the original error as cause', async () => {
			const originalError = new Error('Some unknown error');
			mockAsyncExec.mockRejectedValue(originalError);

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
			mockAsyncExec.mockRejectedValue(rawError);

			await expect(
				executeNpmCommand(['outdated', '--json'], { doNotHandleError: true }),
			).rejects.toThrow(rawError);
		});

		it('should not convert error to UnexpectedError when doNotHandleError is true', async () => {
			const rawError = new Error('npm ERR! 404 Not Found');
			mockAsyncExec.mockRejectedValue(rawError);

			try {
				await executeNpmCommand(['install', 'nonexistent'], { doNotHandleError: true });
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBe(rawError);
				expect(error).not.toBeInstanceOf(UnexpectedError);
			}
		});

		it('should handle errors normally when doNotHandleError is false', async () => {
			mockAsyncExec.mockRejectedValue(new Error('npm ERR! 404 Not Found'));

			await expect(
				executeNpmCommand(['install', 'nonexistent'], { doNotHandleError: false }),
			).rejects.toThrow(new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND));
		});

		it('should handle errors normally when doNotHandleError is undefined (default)', async () => {
			mockAsyncExec.mockRejectedValue(new Error('npm ERR! 404 Not Found'));

			await expect(executeNpmCommand(['install', 'nonexistent'])).rejects.toThrow(
				new UnexpectedError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND),
			);
		});
	});

	describe('auth token redaction in errors', () => {
		it('should redact auth tokens from error messages when authToken is set', async () => {
			const errorWithToken = new Error(
				'Command failed: npm install --registry=https://r.example.com --//r.example.com/:_authToken=super-secret-value',
			);
			mockAsyncExec.mockRejectedValue(errorWithToken);

			await expect(
				executeNpmCommand(['install'], {
					registry: 'https://r.example.com',
					authToken: 'super-secret-value',
				}),
			).rejects.toThrow('Failed to execute npm command');

			expect(errorWithToken.message).not.toContain('super-secret-value');
			expect(errorWithToken.message).toContain('_authToken=*****');
		});

		it('should redact auth tokens from re-thrown errors when doNotHandleError is true', async () => {
			const errorWithToken = new Error(
				'Command failed: npm view pkg --//r.example.com/:_authToken=leak-me',
			);
			mockAsyncExec.mockRejectedValue(errorWithToken);

			try {
				await executeNpmCommand(['view', 'pkg'], {
					registry: 'https://r.example.com',
					authToken: 'leak-me',
					doNotHandleError: true,
				});
				fail('Should have thrown');
			} catch (error) {
				expect((error as Error).message).not.toContain('leak-me');
				expect((error as Error).message).toContain('_authToken=*****');
			}
		});

		it('should not modify error messages when no authToken is set', async () => {
			const originalMessage = 'Command failed: npm install some-package';
			mockAsyncExec.mockRejectedValue(new Error(originalMessage));

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});
	});

	describe('command arguments', () => {
		it('should pass all arguments to npm command', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: 'success',
				stderr: '',
			});

			await executeNpmCommand([
				'install',
				'package-name@1.0.0',
				'--registry=https://custom-registry.com',
				'--json',
			]);

			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				['install', 'package-name@1.0.0', '--registry=https://custom-registry.com', '--json'],
				undefined,
			);
		});

		it('should append registry and authToken args when provided in options', async () => {
			mockAsyncExec.mockResolvedValue({ stdout: '', stderr: '' });

			await executeNpmCommand(['install', 'pkg@1.0.0'], {
				registry: 'https://registry.example.com/', // trailing slash — tests sanitization
				authToken: 'my-token',
			});

			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				[
					'install',
					'pkg@1.0.0',
					'--registry=https://registry.example.com',
					'--//registry.example.com/:_authToken=my-token',
				],
				undefined,
			);
		});

		it('should preserve registry pathname in authToken arg for path-based registries', async () => {
			mockAsyncExec.mockResolvedValue({ stdout: '', stderr: '' });

			await executeNpmCommand(['install', 'pkg@1.0.0'], {
				registry: 'https://gitlab.example.com/api/v4/packages/npm/',
				authToken: 'my-token',
			});

			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				[
					'install',
					'pkg@1.0.0',
					'--registry=https://gitlab.example.com/api/v4/packages/npm',
					'--//gitlab.example.com/api/v4/packages/npm/:_authToken=my-token',
				],
				undefined,
			);
		});

		it('should append only registry arg when authToken is absent', async () => {
			mockAsyncExec.mockResolvedValue({ stdout: '', stderr: '' });

			await executeNpmCommand(['view', 'pkg'], { registry: 'https://registry.example.com' });

			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				['view', 'pkg', '--registry=https://registry.example.com'],
				undefined,
			);
		});

		it('should handle empty arguments array', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: 'npm help output',
				stderr: '',
			});

			const result = await executeNpmCommand([]);

			expect(result).toBe('npm help output');
			expect(mockAsyncExec).toHaveBeenCalledWith('npm', [], undefined);
		});
	});

	describe('edge cases', () => {
		it('should handle non-Error objects being thrown', async () => {
			mockAsyncExec.mockRejectedValue('string error');

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				new UnexpectedError('Failed to execute npm command'),
			);
		});

		it('should handle errors with no message', async () => {
			const errorWithoutMessage = new Error();
			errorWithoutMessage.message = '';
			mockAsyncExec.mockRejectedValue(errorWithoutMessage);

			await expect(executeNpmCommand(['install', 'some-package'])).rejects.toThrow(
				'Failed to execute npm command',
			);
		});

		it('should handle empty stdout', async () => {
			mockAsyncExec.mockResolvedValue({
				stdout: '',
				stderr: '',
			});

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
		mockAsyncExec.mockReset();
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
			new UnexpectedError(
				'Checksum verification failed. Try restarting n8n and attempting the installation again.',
			),
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
				'npm',
				[
					'view',
					`${packageName}@${version}`,
					'dist.integrity',
					'--json',
					`--registry=${registryUrl}`,
				],
				undefined,
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
				new UnexpectedError(
					'Checksum verification failed. Try restarting n8n and attempting the installation again.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle special characters in package name and version safely', async () => {
			const specialPackageName = 'test-package; rm -rf /';
			const specialVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(specialPackageName)}/${specialVersion}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(integrity),
				stderr: '',
			});

			await verifyIntegrity(specialPackageName, specialVersion, registryUrl, integrity);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				[
					'view',
					`${specialPackageName}@${specialVersion}`,
					'dist.integrity',
					'--json',
					`--registry=${registryUrl}`,
				],
				undefined,
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
				new UnexpectedError(
					'Checksum verification failed. Try restarting n8n and attempting the installation again.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});
	});
});

describe('checkIfVersionExistsOrThrow', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';

	beforeEach(() => {
		jest.clearAllMocks();
		mockAsyncExec.mockReset();
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

		mockAsyncExec.mockRejectedValue(new Error('E404 Not Found'));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Package version does not exist'),
		);
	});

	it('should throw UnexpectedError with proper message on 404 when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);

		mockAsyncExec.mockRejectedValue(new Error('Some error'));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for network failures when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockRejectedValue(new Error('CLI network failure'));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			new UnexpectedError('Failed to check package version existence'),
		);
	});

	it('should throw UnexpectedError for server errors (500) when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		mockAsyncExec.mockRejectedValue(new Error('CLI error'));

		await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
			UnexpectedError,
		);
	});

	it('should return generic message for DNS getaddrinfo errors when CLI fallback fails', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('getaddrinfo ENOTFOUND internal.registry.local');

		mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

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

		mockAsyncExec.mockRejectedValue(new Error('ENOTFOUND registry.npmjs.org'));

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

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(version),
				stderr: '',
			});

			const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl);
			expect(result).toBe(true);
			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
			expect(mockAsyncExec).toHaveBeenCalledWith(
				'npm',
				['view', `${packageName}@${version}`, 'version', '--json', `--registry=${registryUrl}`],
				undefined,
			);
		});

		it('should return true when npm CLI resolves a dist-tag to a different version string', async () => {
			// npm resolves "latest" to an actual version (e.g. "1.0.0"), not the tag name itself.
			const resolvedVersion = '1.0.0';

			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/latest`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(resolvedVersion),
				stderr: '',
			});

			const result = await checkIfVersionExistsOrThrow(packageName, 'latest', registryUrl);
			expect(result).toBe(true);
		});

		it('should throw when npm CLI returns an empty response', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({ stdout: 'null', stderr: '' });

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Failed to check package version existence'),
			);
		});

		it('should reject CLI output that is not valid semver', async () => {
			const specialPackageName = 'test-package; rm -rf /';
			const specialVersion = '1.0.0 && echo "hacked"';

			nock(registryUrl)
				.get(`/${encodeURIComponent(specialPackageName)}/${specialVersion}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify(specialVersion),
				stderr: '',
			});

			await expect(
				checkIfVersionExistsOrThrow(specialPackageName, specialVersion, registryUrl),
			).rejects.toThrow('Failed to check package version existence');
		});

		it('should handle 404 errors in CLI fallback', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(
				new Error('E404 Not Found - GET https://registry.npmjs.org/nonexistent-package'),
			);

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Package version does not exist'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle DNS errors in CLI fallback for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'));

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle npm errors in CLI fallback for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('npm ERR! 500 Internal Server Error'));

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError(
					'The community nodes service is temporarily unreachable. Please try again later.',
				),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});

		it('should handle generic CLI errors for checkIfVersionExistsOrThrow', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/${version}`)
				.replyWithError('Network failure');

			mockAsyncExec.mockRejectedValue(new Error('Some other error'));

			await expect(checkIfVersionExistsOrThrow(packageName, version, registryUrl)).rejects.toThrow(
				new UnexpectedError('Failed to check package version existence'),
			);

			expect(mockAsyncExec).toHaveBeenCalledTimes(1);
		});
	});

	describe('Helper functions', () => {
		it('should return true when CLI resolves a dist-tag to a semver version', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/beta`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify('1.2.3'),
				stderr: '',
			});

			const result = await checkIfVersionExistsOrThrow(packageName, 'beta', registryUrl);
			expect(result).toBe(true);
		});

		it('should reject dist-tag when CLI returns non-semver output', async () => {
			nock(registryUrl)
				.get(`/${encodeURIComponent(packageName)}/beta`)
				.replyWithError('Network failure');

			mockAsyncExec.mockResolvedValue({
				stdout: JSON.stringify('not-a-version'),
				stderr: '',
			});

			await expect(checkIfVersionExistsOrThrow(packageName, 'beta', registryUrl)).rejects.toThrow(
				'Failed to check package version existence',
			);
		});

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

describe('executeNpmRequest', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';

	afterEach(() => {
		nock.cleanAll();
	});

	it('should return parsed response data on success', async () => {
		const payload = { name: packageName, version };
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, payload);

		const result = await executeNpmRequest(
			registryUrl,
			`${encodeURIComponent(packageName)}/${version}`,
		);
		expect(result).toEqual(payload);
	});

	it('should strip trailing slashes from registry URL', async () => {
		const payload = { name: packageName };
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, payload);

		const result = await executeNpmRequest(
			`${registryUrl}///`,
			`${encodeURIComponent(packageName)}/${version}`,
		);
		expect(result).toEqual(payload);
	});

	it('should include Authorization header when authToken is provided', async () => {
		const authToken = 'my-secret-token';
		nock(registryUrl, { reqheaders: { authorization: `Bearer ${authToken}` } })
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { name: packageName });

		await expect(
			executeNpmRequest(registryUrl, `${encodeURIComponent(packageName)}/${version}`, {
				authToken,
			}),
		).resolves.not.toThrow();
	});

	it('should not include Authorization header when authToken is not provided', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { name: packageName });

		await expect(
			executeNpmRequest(registryUrl, `${encodeURIComponent(packageName)}/${version}`),
		).resolves.not.toThrow();
	});

	it('should merge extra headers with auth header', async () => {
		const authToken = 'token';
		nock(registryUrl, { reqheaders: { authorization: `Bearer ${authToken}`, 'x-custom': 'value' } })
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { name: packageName });

		await expect(
			executeNpmRequest(registryUrl, `${encodeURIComponent(packageName)}/${version}`, {
				authToken,
				headers: { 'x-custom': 'value' },
			}),
		).resolves.not.toThrow();
	});

	it('should throw and log on HTTP error', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);

		await expect(
			executeNpmRequest(registryUrl, `${encodeURIComponent(packageName)}/${version}`),
		).rejects.toThrow();
	});

	it('should throw and log on network error', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		await expect(
			executeNpmRequest(registryUrl, `${encodeURIComponent(packageName)}/${version}`),
		).rejects.toThrow();
	});
});

describe('verifyIntegrity with auth token', () => {
	const registryUrl = 'https://registry.example.com';
	const packageName = 'test-package';
	const version = '1.0.0';
	const integrity = 'sha512-hash==';
	const authToken = 'my-secret-token';

	beforeEach(() => {
		jest.clearAllMocks();
		mockAsyncExec.mockReset();
	});

	afterEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
	});

	it('should include Authorization header in axios request when authToken is provided', async () => {
		nock(registryUrl, { reqheaders: { authorization: `Bearer ${authToken}` } })
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { dist: { integrity } });

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity, authToken),
		).resolves.not.toThrow();
	});

	it('should not include Authorization header when authToken is undefined', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { dist: { integrity } });

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity, undefined),
		).resolves.not.toThrow();
	});

	it('should include auth token arg in npm CLI fallback when authToken is provided', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockResolvedValue({ stdout: JSON.stringify(integrity), stderr: '' });

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity, authToken),
		).resolves.not.toThrow();

		expect(mockAsyncExec).toHaveBeenCalledWith(
			'npm',
			[
				'view',
				`${packageName}@${version}`,
				'dist.integrity',
				'--json',
				`--registry=${registryUrl}`,
				`--//registry.example.com/:_authToken=${authToken}`,
			],
			undefined,
		);
	});

	it('should not include auth token arg in npm CLI fallback when authToken is undefined', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockResolvedValue({ stdout: JSON.stringify(integrity), stderr: '' });

		await expect(
			verifyIntegrity(packageName, version, registryUrl, integrity, undefined),
		).resolves.not.toThrow();

		expect(mockAsyncExec).toHaveBeenCalledWith(
			'npm',
			[
				'view',
				`${packageName}@${version}`,
				'dist.integrity',
				'--json',
				`--registry=${registryUrl}`,
			],
			undefined,
		);
	});
});

describe('checkIfVersionExistsOrThrow with auth token', () => {
	const registryUrl = 'https://registry.example.com';
	const packageName = 'test-package';
	const version = '1.0.0';
	const authToken = 'my-secret-token';

	beforeEach(() => {
		jest.clearAllMocks();
		mockAsyncExec.mockReset();
	});

	afterEach(() => {
		nock.cleanAll();
		jest.clearAllMocks();
	});

	it('should include Authorization header in axios request when authToken is provided', async () => {
		nock(registryUrl, { reqheaders: { authorization: `Bearer ${authToken}` } })
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { name: packageName, version });

		const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl, authToken);
		expect(result).toBe(true);
	});

	it('should not include Authorization header when authToken is undefined', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, { name: packageName, version });

		const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl, undefined);
		expect(result).toBe(true);
	});

	it('should include auth token arg in npm CLI fallback when authToken is provided', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockResolvedValue({ stdout: JSON.stringify(version), stderr: '' });

		const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl, authToken);
		expect(result).toBe(true);

		expect(mockAsyncExec).toHaveBeenCalledWith(
			'npm',
			[
				'view',
				`${packageName}@${version}`,
				'version',
				'--json',
				`--registry=${registryUrl}`,
				`--//registry.example.com/:_authToken=${authToken}`,
			],
			undefined,
		);
	});

	it('should not include auth token arg in npm CLI fallback when authToken is undefined', async () => {
		nock(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');

		mockAsyncExec.mockResolvedValue({ stdout: JSON.stringify(version), stderr: '' });

		const result = await checkIfVersionExistsOrThrow(packageName, version, registryUrl, undefined);
		expect(result).toBe(true);

		expect(mockAsyncExec).toHaveBeenCalledWith(
			'npm',
			['view', `${packageName}@${version}`, 'version', '--json', `--registry=${registryUrl}`],
			undefined,
		);
	});
});
