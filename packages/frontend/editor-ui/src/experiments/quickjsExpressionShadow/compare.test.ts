import { DateTime, Duration } from 'luxon';

import { canonicalize, expressionSkeleton, isNonDeterministic, valueType } from './compare';

describe('isNonDeterministic', () => {
	it.each([
		'{{ $now }}',
		"{{ $today.plus(1, 'day') }}",
		'{{ new Date().getTime() }}',
		'{{ DateTime.now().toISO() }}',
		'{{ DateTime.local() }}',
		'{{ Math.random() }}',
		'{{ $json.list.randomItem() }}',
	])('marks %s as non-deterministic', (source) => {
		expect(isNonDeterministic(source)).toBe(true);
	});

	it.each([
		'{{ $json.date.toDateTime() }}',
		'{{ $json.updatedAt }}',
		'{{ DateTime.fromISO($json.created) }}',
		'{{ Math.max(1, 2) }}',
	])('treats %s as deterministic', (source) => {
		expect(isNonDeterministic(source)).toBe(false);
	});
});

describe('canonicalize', () => {
	it('ignores the key order of objects', () => {
		expect(canonicalize({ a: 1, b: { c: 2, d: 3 } })).toBe(
			canonicalize({ b: { d: 3, c: 2 }, a: 1 }),
		);
	});

	it('tells different values apart', () => {
		expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: '1' }));
		expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
		expect(canonicalize(undefined)).not.toBe(canonicalize(null));
	});

	it('compares luxon values by instant and zone, not by identity', () => {
		const iso = '2026-10-07T10:00:00.000+02:00';
		const a = DateTime.fromISO(iso, { zone: 'Europe/Rome' });
		const b = DateTime.fromISO(iso, { zone: 'Europe/Rome' });

		expect(canonicalize(a)).toBe(canonicalize(b));
		expect(canonicalize(a)).not.toBe(canonicalize(a.setZone('UTC')));
		expect(canonicalize(Duration.fromObject({ hours: 1 }))).toBe('Duration(PT1H)');
	});

	it('compares dates, maps and sets by content', () => {
		expect(canonicalize(new Date(0))).toBe(canonicalize(new Date(0)));
		expect(canonicalize(new Date(0))).not.toBe(canonicalize(new Date(1)));
		expect(canonicalize(new Map([['a', 1]]))).toBe(canonicalize(new Map([['a', 1]])));
		expect(canonicalize(new Map([['a', 1]]))).not.toBe(canonicalize(new Map([['a', 2]])));
		expect(canonicalize(new Set([1]))).not.toBe(canonicalize(new Set([2])));
	});

	// The legacy engine returns `new String('ab')` as is; QuickJS returns { 0: 'a', 1: 'b' }.
	it('keeps a boxed primitive apart from a plain object with the same keys', () => {
		expect(canonicalize(new String('ab'))).toBe(canonicalize(new String('ab')));
		expect(canonicalize(new String('ab'))).not.toBe(canonicalize({ 0: 'a', 1: 'b' }));
		expect(canonicalize(new Number(5))).not.toBe(canonicalize(5));
	});

	it('reads a boxed primitive without calling a valueOf that the expression set', () => {
		const boxed = new String('ab');
		const valueOf = vi.fn(() => 'changed');
		Object.defineProperty(boxed, 'valueOf', { value: valueOf });

		expect(canonicalize(boxed)).toBe(canonicalize(new String('ab')));
		expect(valueOf).not.toHaveBeenCalled();
	});

	it('keeps NaN apart from null, which JSON would not', () => {
		expect(canonicalize(NaN)).not.toBe(canonicalize(null));
	});

	it('survives circular values', () => {
		const value: Record<string, unknown> = { a: 1 };
		value.self = value;

		expect(canonicalize(value)).toBe('{"a":1,"self":circular}');
	});

	it('gives up on values that are too large to compare on the main thread', () => {
		expect(canonicalize(new Array(20_000).fill(1))).toBeUndefined();
		expect(canonicalize('x'.repeat(2_000_000))).toBeUndefined();
		expect(canonicalize({ a: 'x'.repeat(600_000), b: 'y'.repeat(600_000) })).toBeUndefined();
	});
});

describe('valueType', () => {
	it.each([
		[null, 'null'],
		[undefined, 'undefined'],
		['a', 'string'],
		[1, 'number'],
		[[1], 'array'],
		[{}, 'object'],
		[DateTime.now(), 'DateTime'],
		[new Date(), 'Date'],
		[() => {}, 'function'],
		[new String('a'), 'String'],
	])('names %s as %s', (value, expected) => {
		expect(valueType(value)).toBe(expected);
	});
});

describe('expressionSkeleton', () => {
	it.each([
		['{{ $json.customer.email }}', '{{ $json.<id>.<id> }}'],
		['Hello {{ $json.name.toUpperCase() }}!', '<text> {{ $json.<id>.toUpperCase() }} <text>'],
		['{{ $(\'Node A\').item.json["first name"] }}', '{{ $(<str>).item.json[<str>] }}'],
		['{{ $json.amount * 1.2 + 10 }}', '{{ $json.<id>*<num>+<num> }}'],
		['{{ "}}" + $json.a }}', '{{ <str>+$json.<id> }}'],
		['{{ `Hi ${$json.name}` }}', '{{ <str> }}'],
		['{{ { total: $json.total } }}', '{{ {<id>:$json.<id>} }}'],
		['{{ $json.items?.length }}', '{{ $json.<id>?.length }}'],
	])('reduces %s to %s', (source, expected) => {
		expect(expressionSkeleton(source)).toBe(expected);
	});

	it('keeps known methods and masks methods the user wrote', () => {
		expect(expressionSkeleton('{{ $json.date.toDateTime().plus(1, "day").toISO() }}')).toBe(
			'{{ $json.<id>.toDateTime().plus(<num>,<str>).toISO() }}',
		);
		expect(expressionSkeleton("{{ $('Orders').first().json.total.toFixed(2) }}")).toBe(
			'{{ $(<str>).first().json.<id>.toFixed(<num>) }}',
		);
		expect(expressionSkeleton('{{ ({ customerSecret() {} }).customerSecret() }}')).not.toContain(
			'customerSecret',
		);
	});

	it('drops names that the user chose, such as arrow function parameters', () => {
		const skeleton = expressionSkeleton('{{ $json.orders.map(order => order.price) }}');

		expect(skeleton).not.toContain('order');
		expect(skeleton).not.toContain('price');
		expect(skeleton).toContain('.map(');
	});

	it('caps the length', () => {
		const skeleton = expressionSkeleton(`{{ ${'$json.a + '.repeat(200)}1 }}`);

		expect(skeleton.length).toBeLessThanOrEqual(301);
		expect(skeleton.endsWith('…')).toBe(true);
	});
});
