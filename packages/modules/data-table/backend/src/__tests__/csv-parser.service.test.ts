import { testModules } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { CSV_MAX_COLUMNS } from '../csv-column-limit';
import { CSV_ROW_BATCH_SIZE, CsvParserService } from '../csv-parser.service';
import { FileUploadError } from '../errors/data-table-file-upload.error';

beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
});

describe('CsvParserService', () => {
	let tempDir: string;
	let csvParserService: CsvParserService;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'csv-test-'));
		const globalConfig = mock<GlobalConfig>({
			dataTable: { uploadDir: tempDir },
		});
		csvParserService = new CsvParserService(globalConfig);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const writeCsv = (filename: string, content: string | Buffer) => {
		writeFileSync(join(tempDir, filename), content);
		return filename;
	};

	const wideRow = (columns: number) => Array.from({ length: columns }, (_, i) => `c${i}`).join(',');

	const utf16 = (text: string) =>
		Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);

	describe('parseFile', () => {
		it('should not allow path traversal when parsing CSV file metadata', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: { uploadDir: '/safe/upload/dir' },
			});
			const service = new CsvParserService(globalConfig);

			await expect(
				service.parseFile('../some/other/directory/malicious-file.csv'),
			).rejects.toThrowError('Path traversal detected');
		});

		it('should parse CSV with headers and infer column types', async () => {
			const fileId = writeCsv('test.csv', 'name,age,active\nAlice,30,true\nBob,25,false\n');

			const result = await csvParserService.parseFile(fileId, true);

			expect(result.rowCount).toBe(2);
			expect(result.columnCount).toBe(3);
			expect(result.columns).toEqual([
				expect.objectContaining({ name: 'name', type: 'string' }),
				expect.objectContaining({ name: 'age', type: 'number' }),
				expect.objectContaining({ name: 'active', type: 'boolean' }),
			]);
		});

		it('should trim header names', async () => {
			const fileId = writeCsv('test.csv', ' name , age \nAlice,30\n');

			const result = await csvParserService.parseFile(fileId, true);

			expect(result.columns[0].name).toBe('name');
			expect(result.columns[1].name).toBe('age');
		});

		it('should generate column names when no headers', async () => {
			const fileId = writeCsv('test.csv', 'Alice,30,true\nBob,25,false\n');

			const result = await csvParserService.parseFile(fileId, false);

			expect(result.rowCount).toBe(2);
			expect(result.columns[0].name).toBe('Column_1');
			expect(result.columns[1].name).toBe('Column_2');
			expect(result.columns[2].name).toBe('Column_3');
		});
	});

	describe('parseFile errors', () => {
		it('should reject when a row is not valid CSV', async () => {
			const fileId = writeCsv('test.csv', 'name\nAlice\n"Bob\n');

			await expect(csvParserService.parseFile(fileId)).rejects.toThrow();
		});

		it('should reject when the file does not exist', async () => {
			await expect(csvParserService.parseFile('missing-file')).rejects.toThrow('ENOENT');
		});

		it('should reject a header with more columns than the limit', async () => {
			const fileId = writeCsv('test.csv', `${wideRow(CSV_MAX_COLUMNS + 1)}\n`);

			await expect(csvParserService.parseFile(fileId)).rejects.toThrow(FileUploadError);
		});

		it('should reject a UTF-16LE header with more columns than the limit', async () => {
			const fileId = writeCsv('test.csv', utf16(`∀${wideRow(CSV_MAX_COLUMNS + 1)}\n`));

			await expect(csvParserService.parseFile(fileId)).rejects.toThrow(FileUploadError);
		});

		it('should accept a header with as many columns as the limit', async () => {
			const fileId = writeCsv('test.csv', `${wideRow(CSV_MAX_COLUMNS)}\n`);

			await expect(csvParserService.parseFile(fileId)).resolves.toMatchObject({
				columnCount: CSV_MAX_COLUMNS,
			});
		});
	});

	const collectBatches = async (batches: AsyncIterable<Array<Record<string, string>>>) => {
		const result: Array<Array<Record<string, string>>> = [];
		for await (const batch of batches) {
			result.push(batch);
		}

		return result;
	};

	describe('parseColumnNames', () => {
		it('should return the trimmed header names', async () => {
			const fileId = writeCsv('test.csv', ' name , age\nAlice,30\nBob,25\n');

			await expect(csvParserService.parseColumnNames(fileId)).resolves.toEqual(['name', 'age']);
		});

		it('should return the header names when the file has no rows', async () => {
			const fileId = writeCsv('test.csv', 'name,age\n');

			await expect(csvParserService.parseColumnNames(fileId)).resolves.toEqual(['name', 'age']);
		});

		it('should reject when the file does not exist', async () => {
			await expect(csvParserService.parseColumnNames('missing-file')).rejects.toThrow('ENOENT');
		});

		it('should return no column names for an empty file', async () => {
			const fileId = writeCsv('test.csv', '');

			await expect(csvParserService.parseColumnNames(fileId)).resolves.toEqual([]);
		});

		it('should reject a header with more columns than the limit', async () => {
			const fileId = writeCsv('test.csv', `${wideRow(CSV_MAX_COLUMNS + 1)}\n`);

			await expect(csvParserService.parseColumnNames(fileId)).rejects.toThrow(FileUploadError);
		});

		it('should read only the header line', async () => {
			const fileId = writeCsv('test.csv', 'name,age\nAlice,30,"broken\n');

			await expect(csvParserService.parseColumnNames(fileId)).resolves.toEqual(['name', 'age']);
		});
	});

	describe('parseFileInBatches', () => {
		it('should not allow path traversal when parsing CSV file data', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: { uploadDir: '/safe/upload/dir' },
			});
			const service = new CsvParserService(globalConfig);

			await expect(
				collectBatches(service.parseFileInBatches('../some/other/directory/malicious-file.csv')),
			).rejects.toThrowError('Path traversal detected');
		});

		it('should return rows as objects with header keys', async () => {
			const fileId = writeCsv('test.csv', 'name,age\nAlice,30\nBob,25\n');

			const batches = await collectBatches(csvParserService.parseFileInBatches(fileId, true));

			expect(batches).toEqual([
				[
					{ name: 'Alice', age: '30' },
					{ name: 'Bob', age: '25' },
				],
			]);
		});

		it('should return rows with generated column names when no headers', async () => {
			const fileId = writeCsv('test.csv', 'Alice,30\nBob,25\n');

			const batches = await collectBatches(csvParserService.parseFileInBatches(fileId, false));

			expect(batches).toEqual([
				[
					{ Column_1: 'Alice', Column_2: '30' },
					{ Column_1: 'Bob', Column_2: '25' },
				],
			]);
		});

		it('should split rows into batches of the given size', async () => {
			const fileId = writeCsv('test.csv', 'n\n1\n2\n3\n4\n5\n');

			const batches = await collectBatches(csvParserService.parseFileInBatches(fileId, true, 2));

			expect(batches.map((batch) => batch.map((row) => row.n))).toEqual([
				['1', '2'],
				['3', '4'],
				['5'],
			]);
		});

		it('should use the default batch size', async () => {
			const rowCount = CSV_ROW_BATCH_SIZE * 2 + 1;
			const fileId = writeCsv('test.csv', 'n\n' + 'x\n'.repeat(rowCount));

			const batches = await collectBatches(csvParserService.parseFileInBatches(fileId));

			expect(batches.map((batch) => batch.length)).toEqual([
				CSV_ROW_BATCH_SIZE,
				CSV_ROW_BATCH_SIZE,
				1,
			]);
		});

		it('should yield nothing when the file has no rows', async () => {
			const fileId = writeCsv('test.csv', 'name,age\n');

			await expect(collectBatches(csvParserService.parseFileInBatches(fileId))).resolves.toEqual(
				[],
			);
		});

		it('should reject when the file does not exist', async () => {
			await expect(
				collectBatches(csvParserService.parseFileInBatches('missing-file')),
			).rejects.toThrow('ENOENT');
		});

		it('should reject when a row is not valid CSV', async () => {
			const fileId = writeCsv('test.csv', 'name\nAlice\n"Bob\n');

			await expect(collectBatches(csvParserService.parseFileInBatches(fileId))).rejects.toThrow();
		});

		it('should end a row at any line ending, even when the file mixes them', async () => {
			const fileId = writeCsv('test.csv', 'a,b\r\n1,2\n3,4\r5,6\r\n');

			await expect(collectBatches(csvParserService.parseFileInBatches(fileId))).resolves.toEqual([
				[
					{ a: '1', b: '2' },
					{ a: '3', b: '4' },
					{ a: '5', b: '6' },
				],
			]);
		});

		it('should read a UTF-16LE file', async () => {
			const fileId = writeCsv('test.csv', utf16('name,city\r\nAnn,Köln∀\n"Bob, Jr.",Ċ\n'));

			await expect(collectBatches(csvParserService.parseFileInBatches(fileId))).resolves.toEqual([
				[
					{ name: 'Ann', city: 'Köln∀' },
					{ name: 'Bob, Jr.', city: 'Ċ' },
				],
			]);
		});

		it.each([true, false])(
			'should reject a UTF-16LE row with more columns than the limit (hasHeaders: %s)',
			async (hasHeaders) => {
				const fileId = writeCsv(
					'test.csv',
					utf16(`a,b\n1,2\n${wideRow(CSV_MAX_COLUMNS + 1).replaceAll(',', 'Ċ,')}\n`),
				);

				await expect(
					collectBatches(csvParserService.parseFileInBatches(fileId, hasHeaders)),
				).rejects.toThrow(FileUploadError);
			},
		);

		it.each([true, false])(
			'should reject a row with more columns than the limit (hasHeaders: %s)',
			async (hasHeaders) => {
				const fileId = writeCsv('test.csv', `a,b\n1,2\n${wideRow(CSV_MAX_COLUMNS + 1)}\n`);

				await expect(
					collectBatches(csvParserService.parseFileInBatches(fileId, hasHeaders)),
				).rejects.toThrow(FileUploadError);
			},
		);

		it('should stop reading when the caller stops early', async () => {
			const fileId = writeCsv('test.csv', 'n\n1\n2\n3\n4\n');
			const batches = csvParserService.parseFileInBatches(fileId, true, 1);

			const first = await batches.next();
			await batches.return(undefined);

			expect(first.value).toEqual([{ n: '1' }]);
			await expect(batches.next()).resolves.toEqual({ done: true, value: undefined });
		});
	});
});
