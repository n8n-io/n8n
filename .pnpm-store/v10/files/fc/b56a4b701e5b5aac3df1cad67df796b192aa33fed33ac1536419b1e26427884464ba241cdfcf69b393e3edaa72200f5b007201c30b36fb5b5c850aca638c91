import type {GreaterThan} from '../greater-than';
import type {LessThan} from '../less-than';
import type {NegativeInfinity, PositiveInfinity} from '../numeric';
import type {UnknownArray} from '../unknown-array';

/**
Infer the length of the given tuple `<T>`.

Returns `never` if the given type is an non-fixed-length array like `Array<string>`.

@example
```
type Tuple = TupleLength<[string, number, boolean]>;
//=> 3

type Array = TupleLength<string[]>;
//=> never

// Supports union types.
type Union = TupleLength<[] | [1, 2, 3] | Array<number>>;
//=> 1 | 3
```
*/
export type TupleLength<T extends UnknownArray> =
	// `extends unknown` is used to convert `T` (if `T` is a union type) to
	// a [distributive conditionaltype](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types))
	T extends unknown
		? number extends T['length']
			? never // Return never if the given type is an non-flexed-length array like `Array<string>`
			: T['length']
		: never; // Should never happen

/**
Create a tuple type of the given length `<L>` and fill it with the given type `<Fill>`.

If `<Fill>` is not provided, it will default to `unknown`.

@link https://itnext.io/implementing-arithmetic-within-typescripts-type-system-a1ef140a6f6f
*/
export type BuildTuple<L extends number, Fill = unknown, T extends readonly unknown[] = []> = T['length'] extends L
	? T
	: BuildTuple<L, Fill, [...T, Fill]>;

/**
Returns the maximum value from a tuple of integers.

Note:
- Float numbers are not supported.

@example
```
ArrayMax<[1, 2, 5, 3]>;
//=> 5

ArrayMax<[1, 2, 5, 3, 99, -1]>;
//=> 99
```
*/
export type TupleMax<A extends number[], Result extends number = NegativeInfinity> = number extends A[number]
	? never :
	A extends [infer F extends number, ...infer R extends number[]]
		? GreaterThan<F, Result> extends true
			? TupleMax<R, F>
			: TupleMax<R, Result>
		: Result;

/**
Returns the minimum value from a tuple of integers.

Note:
- Float numbers are not supported.

@example
```
ArrayMin<[1, 2, 5, 3]>;
//=> 1

ArrayMin<[1, 2, 5, 3, -5]>;
//=> -5
```
*/
export type TupleMin<A extends number[], Result extends number = PositiveInfinity> = number extends A[number]
	? never
	: A extends [infer F extends number, ...infer R extends number[]]
		? LessThan<F, Result> extends true
			? TupleMin<R, F>
			: TupleMin<R, Result>
		: Result;
