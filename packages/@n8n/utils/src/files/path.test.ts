import { describe, it, expect } from 'vitest';

import { isWindowsFilePath } from './path';

describe('isWindowsFilePath', () => {
	describe('valid Windows paths', () => {
		it('should return true for uppercase drive letter with forward slash', () => {
			expect(isWindowsFilePath('C:/path')).toBe(true);
			expect(isWindowsFilePath('Z:/')).toBe(true);
		});

		it('should return true for uppercase drive letter with backslash', () => {
			expect(isWindowsFilePath('C:\\path')).toBe(true);
			expect(isWindowsFilePath('Z:\\')).toBe(true);
		});

		it('should return true for lowercase drive letter with forward slash', () => {
			expect(isWindowsFilePath('c:/path')).toBe(true);
			expect(isWindowsFilePath('z:/')).toBe(true);
		});

		it('should return true for lowercase drive letter with backslash', () => {
			expect(isWindowsFilePath('c:\\path')).toBe(true);
			expect(isWindowsFilePath('z:\\')).toBe(true);
		});
	});

	describe('invalid paths', () => {
		it('should return false for Unix/Linux absolute paths', () => {
			expect(isWindowsFilePath('/unix/path')).toBe(false);
		});

		it('should return false for Unix/Linux relative paths', () => {
			expect(isWindowsFilePath('./relative/path')).toBe(false);
			expect(isWindowsFilePath('../parent/path')).toBe(false);
			expect(isWindowsFilePath('relative/path')).toBe(false);
		});

		it('should return false for UNC network paths', () => {
			expect(isWindowsFilePath('//network/share')).toBe(false);
			expect(isWindowsFilePath('\\\\network\\share')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isWindowsFilePath('')).toBe(false);
		});

		it('should return false for paths missing drive letter separator', () => {
			expect(isWindowsFilePath('C')).toBe(false);
			expect(isWindowsFilePath('C:')).toBe(false);
			expect(isWindowsFilePath('CD:/path')).toBe(false);
		});

		it('should return false for paths with invalid drive letter format', () => {
			expect(isWindowsFilePath('1:/path')).toBe(false);
			expect(isWindowsFilePath('@:/path')).toBe(false);
		});
	});
});
