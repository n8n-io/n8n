import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { CSV_MAX_COLUMNS, CsvColumnLimit } from '../csv-column-limit';
import { FileUploadError } from '../errors/data-table-file-upload.error';

const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);

describe('CsvColumnLimit', () => {
	const run = async (chunks: Array<string | Buffer>, maxColumns?: number) => {
		const output: Buffer[] = [];
		await pipeline(
			Readable.from(chunks.map((chunk) => Buffer.from(chunk))),
			new CsvColumnLimit(maxColumns),
			async (source: AsyncIterable<Buffer>) => {
				for await (const chunk of source) {
					output.push(chunk);
				}
			},
		);

		return Buffer.concat(output).toString();
	};

	const row = (columns: number) => Array.from({ length: columns }, () => 'x').join(',');

	const utf16 = (text: string) => Buffer.concat([UTF16LE_BOM, Buffer.from(text, 'utf16le')]);

	it('should pass a UTF-8 file through unchanged', async () => {
		const content = 'name,age\n"Doe, John",30\r\nAnn,25';

		await expect(run([content])).resolves.toBe(content);
	});

	it('should accept rows with exactly the maximum number of columns', async () => {
		await expect(
			run([`${row(CSV_MAX_COLUMNS)}\n${row(CSV_MAX_COLUMNS)}\n`]),
		).resolves.toBeDefined();
	});

	it('should reject a header with more than the maximum number of columns', async () => {
		await expect(run([`${row(CSV_MAX_COLUMNS + 1)}\nx\n`])).rejects.toThrow(FileUploadError);
	});

	it('should reject a data row with more than the maximum number of columns', async () => {
		await expect(run(['a,b\n', `${row(4)}\n`], 3)).rejects.toThrow(
			'The file has more than 3 columns',
		);
	});

	it('should count empty fields', async () => {
		await expect(run([',,,\n'], 3)).rejects.toThrow(FileUploadError);
	});

	it('should not count commas inside quoted values', async () => {
		await expect(run(['a,"b,c,d,e"\n"x,y",""""\n'], 2)).resolves.toBeDefined();
	});

	it('should start a new count after a line break inside a quoted value only when the quote ends', async () => {
		await expect(run(['a,"line 1\nline 2,still quoted"\n'], 2)).resolves.toBeDefined();
	});

	it('should start a new count after a carriage return', async () => {
		await expect(run(['a,b\rc,d\r'], 2)).resolves.toBeDefined();
	});

	it('should count across chunk boundaries', async () => {
		await expect(run(['a,b', ',c', ',d\n'], 3)).rejects.toThrow(FileUploadError);
		await expect(run(['a,"b', ',c",d\n'], 3)).resolves.toBeDefined();
	});

	it('should pass a file shorter than the byte order mark through', async () => {
		await expect(run(['a'])).resolves.toBe('a');
	});

	it('should keep a character that is split across chunks', async () => {
		const bytes = Buffer.from('a,é\n');

		await expect(run([bytes.subarray(0, 3), bytes.subarray(3)])).resolves.toBe('a,é\n');
	});

	describe('UTF-16LE files', () => {
		it('should pass the text through as UTF-8 with a UTF-8 byte order mark', async () => {
			await expect(run([utf16('name,∀\nĊ,x\n')])).resolves.toBe('\uFEFFname,∀\nĊ,x\n');
		});

		it('should keep a character that is split across chunks', async () => {
			const bytes = utf16('a,∀\n');

			await expect(run([bytes.subarray(0, 5), bytes.subarray(5)])).resolves.toBe('\uFEFFa,∀\n');
		});

		it.each(['∀', 'Ċ'])('should count the columns of a row that contains %s', async (character) => {
			await expect(run([utf16(`${character}${row(4)}\n`)], 3)).rejects.toThrow(FileUploadError);
			await expect(run([utf16(`${row(4).replaceAll(',', `${character},`)}\n`)], 3)).rejects.toThrow(
				FileUploadError,
			);
		});
	});
});
