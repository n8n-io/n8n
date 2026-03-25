import type {KeysOfUnion} from './keys-of-union';

/**
Pick keys from a type, distributing the operation over a union.

TypeScript's `Pick` doesn't distribute over unions, leading to the erasure of unique properties from union members when picking keys. This creates a type that only retains properties common to all union members, making it impossible to access member-specific properties after the Pick. Essentially, using `Pick` on a union type merges the types into a less specific one, hindering type narrowing and property access based on discriminants. This type solves that.

Example:

```
type A = {
	discriminant: 'A';
	foo: {
		bar: string;
	};
};

type B = {
	discriminant: 'B';
	foo: {
		baz: string;
	};
};

type Union = A | B;

type PickedUnion = Pick<Union, 'discriminant' | 'foo'>;
//=> {discriminant: 'A' | 'B', foo: {bar: string} | {baz: string}}

const pickedUnion: PickedUnion = createPickedUnion();

if (pickedUnion.discriminant === 'A') {
	// We would like to narrow `pickedUnion`'s type
	// to `A` here, but we can't because `Pick`
	// doesn't distribute over unions.

	pickedUnion.foo.bar;
	//=> Error: Property 'bar' does not exist on type '{bar: string} | {baz: string}'.
}
```

@example
```
type A = {
	discriminant: 'A';
	foo: {
		bar: string;
	};
	extraneous: boolean;
};

type B = {
	discriminant: 'B';
	foo: {
		baz: string;
	};
	extraneous: boolean;
};

// Notice that `foo.bar` exists in `A` but not in `B`.

type Union = A | B;

type PickedUnion = DistributedPick<Union, 'discriminant' | 'foo'>;

const pickedUnion: PickedUnion = createPickedUnion();

if (pickedUnion.discriminant === 'A') {
	pickedUnion.foo.bar;
 	//=> OK

	pickedUnion.extraneous;
	//=> Error: Property `extraneous` does not exist on type `Pick<A, 'discriminant' | 'foo'>`.

	pickedUnion.foo.baz;
	//=> Error: `bar` is not a property of `{discriminant: 'A'; a: string}`.
}
```

@category Object
*/
export type DistributedPick<ObjectType, KeyType extends KeysOfUnion<ObjectType>> =
	ObjectType extends unknown
		? Pick<ObjectType, Extract<KeyType, keyof ObjectType>>
		: never;
