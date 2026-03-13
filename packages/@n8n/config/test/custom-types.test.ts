import { CommaSeparatedStringArray } from '../src/custom-types';

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
