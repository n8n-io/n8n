import { parseExpressionChain, diagnosePath, closestKey, buildExpression } from './expressionXRay';

describe('parseExpressionChain', () => {
	it('parses a simple $json chain', () => {
		expect(parseExpressionChain('{{ $json.user.email }}')).toEqual({
			base: '$json',
			parts: ['user', 'email'],
		});
	});

	it('parses bracket and index access', () => {
		expect(parseExpressionChain("{{ $json['user name'].items[0].id }}")).toEqual({
			base: '$json',
			parts: ['user name', 'items', 0, 'id'],
		});
	});

	it('parses optional chaining', () => {
		expect(parseExpressionChain('{{ $json.user?.email }}')).toEqual({
			base: '$json',
			parts: ['user', 'email'],
		});
	});

	it('parses node reference bases', () => {
		expect(parseExpressionChain("{{ $('Webhook').item.json.body.name }}")).toEqual({
			base: "$('Webhook').item.json",
			parts: ['body', 'name'],
		});
		expect(parseExpressionChain('{{ $input.first().json.a }}')).toEqual({
			base: '$input.first().json',
			parts: ['a'],
		});
		expect(parseExpressionChain('{{ $input.all()[2].json.a }}')).toEqual({
			base: '$input.all()[2].json',
			parts: ['a'],
		});
	});

	it('rejects non-chain expressions', () => {
		expect(parseExpressionChain('{{ $json }}')).toBeNull(); // no path to diagnose
		expect(parseExpressionChain('{{ $json.email.toUpperCase() }}')).toBeNull();
		expect(parseExpressionChain('{{ $json.a ? 1 : 2 }}')).toBeNull();
		expect(parseExpressionChain('{{ $now.minus(1) }}')).toBeNull();
		expect(parseExpressionChain('{{ 1 + 1 }}')).toBeNull();
	});
});

describe('diagnosePath', () => {
	const chain = (expr: string) => {
		const parsed = parseExpressionChain(expr);
		if (!parsed) throw new Error(`unparseable test expression: ${expr}`);
		return parsed;
	};

	it('suggests the closest field for a typo', () => {
		const diagnosis = diagnosePath(chain('{{ $json.user.email }}'), { user_email: 'a@b.c' });
		expect(diagnosis).toEqual({
			kind: 'unknownField',
			key: 'user',
			path: '$json',
			candidates: ['user_email'],
			suggestedExpression: '{{ $json.user_email }}',
			suggestionLabel: 'user_email',
		});
	});

	it('matches across casing and snake/camel', () => {
		const diagnosis = diagnosePath(chain('{{ $json.userEmail }}'), { user_email: 'x' });
		expect(diagnosis).toMatchObject({ suggestedExpression: '{{ $json.user_email }}' });
	});

	it('keeps the rest of the path in the suggestion', () => {
		const diagnosis = diagnosePath(chain('{{ $json.usr.email }}'), {
			user: { email: 'x' },
		});
		expect(diagnosis).toMatchObject({ suggestedExpression: '{{ $json.user.email }}' });
	});

	it('keeps trailing segments when the typed key contains the real field', () => {
		const diagnosis = diagnosePath(chain('{{ $json.profile.user_email.primary }}'), {
			profile: { email: { primary: 'a@b.c' } },
		});
		expect(diagnosis).toMatchObject({
			kind: 'unknownField',
			key: 'user_email',
			path: '$json.profile',
			suggestedExpression: '{{ $json.profile.email.primary }}',
		});
	});

	it('rejects a name-similar field that cannot hold the rest of the path', () => {
		// 'name' is edit-distance 2 from 'home', but it's a string — only
		// 'address' can resolve '.street'
		const diagnosis = diagnosePath(chain('{{ $json.home.street }}'), {
			name: 'Leanne Graham',
			address: { street: 'Kulas Light' },
		});
		expect(diagnosis).toMatchObject({
			kind: 'unknownField',
			key: 'home',
			suggestedExpression: '{{ $json.address.street }}',
		});
	});

	it('stays silent when several fields could hold the rest of the path', () => {
		const diagnosis = diagnosePath(chain('{{ $json.home.street }}'), {
			address: { street: 'a' },
			office: { street: 'b' },
		});
		expect(diagnosis).toMatchObject({ kind: 'unknownField', suggestedExpression: undefined });
	});

	it('prefers a name-based match that also fits the path shape', () => {
		const diagnosis = diagnosePath(chain('{{ $json.adress.street }}'), {
			address: { street: 'a' },
			office: { street: 'b' },
		});
		expect(diagnosis).toMatchObject({ suggestedExpression: '{{ $json.address.street }}' });
	});

	it('suggests [0] when a key is accessed on an array', () => {
		const diagnosis = diagnosePath(chain('{{ $json.items.name }}'), {
			items: [{ name: 'x' }],
		});
		expect(diagnosis).toEqual({
			kind: 'arrayNotObject',
			key: 'name',
			path: '$json.items',
			suggestedExpression: '{{ $json.items[0].name }}',
			suggestionLabel: 'items[0]',
		});
	});

	it('reports an array without suggestion when element 0 lacks the key', () => {
		const diagnosis = diagnosePath(chain('{{ $json.items.name }}'), { items: [1, 2] });
		expect(diagnosis).toEqual({
			kind: 'arrayNotObject',
			key: 'name',
			path: '$json.items',
			suggestedExpression: undefined,
		});
	});

	it('explains reading a field from a primitive', () => {
		const diagnosis = diagnosePath(chain('{{ $json.user.email }}'), { user: 'alice' });
		expect(diagnosis).toEqual({
			kind: 'notAnObject',
			key: 'email',
			path: '$json.user',
			valueType: 'string',
		});
	});

	it('reports an out-of-range index as an unknown field', () => {
		const diagnosis = diagnosePath(chain('{{ $json.items[5].name }}'), { items: ['a', 'b'] });
		expect(diagnosis).toMatchObject({ kind: 'unknownField', key: '5', path: '$json.items' });
	});

	it('reports the failure point of a deep path', () => {
		const diagnosis = diagnosePath(chain('{{ $json.a.b.c.d }}'), { a: { b: { x: 1 } } });
		expect(diagnosis).toMatchObject({ kind: 'unknownField', key: 'c', path: '$json.a.b' });
	});

	it('returns null when the field exists with an undefined value', () => {
		expect(diagnosePath(chain('{{ $json.a }}'), { a: undefined })).toBeNull();
	});

	it('returns null when the path resolves', () => {
		expect(diagnosePath(chain('{{ $json.a.b }}'), { a: { b: 1 } })).toBeNull();
	});

	it('lists candidates when nothing is close enough', () => {
		const diagnosis = diagnosePath(chain('{{ $json.zzz }}'), { alpha: 1, beta: 2 });
		expect(diagnosis).toMatchObject({
			kind: 'unknownField',
			candidates: ['alpha', 'beta'],
			suggestedExpression: undefined,
		});
	});
});

describe('closestKey', () => {
	it('prefers normalized matches over edit distance', () => {
		expect(closestKey('user-email', ['userEmail', 'user_mail'])).toBe('userEmail');
	});

	it('returns undefined when everything is too far', () => {
		expect(closestKey('id', ['completely', 'different'])).toBeUndefined();
	});

	it('suggests a unique containment match', () => {
		expect(closestKey('user', ['foo', 'user_account'])).toBe('user_account');
		expect(closestKey('user_account_id', ['foo', 'user_account'])).toBe('user_account');
		// typed key carries an extra token: user_email vs a plain email field
		expect(closestKey('user_email', ['foo', 'email'])).toBe('email');
	});

	it('stays silent on ambiguous containment matches', () => {
		expect(closestKey('user', ['user_account', 'user_email'])).toBeUndefined();
	});

	it('ignores containment for very short keys or candidates', () => {
		expect(closestKey('us', ['user_account', 'foo'])).toBeUndefined();
		expect(closestKey('identifier', ['id', 'foo'])).toBeUndefined();
	});
});

describe('buildExpression', () => {
	it('quotes non-identifier keys and renders indices', () => {
		expect(buildExpression('$json', ['a b', 0, 'c'])).toBe("{{ $json['a b'][0].c }}");
	});
});
