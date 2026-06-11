import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AgentKnowledgeCommandService } from '../agent-knowledge-command.service';

jest.unmock('node:fs/promises');

async function withTempWorkspace(operation: (workspaceRoot: string) => Promise<void>) {
	const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'n8n-agent-knowledge-test-'));
	try {
		await operation(workspaceRoot);
	} finally {
		await rm(workspaceRoot, { recursive: true, force: true });
	}
}

describe('AgentKnowledgeCommandService', () => {
	let service: AgentKnowledgeCommandService;

	beforeEach(() => {
		service = new AgentKnowledgeCommandService();
	});

	it('searches text files with git grep', async () => {
		await withTempWorkspace(async (workspaceRoot) => {
			await writeFile(path.join(workspaceRoot, 'notes.txt'), 'alpha\nneedle\nomega\n');

			const result = await service.run(workspaceRoot, {
				command: 'git_grep',
				pattern: 'needle',
				fixedStrings: true,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('notes.txt:2:needle');
			expect(result.truncated).toBe(false);
		});
	});
	it('truncates command output to the byte budget for non-ASCII content', async () => {
		await withTempWorkspace(async (workspaceRoot) => {
			await writeFile(path.join(workspaceRoot, 'notes.txt'), 'é'.repeat(40_000));

			const result = await service.run(workspaceRoot, {
				command: 'cat',
				file: 'notes.txt',
			});

			expect(result.truncated).toBe(true);
			expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(64 * 1024);
		});
	});

	it('rejects parent path traversal and symlink escapes', async () => {
		await withTempWorkspace(async (workspaceRoot) => {
			const outsideDirectory = await mkdtemp(path.join(tmpdir(), 'n8n-agent-knowledge-outside-'));
			try {
				await writeFile(path.join(outsideDirectory, 'secret.txt'), 'secret\n');
				await symlink(
					path.join(outsideDirectory, 'secret.txt'),
					path.join(workspaceRoot, 'secret-link'),
				);

				await expect(
					service.run(workspaceRoot, { command: 'cat', file: '../secret.txt' }),
				).rejects.toThrow('Parent path segments are not allowed');
				await expect(
					service.run(workspaceRoot, { command: 'cat', file: 'secret-link' }),
				).rejects.toThrow('Path escapes the knowledge workspace');
			} finally {
				await rm(outsideDirectory, { recursive: true, force: true });
			}
		});
	});

	it('rejects absolute paths and control characters', async () => {
		await withTempWorkspace(async (workspaceRoot) => {
			await expect(
				service.run(workspaceRoot, { command: 'cat', file: '/etc/passwd' }),
			).rejects.toThrow('Absolute paths are not allowed');
			await expect(
				service.run(workspaceRoot, { command: 'cat', file: 'notes\u0000.txt' }),
			).rejects.toThrow('Invalid path');
		});
	});

	it('reuses a cached workspace for the same key and re-materializes for a new key', async () => {
		let materializeCount = 0;
		const materialize = async (root: string) => {
			materializeCount++;
			await writeFile(path.join(root, 'notes.txt'), 'needle\n');
		};
		const operation = async (root: string) =>
			await service.run(root, { command: 'git_grep', pattern: 'needle', fixedStrings: true });

		const first = await service.withCachedWorkspace('key-a', materialize, operation);
		const second = await service.withCachedWorkspace('key-a', materialize, operation);
		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(materializeCount).toBe(1);

		await service.withCachedWorkspace('key-b', materialize, operation);
		expect(materializeCount).toBe(2);
	});
});
