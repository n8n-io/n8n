import type {IsNever} from '../is-never';
import type {UnknownArray} from '../unknown-array';
import type {StringToNumber} from './string';

/**
Returns the absolute value of a given value.

@example
```
NumberAbsolute<-1>;
//=> 1

NumberAbsolute<1>;
//=> 1

NumberAbsolute<NegativeInfinity>
//=> PositiveInfinity
```
*/
export type NumberAbsolute<N extends number> = `${N}` extends `-${infer StringPositiveN}` ? StringToNumber<StringPositiveN> : N;

/**
Check whether the given type is a number or a number string.

Supports floating-point as a string.

@example
```
type A = IsNumberLike<'1'>;
//=> true

type B = IsNumberLike<'-1.1'>;
//=> true

type C = IsNumberLike<1>;
//=> true

type D = IsNumberLike<'a'>;
//=> false
*/
export type IsNumberLike<N> =
	N extends number ? true
		:	N extends `${number}`
			? true
			: N extends `${number}.${number}`
				? true
				: false;

/**
Returns the minimum number in the given union of numbers.

Note: Just supports numbers from 0 to 999.

@example
```
type A = UnionMin<3 | 1 | 2>;
//=> 1
```
*/
export type UnionMin<N extends number> = InternalUnionMin<N>;

/**
The actual implementation of `UnionMin`. It's private because it has some arguments that don't need to be exposed.
*/
type InternalUnionMin<N extends number, T extends UnknownArray = []> =
	T['length'] extends N
		? T['length']
		: InternalUnionMin<N, [...T, unknown]>;

/**
Returns the maximum number in the given union of numbers.

Note: Just supports numbers from 0 to 999.

@example
```
type A = UnionMax<1 | 3 | 2>;
//=> 3
```
*/
export type UnionMax<N extends number> = InternalUnionMax<N>;

/**
The actual implementation of `UnionMax`. It's private because it has some arguments that don't need to be exposed.
*/
type InternalUnionMax<N extends number, T extends UnknownArray = []> =
	IsNever<N> extends true
		? T['length']
		:	T['length'] extends N
			? InternalUnionMax<Exclude<N, T['length']>, T>
			: InternalUnionMax<N, [...T, unknown]>;
