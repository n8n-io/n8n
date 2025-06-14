import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeFilename, validateFilename, generateSafeFilename } from './fileUtils';

describe('fileUtils', () => {
	describe('sanitizeFilename', () => {
		it('should return normal filenames unchanged', () => {
			expect(sanitizeFilename('normalfile.txt')).toBe('normalfile.txt');
			expect(sanitizeFilename('my-file_v2.pdf')).toBe('my-file_v2.pdf');
		});

		it('should handle empty and invalid inputs', () => {
			expect(sanitizeFilename('')).toBe('untitled');
			expect(sanitizeFilename(null as unknown as string)).toBe('untitled');
			expect(sanitizeFilename(undefined as unknown as string)).toBe('untitled');
			expect(sanitizeFilename('  filename.txt  ')).toBe('filename.txt');
		});

		it('should replace Windows forbidden characters', () => {
			expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
			expect(sanitizeFilename('file>name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file"name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file/name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file\\name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file|name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file?name.txt')).toBe('file_name.txt');
			expect(sanitizeFilename('file*name.txt')).toBe('file_name.txt');
		});

		it('should handle Unicode characters', () => {
			// Remove zero-width characters
			expect(sanitizeFilename('file\u200Bname.txt')).toBe('filename.txt');
			expect(sanitizeFilename('file\uFEFFname.txt')).toBe('filename.txt');
			// Convert special spaces
			expect(sanitizeFilename('file\u00A0name.txt')).toBe('file name.txt');
			// Preserve Chinese characters
			expect(sanitizeFilename('文件名.txt')).toBe('文件名.txt');
		});

		it('should handle Windows reserved names', () => {
			expect(sanitizeFilename('CON.txt')).toBe('_CON.txt');
			expect(sanitizeFilename('con.txt')).toBe('_con.txt');
			expect(sanitizeFilename('PRN')).toBe('_PRN');
			expect(sanitizeFilename('COM1.txt')).toBe('_COM1.txt');
			expect(sanitizeFilename('LPT1.txt')).toBe('_LPT1.txt');
			// Should not affect partial matches
			expect(sanitizeFilename('my-CON-file.txt')).toBe('my-CON-file.txt');
		});

		it('should remove leading/trailing spaces and dots', () => {
			expect(sanitizeFilename('...filename...')).toBe('filename');
			expect(sanitizeFilename('   filename   ')).toBe('filename');
			expect(sanitizeFilename('.hidden')).toBe('hidden');
		});

		it('should handle special cases', () => {
			expect(sanitizeFilename('.')).toBe('untitled');
			expect(sanitizeFilename('..')).toBe('untitled');
			expect(sanitizeFilename('<<<>>>')).toBe('______');
		});

		it('should handle length limits', () => {
			const longName = 'a'.repeat(250) + '.txt';
			const result = sanitizeFilename(longName);
			expect(result.length).toBeLessThanOrEqual(200);
			expect(result.endsWith('.txt')).toBe(true);

			// Custom length limit
			const result2 = sanitizeFilename(longName, 50);
			expect(result2.length).toBeLessThanOrEqual(50);
			expect(result2.endsWith('.txt')).toBe(true);
		});
	});

	describe('validateFilename', () => {
		it('should validate valid filenames', () => {
			const result = validateFilename('validfile.txt');
			expect(result.isValid).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.sanitized).toBe('validfile.txt');
		});

		it('should detect invalid filenames', () => {
			// Empty filename
			const result1 = validateFilename('');
			expect(result1.isValid).toBe(false);
			expect(result1.issues).toContain('Filename is empty');

			// Invalid characters
			const result2 = validateFilename('file<>name.txt');
			expect(result2.isValid).toBe(false);
			expect(result2.issues).toContain('Filename contains invalid characters or format');

			// Too long
			const result3 = validateFilename('a'.repeat(300));
			expect(result3.isValid).toBe(false);
			expect(result3.issues).toContain('Filename is too long (max 255 characters)');

			// Reserved names
			const result4 = validateFilename('CON.txt');
			expect(result4.isValid).toBe(false);
			expect(result4.issues).toContain('Filename uses Windows reserved name');
		});

		it('should test common Windows reserved names', () => {
			const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9'];

			reservedNames.forEach((name) => {
				const result = validateFilename(name);
				expect(result.isValid).toBe(false);
				expect(result.issues).toContain('Filename uses Windows reserved name');
			});
		});
	});

	describe('generateSafeFilename', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2023-12-25T10:30:45.123Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return valid filenames unchanged', () => {
			expect(generateSafeFilename('validfile.txt')).toBe('validfile.txt');
			expect(generateSafeFilename('document.pdf')).toBe('document.pdf');
		});

		it('should clean invalid filenames', () => {
			expect(generateSafeFilename('file<>name.txt')).toBe('file__name.txt');
			expect(generateSafeFilename('file?name')).toBe('file_name');
		});

		it('should generate timestamped names for problematic inputs', () => {
			expect(generateSafeFilename('')).toBe('file_2023-12-25T10-30-45');
			expect(generateSafeFilename('   ')).toBe('file_2023-12-25T10-30-45');
			expect(generateSafeFilename('...')).toBe('file_2023-12-25T10-30-45');
		});

		it('should handle Windows reserved names', () => {
			expect(generateSafeFilename('CON.txt')).toBe('_CON.txt');
		});

		it('should handle custom prefix', () => {
			const result = generateSafeFilename('', 'document');
			expect(result).toBe('document_2023-12-25T10-30-45');
		});
	});

	describe('integration tests', () => {
		it('should handle complex real-world filenames', () => {
			const complexName = 'My Document (v2.1) - "Final" <DRAFT> [2023].docx';
			const sanitized = sanitizeFilename(complexName);
			const validation = validateFilename(complexName);
			const safe = generateSafeFilename(complexName);

			expect(sanitized).toBe('My Document (v2.1) - _Final_ _DRAFT_ [2023].docx');
			expect(validation.isValid).toBe(false);
			expect(validation.sanitized).toBe(sanitized);
			expect(safe).toBe(sanitized);
		});

		it('should handle Chinese and special characters', () => {
			const chineseName = '我的文档<测试>：版本2.0.pdf';
			const sanitized = sanitizeFilename(chineseName);
			const validation = validateFilename(chineseName);

			expect(sanitized).toBe('我的文档_测试_：版本2.0.pdf');
			expect(validation.isValid).toBe(false);
			expect(validation.sanitized).toBe(sanitized);
		});

		it('should ensure consistency across all functions', () => {
			const testCases = ['normal.txt', 'file<>name.txt', 'CON.txt', '', 'a'.repeat(300)];

			testCases.forEach((testCase) => {
				const sanitized = sanitizeFilename(testCase);
				const validation = validateFilename(testCase);
				const safe = generateSafeFilename(testCase);

				expect(validation.sanitized).toBe(sanitized);

				if (sanitized !== 'untitled' || testCase === 'untitled') {
					expect(safe).toBe(sanitized);
				}
			});
		});
	});
});
