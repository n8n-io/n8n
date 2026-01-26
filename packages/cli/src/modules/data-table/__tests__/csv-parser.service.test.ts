import { testModules } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { CsvParserService } from '../csv-parser.service';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
});
describe('CsvParserService', () => {
	describe('parseFile', () => {
		it('should not allow path traversal when parsing CSV file metadata', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: {
					uploadDir: '/safe/upload/dir',
				},
			});

			const csvParserService = new CsvParserService(globalConfig);

			const maliciousFileId = '../some/other/directory/malicious-file.csv';

			await expect(csvParserService.parseFile(maliciousFileId)).rejects.toThrowError(
				'Path traversal detected',
			);
		});

		it('should try to access file if it is within upload directory', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: {
					uploadDir: '/safe/upload/dir',
				},
			});

			const csvParserService = new CsvParserService(globalConfig);
			const safeFileId = 'valid-file.csv';

			// Since we are not actually testing file reading here, just ensure no error is thrown
			await expect(csvParserService.parseFile(safeFileId)).rejects.toThrowError(
				"ENOENT: no such file or directory, open '/safe/upload/dir/valid-file.csv",
			);
		});
	});

	describe('parseFileData', () => {
		it('should not allow path traversal when parsing CSV file data', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: {
					uploadDir: '/safe/upload/dir',
				},
			});

			const csvParserService = new CsvParserService(globalConfig);

			const maliciousFileId = '../some/other/directory/malicious-file.csv';

			await expect(csvParserService.parseFileData(maliciousFileId)).rejects.toThrowError(
				'Path traversal detected',
			);
		});

		it('should try to access file if it is within upload directory', async () => {
			const globalConfig = mock<GlobalConfig>({
				dataTable: {
					uploadDir: '/safe/upload/dir',
				},
			});

			const csvParserService = new CsvParserService(globalConfig);
			const safeFileId = 'valid-file.csv';

			// Since we are not actually testing file reading here, just ensure no error is thrown
			await expect(csvParserService.parseFileData(safeFileId)).rejects.toThrowError(
				"ENOENT: no such file or directory, open '/safe/upload/dir/valid-file.csv",
			);
		});
	});
});
