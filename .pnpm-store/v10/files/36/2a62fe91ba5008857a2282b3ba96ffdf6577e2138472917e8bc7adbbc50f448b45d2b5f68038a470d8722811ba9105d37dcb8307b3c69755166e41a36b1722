import type {BuildTuple} from './internal';
import type {Subtract} from './subtract';

/**
Generate a union of numbers.

The numbers are created from the given `Start` (inclusive) parameter to the given `End` (exclusive) parameter.

You skip over numbers using the `Step` parameter (defaults to `1`). For example, `IntRange<0, 10, 2>` will create a union of `0 | 2 | 4 | 6 | 8`.

Note: `Start` or `End` must be non-negative and smaller than `1000`.

Use-cases:
1. This can be used to define a set of valid input/output values. for example:
	```
	type Age = IntRange<0, 120>;
	type FontSize = IntRange<10, 20>;
	type EvenNumber = IntRange<0, 11, 2>; //=> 0 | 2 | 4 | 6 | 8 | 10
	```
2. This can be used to define random numbers in a range. For example, `type RandomNumber = IntRange<0, 100>;`

@example
```
import type {IntRange} from 'type-fest';

// Create union type `0 | 1 | ... | 9`
type ZeroToNine = IntRange<0, 10>;

// Create union type `100 | 200 | 300 | ... | 900`
type Hundreds = IntRange<100, 901, 100>;
```

@see IntClosedRange
*/
export type IntRange<Start extends number, End extends number, Step extends number = 1> = PrivateIntRange<Start, End, Step>;

/**
The actual implementation of `IntRange`. It's private because it has some arguments that don't need to be exposed.
*/
type PrivateIntRange<
	Start extends number,
	End extends number,
	Step extends number,
	Gap extends number = Subtract<Step, 1>, // The gap between each number, gap = step - 1
	List extends unknown[] = BuildTuple<Start, never>, // The final `List` is `[...StartLengthTuple, ...[number, ...GapLengthTuple], ...[number, ...GapLengthTuple], ... ...]`, so can initialize the `List` with `[...StartLengthTuple]`
	EndLengthTuple extends unknown[] = BuildTuple<End>,
> = Gap extends 0 ?
	// Handle the case that without `Step`
	List['length'] extends End // The result of "List[length] === End"
		? Exclude<List[number], never> // All unused elements are `never`, so exclude them
		: PrivateIntRange<Start, End, Step, Gap, [...List, List['length'] ]>
	// Handle the case that with `Step`
	: List extends [...(infer U), ...EndLengthTuple] // The result of "List[length] >= End", because the `...BuildTuple<Gap, never>` maybe make `List` too long.
		? Exclude<List[number], never>
		: PrivateIntRange<Start, End, Step, Gap, [...List, List['length'], ...BuildTuple<Gap, never>]>;
