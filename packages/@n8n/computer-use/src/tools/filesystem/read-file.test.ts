import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { readFileTool } from './read-file';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function mockStat(size: number): void {
	jest.mocked(fs.stat).mockResolvedValue({ size } as unknown as Stats);
}

function mockReadFile(content: Buffer | string): void {
	(fs.readFile as jest.Mock).mockResolvedValue(content);
}

describe('readFileTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(readFileTool.name).toBe('read_file');
		});

		it('has a non-empty description', () => {
			expect(readFileTool.description.length).toBeGreaterThan(0);
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input with only required fields', () => {
			expect(() => readFileTool.inputSchema.parse({ filePath: 'src/index.ts' })).not.toThrow();
		});

		it('accepts all optional fields with valid values', () => {
			expect(() =>
				readFileTool.inputSchema.parse({ filePath: 'src/index.ts', startLine: 1, maxLines: 50 }),
			).not.toThrow();
		});

		it('throws when filePath is missing', () => {
			expect(() => readFileTool.inputSchema.parse({})).toThrow();
		});

		it('throws when filePath is not a string', () => {
			expect(() => readFileTool.inputSchema.parse({ filePath: 99 })).toThrow();
		});

		it('throws when startLine is not an integer', () => {
			expect(() => readFileTool.inputSchema.parse({ filePath: 'a.ts', startLine: 1.7 })).toThrow();
		});

		it('throws when startLine is a string', () => {
			expect(() =>
				readFileTool.inputSchema.parse({ filePath: 'a.ts', startLine: 'first' }),
			).toThrow();
		});

		it('throws when maxLines is not an integer', () => {
			expect(() => readFileTool.inputSchema.parse({ filePath: 'a.ts', maxLines: 3.14 })).toThrow();
		});

		it('leaves optional fields undefined when not provided', () => {
			const parsed = readFileTool.inputSchema.parse({ filePath: 'a.ts' });
			expect(parsed.startLine).toBeUndefined();
			expect(parsed.maxLines).toBeUndefined();
		});
	});

	describe('execute', () => {
		it('reads a text file and returns path, content, totalLines, truncated', async () => {
			mockStat(100);
			mockReadFile(Buffer.from('Hello, world!\nLine 2\nLine 3'));

			const result = await readFileTool.execute({ filePath: 'hello.txt' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const content = JSON.parse(textOf(result)) as {
				path: string;
				content: string;
				truncated: boolean;
				totalLines: number;
			};

			expect(content.path).toBe('hello.txt');
			expect(content.content).toContain('Hello, world!');
			expect(content.totalLines).toBe(3);
			expect(content.truncated).toBe(false);
		});

		it('respects maxLines and sets truncated=true', async () => {
			mockStat(1000);
			const lines = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}`).join('\n');
			mockReadFile(Buffer.from(lines));

			const result = await readFileTool.execute({ filePath: 'big.txt', maxLines: 10 }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const content = JSON.parse(textOf(result)) as {
				content: string;
				truncated: boolean;
				totalLines: number;
			};

			expect(content.content.split('\n')).toHaveLength(10);
			expect(content.truncated).toBe(true);
			expect(content.totalLines).toBe(500);
		});

		it('respects startLine', async () => {
			mockStat(200);
			const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
			mockReadFile(Buffer.from(lines));

			const result = await readFileTool.execute(
				{ filePath: 'numbered.txt', startLine: 5, maxLines: 3 },
				CONTEXT,
			);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const content = JSON.parse(textOf(result)) as { content: string };

			expect(content.content).toBe('Line 5\nLine 6\nLine 7');
		});

		it('rejects unsupported binary files', async () => {
			mockStat(100);
			const binary = Buffer.alloc(100);
			binary[50] = 0;
			mockReadFile(binary);

			await expect(readFileTool.execute({ filePath: 'binary.dat' }, CONTEXT)).rejects.toThrow(
				'Unsupported binary file',
			);
		});

		it('rejects unsupported binary files without null bytes', async () => {
			mockStat(100);
			mockReadFile(Buffer.from([0xfe, 0xfd, 0xfc, 0xfb]));

			await expect(readFileTool.execute({ filePath: 'binary.dat' }, CONTEXT)).rejects.toThrow(
				'Unsupported binary file',
			);
		});

		it('rejects files larger than 1MB', async () => {
			mockStat(2 * 1024 * 1024);

			await expect(readFileTool.execute({ filePath: 'large.txt' }, CONTEXT)).rejects.toThrow(
				'too large',
			);
		});

		it('returns PNG as image content', async () => {
			const pngHeader = Buffer.from([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xde, 0xad, 0xbe, 0xef,
			]);
			mockStat(pngHeader.length);
			mockReadFile(pngHeader);

			const result = await readFileTool.execute({ filePath: 'pic.png' }, CONTEXT);
			expect(result.content).toEqual([
				{ type: 'image', data: pngHeader.toString('base64'), mimeType: 'image/png' },
			]);
		});

		it('returns JPEG as image content', async () => {
			const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
			mockStat(jpegHeader.length);
			mockReadFile(jpegHeader);

			const result = await readFileTool.execute({ filePath: 'pic.jpg' }, CONTEXT);
			expect(result.content[0]).toMatchObject({ type: 'image', mimeType: 'image/jpeg' });
		});

		it('returns GIF as image content', async () => {
			const gifHeader = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(10)]);
			mockStat(gifHeader.length);
			mockReadFile(gifHeader);

			const result = await readFileTool.execute({ filePath: 'pic.gif' }, CONTEXT);
			expect(result.content[0]).toMatchObject({ type: 'image', mimeType: 'image/gif' });
		});

		it('returns WebP as image content', async () => {
			const webpHeader = Buffer.concat([
				Buffer.from('RIFF'),
				Buffer.from([0x10, 0x00, 0x00, 0x00]),
				Buffer.from('WEBP'),
			]);
			mockStat(webpHeader.length);
			mockReadFile(webpHeader);

			const result = await readFileTool.execute({ filePath: 'pic.webp' }, CONTEXT);
			expect(result.content[0]).toMatchObject({ type: 'image', mimeType: 'image/webp' });
		});

		it('returns PDF as embedded resource', async () => {
			const pdfHeader = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(20)]);
			mockStat(pdfHeader.length);
			mockReadFile(pdfHeader);

			const result = await readFileTool.execute({ filePath: 'doc.pdf' }, CONTEXT);
			expect(result.content).toHaveLength(1);
			const item = result.content[0] as {
				type: string;
				resource: { uri: string; mimeType: string; blob: string };
			};
			expect(item.type).toBe('resource');
			expect(item.resource.mimeType).toBe('application/pdf');
			expect(item.resource.uri.startsWith('file://')).toBe(true);
			expect(item.resource.blob).toBe(pdfHeader.toString('base64'));
		});

		it('returns MP3 as audio content', async () => {
			const mp3Header = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(20)]);
			mockStat(mp3Header.length);
			mockReadFile(mp3Header);

			const result = await readFileTool.execute({ filePath: 'song.mp3' }, CONTEXT);
			expect(result.content[0]).toMatchObject({ type: 'audio', mimeType: 'audio/mpeg' });
		});

		it('returns WAV as audio content', async () => {
			const wavHeader = Buffer.concat([
				Buffer.from('RIFF'),
				Buffer.from([0x10, 0x00, 0x00, 0x00]),
				Buffer.from('WAVE'),
			]);
			mockStat(wavHeader.length);
			mockReadFile(wavHeader);

			const result = await readFileTool.execute({ filePath: 'song.wav' }, CONTEXT);
			expect(result.content[0]).toMatchObject({ type: 'audio', mimeType: 'audio/wav' });
		});

		it('rejects path traversal', async () => {
			await expect(
				readFileTool.execute({ filePath: '../../../etc/passwd' }, CONTEXT),
			).rejects.toThrow('escapes');
		});

		it.each(['node_modules/foo/.env', 'Node_Modules/foo/.env', '.git/config', 'dist/bundle.js'])(
			'rejects direct reads under excluded directory %s',
			async (filePath) => {
				await expect(readFileTool.execute({ filePath }, CONTEXT)).rejects.toThrow(
					'excluded from filesystem reads',
				);
			},
		);

		it.each([
			{ startLine: undefined, maxLines: undefined },
			{ startLine: 1, maxLines: 5 },
			{ startLine: 3, maxLines: 2 },
		])(
			'returns content array of length 1 for startLine=$startLine maxLines=$maxLines',
			async ({ startLine, maxLines }) => {
				mockStat(200);
				const fileLines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n');
				mockReadFile(Buffer.from(fileLines));

				const result = await readFileTool.execute(
					{ filePath: 'file.txt', startLine, maxLines },
					CONTEXT,
				);

				expect(result.content).toHaveLength(1);
				expect(result.content[0].type).toBe('text');
			},
		);
	});
});
