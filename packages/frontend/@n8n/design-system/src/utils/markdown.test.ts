import { toggleCheckbox, serializeAttr } from './markdown';

describe('toggleCheckbox', () => {
	it('should do nothing when there are no checkboxes', () => {
		const content = '"## I\'m a note \n Test\n"';
		expect(toggleCheckbox(content, 0)).toBe(content);
	});

	it('should toggle a checkbox at a specific index', () => {
		const content = '"## I\'m a note \n* [ ] First\n* [ ] Second\n* [ ] Third\n"';
		expect(toggleCheckbox(content, 0)).toBe(
			'"## I\'m a note \n* [x] First\n* [ ] Second\n* [ ] Third\n"',
		);
		expect(toggleCheckbox(content, 1)).toBe(
			'"## I\'m a note \n* [ ] First\n* [x] Second\n* [ ] Third\n"',
		);
		expect(toggleCheckbox(content, 2)).toBe(
			'"## I\'m a note \n* [ ] First\n* [ ] Second\n* [x] Third\n"',
		);

		const updatedContent = toggleCheckbox(content, 1);
		expect(toggleCheckbox(updatedContent, 0)).toBe(
			'"## I\'m a note \n* [x] First\n* [x] Second\n* [ ] Third\n"',
		);
		expect(toggleCheckbox(updatedContent, 1)).toBe(content);
	});
});

describe('serializeAttr', () => {
	it('should serialize attribute with safe value', () => {
		const result = serializeAttr('a', 'href', 'https://example.com');
		expect(result).toBe('href="https://example.com"');
	});

	it('should return empty string for unsafe attribute value', () => {
		const result = serializeAttr('a', 'href', 'javascript:alert(1)');
		expect(result).toBe('');
	});

	it('should handle empty attribute value', () => {
		const result = serializeAttr('img', 'alt', '');
		expect(result).toBe('');
	});

	it('should handle numeric attribute value', () => {
		const result = serializeAttr('iframe', 'width', '600');
		expect(result).toBe('width="600"');
	});

	it('should escape special characters in attribute value', () => {
		const result = serializeAttr('img', 'alt', 'Image "description" & more');
		expect(result).toBe('alt="Image &quot;description&quot; & more"');
	});

	it('should escape iframe src attribute value', () => {
		const result = serializeAttr('iframe', 'src', 'https://example.com/1 ></">');
		expect(result).toBe('src="https://example.com/1 &gt;&lt;/&quot;&gt;"');
	});
});
