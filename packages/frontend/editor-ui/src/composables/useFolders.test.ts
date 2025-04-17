import { describe, it, expect } from 'vitest';
import { useFolders } from './useFolders';
import { FOLDER_NAME_MAX_LENGTH } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

vi.mock('@/stores/folders.store', () => ({
	useFoldersStore: vi.fn(() => ({
		draggedElement: null,
		activeDropTarget: null,
	})),
}));

describe('useFolders', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const { validateFolderName } = useFolders();

	describe('validateFolderName', () => {
		describe('Valid folder names', () => {
			const validNames = [
				'normal-folder',
				'folder_with_underscore',
				'folder with spaces',
				'folder123',
				'UPPERCASE',
				'MixedCase',
				'123numbers',
				'a', // Single character
				'folder.with.dots', // Dots in the middle are fine
				'folder-with-dashes',
				'folder(with)parentheses',
				'folder+with+plus',
				'folder&with&ampersand',
				"folder'with'quotes",
				'folder,with,commas',
				'folder;with;semicolons',
				'folder=with=equals',
				'folder~with~tilde',
			];

			validNames.forEach((name) => {
				it(`should validate "${name}" as a valid folder name`, () => {
					expect(validateFolderName(name)).toBe(true);
				});
			});
		});

		describe('Folder names with illegal starting dots', () => {
			const namesWithDots = ['.hidden', '..parent', '...multiple', '.', '..', '...'];

			namesWithDots.forEach((name) => {
				it(`should reject "${name}" as it starts with dot(s)`, () => {
					const result = validateFolderName(name);
					if (name === '.' || name === '..' || name === '...') {
						expect(result).toBe('Folder name cannot contain only dots');
					} else {
						expect(result).toBe('Folder name cannot start with a dot');
					}
				});
			});
		});

		describe('Folder names with illegal characters', () => {
			const illegalCharacterCases = [
				{ name: 'folder[bracketed]', char: '[' },
				{ name: 'folder]bracketed', char: ']' },
				{ name: 'folder^caret', char: '^' },
				{ name: 'folder\\backslash', char: '\\' },
				{ name: 'folder/slash', char: '/' },
				{ name: 'folder:colon', char: ':' },
				{ name: 'folder*asterisk', char: '*' },
				{ name: 'folder?question', char: '?' },
				{ name: 'folder"quotes', char: '"' },
				{ name: 'folder<angle', char: '<' },
				{ name: 'folder>angle', char: '>' },
				{ name: 'folder|pipe', char: '|' },
				{ name: '???', char: '?' },
			];

			illegalCharacterCases.forEach(({ name, char }) => {
				it(`should reject "${name}" as it contains illegal character "${char}"`, () => {
					const result = validateFolderName(name);
					expect(result).toBe(
						'Folder name cannot contain the following characters: [ ] ^ \\ / : * ? " < > |',
					);
				});
			});
		});

		it('should reject folder names longer than the maximum length', () => {
			const longName = 'a'.repeat(FOLDER_NAME_MAX_LENGTH + 1);
			const result = validateFolderName(longName);
			expect(result).toBe(`Folder name cannot be longer than ${FOLDER_NAME_MAX_LENGTH} characters`);
		});

		describe('Edge cases', () => {
			it('should handle empty string input', () => {
				// Decide on your desired behavior for empty strings
				// This is implementation-dependent - modify as needed
				const result = validateFolderName('');
				expect(typeof result).toBe('string'); // Expecting an error message
			});

			it('should handle folder names with Unicode characters', () => {
				const unicodeNames = ['folder-with-émojis-😊', '中文文件夹', 'мој фолдер', 'مجلد-عربي'];

				unicodeNames.forEach((name) => {
					expect(validateFolderName(name)).toBe(true);
				});
			});

			it('should handle folder names with multiple spaces', () => {
				expect(validateFolderName('folder   with   spaces')).toBe(true);
			});
		});

		describe('Combined invalid cases', () => {
			it('should prioritize illegal characters when name has both issues', () => {
				const result = validateFolderName('.folder*with/illegal:chars');
				// Expect to get the illegal characters first since that's the order of checks
				expect(result).toBe(
					'Folder name cannot contain the following characters: [ ] ^ \\ / : * ? " < > |',
				);
			});

			it('should check for dots-only before starting dots', () => {
				const result = validateFolderName('...');
				expect(result).toBe('Folder name cannot contain only dots');
			});
		});
	});
});
