import { highlightText } from '@/utils';

describe('highlightText', () => {
	it('should return original text if search parameter is an empty string', () => {
		const text = 'some text';
		const result = highlightText(text);
		expect(result).toBe(text);
	});

	it('should return original text if it is an empty string', () => {
		const text = '';
		const result = highlightText(text, 'search');
		expect(result).toBe(text);
	});

	it('should escape special characters in the search string', () => {
		const text = 'some text [example]';
		const result = highlightText(text, '[example]');
		expect(result).toBe('some text <mark class="highlight">[example]</mark>');
	});

	it('should escape other special characters in the search string', () => {
		const text = 'phone number: +123-456-7890';
		const result = highlightText(text, '+123-456-7890');
		expect(result).toBe('phone number: <mark class="highlight">+123-456-7890</mark>');
	});

	it('should highlight occurrences of the search string in text', () => {
		const text = 'example text example';
		const result = highlightText(text, 'example');
		expect(result).toBe(
			'<mark class="highlight">example</mark> text <mark class="highlight">example</mark>',
		);
	});

	it('should return original text if the search string is not found', () => {
		const text = 'some text';
		const result = highlightText(text, 'notfound');
		expect(result).toBe(text);
	});
});
