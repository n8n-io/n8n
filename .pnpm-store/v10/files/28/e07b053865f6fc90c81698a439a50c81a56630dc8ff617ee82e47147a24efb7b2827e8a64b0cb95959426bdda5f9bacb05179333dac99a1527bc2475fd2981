import type {Not} from './internal';
import type {IsFloat} from './is-float';
import type {PositiveInfinity, NegativeInfinity} from './numeric';

/**
Returns a boolean for whether the given number is a integer, like `-5`, `1.0` or `100`.

Like [`Number#IsInteger()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/IsInteger) but for types.

Use-case:
- If you want to make a conditional branch based on the result of whether a number is a intrger or not.

@example
```
type Integer = IsInteger<1>;
//=> true

type IntegerWithDecimal = IsInteger<1.0>;
//=> true

type NegativeInteger = IsInteger<-1>;
//=> true

type Float = IsInteger<1.5>;
//=> false

// Supports non-decimal numbers

type OctalInteger: IsInteger<0o10>;
//=> true

type BinaryInteger: IsInteger<0b10>;
//=> true

type HexadecimalInteger: IsInteger<0x10>;
//=> true
```
*/
export type IsInteger<T> =
T extends bigint
	? true
	: T extends number
		? number extends T
			? false
			: T extends PositiveInfinity | NegativeInfinity
				? false
				: Not<IsFloat<T>>
		: false;
