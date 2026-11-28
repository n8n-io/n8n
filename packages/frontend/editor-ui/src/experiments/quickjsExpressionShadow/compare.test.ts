import { DateTime } from 'luxon';

import { expressionSkeleton, isNonDeterministic, valueType } from './compare';

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

	it('keeps the n8n `$` roots and masks other names that start with `$`', () => {
		expect(
			expressionSkeleton(
				'{{ $json.orders.map($order => $order.total + $vars.fee + $privateLabel) }}',
			),
		).toBe('{{ $json.<id>.map(<id>=> <id>.<id>+$vars.<id>+<id>) }}');
		expect(expressionSkeleton("{{ $if($input.first().json.ok, $('A').item.json.x, 0) }}")).toBe(
			'{{ $if($input.first().json.<id>,$(<str>).item.json.<id>,<num>) }}',
		);
	});

	it('masks names in any script, and characters that are not punctuation', () => {
		expect(expressionSkeleton('{{ $json.名前 }}')).toBe('{{ $json.<id> }}');
		expect(expressionSkeleton('{{ $json.präfix_kunde.größe() }}')).toBe('{{ $json.<id>.<fn>() }}');
		expect(expressionSkeleton('{{ $json.a ≠ 1 }}')).toBe('{{ $json.<id>?<num> }}');
	});

	it('caps the length', () => {
		const skeleton = expressionSkeleton(`{{ ${'$json.a + '.repeat(200)}1 }}`);

		expect(skeleton.length).toBeLessThanOrEqual(301);
		expect(skeleton.endsWith('…')).toBe(true);
	});
});
