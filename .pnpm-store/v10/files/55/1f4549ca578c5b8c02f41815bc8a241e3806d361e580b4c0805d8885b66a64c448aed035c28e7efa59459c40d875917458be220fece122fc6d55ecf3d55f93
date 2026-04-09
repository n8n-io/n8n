import type {Sum} from './sum';
import type {LessThanOrEqual} from './less-than-or-equal';
import type {GreaterThanOrEqual} from './greater-than-or-equal';
import type {GreaterThan} from './greater-than';
import type {IsNegative} from './numeric';
import type {Not, TupleMin} from './internal';
import type {IsEqual} from './is-equal';
import type {And} from './and';
import type {ArraySplice} from './array-splice';

/**
Returns an array slice of a given range, just like `Array#slice()`.

@example
```
import type {ArraySlice} from 'type-fest';

type T0 = ArraySlice<[0, 1, 2, 3, 4]>;
//=> [0, 1, 2, 3, 4]

type T1 = ArraySlice<[0, 1, 2, 3, 4], 0, -1>;
//=> [0, 1, 2, 3]

type T2 = ArraySlice<[0, 1, 2, 3, 4], 1, -2>;
//=> [1, 2]

type T3 = ArraySlice<[0, 1, 2, 3, 4], -2, 4>;
//=> [3]

type T4 = ArraySlice<[0, 1, 2, 3, 4], -2, -1>;
//=> [3]

type T5 = ArraySlice<[0, 1, 2, 3, 4], 0, -999>;
//=> []

function arraySlice<
	const Array_ extends readonly unknown[],
	Start extends number = 0,
	End extends number = Array_['length'],
>(array: Array_, start?: Start, end?: End) {
	return array.slice(start, end) as ArraySlice<Array_, Start, End>;
}

const slice = arraySlice([1, '2', {a: 3}, [4, 5]], 0, -1);

typeof slice;
//=> [1, '2', { readonly a: 3; }]

slice[2].a;
//=> 3

// @ts-expect-error -- TS2493: Tuple type '[1, "2", {readonly a: 3}]' of length '3' has no element at index '3'.
slice[3];
```

@category Array
*/
export type ArraySlice<
	Array_ extends readonly unknown[],
	Start extends number = never,
	End extends number = never,
> = Array_ extends unknown // To distributive type
	? And<IsEqual<Start, never>, IsEqual<End, never>> extends true
		? Array_
		: number extends Array_['length']
			? VariableLengthArraySliceHelper<Array_, Start, End>
			: ArraySliceHelper<Array_, IsEqual<Start, never> extends true ? 0 : Start, IsEqual<End, never> extends true ? Array_['length'] : End>
	: never; // Never happens

type VariableLengthArraySliceHelper<
	Array_ extends readonly unknown[],
	Start extends number,
	End extends number,
> = And<Not<IsNegative<Start>>, IsEqual<End, never>> extends true
	? ArraySplice<Array_, 0, Start>
	: And<
	And<Not<IsNegative<Start>>, Not<IsNegative<End>>>,
	IsEqual<GreaterThan<End, Start>, true>
	> extends true
		? ArraySliceByPositiveIndex<Array_, Start, End>
		: [];

type ArraySliceHelper<
	Array_ extends readonly unknown[],
	Start extends number = 0,
	End extends number = Array_['length'],
	TraversedElement extends Array<Array_[number]> = [],
	Result extends Array<Array_[number]> = [],
	ArrayLength extends number = Array_['length'],
	PositiveS extends number = IsNegative<Start> extends true
		? Sum<ArrayLength, Start> extends infer AddResult extends number
			? number extends AddResult // (ArrayLength + Start) < 0
				? 0
				: GreaterThan<AddResult, 0> extends true ? AddResult : 0
			: never
		: Start,
	PositiveE extends number = IsNegative<End> extends true ? Sum<ArrayLength, End> : End,
> = true extends [IsNegative<PositiveS>, LessThanOrEqual<PositiveE, PositiveS>, GreaterThanOrEqual<PositiveS, ArrayLength>][number]
	? []
	: ArraySliceByPositiveIndex<Array_, TupleMin<[PositiveS, ArrayLength]>, TupleMin<[PositiveE, ArrayLength]>>;

type ArraySliceByPositiveIndex<
	Array_ extends readonly unknown[],
	Start extends number,
	End extends number,
	Result extends Array<Array_[number]> = [],
> = Start extends End
	? Result
	: ArraySliceByPositiveIndex<Array_, Sum<Start, 1>, End, [...Result, Array_[Start]]>;
