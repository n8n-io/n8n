/**
Create a type that makes the given keys non-nullable, where the remaining keys are kept as is.

If no keys are given, all keys will be made non-nullable.

Use-case: You want to define a single model where the only thing that changes is whether or not some or all of the keys are non-nullable.

@example
```
import type {SetNonNullable} from 'type-fest';

type Foo = {
	a: number | null;
	b: string | undefined;
	c?: boolean | null;
}

type SomeNonNullable = SetNonNullable<Foo, 'b' | 'c'>;
// type SomeNonNullable = {
// 	a: number | null;
// 	b: string; // Can no longer be undefined.
// 	c?: boolean; // Can no longer be null, but is still optional.
// }

type AllNonNullable = SetNonNullable<Foo>;
// type AllNonNullable = {
// 	a: number; // Can no longer be null.
// 	b: string; // Can no longer be undefined.
// 	c?: boolean; // Can no longer be null, but is still optional.
// }
```

@category Object
*/
export type SetNonNullable<BaseType, Keys extends keyof BaseType = keyof BaseType> = {
	[Key in keyof BaseType]: Key extends Keys
		? NonNullable<BaseType[Key]>
		: BaseType[Key];
};
