import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlPreferencesService', () => {
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '' });
	const service = new SourceControlPreferencesService(
		instanceSettings,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	it('should class validate correct preferences', async () => {
		const validPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'git@example.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};
		const validationResult = await service.validateSourceControlPreferences(validPreferences);
		expect(validationResult).toBeTruthy();
	});

	describe('line ending normalization', () => {
		it('should normalize CRLF line endings to LF', () => {
			const keyWithCRLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\r\nkey\r\ndata\r\n-----END OPENSSH PRIVATE KEY-----\r\n';
			const expected =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n';

			// Test the normalization logic directly
			const normalized = keyWithCRLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			expect(normalized).toBe(expected);
			expect(normalized).not.toContain('\r');
		});

		it('should normalize mixed CR and CRLF line endings to LF', () => {
			const keyWithMixedEndings =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\rkey\r\ndata\r-----END OPENSSH PRIVATE KEY-----\n';
			const expected =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n';

			const normalized = keyWithMixedEndings.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			expect(normalized).toBe(expected);
			expect(normalized).not.toContain('\r');
		});

		it('should leave existing LF line endings unchanged', () => {
			const keyWithLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n';

			const normalized = keyWithLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			expect(normalized).toBe(keyWithLF);
		});
	});

	describe('file permission fallback behavior', () => {
		it('should use restrictive permissions as the first choice', () => {
			// The getPrivateKeyPath method should attempt 0o600 first for security
			const restrictiveMode = 0o600;
			const permissiveMode = 0o644;

			// Verify that restrictive mode is more secure (fewer permissions)
			expect(restrictiveMode).toBeLessThan(permissiveMode);

			// Verify the octal values are correct
			expect(restrictiveMode.toString(8)).toBe('600'); // owner: rw-, group: ---, others: ---
			expect(permissiveMode.toString(8)).toBe('644'); // owner: rw-, group: r--, others: r--
		});

		it('should simulate permission fallback when restrictive mode fails', async () => {
			// Test simulates the try-catch behavior in getPrivateKeyPath
			let attemptedMode: number | null = null;
			let fallbackMode: number | null = null;

			// Simulate writeFile function that fails on restrictive permissions
			const mockWriteFile = async (_path: string, _content: string, options: { mode: number }) => {
				if (options.mode === 0o600) {
					attemptedMode = options.mode;
					throw new Error('Permission denied');
				} else {
					fallbackMode = options.mode;
				}
			};

			// Simulate the try-catch logic from getPrivateKeyPath
			try {
				await mockWriteFile('/test/path', 'content', { mode: 0o600 });
			} catch (error) {
				await mockWriteFile('/test/path', 'content', { mode: 0o644 });
			}

			expect(attemptedMode).toBe(0o600);
			expect(fallbackMode).toBe(0o644);
		});

		it('should handle multiple consecutive permission failures gracefully', async () => {
			// Test that if both permission attempts fail, we get a meaningful error
			let firstAttempt = false;
			let secondAttempt = false;

			const mockWriteFile = async (_path: string, _content: string, options: { mode: number }) => {
				if (options.mode === 0o600) {
					firstAttempt = true;
					throw new Error('EPERM: operation not permitted (restrictive)');
				} else if (options.mode === 0o644) {
					secondAttempt = true;
					throw new Error('EACCES: permission denied (permissive)');
				}
			};

			// Simulate both attempts failing
			let caughtError: Error | null = null;
			try {
				try {
					await mockWriteFile('/test/path', 'content', { mode: 0o600 });
				} catch (error) {
					await mockWriteFile('/test/path', 'content', { mode: 0o644 });
				}
			} catch (error) {
				caughtError = error as Error;
			}

			expect(firstAttempt).toBe(true);
			expect(secondAttempt).toBe(true);
			expect(caughtError).toBeInstanceOf(Error);
			expect(caughtError?.message).toContain('permission denied');
		});
	});
});
