import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { editFileTool } from './edit-file';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockStat(size: number): void {
	jest.mocked(fs.stat).mockResolvedValue({ size } as unknown as Stats);
}

function mockReadFile(content: string): void {
	(fs.readFile as jest.Mock).mockResolvedValue(content);
}

function mockWriteFile(): void {
	(fs.writeFile as jest.Mock).mockResolvedValue(undefined);
}

describe('editFileTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(editFileTool.name).toBe('edit_file');
		});

		it('has a non-empty description', () => {
			expect(editFileTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts valid input', () => {
			expect(() =>
				editFileTool.inputSchema.parse({
					filePath: 'src/index.ts',
					oldString: 'foo',
					newString: 'bar',
				}),
			).not.toThrow();
		});

		it('throws when filePath is missing', () => {
			expect(() =>
				editFileTool.inputSchema.parse({ oldString: 'foo', newString: 'bar' }),
			).toThrow();
		});

		it('throws when oldString is missing', () => {
			expect(() =>
				editFileTool.inputSchema.parse({ filePath: 'src/index.ts', newString: 'bar' }),
			).toThrow();
		});

		it('throws when oldString is empty', () => {
			expect(() =>
				editFileTool.inputSchema.parse({
					filePath: 'src/index.ts',
					oldString: '',
					newString: 'bar',
				}),
			).toThrow();
		});

		it('throws when newString is missing', () => {
			expect(() =>
				editFileTool.inputSchema.parse({ filePath: 'src/index.ts', oldString: 'foo' }),
			).toThrow();
		});
	});

	describe('execute', () => {
		it('replaces the first occurrence of oldString with newString', async () => {
			mockStat(100);
			mockReadFile('const foo = 1;\nconst foo2 = 2;');
			mockWriteFile();

			const result = await editFileTool.execute(
				{ filePath: 'src/index.ts', oldString: 'const foo = 1;', newString: 'const foo = 99;' },
				CONTEXT,
			);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('src/index.ts');
			expect(fs.writeFile).toHaveBeenCalledWith(
				'/base/src/index.ts',
				'const foo = 99;\nconst foo2 = 2;',
				'utf-8',
			);
		});

		it('only replaces the first occurrence when multiple exist', async () => {
			mockStat(100);
			mockReadFile('foo foo foo');
			mockWriteFile();

			await editFileTool.execute(
				{ filePath: 'file.txt', oldString: 'foo', newString: 'bar' },
				CONTEXT,
			);

			expect(fs.writeFile).toHaveBeenCalledWith('/base/file.txt', 'bar foo foo', 'utf-8');
		});

		it('returns a single text content block', async () => {
			mockStat(100);
			mockReadFile('hello world');
			mockWriteFile();

			const result = await editFileTool.execute(
				{ filePath: 'file.txt', oldString: 'hello', newString: 'hi' },
				CONTEXT,
			);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('throws when oldString is not found', async () => {
			mockStat(100);
			mockReadFile('hello world');

			await expect(
				editFileTool.execute(
					{ filePath: 'file.txt', oldString: 'missing', newString: 'replacement' },
					CONTEXT,
				),
			).rejects.toThrow('oldString not found');
		});

		it('rejects files larger than 512 KB', async () => {
			mockStat(600 * 1024);

			await expect(
				editFileTool.execute(
					{ filePath: 'large.txt', oldString: 'foo', newString: 'bar' },
					CONTEXT,
				),
			).rejects.toThrow('too large');
		});

		it('rejects path traversal', async () => {
			await expect(
				editFileTool.execute(
					{ filePath: '../../../etc/passwd', oldString: 'root', newString: 'evil' },
					CONTEXT,
				),
			).rejects.toThrow('escapes');
		});
	});
});
