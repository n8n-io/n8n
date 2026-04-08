import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { moveFileTool } from './move';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockMkdir(): void {
	(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
}

function mockRename(): void {
	jest.mocked(fs.rename).mockResolvedValue(undefined);
}

describe('moveFileTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(moveFileTool.name).toBe('move');
		});

		it('has a non-empty description', () => {
			expect(moveFileTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts valid input', () => {
			expect(() =>
				moveFileTool.inputSchema.parse({
					sourcePath: 'src/old.ts',
					destinationPath: 'src/new.ts',
				}),
			).not.toThrow();
		});

		it('throws when sourcePath is missing', () => {
			expect(() => moveFileTool.inputSchema.parse({ destinationPath: 'src/new.ts' })).toThrow();
		});

		it('throws when destinationPath is missing', () => {
			expect(() => moveFileTool.inputSchema.parse({ sourcePath: 'src/old.ts' })).toThrow();
		});
	});

	describe('execute', () => {
		it('moves a file to the destination', async () => {
			mockMkdir();
			mockRename();

			const result = await moveFileTool.execute(
				{ sourcePath: 'src/old.ts', destinationPath: 'src/new.ts' },
				CONTEXT,
			);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				sourcePath: string;
				destinationPath: string;
			};
			expect(data.sourcePath).toBe('src/old.ts');
			expect(data.destinationPath).toBe('src/new.ts');
			expect(fs.rename).toHaveBeenCalledWith('/base/src/old.ts', '/base/src/new.ts');
		});

		it('overwrites the destination if it already exists', async () => {
			mockMkdir();
			mockRename();

			await expect(
				moveFileTool.execute(
					{ sourcePath: 'src/old.ts', destinationPath: 'src/existing.ts' },
					CONTEXT,
				),
			).resolves.not.toThrow();
		});

		it('creates parent directories at the destination', async () => {
			mockMkdir();
			mockRename();

			await moveFileTool.execute(
				{ sourcePath: 'file.ts', destinationPath: 'new/nested/dir/file.ts' },
				CONTEXT,
			);

			expect(fs.mkdir).toHaveBeenCalledWith('/base/new/nested/dir', { recursive: true });
		});

		it('returns a single text content block', async () => {
			mockMkdir();
			mockRename();

			const result = await moveFileTool.execute(
				{ sourcePath: 'a.ts', destinationPath: 'b.ts' },
				CONTEXT,
			);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('rejects path traversal on source', async () => {
			await expect(
				moveFileTool.execute(
					{ sourcePath: '../../../etc/passwd', destinationPath: 'dest.txt' },
					CONTEXT,
				),
			).rejects.toThrow('escapes');
		});

		it('rejects path traversal on destination', async () => {
			mockMkdir();

			await expect(
				moveFileTool.execute(
					{ sourcePath: 'src/file.ts', destinationPath: '../../../etc/passwd' },
					CONTEXT,
				),
			).rejects.toThrow('escapes');
		});
	});
});
