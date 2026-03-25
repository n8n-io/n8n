import type {IsEqual} from './is-equal';

/**
Returns a boolean for whether either of two given types are true.

Use-case: Constructing complex conditional types where multiple conditions must be satisfied.

@example
```
import type {Or} from 'type-fest';

Or<true, false>;
//=> true

Or<false, false>;
//=> false
```

@see {@link And}
*/
export type Or<A extends boolean, B extends boolean> = [A, B][number] extends false
	? false
	: true extends [IsEqual<A, true>, IsEqual<B, true>][number]
		? true
		: never;
