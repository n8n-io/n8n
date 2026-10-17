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

	it('ignores $json text inside string literals', () => {
		expect(
			extractNodeToolVariables({
				a: "={{ 'literal $json.foo' }}",
				b: '={{ "also $json.bar" + `tpl $json.baz` }}',
			}),
		).toEqual([]);
	});

	it('still reads references in code, bracket names and template placeholders', () => {
		expect(
			extractNodeToolVariables({
				a: "={{ 'x' + $json.foo + $json['a-b'] }}",
				b: '={{ `id ${$json.bar}` }}',
			}).sort(),
		).toEqual(['a-b', 'bar', 'foo']);
	});

	it('excludes $fromAI keys with whitespace before the parenthesis or backtick quotes', () => {
		expect(
			extractNodeToolVariables({
				a: "={{ $fromAI ('spaced', 'd') }}",
				b: '={{ $fromAI(`ticked`, `d`) }}',
				c: '={{ $json.spaced + $json.ticked + $json.other }}',
			}),
		).toEqual(['other']);
	});

	it('supports optional chaining and stops dot names at non-identifier characters', () => {
		expect(extractNodeToolVariables({ a: '={{ $json?.opt + $json.a-b }}' }).sort()).toEqual([
			'a',
			'opt',
		]);
	});

	it('drops names that cannot be persisted as trusted metadata keys', () => {
		const long = 'a'.repeat(64);
		expect(
			extractNodeToolVariables({ a: `={{ $json.${long} + $json.ok_name + $json.constructor }}` }),
		).toEqual(['ok_name']);
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

	it('ignores inherited members when reading defaults', () => {
		const result = collectAgentVariables([
			{
				type: 'node',
				name: 'one',
				node: { nodeParameters: { a: '={{ $json.toString + $json.valueOf }}' } },
			},
			{
				type: 'node',
				name: 'two',
				node: { nodeParameters: { a: '={{ $json.toString }}' } },
				trustedMetadata: Object.fromEntries([
					['toString', { mode: 'fixed' as const, value: 'real' }],
				]),
			},
		]);
		expect(result).toEqual([
			{ name: 'toString', tools: ['one', 'two'], default: { mode: 'fixed', value: 'real' } },
			{ name: 'valueOf', tools: ['one'] },
		]);
	});
});
