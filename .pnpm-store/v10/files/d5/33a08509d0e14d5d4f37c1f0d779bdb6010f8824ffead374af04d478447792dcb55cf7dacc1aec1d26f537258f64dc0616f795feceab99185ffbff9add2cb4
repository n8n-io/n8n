import type {IsEqual} from './is-equal';

/**
Returns a boolean for whether two given types are both true.

Use-case: Constructing complex conditional types where multiple conditions must be satisfied.

@example
```
import type {And} from 'type-fest';

And<true, true>;
//=> true

And<true, false>;
//=> false
```

@see {@link Or}
*/
export type And<A extends boolean, B extends boolean> = [A, B][number] extends true
	? true
	: true extends [IsEqual<A, false>, IsEqual<B, false>][number]
		? false
		: never;
