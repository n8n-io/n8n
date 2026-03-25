import type {GreaterThan} from './greater-than';

/**
 Returns a boolean for whether a given number is less than or equal to another number.

@example
```
import type {LessThanOrEqual} from 'type-fest';

LessThanOrEqual<1, -5>;
//=> false

LessThanOrEqual<1, 1>;
//=> true

LessThanOrEqual<1, 5>;
//=> true
```
*/
export type LessThanOrEqual<A extends number, B extends number> = number extends A | B
	? never
	: GreaterThan<A, B> extends true ? false : true;
