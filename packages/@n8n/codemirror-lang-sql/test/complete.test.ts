import type { CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

import type { SQLConfig } from '../src/sql';
import { MySQL, PostgreSQL, schemaCompletionSource } from '../src/sql';

function get(doc: string, conf: SQLConfig & { explicit?: boolean } = {}) {
	const cur = doc.indexOf('|');
	const dialect = conf.dialect || PostgreSQL;
	doc = doc.slice(0, cur) + doc.slice(cur + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cur },
		extensions: [
			dialect,
			dialect.sqlLanguage.data.of({
				autocomplete: schemaCompletionSource(Object.assign({ dialect }, conf)),
			}),
		],
	});
	const result = state.languageDataAt<CompletionSource>('autocomplete', cur)[0](
		new CompletionContext(state, cur, !!conf.explicit),
	);
	return result as CompletionResult | null;
}

function str(result: CompletionResult | null) {
	return !result
		? ''
		: result.options
				.slice()
				.sort((a, b) => (b.boost || 0) - (a.boost || 0) || (a.label < b.label ? -1 : 1))
				.map((o) => o.label)
				.join(', ');
}

const schema1 = {
	users: ['name', 'id', 'address'],
	products: ['name', 'cost', 'description'],
};

const schema2 = {
	'public.users': ['email', 'id'],
	'other.users': ['name', 'id'],
};

describe('SQL completion', () => {
	it('completes table names', () => {
		expect(str(get('select u|', { schema: schema1 }))).toEqual('products, users');
	});

	it('completes quoted table names', () => {
		expect(str(get('select "u|', { schema: schema1 }))).toEqual('"products", "users"');
	});

	it('completes table names under schema', () => {
		expect(str(get('select public.u|', { schema: schema2 }))).toEqual('users');
	});

	it('completes quoted table names under schema', () => {
		expect(str(get('select public."u|', { schema: schema2 }))).toEqual('"users"');
	});

	it('completes quoted table names under quoted schema', () => {
		expect(str(get('select "public"."u|', { schema: schema2 }))).toEqual('"users"');
	});

	it('completes column names', () => {
		expect(str(get('select users.|', { schema: schema1 }))).toEqual('address, id, name');
	});

	it('completes quoted column names', () => {
		expect(str(get('select users."|', { schema: schema1 }))).toEqual('"address", "id", "name"');
	});

	it('completes column names in quoted tables', () => {
		expect(str(get('select "users".|', { schema: schema1 }))).toEqual('address, id, name');
	});

	it('completes column names in tables for a specific schema', () => {
		expect(str(get('select public.users.|', { schema: schema2 }))).toEqual('email, id');
		expect(str(get('select other.users.|', { schema: schema2 }))).toEqual('id, name');
	});

	it('completes quoted column names in tables for a specific schema', () => {
		expect(str(get('select public.users."|', { schema: schema2 }))).toEqual('"email", "id"');
		expect(str(get('select other.users."|', { schema: schema2 }))).toEqual('"id", "name"');
	});

	it('completes column names in quoted tables for a specific schema', () => {
		expect(str(get('select public."users".|', { schema: schema2 }))).toEqual('email, id');
		expect(str(get('select other."users".|', { schema: schema2 }))).toEqual('id, name');
	});

	it('completes column names in quoted tables for a specific quoted schema', () => {
		expect(str(get('select "public"."users".|', { schema: schema2 }))).toEqual('email, id');
		expect(str(get('select "other"."users".|', { schema: schema2 }))).toEqual('id, name');
	});

	it('completes quoted column names in quoted tables for a specific quoted schema', () => {
		expect(str(get('select "public"."users"."|', { schema: schema2 }))).toEqual('"email", "id"');
		expect(str(get('select "other"."users"."|', { schema: schema2 }))).toEqual('"id", "name"');
	});

	it('completes column names of aliased tables', () => {
		expect(str(get('select u.| from users u', { schema: schema1 }))).toEqual('address, id, name');
		expect(str(get('select u.| from users as u', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
		expect(
			str(get('select u.| from (SELECT * FROM something u) join users u', { schema: schema1 })),
		).toEqual('address, id, name');
		expect(str(get('select * from users u where u.|', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
		expect(str(get('select * from users as u where u.|', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
		expect(
			str(
				get('select * from (SELECT * FROM something u) join users u where u.|', {
					schema: schema1,
				}),
			),
		).toEqual('address, id, name');
	});

	it('completes column names of aliased quoted tables', () => {
		expect(str(get('select u.| from "users" u', { schema: schema1 }))).toEqual('address, id, name');
		expect(str(get('select u.| from "users" as u', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
		expect(str(get('select * from "users" u where u.|', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
		expect(str(get('select * from "users" as u where u.|', { schema: schema1 }))).toEqual(
			'address, id, name',
		);
	});

	it('completes column names of aliased tables for a specific schema', () => {
		expect(str(get('select u.| from public.users u', { schema: schema2 }))).toEqual('email, id');
	});

	it('completes column names in aliased quoted tables for a specific schema', () => {
		expect(str(get('select u.| from public."users" u', { schema: schema2 }))).toEqual('email, id');
	});

	it('completes column names in aliased quoted tables for a specific quoted schema', () => {
		expect(str(get('select u.| from "public"."users" u', { schema: schema2 }))).toEqual(
			'email, id',
		);
	});

	it('completes aliased table names', () => {
		expect(str(get('select a| from a.b as ab join auto au', { schema: schema2 }))).toEqual(
			'ab, au, other, public',
		);
	});

	it('includes closing quote in completion', () => {
		const r = get('select "u|"', { schema: schema1 });
		expect(r!.to).toEqual(10);
	});

	it('keeps extra table completion properties', () => {
		const r = get('select u|', {
			schema: { users: ['id'] },
			tables: [{ label: 'users', type: 'keyword' }],
		});
		expect(r!.options[0].type).toEqual('keyword');
	});

	it('keeps extra column completion properties', () => {
		const r = get('select users.|', { schema: { users: [{ label: 'id', type: 'keyword' }] } });
		expect(r!.options[0].type).toEqual('keyword');
	});

	it('supports a default table', () => {
		expect(str(get('select i|', { schema: schema1, defaultTable: 'users' }))).toEqual(
			'address, id, name, products, users',
		);
	});

	it('supports alternate quoting styles', () => {
		expect(str(get('select `u|', { dialect: MySQL, schema: schema1 }))).toEqual(
			'`products`, `users`',
		);
	});

	it("doesn't complete without identifier", () => {
		expect(str(get('select |', { schema: schema1 }))).toEqual('');
	});

	it('does complete explicitly without identifier', () => {
		expect(str(get('select |', { schema: schema1, explicit: true }))).toEqual('products, users');
	});
});
