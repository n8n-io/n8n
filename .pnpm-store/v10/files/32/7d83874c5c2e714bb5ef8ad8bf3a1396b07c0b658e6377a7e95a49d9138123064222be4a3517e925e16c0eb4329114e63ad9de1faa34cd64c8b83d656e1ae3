// The builtin `join` method supports all these natively in the same way that typescript handles them so we can safely accept all of them.
type JoinableItem = string | number | bigint | boolean | undefined | null;

// `null` and `undefined` are treated uniquely in the built-in join method, in a way that differs from the default `toString` that would result in the type `${undefined}`. That's why we need to handle it specifically with this helper.
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#description
type NullishCoalesce<
	Value extends JoinableItem,
	Fallback extends string,
> = Value extends undefined | null ? NonNullable<Value> | Fallback : Value;

/**
Join an array of strings and/or numbers using the given string as a delimiter.

Use-case: Defining key paths in a nested object. For example, for dot-notation fields in MongoDB queries.

@example
```
import type {Join} from 'type-fest';

// Mixed (strings & numbers) items; result is: 'foo.0.baz'
const path: Join<['foo', 0, 'baz'], '.'> = ['foo', 0, 'baz'].join('.');

// Only string items; result is: 'foo.bar.baz'
const path: Join<['foo', 'bar', 'baz'], '.'> = ['foo', 'bar', 'baz'].join('.');

// Only number items; result is: '1.2.3'
const path: Join<[1, 2, 3], '.'> = [1, 2, 3].join('.');

// Only bigint items; result is '1.2.3'
const path: Join<[1n, 2n, 3n], '.'> = [1n, 2n, 3n].join('.');

// Only boolean items; result is: 'true.false.true'
const path: Join<[true, false, true], '.'> = [true, false, true].join('.');

// Contains nullish items; result is: 'foo..baz..xyz'
const path: Join<['foo', undefined, 'baz', null, 'xyz'], '.'> = ['foo', undefined, 'baz', null, 'xyz'].join('.');

// Partial tuple shapes (rest param last); result is: `prefix.${string}`
const path: Join<['prefix', ...string[]], '.'> = ['prefix'].join('.');

// Partial tuple shapes (rest param first); result is: `${string}.suffix`
const path: Join<[...string[], 'suffix'], '.'> = ['suffix'].join('.');

// Tuples items with nullish unions; result is '.' | 'hello.' | '.world' | 'hello.world'
const path: Join<['hello' | undefined, 'world' | null], '.'> = ['hello', 'world'].join('.');
```

@category Array
@category Template literal
*/
export type Join<
	Items extends readonly JoinableItem[],
	Delimiter extends string,
> = Items extends readonly []
	? ''
	: Items extends readonly [JoinableItem?]
		? `${NullishCoalesce<Items[0], ''>}`
		: Items extends readonly [
			infer First extends JoinableItem,
			...infer Tail extends readonly JoinableItem[],
		]
			? `${NullishCoalesce<First, ''>}${Delimiter}${Join<Tail, Delimiter>}`
			: Items extends readonly [
				...infer Head extends readonly JoinableItem[],
				infer Last extends JoinableItem,
			]
				? `${Join<Head, Delimiter>}${Delimiter}${NullishCoalesce<Last, ''>}`
				: string;
