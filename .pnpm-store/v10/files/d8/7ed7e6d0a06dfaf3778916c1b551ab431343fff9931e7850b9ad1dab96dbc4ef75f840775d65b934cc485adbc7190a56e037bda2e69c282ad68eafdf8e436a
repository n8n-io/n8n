import type {GreaterThanOrEqual} from './greater-than-or-equal';

/**
Returns a boolean for whether a given number is less than another number.

@example
```
import type {LessThan} from 'type-fest';

LessThan<1, -5>;
//=> false

LessThan<1, 1>;
//=> false

LessThan<1, 5>;
//=> true
```
*/
export type LessThan<A extends number, B extends number> = number extends A | B
	? never
	: GreaterThanOrEqual<A, B> extends infer Result
		? Result extends true
			? false
			: true
		: never; // Should never happen
