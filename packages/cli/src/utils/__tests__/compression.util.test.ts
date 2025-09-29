import { compressFolder, decompressFolder } from '../compression.util';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

describe('CompressionUtil', () => {
	const testDir = path.join(__dirname, 'test-data');
	const outputDir = path.join(__dirname, 'test-output');

	beforeEach(async () => {
		// Clean up test directories
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
		if (existsSync(outputDir)) {
			await rm(outputDir, { recursive: true, force: true });
		}

		// Create test directory structure
		await mkdir(testDir, { recursive: true });
		await mkdir(path.join(testDir, 'subdir'), { recursive: true });

		// Create test files
		await writeFile(path.join(testDir, 'file1.txt'), 'Hello World!');
		await writeFile(path.join(testDir, 'file2.json'), JSON.stringify({ test: 'data' }));
		await writeFile(path.join(testDir, 'subdir', 'file3.txt'), 'Nested file content');
	});

	afterEach(async () => {
		// Clean up
		if (existsSync(testDir)) {
			await rm(testDir, { recursive: true, force: true });
		}
		if (existsSync(outputDir)) {
			await rm(outputDir, { recursive: true, force: true });
		}
	});

	describe('compressFolder', () => {
		it('should compress a folder into a ZIP archive', async () => {
			const zipPath = path.join(outputDir, 'test.zip');

			await compressFolder(testDir, zipPath);

			expect(existsSync(zipPath)).toBe(true);
		});

		it('should compress with exclusion patterns', async () => {
			const zipPath = path.join(outputDir, 'test-exclude.zip');

			await compressFolder(testDir, zipPath, {
				exclude: ['*.txt'],
			});

			expect(existsSync(zipPath)).toBe(true);

			// Extract and verify excluded files are not present
			const extractDir = path.join(outputDir, 'extracted-exclude');
			await decompressFolder(zipPath, extractDir);

			// Verify that .txt files are excluded
			expect(existsSync(path.join(extractDir, 'file1.txt'))).toBe(false);
			expect(existsSync(path.join(extractDir, 'subdir', 'file3.txt'))).toBe(false);

			// Verify that .json files are included
			expect(existsSync(path.join(extractDir, 'file2.json'))).toBe(true);
			expect(existsSync(path.join(extractDir, 'subdir', 'file3.txt'))).toBe(false);
		});

		it('should compress with custom compression level', async () => {
			const zipPath = path.join(outputDir, 'test-level.zip');

			await compressFolder(testDir, zipPath, {
				level: 1,
			});

			expect(existsSync(zipPath)).toBe(true);
		});
	});

	describe('decompressFolder', () => {
		it('should decompress a ZIP archive to a folder', async () => {
			const zipPath = path.join(outputDir, 'test.zip');
			const extractDir = path.join(outputDir, 'extracted');

			// First compress
			await compressFolder(testDir, zipPath);

			// Then decompress
			await decompressFolder(zipPath, extractDir);

			// Verify files exist
			expect(existsSync(path.join(extractDir, 'file1.txt'))).toBe(true);
			expect(existsSync(path.join(extractDir, 'file2.json'))).toBe(true);
			expect(existsSync(path.join(extractDir, 'subdir', 'file3.txt'))).toBe(true);

			// Verify content
			const content1 = await readFile(path.join(extractDir, 'file1.txt'), 'utf-8');
			expect(content1).toBe('Hello World!');

			const content2 = await readFile(path.join(extractDir, 'file2.json'), 'utf-8');
			expect(JSON.parse(content2)).toEqual({ test: 'data' });
		});

		it('should decompress with exclusion patterns', async () => {
			const zipPath = path.join(outputDir, 'test.zip');
			const extractDir = path.join(outputDir, 'extracted');

			await compressFolder(testDir, zipPath);
			await decompressFolder(zipPath, extractDir, {
				exclude: ['*.txt'],
			});

			expect(existsSync(path.join(extractDir, 'file1.txt'))).toBe(false);
			expect(existsSync(path.join(extractDir, 'subdir', 'file3.txt'))).toBe(false);
			expect(existsSync(path.join(extractDir, 'file2.json'))).toBe(true);
		});
	});
});
