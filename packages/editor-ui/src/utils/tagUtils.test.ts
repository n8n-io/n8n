import { tagMatchesSearch } from './tagUtils';

describe('matchesSearch', () => {
	describe('matchesSearch', () => {
		test.each([
			['exampleTag', 'example', true],
			['exampleTag', 'test', false],
			['exampleTag', 'EXAMPLE', true],
			['exampleTag', '  example  ', true],
			['  exampleTag  ', 'example', true],
			['exampleTag', '', true],
			['exampleTag', 'tag', true],
			['exampleTag', 'exampleTag', true],
			['exampleTag', 'exampleTag123', false],
			['exampleTag', '123', false],
		])(
			'should return %s when tag name is %s and search string is %s',
			(name: string, search: string, expected: boolean) => {
				expect(tagMatchesSearch({ name, id: '1' }, search)).toBe(expected);
			},
		);
	});
});
