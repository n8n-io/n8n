import type {IsNegative} from './numeric';
import type {Subtract} from './subtract';

/**
Returns a new string which contains the specified number of copies of a given string, just like `String#repeat()`.

@example
```
import {StringRepeat} from 'type-fest';

declare function stringRepeat<
	Input extends string,
	Count extends number
>(input: Input, count: Count): StringRepeat<Input, Count>;

// The return type is the exact string literal, not just `string`.

stringRepeat('foo', 2);
//=> 'foofoo'

stringRepeat('=', 3);
//=> '==='
```

@category String
@category Template literal
*/
export type StringRepeat<
	Input extends string,
	Count extends number,
> = number extends Count
	? Input extends ''
		? ''
		: string
	: IsNegative<Count> extends true
		? never
		: Count extends 0
			? ''
			: string extends Input
				? string
				: StringRepeat<Input, Subtract<Count, 1>> extends infer R extends string
					? `${Input}${R}`
					: never;
