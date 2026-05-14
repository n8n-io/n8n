import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { writeFileTool } from './write-file';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockMkdir(): void {
	(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
}

function mockWriteFile(): void {
	(fs.writeFile as jest.Mock).mockResolvedValue(undefined);
}

describe('writeFileTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(writeFileTool.name).toBe('write_file');
		});

		it('has a non-empty description', () => {
			expect(writeFileTool.description).not.toBe('');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts valid input', () => {
			expect(() =>
				writeFileTool.inputSchema.parse({ filePath: 'src/index.ts', content: 'hello' }),
			).not.toThrow();
		});

		it('throws when filePath is missing', () => {
			expect(() => writeFileTool.inputSchema.parse({ content: 'hello' })).toThrow();
		});

		it('throws when content is missing', () => {
			expect(() => writeFileTool.inputSchema.parse({ filePath: 'src/index.ts' })).toThrow();
		});

		it('throws when filePath is not a string', () => {
			expect(() => writeFileTool.inputSchema.parse({ filePath: 99, content: 'hello' })).toThrow();
		});
	});

	describe('getAffectedResources', () => {
		it('includes a content preview for new files', async () => {
			jest
				.mocked(fs.stat)
				.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

			const resources = await writeFileTool.getAffectedResources(
				{ filePath: 'new.txt', content: 'hello' },
				CONTEXT,
			);

			expect(resources).toMatchObject([
				{
					toolGroup: 'filesystemWrite',
					resource: '/base/new.txt',
					description: 'Write file: new.txt',
					preview: { kind: 'text', content: 'hello' },
				},
			]);
		});

		it('includes a diff preview when overwriting files', async () => {
			jest.mocked(fs.stat).mockResolvedValue({ size: 3 } as unknown as Stats);
			(fs.readFile as jest.Mock).mockResolvedValue('old');

			const resources = await writeFileTool.getAffectedResources(
				{ filePath: 'existing.txt', content: 'new' },
				CONTEXT,
			);

			expect(resources[0].preview).toMatchObject({
				kind: 'diff',
				content: expect.stringContaining('-old') as string,
			});
		});

		it('does not read a large existing file to build the approval preview', async () => {
			jest.mocked(fs.stat).mockResolvedValue({ size: 600 * 1024 } as unknown as Stats);

			const resources = await writeFileTool.getAffectedResources(
				{ filePath: 'large.txt', content: 'new' },
				CONTEXT,
			);

			expect(fs.readFile).not.toHaveBeenCalled();
			expect(resources[0].preview).toMatchObject({
				kind: 'text',
				title: expect.stringContaining('too large to diff') as string,
				content: 'new',
			});
		});
	});

	describe('execute', () => {
		it('creates parent directories and writes the file', async () => {
			mockMkdir();
			mockWriteFile();

			const result = await writeFileTool.execute(
				{ filePath: 'subdir/hello.txt', content: 'hello world' },
				CONTEXT,
			);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { path: string };
			expect(data.path).toBe('subdir/hello.txt');
			expect(fs.mkdir).toHaveBeenCalledWith('/base/subdir', { recursive: true });
			expect(fs.writeFile).toHaveBeenCalledWith('/base/subdir/hello.txt', 'hello world', 'utf-8');
		});

		it('returns a single text content block', async () => {
			mockMkdir();
			mockWriteFile();

			const result = await writeFileTool.execute({ filePath: 'hello.txt', content: 'hi' }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});

		it('overwrites a file that already exists', async () => {
			mockMkdir();
			mockWriteFile();

			await expect(
				writeFileTool.execute({ filePath: 'existing.txt', content: 'new data' }, CONTEXT),
			).resolves.not.toThrow();

			expect(fs.writeFile).toHaveBeenCalledWith('/base/existing.txt', 'new data', 'utf-8');
		});

		it('rejects when expectedSha256 does not match the existing file', async () => {
			(fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('old data'));

			await expect(
				writeFileTool.execute(
					{ filePath: 'existing.txt', content: 'new data', expectedSha256: 'different' },
					CONTEXT,
				),
			).rejects.toThrow('File changed since it was last read');

			expect(fs.writeFile).not.toHaveBeenCalled();
		});

		it('rejects content larger than 512 KB', async () => {
			const largeContent = 'x'.repeat(600 * 1024);

			await expect(
				writeFileTool.execute({ filePath: 'large.txt', content: largeContent }, CONTEXT),
			).rejects.toThrow('too large');
		});

		it('rejects path traversal', async () => {
			await expect(
				writeFileTool.execute({ filePath: '../../../etc/passwd', content: 'bad' }, CONTEXT),
			).rejects.toThrow('escapes');
		});
	});
});
