import { folderNameSchema } from '../folder.schema';

describe('folder.schema', () => {
	describe('folderNameSchema', () => {
		test.each([
			{ name: 'valid folder name', value: 'My Folder', expected: true },
			{ name: 'valid trimmed name', value: '  Trimmed Folder  ', expected: true },
			{ name: 'empty name', value: '', expected: false },
			{ name: 'whitespace only name', value: '   ', expected: false },
			{ name: 'name too long', value: 'a'.repeat(129), expected: false },
			{ name: 'name with invalid character: /', value: 'Folder/Name', expected: false },
			{ name: 'name with invalid character: :', value: 'Folder:Name', expected: false },
			{ name: 'name with invalid character: "', value: 'Folder"Name', expected: false },
			{ name: 'name with invalid character: *', value: 'Folder*Name', expected: false },
			{ name: 'name with invalid character: ?', value: 'Folder?Name', expected: false },
			{ name: 'name with invalid character: <', value: 'Folder<Name', expected: false },
			{ name: 'name with invalid character: >', value: 'Folder>Name', expected: false },
			{ name: 'name with invalid character: |', value: 'Folder|Name', expected: false },
			{ name: 'name with invalid character: [', value: 'Folder[Name', expected: false },
			{ name: 'name with invalid character: ]', value: 'Folder]Name', expected: false },
			{ name: 'name with invalid character: \\', value: 'Folder\\Name', expected: false },
			{ name: 'name with multiple invalid characters', value: 'Fold/er:Na*me?', expected: false },
			{ name: 'name consisting of dots only', value: '...', expected: false },
			{ name: 'name starting with dot', value: '.hidden', expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = folderNameSchema.safeParse(value);

			expect(result.success).toBe(expected);

			if (expected) {
				expect(result.success && result.data.trim()).toBe(result.data);
			}
		});
	});
});
