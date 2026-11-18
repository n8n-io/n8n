import { describe, expect, it } from 'vitest';

import { parseTestNames } from './workflowTests.utils';

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
