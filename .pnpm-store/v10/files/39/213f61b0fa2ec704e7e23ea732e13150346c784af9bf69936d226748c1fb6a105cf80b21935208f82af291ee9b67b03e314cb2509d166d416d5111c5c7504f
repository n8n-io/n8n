import type {NumberAbsolute, BuildTuple, TupleMax, TupleMin} from './internal';
import type {IsEqual} from './is-equal';
import type {PositiveInfinity, NegativeInfinity, IsNegative} from './numeric';
import type {Subtract} from './subtract';
import type {And} from './and';
import type {Or} from './or';

/**
Returns the sum of two numbers.

Note:
- A or B can only support `-999` ~ `999`.
- A and B can only be small integers, less than 1000.
- If the result is negative, you can only get `number`.

@example
```
import type {Sum} from 'type-fest';

Sum<111, 222>;
//=> 333

Sum<-111, 222>;
//=> 111

Sum<111, -222>;
//=> number

Sum<PositiveInfinity, -9999>;
//=> PositiveInfinity

Sum<PositiveInfinity, NegativeInfinity>;
//=> number
```

@category Numeric
*/
// TODO: Support big integer and negative number.
export type Sum<A extends number, B extends number> = number extends A | B
	? number
	: [
		IsEqual<A, PositiveInfinity>, IsEqual<A, NegativeInfinity>,
		IsEqual<B, PositiveInfinity>, IsEqual<B, NegativeInfinity>,
	] extends infer R extends [boolean, boolean, boolean, boolean]
		? Or<
		And<IsEqual<R[0], true>, IsEqual<R[3], false>>,
		And<IsEqual<R[2], true>, IsEqual<R[1], false>>
		> extends true
			? PositiveInfinity
			: Or<
			And<IsEqual<R[1], true>, IsEqual<R[2], false>>,
			And<IsEqual<R[3], true>, IsEqual<R[0], false>>
			> extends true
				? NegativeInfinity
				: true extends R[number]
					? number
					: ([IsNegative<A>, IsNegative<B>] extends infer R
						? [false, false] extends R
							? [...BuildTuple<A>, ...BuildTuple<B>]['length']
							: [true, true] extends R
								? number
								: TupleMax<[NumberAbsolute<A>, NumberAbsolute<B>]> extends infer Max_
									? TupleMin<[NumberAbsolute<A>, NumberAbsolute<B>]> extends infer Min_ extends number
										? Max_ extends A | B
											? Subtract<Max_, Min_>
											: number
										: never
									: never
						: never) & number
		: never;
