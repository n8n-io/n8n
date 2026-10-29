import { containsExpression } from './contains-expression';

describe('containsExpression', () => {
	it('returns true for a simple expression with {{...}}', () => {
		expect(containsExpression('={{value}}')).toBe(true);
	});

	it('returns true when {{...}} appears later in the string', () => {
		expect(containsExpression('=hello {{world}}')).toBe(true);
	});

	it('returns true when there is content inside the braces (including spaces)', () => {
		expect(containsExpression('={{ value }}')).toBe(true);
	});

	it('returns true when there is trailing content after the }}', () => {
		expect(containsExpression('={{value}} + 1')).toBe(true);
	});

	it('returns false when the string does not start with "="', () => {
		expect(containsExpression('hello {{world}}')).toBe(false);
	});

	it('returns false when the string starts with "=" but has no {{...}}', () => {
		expect(containsExpression('=hello world')).toBe(false);
	});

	it('returns false for empty placeholder {{}}', () => {
		expect(containsExpression('={{}}')).toBe(false);
	});

	it('returns false when the string uses single braces {..} instead of double {{..}}', () => {
		expect(containsExpression('={value}')).toBe(false);
	});

	it('returns false when the braces are incomplete', () => {
		expect(containsExpression('={{value}')).toBe(false);
		expect(containsExpression('={value}}')).toBe(false);
		expect(containsExpression('={{value')).toBe(false);
	});

	it('returns true when there are multiple placeholders and at least one matches', () => {
		expect(containsExpression('=x {{a}} y {{b}}')).toBe(true);
	});

	it('returns false when the string is empty', () => {
		expect(containsExpression('')).toBe(false);
	});
});
