import { describe, expect, it } from 'vitest';

import { extractTestSource, parseTestNames } from './workflowTests.utils';

describe('extractTestSource', () => {
	const source = `import { test } from 'vitest';

test('first', async () => {
	const text = 'a ) } quote';
	expect(fn({ a: [1] })).toBe(\`)\`); // )
});

test('second', () => {});
`;

	it('returns the whole call, with brackets inside strings and comments', () => {
		expect(extractTestSource(source, 'first')).toBe(
			"test('first', async () => {\n\tconst text = 'a ) } quote';\n\texpect(fn({ a: [1] })).toBe(`)`); // )\n});",
		);
		expect(extractTestSource(source, 'second')).toBe("test('second', () => {});");
	});

	it('returns undefined for an unknown name', () => {
		expect(extractTestSource(source, 'third')).toBeUndefined();
	});
});

describe('parseTestNames', () => {
	it('reads the names of test and it calls in order', () => {
		const source = `
import { expect, it, test } from 'vitest';
test('first', async () => {});
it("second", () => {});
test.skip(\`third\`, () => {});
`;
		expect(parseTestNames(source)).toEqual(['first', 'second', 'third']);
	});

	it('keeps escaped quotes in a name', () => {
		expect(parseTestNames("test('the customer\\'s plan', () => {})")).toEqual([
			"the customer's plan",
		]);
	});

	it('ignores names with a template expression and other calls', () => {
		const source = 'test(`case ${id}`, () => {}); latest("no"); expect("no");';
		expect(parseTestNames(source)).toEqual([]);
	});
});
