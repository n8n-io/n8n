import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { deleteTool } from './delete';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockStatFile(): void {
	jest.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as unknown as Stats);
}

function mockStatDirectory(): void {
	jest.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as unknown as Stats);
}

function mockStatNotFound(): void {
	const error = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
	jest.mocked(fs.stat).mockRejectedValue(error);
}

describe('deleteTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(deleteTool.name).toBe('delete');
		});

		it('has a non-empty description', () => {
			expect(deleteTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input', () => {
			expect(() => deleteTool.inputSchema.parse({ path: 'src/old-file.ts' })).not.toThrow();
		});

		it('throws when path is missing', () => {
			expect(() => deleteTool.inputSchema.parse({})).toThrow();
		});

		it('throws when path is not a string', () => {
			expect(() => deleteTool.inputSchema.parse({ path: 123 })).toThrow();
		});
	});

	describe('execute', () => {
		it('deletes a file using unlink', async () => {
			mockStatFile();
			jest.mocked(fs.unlink).mockResolvedValue(undefined);

			const result = await deleteTool.execute({ path: 'src/old.ts' }, CONTEXT);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('src/old.ts');
			expect(fs.unlink).toHaveBeenCalledWith('/base/src/old.ts');
			expect(fs.rm).not.toHaveBeenCalled();
		});

		it('deletes a directory recursively using rm', async () => {
			mockStatDirectory();
			(fs.rm as jest.Mock).mockResolvedValue(undefined);

			const result = await deleteTool.execute({ path: 'old-dir' }, CONTEXT);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('old-dir');
			expect(fs.rm).toHaveBeenCalledWith('/base/old-dir', { recursive: true, force: false });
			expect(fs.unlink).not.toHaveBeenCalled();
		});

		it('returns a single text content block', async () => {
			mockStatFile();
			jest.mocked(fs.unlink).mockResolvedValue(undefined);

			const result = await deleteTool.execute({ path: 'file.ts' }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('propagates error when path does not exist', async () => {
			mockStatNotFound();

			await expect(deleteTool.execute({ path: 'missing.ts' }, CONTEXT)).rejects.toThrow('ENOENT');
		});

		it('rejects path traversal', async () => {
			await expect(deleteTool.execute({ path: '../../../etc/passwd' }, CONTEXT)).rejects.toThrow(
				'escapes',
			);
		});
	});
});
