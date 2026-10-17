import { collectAgentVariables, extractNodeToolVariables } from '../node-tool-variables';

describe('extractNodeToolVariables', () => {
	it('finds dot and bracket $json references in expressions', () => {
		expect(
			extractNodeToolVariables({
				a: '={{ $json.tenant_id }}',
				nested: { b: '={{ $json[\'region-code\'] + $json["plan"] }}' },
				list: ['={{ $json.tenant_id }}'],
			}).sort(),
		).toEqual(['plan', 'region-code', 'tenant_id']);
	});

	it('ignores non-expression strings', () => {
		expect(extractNodeToolVariables({ a: '$json.tenant_id', b: 5, c: null })).toEqual([]);
	});

	it('excludes $fromAI keys', () => {
		expect(
			extractNodeToolVariables({
				a: "={{ $fromAI('order_id', 'The order') }}",
				b: '={{ $json.order_id }} {{ $json.tenant_id }}',
			}),
		).toEqual(['tenant_id']);
	});

	it('excludes reserved keys', () => {
		expect(extractNodeToolVariables({ a: '={{ $json.constructor + $json.__proto__ }}' })).toEqual(
			[],
		);
	});

	it('handles missing parameters', () => {
		expect(extractNodeToolVariables(undefined)).toEqual([]);
	});
});

describe('collectAgentVariables', () => {
	it('collects variables across node tools, keeping the first default', () => {
		const result = collectAgentVariables([
			{
				type: 'node',
				name: 'one',
				node: { nodeParameters: { a: '={{ $json.tenant_id }}' } },
				trustedMetadata: { tenant_id: { mode: 'fixed', value: 'first' } },
			},
			{
				type: 'node',
				name: 'two',
				node: { nodeParameters: { a: '={{ $json.tenant_id }} {{ $json.region }}' } },
				trustedMetadata: { tenant_id: { mode: 'fixed', value: 'second' } },
			},
			{ type: 'workflow', name: 'wf' },
		]);
		expect(result).toEqual([
			{ name: 'tenant_id', tools: ['one', 'two'], default: { mode: 'fixed', value: 'first' } },
			{ name: 'region', tools: ['two'] },
		]);
	});

	it('returns an empty list without tools', () => {
		expect(collectAgentVariables(undefined)).toEqual([]);
	});
});
