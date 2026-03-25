import type {Zero} from './numeric';

/**
Returns a boolean for whether the given number is a float, like `1.5` or `-1.5`.

It returns `false` for `Infinity`.

Use-case:
- If you want to make a conditional branch based on the result of whether a number is a float or not.

@example
```
type Float = IsFloat<1.5>;
//=> true

type IntegerWithDecimal = IsInteger<1.0>;
//=> false

type NegativeFloat = IsInteger<-1.5>;
//=> true

type Infinity_ = IsInteger<Infinity>;
//=> false
```
*/
export type IsFloat<T> =
T extends number
	? `${T}` extends `${infer _Sign extends '' | '-'}${number}.${infer Decimal extends number}`
		? Decimal extends Zero
			? false
			: true
		: false
	: false;
