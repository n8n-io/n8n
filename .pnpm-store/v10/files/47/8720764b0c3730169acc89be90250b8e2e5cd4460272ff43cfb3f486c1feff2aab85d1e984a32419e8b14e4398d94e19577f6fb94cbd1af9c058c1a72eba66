import type {WritableKeysOf} from './writable-keys-of';

/**
Extract all readonly keys from the given type.

This is useful when you want to create a new type that contains readonly keys only.

@example
```
import type {ReadonlyKeysOf} from 'type-fest';

interface User {
	name: string;
	surname: string;
	readonly id: number;
}

type UpdateResponse<Entity extends object> = Pick<Entity, ReadonlyKeysOf<Entity>>;

const update1: UpdateResponse<User> = {
    id: 123,
};
```

@category Utilities
*/
export type ReadonlyKeysOf<T> =
	T extends unknown // For distributing `T`
		? Exclude<keyof T, WritableKeysOf<T>>
		: never; // Should never happen
