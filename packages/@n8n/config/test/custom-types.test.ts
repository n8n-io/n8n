import { CommaSeparatedStringArray, ColonSeparatedStringArray } from '../src/custom-types';

describe('CommaSeparatedStringArray', () => {
	it('should parse comma-separated string into array', () => {
		const result = new CommaSeparatedStringArray('a,b,c');
		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('should handle empty strings', () => {
		const result = new CommaSeparatedStringArray('a,b,,,');
		expect(result).toEqual(['a', 'b']);
	});
});

describe('ColonSeparatedStringArray', () => {
	it('should parse colon-separated string into array', () => {
		const result = new ColonSeparatedStringArray('a:b:c');
		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('should handle empty strings', () => {
		const result = new ColonSeparatedStringArray('a::b:::');
		expect(result).toEqual(['a', 'b']);
	});

	it('should handle a single Windows absolute path', () => {
		const result = new ColonSeparatedStringArray('C:\\n8n\\hooks\\my-hook.js');
		expect(result).toEqual(['C:\\n8n\\hooks\\my-hook.js']);
	});

	it('should handle multiple Windows absolute paths separated by colons', () => {
		const result = new ColonSeparatedStringArray(
			'C:\\hooks\\hook1.js:D:\\hooks\\hook2.js',
		);
		expect(result).toEqual(['C:\\hooks\\hook1.js', 'D:\\hooks\\hook2.js']);
	});

	it('should handle a mix of Windows paths and Unix-style paths', () => {
		const result = new ColonSeparatedStringArray(
			'C:\\hooks\\hook1.js:/usr/local/hooks/hook2.js',
		);
		expect(result).toEqual(['C:\\hooks\\hook1.js', '/usr/local/hooks/hook2.js']);
	});

	it('should handle Windows paths with forward slashes', () => {
		const result = new ColonSeparatedStringArray('C:/hooks/hook1.js');
		expect(result).toEqual(['C:/hooks/hook1.js']);
	});

	it('should not rejoin segments that are not drive letters', () => {
		const result = new ColonSeparatedStringArray('ab:\\path');
		expect(result).toEqual(['ab', '\\path']);
	});

	it('should handle Unix paths without modification', () => {
		const result = new ColonSeparatedStringArray(
			'/usr/local/hook1.js:/opt/hooks/hook2.js',
		);
		expect(result).toEqual(['/usr/local/hook1.js', '/opt/hooks/hook2.js']);
	});
});
