import { testModules } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { mock } from 'jest-mock-extended';
import { tmpdir } from 'os';
import { join } from 'path';

import { CsvParserService } from '../csv-parser.service';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
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

	const writeCsv = (filename: string, content: string) => {
		writeFileSync(join(tempDir, filename), content);
		return filename;
	};

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

	describe('parseFileData', () => {
		it('should not allow path traversal when parsing CSV file data', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: { uploadDir: '/safe/upload/dir' },
			});
			const service = new CsvParserService(globalConfig);

			await expect(
				service.parseFileData('../some/other/directory/malicious-file.csv'),
			).rejects.toThrowError('Path traversal detected');
		});

		it('should return rows as objects with header keys', async () => {
			const fileId = writeCsv('test.csv', 'name,age\nAlice,30\nBob,25\n');

			const rows = await csvParserService.parseFileData(fileId, true);

			expect(rows).toEqual([
				{ name: 'Alice', age: '30' },
				{ name: 'Bob', age: '25' },
			]);
		});

		it('should return rows with generated column names when no headers', async () => {
			const fileId = writeCsv('test.csv', 'Alice,30\nBob,25\n');

			const rows = await csvParserService.parseFileData(fileId, false);

			expect(rows).toEqual([
				{ Column_1: 'Alice', Column_2: '30' },
				{ Column_1: 'Bob', Column_2: '25' },
			]);
		});
	});

	describe('parseFileWithData', () => {
		it('should return both metadata and rows in a single pass', async () => {
			const fileId = writeCsv('test.csv', 'name,age\nAlice,30\nBob,25\n');

			const result = await csvParserService.parseFileWithData(fileId, true);

			expect(result.metadata.rowCount).toBe(2);
			expect(result.metadata.columnCount).toBe(2);
			expect(result.metadata.columns).toEqual([
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'string' },
			]);
			expect(result.rows).toEqual([
				{ name: 'Alice', age: '30' },
				{ name: 'Bob', age: '25' },
			]);
		});

		it('should handle CSV without headers', async () => {
			const fileId = writeCsv('test.csv', 'Alice,30\nBob,25\n');

			const result = await csvParserService.parseFileWithData(fileId, false);

			expect(result.metadata.columns[0].name).toBe('Column_1');
			expect(result.rows[0]).toEqual({ Column_1: 'Alice', Column_2: '30' });
		});
	});
});
