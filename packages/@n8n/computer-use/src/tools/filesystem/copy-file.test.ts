import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { copyFileTool } from './copy-file';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockMkdir(): void {
	(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
}

function mockCopyFile(): void {
	jest.mocked(fs.copyFile).mockResolvedValue(undefined);
}

describe('copyFileTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(copyFileTool.name).toBe('copy_file');
		});

		it('has a non-empty description', () => {
			expect(copyFileTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts valid input', () => {
			expect(() =>
				copyFileTool.inputSchema.parse({
					sourcePath: 'src/file.ts',
					destinationPath: 'dst/file.ts',
				}),
			).not.toThrow();
		});

		it('throws when sourcePath is missing', () => {
			expect(() => copyFileTool.inputSchema.parse({ destinationPath: 'dst/file.ts' })).toThrow();
		});

		it('throws when destinationPath is missing', () => {
			expect(() => copyFileTool.inputSchema.parse({ sourcePath: 'src/file.ts' })).toThrow();
		});
	});

	describe('execute', () => {
		it('creates parent directories and copies the file', async () => {
			mockMkdir();
			mockCopyFile();

			const result = await copyFileTool.execute(
				{ sourcePath: 'src/file.ts', destinationPath: 'dst/sub/file.ts' },
				CONTEXT,
			);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				sourcePath: string;
				destinationPath: string;
			};
			expect(data.sourcePath).toBe('src/file.ts');
			expect(data.destinationPath).toBe('dst/sub/file.ts');
			expect(fs.mkdir).toHaveBeenCalledWith('/base/dst/sub', { recursive: true });
			expect(fs.copyFile).toHaveBeenCalledWith('/base/src/file.ts', '/base/dst/sub/file.ts');
		});

		it('overwrites the destination if it already exists', async () => {
			mockMkdir();
			mockCopyFile();

			await expect(
				copyFileTool.execute(
					{ sourcePath: 'src/file.ts', destinationPath: 'existing.ts' },
					CONTEXT,
				),
			).resolves.toBeDefined();
		});

		it('returns a single text content block', async () => {
			mockMkdir();
			mockCopyFile();

			const result = await copyFileTool.execute(
				{ sourcePath: 'a.ts', destinationPath: 'b.ts' },
				CONTEXT,
			);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('rejects path traversal on source', async () => {
			await expect(
				copyFileTool.execute(
					{ sourcePath: '../../../etc/passwd', destinationPath: 'dst.txt' },
					CONTEXT,
				),
			).rejects.toThrow('escapes');
		});

		it('rejects path traversal on destination', async () => {
			mockMkdir();

			await expect(
				copyFileTool.execute(
					{ sourcePath: 'src/file.ts', destinationPath: '../../../etc/passwd' },
					CONTEXT,
				),
			).rejects.toThrow('escapes');
		});
	});
});
