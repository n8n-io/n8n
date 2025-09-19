import { mock } from 'jest-mock-extended';
import type { InstanceSettings, Cipher } from 'n8n-core';
import { readFile, access, mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

// Restore real fs modules for these tests since we need actual file operations
jest.unmock('node:fs');
jest.unmock('node:fs/promises');

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
		let tempDir: string;

		beforeEach(async () => {
			tempDir = path.join(os.tmpdir(), 'n8n-test-' + Date.now());
			await mkdir(tempDir, { recursive: true });
		});

		it('should normalize CRLF line endings to LF when writing private key', async () => {
			// Arrange
			const keyWithCRLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\r\nkey\r\ndata\r\n-----END OPENSSH PRIVATE KEY-----\r\n';
			const expectedNormalizedKey = keyWithCRLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithCRLF);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method to return a key pair
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content has normalized line endings
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).not.toContain('\r');
			expect(fileContent).toBe(expectedNormalizedKey);
		});

		it('should normalize mixed CR and CRLF line endings to LF when writing private key', async () => {
			// Arrange
			const keyWithMixedEndings =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\rkey\r\ndata\r-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithMixedEndings);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content has normalized line endings
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).not.toContain('\r');
			expect(fileContent).toBe(
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n',
			);
		});

		it('should leave existing LF line endings unchanged when writing private key', async () => {
			// Arrange
			const keyWithLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithLF);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content remains unchanged
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).toBe(keyWithLF);
		});
	});

	describe('file security and permissions', () => {
		let tempDir: string;

		beforeEach(async () => {
			tempDir = path.join(os.tmpdir(), 'n8n-test-' + Date.now());
			await mkdir(tempDir, { recursive: true });
		});

		it('should always use restrictive permissions for SSH private keys', async () => {
			// Arrange
			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(testKey);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file permissions
			const fs = require('fs');
			const stats = await fs.promises.stat(tempFilePath);
			const permissions = (stats.mode & parseInt('777', 8)).toString(8);

			expect(permissions).toBe('600'); // Owner read/write only
			expect(stats.mode & 0o077).toBe(0); // Group and others have no permissions
		});

		it('should fail securely when file cannot be created', async () => {
			// Arrange
			const instanceSettings = mock<InstanceSettings>({ n8nFolder: '/nonexistent/path' });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mock(),
				mock(),
				mock(),
			);

			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';
			jest.spyOn(service as any, 'getPrivateKeyFromDatabase').mockResolvedValue(testKey);

			// Act & Assert - should throw UnexpectedError when file creation fails
			await expect(service.getPrivateKeyPath()).rejects.toThrow(
				'Failed to create SSH private key file',
			);
		});

		it('should remove existing file before creating new one with fsRm force option', async () => {
			// Arrange
			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(testKey);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Create a test file first
			const tempFilePath1 = await service.getPrivateKeyPath();
			expect(await access(tempFilePath1)).toBeUndefined(); // File exists

			// Act - call again to test file removal and recreation
			const tempFilePath2 = await service.getPrivateKeyPath();

			// Assert - should succeed without errors (fsRm with force: true handles existing file)
			expect(tempFilePath2).toBe(tempFilePath1);
			const fileContent = await readFile(tempFilePath2, 'utf8');
			expect(fileContent).toBe(testKey);
		});
	});
});
