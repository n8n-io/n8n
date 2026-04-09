/**
Extract all optional keys from the given type.

This is useful when you want to create a new type that contains different type values for the optional keys only.

@example
```
import type {OptionalKeysOf, Except} from 'type-fest';

interface User {
	name: string;
	surname: string;

	luckyNumber?: number;
}

const REMOVE_FIELD = Symbol('remove field symbol');
type UpdateOperation<Entity extends object> = Except<Partial<Entity>, OptionalKeysOf<Entity>> & {
	[Key in OptionalKeysOf<Entity>]?: Entity[Key] | typeof REMOVE_FIELD;
};

const update1: UpdateOperation<User> = {
	name: 'Alice'
};

const update2: UpdateOperation<User> = {
	name: 'Bob',
	luckyNumber: REMOVE_FIELD
};
```

@category Utilities
*/
export type OptionalKeysOf<BaseType extends object> =
	BaseType extends unknown // For distributing `BaseType`
		? (keyof {
			[Key in keyof BaseType as BaseType extends Record<Key, BaseType[Key]> ? never : Key]: never
		}) & (keyof BaseType) // Intersect with `keyof BaseType` to ensure result of `OptionalKeysOf<BaseType>` is always assignable to `keyof BaseType`
		: never; // Should never happen
