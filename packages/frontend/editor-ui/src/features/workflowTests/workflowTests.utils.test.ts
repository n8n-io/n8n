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
						line: 6,
						marks: [],
						httpMocks: 0,
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
								line: 12,
								marks: [],
								httpMocks: 0,
							},
						],
					},
				],
			},
			{
				kind: 'test',
				name: 'top level',
				fullName: 'top level',
				line: 16,
				marks: [],
				httpMocks: 0,
			},
		]);
	});

	it('keeps escaped quotes in a name', () => {
		expect(parseTestFile("test('the customer\\'s plan', () => {})")).toMatchObject([
			{ name: "the customer's plan" },
		]);
	});

	it('reads the input, the mocks and the assertions of a test', () => {
		const source = `
test('sends an enterprise signup to sales', async () => {
	const workflow = (await loadPackage('./package')).get('wf-1');
	mockNode(workflow.node('Get customer'), [{ id: 42 }]);
	// mockNode(workflow.node('Old mock'), []);
	nock('https://crm.example.com').get('/customers/42').reply(200, {});

	const result = await executeWorkflow(workflow, {
		input: { body: { customerId: 42 } },
		trigger: 'Webhook',
	});

	expect(result.node('Run sales workflow').input).toEqual([{ id: 42 }]);
});
`;
		expect(parseTestFile(source)).toMatchObject([
			{
				httpMocks: 1,
				marks: [
					{ kind: 'input', node: 'Webhook', line: 9 },
					{
						kind: 'mocked',
						node: 'Get customer',
						line: 4,
						text: "mockNode(workflow.node('Get customer'), [{ id: 42 }]);",
					},
					{ kind: 'asserted', node: 'Run sales workflow', line: 13 },
				],
			},
		]);
	});

	it('ignores names with a template expression and calls that only end in test', () => {
		const source = 'test(`case ${id}`, () => {}); latest("no"); expect("no"); foo.test("no");';
		expect(parseTestFile(source)).toEqual([]);
	});
});
