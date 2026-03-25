import type {NumberAbsolute, PositiveNumericStringGt} from './internal';
import type {IsEqual} from './is-equal';
import type {PositiveInfinity, NegativeInfinity, IsNegative} from './numeric';
import type {And} from './and';
import type {Or} from './or';

/**
Returns a boolean for whether a given number is greater than another number.

@example
```
import type {GreaterThan} from 'type-fest';

GreaterThan<1, -5>;
//=> true

GreaterThan<1, 1>;
//=> false

GreaterThan<1, 5>;
//=> false
```
*/
export type GreaterThan<A extends number, B extends number> = number extends A | B
	? never
	: [
		IsEqual<A, PositiveInfinity>, IsEqual<A, NegativeInfinity>,
		IsEqual<B, PositiveInfinity>, IsEqual<B, NegativeInfinity>,
	] extends infer R extends [boolean, boolean, boolean, boolean]
		? Or<
		And<IsEqual<R[0], true>, IsEqual<R[2], false>>,
		And<IsEqual<R[3], true>, IsEqual<R[1], false>>
		> extends true
			? true
			: Or<
			And<IsEqual<R[1], true>, IsEqual<R[3], false>>,
			And<IsEqual<R[2], true>, IsEqual<R[0], false>>
			> extends true
				? false
				: true extends R[number]
					? false
					: [IsNegative<A>, IsNegative<B>] extends infer R extends [boolean, boolean]
						? [true, false] extends R
							? false
							: [false, true] extends R
								? true
								: [false, false] extends R
									? PositiveNumericStringGt<`${A}`, `${B}`>
									: PositiveNumericStringGt<`${NumberAbsolute<B>}`, `${NumberAbsolute<A>}`>
						: never
		: never;
