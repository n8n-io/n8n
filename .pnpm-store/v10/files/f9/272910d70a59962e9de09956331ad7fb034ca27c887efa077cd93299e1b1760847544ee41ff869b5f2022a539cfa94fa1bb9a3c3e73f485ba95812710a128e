import type {IsEqual} from './is-equal';

/**
Extract all writable keys from the given type.

This is useful when you want to create a new type that contains writable keys only.

@example
```
import type {WritableKeysOf} from 'type-fest';

interface User {
	name: string;
	surname: string;
	readonly id: number;
}

type UpdateRequest<Entity extends object> = Pick<Entity, WritableKeysOf<Entity>>;

const update1: UpdateRequest<User> = {
	name: 'Alice',
	surname: 'Acme',
};
```

@category Utilities
*/
export type WritableKeysOf<T> = NonNullable<{
	[P in keyof T]: IsEqual<{[Q in P]: T[P]}, {readonly [Q in P]: T[P]}> extends false ? P : never
}[keyof T]>;
