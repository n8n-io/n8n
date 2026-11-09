import { extractFieldReferences, findMissingFieldReferences } from './field-references';

const paths = (expression: string) =>
	extractFieldReferences(expression).map(({ source, path }) =>
		source.kind === 'node' ? `${source.nodeName}:${path.join('.')}` : path.join('.'),
	);

describe('extractFieldReferences', () => {
	it('reads dot, bracket and optional paths from $json', () => {
		expect(
			paths("={{ $json.user.email }} {{ $json['first name'] }} {{ $json.items[0]?.id }}"),
		).toEqual(['user.email', 'first name', 'items.0.id']);
	});

	it('drops a method call from the end of the path', () => {
		expect(paths('={{ $json.name.toUpperCase() }}')).toEqual(['name']);
		expect(paths('={{ $json.tags.map((tag) => tag.label) }}')).toEqual(['tags']);
	});

	it('reads $input and named node item accessors', () => {
		expect(
			paths(
				"={{ $input.item.json.a }} {{ $input.first().json.b }} {{ $('Fetch').item.json.c.d }} {{ $('Fetch').last().json.e }}",
			),
		).toEqual(['a', 'b', 'Fetch:c.d', 'Fetch:e']);
	});

	it('stops at a dynamic segment', () => {
		expect(paths('={{ $json.data[$json.key].value }}')).toEqual(['data', 'key']);
	});

	it('ignores text outside expression brackets and values that are not expressions', () => {
		expect(paths('=Write to $json.notAField: {{ $json.real }}')).toEqual(['real']);
		expect(paths('{{ $json.real }}')).toEqual([]);
	});

	it('skips code that does not parse and removes duplicates', () => {
		expect(paths('={{ $json.a }} {{ $json.a }} {{ if ( }}')).toEqual(['a']);
	});
});

describe('findMissingFieldReferences', () => {
	const run = (parameters: Record<string, unknown>, items: Array<Record<string, unknown>>) =>
		findMissingFieldReferences({
			nodes: [{ name: 'Send', parameters }],
			inputNodeOf: () => 'Fetch',
			itemsOf: (name) => (name === 'Fetch' ? items : undefined),
		});

	it('reports a field that no input item has, with the keys it does have', () => {
		const [finding] = run({ to: '={{ $json.user.mail }}' }, [{ user: { email: 'a@b.c' } }]);

		expect(finding).toMatchObject({
			nodeName: 'Send',
			parameterPath: 'to',
			sourceNodeName: 'Fetch',
			missingSegment: 'mail',
			resolvedPath: ['user'],
			availableKeys: ['email'],
		});
	});

	it('does not report a field that at least one item has', () => {
		expect(run({ to: '={{ $json.email }}' }, [{}, { email: 'a@b.c' }])).toEqual([]);
	});

	it('names the array whose entries have the field', () => {
		const [finding] = run({ id: '={{ $json.id }}' }, [{ results: [{ id: 1 }] }]);

		expect(finding?.arrayFieldsWithSegment).toEqual(['results']);
	});

	it('does not report a path through a primitive value', () => {
		expect(run({ n: '={{ $json.name.length }}' }, [{ name: 'x' }])).toEqual([]);
	});
});
