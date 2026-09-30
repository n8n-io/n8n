import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoIteratorHelpersRule } from './no-iterator-helpers.js';

const ruleTester = new RuleTester();

const error = (producer: string, helper: string) => ({
	messageId: 'noIteratorHelpers' as const,
	data: { producer, helper },
});

ruleTester.run('no-iterator-helpers', NoIteratorHelpersRule, {
	valid: [
		// Already spread into an array.
		{ code: 'const a = [...map.entries()].map((x) => x);' },
		{ code: 'const a = [...set.values()].filter(Boolean);' },
		{ code: 'const a = Array.from(map.keys()).map((k) => k);' },
		// Static receivers return arrays.
		{ code: 'const a = Object.entries(obj).map(([k]) => k);' },
		{ code: 'const a = Object.keys(obj).filter(Boolean);' },
		{ code: 'const a = Object.values(obj).forEach(fn);' },
		{ code: 'const a = Reflect.keys(obj).map((k) => k);' },
		// An array method on an array-valued property, not on an iterator call.
		{ code: 'const a = thing.values.map((v) => v);' },
		// Methods that are not iterator helpers stay out of scope.
		{ code: 'const a = map.entries().next();' },
		{ code: 'const a = map.keys().toString();' },
		// A producer name that is not an iterator producer.
		{ code: 'const a = thing.items().map((v) => v);' },
		// Computed access is not resolvable to a known helper.
		{ code: 'const a = map.entries()[helperName](fn);' },
	],
	invalid: [
		{
			name: 'entries().map',
			code: 'const a = map.entries().map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'keys().map',
			code: "const a = map.keys().map((k) => ({ name: k, type: 'any' }));",
			errors: [error('keys', 'map')],
		},
		{
			name: 'values().filter',
			code: 'const a = set.values().filter(Boolean);',
			errors: [error('values', 'filter')],
		},
		{
			name: 'inside a spread element',
			code: 'const a = [...map.entries().map((x) => x)];',
			errors: [error('entries', 'map')],
		},
		{
			name: 'chained producer receiver',
			code: 'const a = store.state.map.entries().flatMap((x) => x);',
			errors: [error('entries', 'flatMap')],
		},
		{
			name: 'producer receiver is itself a call',
			code: 'const a = getMap().values().some(Boolean);',
			errors: [error('values', 'some')],
		},
		{
			name: 'reduce',
			code: 'const a = map.entries().reduce((acc, x) => acc + x, 0);',
			errors: [error('entries', 'reduce')],
		},
		// No `Array.prototype` counterpart, so the rewrite is not a plain spread.
		{ name: 'take', code: 'const a = map.keys().take(2);', errors: [error('keys', 'take')] },
		{ name: 'drop', code: 'const a = map.keys().drop(2);', errors: [error('keys', 'drop')] },
		{
			name: 'toArray',
			code: 'const a = map.keys().toArray();',
			errors: [error('keys', 'toArray')],
		},
		// Optional links still report; a spread would change the short-circuit.
		{
			name: 'optional chaining on the helper',
			code: 'const a = map.entries()?.map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'optional producer receiver',
			code: 'const a = map?.entries().map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'optional producer call',
			code: 'const a = map.entries?.().map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'deep optional link in the receiver',
			code: 'const a = store?.state.map.entries().map((x) => x);',
			errors: [error('entries', 'map')],
		},
		// Callbacks that read the extra array argument still report.
		{
			name: 'callback reading the third argument',
			code: 'const a = map.entries().map((x, i, all) => all.length + i);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'rest-parameter callback',
			code: 'const a = map.entries().map((...args) => args);',
			errors: [error('entries', 'map')],
		},
	],
});
