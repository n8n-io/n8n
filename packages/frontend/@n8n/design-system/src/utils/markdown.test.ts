import { toggleCheckbox } from './markdown';

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
