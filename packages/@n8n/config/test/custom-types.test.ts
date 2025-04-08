import { CommaSeperatedStringArray, ColonSeparatedStringArray } from '../src/custom-types';

describe('CommaSeperatedStringArray', () => {
	it('should parse comma-separated string into array', () => {
		const result = new CommaSeperatedStringArray('a,b,c');
		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('should handle empty strings', () => {
		const result = new CommaSeperatedStringArray('a,b,,,');
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
});
