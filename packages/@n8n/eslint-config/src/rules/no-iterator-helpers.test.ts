import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoIteratorHelpersRule } from './no-iterator-helpers.js';

const ruleTester = new RuleTester();

const error = (producer: string, helper: string) => ({
	messageId: 'noIteratorHelpers' as const,
	data: { producer, helper },
});

const iteratorOnlyError = (producer: string, helper: string, replacement: string) => ({
	messageId: 'noIteratorOnlyHelper' as const,
	data: { producer, helper, replacement },
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
			name: 'optional chaining on the helper is safe to fix',
			code: 'const a = map.entries()?.map((x) => x);',
			output: 'const a = [...map.entries()]?.map((x) => x);',
			errors: [error('entries', 'map')],
		},
		{
			name: 'reduce keeps its accumulator parameter',
			code: 'const a = map.entries().reduce((acc, x) => acc + x, 0);',
			output: 'const a = [...map.entries()].reduce((acc, x) => acc + x, 0);',
			errors: [error('entries', 'reduce')],
		},
		// `Array.prototype` has no counterpart, so a spread alone still throws. Report only.
		{
			name: 'take has no array counterpart',
			code: 'const a = map.keys().take(2);',
			output: null,
			errors: [iteratorOnlyError('keys', 'take', '.slice(0, n)')],
		},
		{
			name: 'drop has no array counterpart',
			code: 'const a = map.keys().drop(2);',
			output: null,
			errors: [iteratorOnlyError('keys', 'drop', '.slice(n)')],
		},
		{
			name: 'toArray has no array counterpart',
			code: 'const a = map.keys().toArray();',
			output: null,
			errors: [iteratorOnlyError('keys', 'toArray', 'the spread itself')],
		},
		// An optional producer short-circuits to undefined, but `[...undefined]` throws.
		{
			name: 'optional producer receiver is reported without a fix',
			code: 'const a = map?.entries().map((x) => x);',
			output: null,
			errors: [error('entries', 'map')],
		},
		{
			name: 'optional producer call is reported without a fix',
			code: 'const a = map.entries?.().map((x) => x);',
			output: null,
			errors: [error('entries', 'map')],
		},
		{
			name: 'deep optional link in the receiver is reported without a fix',
			code: 'const a = store?.state.map.entries().map((x) => x);',
			output: null,
			errors: [error('entries', 'map')],
		},
		// `Array.prototype` passes the array as an extra argument, so a callback that
		// declares it would start receiving a value where it got undefined.
		{
			name: 'callback reading the third argument is reported without a fix',
			code: 'const a = map.entries().map((x, i, all) => all.length + i);',
			output: null,
			errors: [error('entries', 'map')],
		},
		{
			name: 'reduce callback reading the fourth argument is reported without a fix',
			code: 'const a = map.entries().reduce((acc, x, i, all) => acc + all.length, 0);',
			output: null,
			errors: [error('entries', 'reduce')],
		},
		{
			name: 'rest-parameter callback is reported without a fix',
			code: 'const a = map.entries().map((...args) => args);',
			output: null,
			errors: [error('entries', 'map')],
		},
		{
			name: 'function-expression callback reading the third argument is reported without a fix',
			code: 'const a = map.entries().map(function (x, i, all) { return all.length; });',
			output: null,
			errors: [error('entries', 'map')],
		},
	],
});
