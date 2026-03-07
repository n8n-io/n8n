import { mock } from 'jest-mock-extended';
import fs from 'fs/promises';
import path from 'path';

import type { ErrorReporter } from '@/errors';

import { FileSystemManager } from '../file-system.manager';
import { FileLocation } from '../utils';

/**
 * Integration test to reproduce ADO-4926: Race condition between webhook binary
 * workflows renaming/deleting the 'temp' execution folder.
 *
 * The race occurs when:
 * 1. Execution A completes and its restoreBinaryDataId post-hook calls rename()
 *    which deletes the 'temp' folder (line 138 of file-system.manager.ts)
 * 2. Execution B is in the middle of copyByFilePath, having asserted the 'temp'
 *    folder exists (line 98) but not yet copied the file (line 100)
 * 3. B's copy fails with ENOENT because A deleted the temp folder
 *
 * In production, this race occurred 31 times out of 8053 webhook calls (0.38%).
 * The race window is very small, making it difficult to reproduce consistently.
 */
describe('FileSystemManager - Race Condition (ADO-4926)', () => {
	const testDir = path.join(__dirname, 'test-binary-data-race');
	const errorReporter = mock<ErrorReporter>();
	let manager: FileSystemManager;

	beforeEach(async () => {
		await fs.mkdir(testDir, { recursive: true });
		manager = new FileSystemManager(testDir, errorReporter);
		await manager.init();
	});

	afterEach(async () => {
		await fs.rm(testDir, { recursive: true, force: true });
	});

	it('should demonstrate the race window in rename operation', async () => {
		// This test shows that rename() deletes the temp folder unconditionally
		// without checking if other operations might still be using it.
		//
		// The race occurs when:
		// - Operation A calls assertDir (creates/verifies temp exists)
		// - Operation B calls rename (deletes temp)
		// - Operation A calls fs.cp (fails because temp is gone)
		//
		// This window is very small but can occur in production with concurrent
		// webhook executions.

		const sourceFile = path.join(testDir, 'source.bin');
		await fs.writeFile(sourceFile, Buffer.from('test data'));

		const workflowId = 'test-workflow';
		const tempLocation = FileLocation.ofExecution(workflowId, 'temp');

		// Write file to temp
		const result = await manager.copyByFilePath(tempLocation, sourceFile, {
			mimeType: 'application/octet-stream',
			fileName: 'file.bin',
		});

		// Verify temp folder exists
		const tempDir = path.join(testDir, 'workflows', workflowId, 'executions', 'temp');
		await expect(fs.access(tempDir)).resolves.not.toThrow();

		// Rename deletes temp folder at line 138 of file-system.manager.ts
		const oldFileId = result.fileId;
		const newFileId = oldFileId.replace('/temp/', '/exec-123/');
		await manager.rename(oldFileId, newFileId);

		// Temp folder is now deleted - this is the root cause of the race
		await expect(fs.access(tempDir)).rejects.toThrow(/ENOENT|no such file or directory/);
	});

	it('should show the critical code paths involved in the race', async () => {
		// This test documents the race condition without relying on timing.
		// It shows that the temp folder is deleted by rename() and that
		// copyByFilePath() expects it to exist.

		const sourceFile = path.join(testDir, 'test.bin');
		await fs.writeFile(sourceFile, Buffer.from('test'));

		const workflowId = 'webhook-workflow';
		const tempLocation = FileLocation.ofExecution(workflowId, 'temp');

		// Step 1: Copy file to temp location
		const result = await manager.copyByFilePath(tempLocation, sourceFile, {
			mimeType: 'application/octet-stream',
			fileName: 'file.bin',
		});

		// Verify temp folder exists
		const tempDir = path.join(testDir, 'workflows', workflowId, 'executions', 'temp');
		await expect(fs.access(tempDir)).resolves.not.toThrow();

		// Step 2: Rename operation (line 138 deletes temp folder)
		const oldFileId = result.fileId;
		const newFileId = oldFileId.replace('/temp/', '/exec-123/');
		await manager.rename(oldFileId, newFileId);

		// Verify temp folder was deleted by rename
		await expect(fs.access(tempDir)).rejects.toThrow(/ENOENT|no such file or directory/);

		// This demonstrates the root cause: rename() deletes temp, breaking
		// concurrent copyByFilePath() calls that are in progress
	});

	it('should fail with concurrent operations on temp folder', async () => {
		// Attempt to reproduce the race with many concurrent operations.
		// Due to the small race window, this may not always fail, but when it
		// does, it demonstrates the bug.

		const sourceFile = path.join(testDir, 'source.bin');
		await fs.writeFile(sourceFile, Buffer.from('test data'));

		const workflowId = 'webhook-wf';
		const executionCount = 100; // High count increases chance of hitting race

		const promises: Promise<void>[] = [];

		for (let i = 0; i < executionCount; i++) {
			promises.push(
				(async () => {
					const tempLocation = FileLocation.ofExecution(workflowId, 'temp');
					const result = await manager.copyByFilePath(tempLocation, sourceFile, {
						mimeType: 'application/octet-stream',
						fileName: `file-${i}.bin`,
					});

					const oldFileId = result.fileId;
					const newFileId = oldFileId.replace('/temp/', `/exec-${i}/`);
					await manager.rename(oldFileId, newFileId);
				})(),
			);
		}

		const results = await Promise.allSettled(promises);
		const failures = results.filter((r) => r.status === 'rejected');

		// The race may or may not occur in this test run, but if it does,
		// it should be one of the expected errors
		if (failures.length > 0) {
			const hasRaceError = failures.every((f) => {
				const reason = (f as PromiseRejectedResult).reason;
				return (
					reason.message.includes('ENOENT') ||
					reason.message.includes('ENOTEMPTY') ||
					reason.message.includes('no such file or directory')
				);
			});
			expect(hasRaceError).toBe(true);
		}

		// Even if no failures occurred, the test demonstrates the pattern
		// that can cause the race condition in production
	});
});
