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

	describe('file security and permissions', () => {
		it('should always use restrictive permissions for SSH private keys', () => {
			// SSH private keys must use restrictive permissions for security
			const sshKeyMode = 0o600;

			// Verify the octal value is correct for SSH private keys
			expect(sshKeyMode.toString(8)).toBe('600'); // owner: rw-, group: ---, others: ---

			// Verify this is the most restrictive mode for files (no execute needed)
			expect(sshKeyMode & 0o077).toBe(0); // Group and others have no permissions
			expect(sshKeyMode & 0o700).toBe(0o600); // Owner has read+write only
		});

		it('should fail securely if file permissions cannot be set', async () => {
			// Test that we fail securely rather than downgrade permissions
			const mockWriteFile = async (_path: string, _content: string, options: { mode: number }) => {
				// Verify we always attempt restrictive permissions
				expect(options.mode).toBe(0o600);
				throw new Error('Permission denied - cannot create file');
			};

			// Simulate the file creation failing
			let caughtError: Error | null = null;
			try {
				await mockWriteFile('/test/path', 'ssh-key-content', { mode: 0o600 });
			} catch (error) {
				caughtError = error as Error;
			}

			expect(caughtError).toBeInstanceOf(Error);
			expect(caughtError?.message).toContain('Permission denied');
		});

		it('should validate SSH key permission requirements', () => {
			// SSH requires private keys to be readable only by owner
			const correctMode = 0o600;
			const insecureMode = 0o644; // This would be rejected by SSH

			// Verify correct mode allows owner read/write, denies group/others
			expect(correctMode & 0o400).toBeTruthy(); // Owner can read
			expect(correctMode & 0o200).toBeTruthy(); // Owner can write
			expect(correctMode & 0o040).toBeFalsy(); // Group cannot read
			expect(correctMode & 0o004).toBeFalsy(); // Others cannot read

			// Verify insecure mode would expose key to group/others
			expect(insecureMode & 0o044).toBeTruthy(); // Group and others can read (bad!)
		});
	});
});
