import type {IntRange} from './int-range';
import type {Sum} from './sum';

/**
Generate a union of numbers.

The numbers are created from the given `Start` (inclusive) parameter to the given `End` (inclusive) parameter.

You skip over numbers using the `Step` parameter (defaults to `1`). For example, `IntClosedRange<0, 10, 2>` will create a union of `0 | 2 | 4 | 6 | 8 | 10`.

Note: `Start` or `End` must be non-negative and smaller than `999`.

Use-cases:
1. This can be used to define a set of valid input/output values. for example:
	```
	type Age = IntClosedRange<0, 120>; //=> 0 | 1 | 2 | ... | 119 | 120
	type FontSize = IntClosedRange<10, 20>; //=> 10 | 11 | ... | 19 | 20
	type EvenNumber = IntClosedRange<0, 10, 2>; //=> 0 | 2 | 4 | 6 | 8 | 10
	```
2. This can be used to define random numbers in a range. For example, `type RandomNumber = IntClosedRange<0, 100>;`

@example
```
import type {IntClosedRange} from 'type-fest';

// Create union type `0 | 1 | ... | 9`
type ZeroToNine = IntClosedRange<0, 9>;

// Create union type `100 | 200 | 300 | ... | 900`
type Hundreds = IntClosedRange<100, 900, 100>;
```

@see IntRange
*/
export type IntClosedRange<Start extends number, End extends number, Skip extends number = 1> = IntRange<Start, Sum<End, 1>, Skip>;
