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
		// An array method on an array-valued property, not on an iterator call.
		{ code: 'const a = thing.values.map((v) => v);' },
		// Array methods that are not iterator helpers stay out of scope.
		{ code: 'const a = map.entries().next();' },
		{ code: 'const a = map.keys().toString();' },
		// A producer name that is not an iterator producer.
		{ code: 'const a = thing.items().map((v) => v);' },
	],
	invalid: [
		{
			name: 'entries().map',
			code: 'const a = map.entries().map((x) => x);',
			output: 'const a = [...map.entries()].map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'keys().map',
			code: "const a = map.keys().map((k) => ({ name: k, type: 'any' }));",
			output: "const a = [...map.keys()].map((k) => ({ name: k, type: 'any' }));",
			errors: [error('keys', 'map')],
		},
		{
			name: 'values().filter',
			code: 'const a = set.values().filter(Boolean);',
			output: 'const a = [...set.values()].filter(Boolean);',
			errors: [error('values', 'filter')],
		},
		{
			name: 'inside a spread element',
			code: 'const a = [...map.entries().map((x) => x)];',
			output: 'const a = [...[...map.entries()].map((x) => x)];',
			errors: [error('entries', 'map')],
		},
		{
			name: 'chained producer receiver',
			code: 'const a = store.state.map.entries().flatMap((x) => x);',
			output: 'const a = [...store.state.map.entries()].flatMap((x) => x);',
			errors: [error('entries', 'flatMap')],
		},
		{
			name: 'producer receiver is itself a call',
			code: 'const a = getMap().values().some(Boolean);',
			output: 'const a = [...getMap().values()].some(Boolean);',
			errors: [error('values', 'some')],
		},
		{
			name: 'optional chaining on the helper',
			code: 'const a = map.entries()?.map((x) => x);',
			output: 'const a = [...map.entries()]?.map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'toArray',
			code: 'const a = map.keys().toArray();',
			output: 'const a = [...map.keys()].toArray();',
			errors: [error('keys', 'toArray')],
		},
	],
});
