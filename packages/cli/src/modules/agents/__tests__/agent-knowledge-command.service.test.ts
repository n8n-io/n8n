import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AgentKnowledgeCommandService } from '../agent-knowledge-command.service';

jest.unmock('node:fs/promises');

describe('AgentKnowledgeCommandService', () => {
	let service: AgentKnowledgeCommandService;

	beforeEach(() => {
		service = new AgentKnowledgeCommandService();
	});

	it('searches text files with git grep', async () => {
		await service.withWorkspace(async (workspaceRoot) => {
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
		await service.withWorkspace(async (workspaceRoot) => {
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
		await service.withWorkspace(async (workspaceRoot) => {
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
});
