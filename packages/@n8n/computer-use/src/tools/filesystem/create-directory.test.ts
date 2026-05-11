import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { createDirectoryTool } from './create-directory';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockMkdir(): void {
	(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
}

describe('createDirectoryTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(createDirectoryTool.name).toBe('create_directory');
		});

		it('has a non-empty description', () => {
			expect(createDirectoryTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input', () => {
			expect(() =>
				createDirectoryTool.inputSchema.parse({ dirPath: 'src/components' }),
			).not.toThrow();
		});

		it('throws when dirPath is missing', () => {
			expect(() => createDirectoryTool.inputSchema.parse({})).toThrow();
		});

		it('throws when dirPath is not a string', () => {
			expect(() => createDirectoryTool.inputSchema.parse({ dirPath: 42 })).toThrow();
		});
	});

	describe('execute', () => {
		it('creates directory including parent directories', async () => {
			mockMkdir();

			const result = await createDirectoryTool.execute({ dirPath: 'a/b/c' }, CONTEXT);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('a/b/c');
			expect(fs.mkdir).toHaveBeenCalledWith('/base/a/b/c', { recursive: true });
		});

		it('is idempotent when the directory already exists', async () => {
			// fs.mkdir with { recursive: true } resolves without error when the dir already exists
			(fs.mkdir as jest.Mock).mockResolvedValue(undefined);

			const result = await createDirectoryTool.execute({ dirPath: 'existing' }, CONTEXT);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('existing');
			expect(fs.mkdir).toHaveBeenCalledWith('/base/existing', { recursive: true });
		});

		it('returns a single text content block', async () => {
			mockMkdir();

			const result = await createDirectoryTool.execute({ dirPath: 'newdir' }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('rejects path traversal', async () => {
			await expect(
				createDirectoryTool.execute({ dirPath: '../../../etc' }, CONTEXT),
			).rejects.toThrow('escapes');
		});
	});
});
