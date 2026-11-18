import { describe, expect, it } from 'vitest';

import { parseTestFile } from './workflowTests.utils';

describe('parseTestFile', () => {
	it('reads describe blocks and tests with the full names that Vitest reports', () => {
		const source = `
import { describe, expect, test } from 'vitest';
const webhook = (body) => ({ body, query: {} });

describe('a) mocked', () => {
	test('passes the order', async () => {
		const text = 'a ) } ] quote';
		expect(fn({ a: [1] })).toBe(\`)\`); // ) }
	});

	describe("nested", () => {
		it.skip('skips', () => {});
	});
});

test('top level', () => {});
void webhook;
`;
		expect(parseTestFile(source)).toEqual([
			{
				kind: 'describe',
				name: 'a) mocked',
				fullName: 'a) mocked',
				children: [
					{
						kind: 'test',
						name: 'passes the order',
						fullName: 'a) mocked > passes the order',
						code: "test('passes the order', async () => {\n\t\tconst text = 'a ) } ] quote';\n\t\texpect(fn({ a: [1] })).toBe(`)`); // ) }\n\t});",
					},
					{
						kind: 'describe',
						name: 'nested',
						fullName: 'a) mocked > nested',
						children: [
							{
								kind: 'test',
								name: 'skips',
								fullName: 'a) mocked > nested > skips',
								code: "it.skip('skips', () => {});",
							},
						],
					},
				],
			},
			{
				kind: 'test',
				name: 'top level',
				fullName: 'top level',
				code: "test('top level', () => {});",
			},
		]);
	});

	it('keeps escaped quotes in a name', () => {
		expect(parseTestFile("test('the customer\\'s plan', () => {})")).toMatchObject([
			{ name: "the customer's plan" },
		]);
	});

	it('ignores names with a template expression and calls that only end in test', () => {
		const source = 'test(`case ${id}`, () => {}); latest("no"); expect("no"); foo.test("no");';
		expect(parseTestFile(source)).toEqual([]);
	});
});
