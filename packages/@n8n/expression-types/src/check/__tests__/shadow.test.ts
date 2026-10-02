import { locate, shadowOf, type ExpressionSpan } from '../shadow';

const scope = {
	globals: { item: ['$json', '$now'], code: ['$json', 'items'] },
	trailer: 'declare function __n8nExpression(): void;',
};

/** The span of the first literal `needle` in `source`, as a literal or as the one argument of a call. */
function spanOf(source: string, needle: string, call?: string): ExpressionSpan {
	const literalStart = source.indexOf(needle);
	const literalEnd = literalStart + needle.length;
	const start = call ? source.indexOf(call) : literalStart;
	const end = call ? start + call.length : literalEnd;
	return { start, end, literalStart, literalEnd, text: needle.slice(1, -1).replace(/\\n/g, '\n') };
}

describe('shadowOf', () => {
	it('returns a single block as its value and concatenates mixed text', () => {
		const source = "f({ a: '={{ $json.id }}', b: '=x {{ $now }} y' });";
		const shadow = shadowOf(
			source,
			[spanOf(source, "'={{ $json.id }}'"), spanOf(source, "'=x {{ $now }} y'")],
			scope,
		);

		expect(shadow.text).toContain('return ( $json.id \n); }))');
		expect(shadow.text).toContain("return [( $now \n)].join(''); }))");
		expect(shadow.text.endsWith(`\n${scope.trailer}`)).toBe(true);
		expect(shadow.text.slice(0, shadow.trailerStart)).not.toContain('__n8nExpression()');
	});

	it('wraps Code text in a nested async function with the Code globals', () => {
		const source = "f({ jsCode: 'return items;' });";
		const span = { ...spanOf(source, "'return items;'"), kind: 'code' as const };
		const shadow = shadowOf(source, [span], scope);

		expect(shadow.text).toContain(
			'((...__args) => __n8nCode(__args, (__scope) => { const { $json, items } = __scope; return (async () => {\nreturn items;\n})(); }))',
		);
		expect(locate(shadow, shadow.text.indexOf('items;'), 2304)?.start).toBe(
			source.indexOf('items;'),
		);
	});

	it('maps a body position back to the source, past escapes and an added =', () => {
		const source = "f({ a: '=\\n{{ $json.idd }}', b: expr('{{ $json.x }}') });";
		const spans = [
			spanOf(source, "'=\\n{{ $json.idd }}'"),
			spanOf(source, "'{{ $json.x }}'", "expr('{{ $json.x }}')"),
		];
		const shadow = shadowOf(source, spans, scope);

		const first = shadow.text.indexOf('idd');
		expect(locate(shadow, first, 2339)).toMatchObject({
			start: source.indexOf('idd'),
			inBody: true,
		});
		const second = shadow.text.indexOf('.x');
		expect(locate(shadow, second, 2339)?.start).toBe(source.indexOf('.x'));
	});

	it('points a result error at the node, and a mismatch at the property name', () => {
		const source = "f({ max: '={{ $json.id }}' });";
		const span = { ...spanOf(source, "'={{ $json.id }}'"), propertyName: source.indexOf('max') };
		const shadow = shadowOf(source, [span], scope);
		const [replacement] = shadow.replacements;

		expect(locate(shadow, replacement?.propertyName ?? -1, 2322)).toMatchObject({
			start: span.start,
			inBody: false,
		});
		expect(locate(shadow, replacement?.propertyName ?? -1, 2339)).toBeUndefined();
		expect(locate(shadow, 0, 2304)).toBeUndefined();
	});
});
