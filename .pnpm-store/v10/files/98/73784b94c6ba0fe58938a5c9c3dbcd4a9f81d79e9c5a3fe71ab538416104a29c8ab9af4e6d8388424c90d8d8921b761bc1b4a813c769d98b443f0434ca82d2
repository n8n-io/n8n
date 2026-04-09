/**
Create a deep version of another object type where property values are recursively replaced into a given value type.

Use-cases:
- Form validation: Define how each field should be validated.
- Form settings: Define configuration for input fields.
- Parsing: Define types that specify special behavior for specific fields.

@example
```
import type {Schema} from 'type-fest';

interface User {
	id: string;
	name: {
		firstname: string;
		lastname: string;
	};
	created: Date;
	active: boolean;
	passwordHash: string;
	attributes: ['Foo', 'Bar']
}

type UserMask = Schema<User, 'mask' | 'hide' | 'show'>;

const userMaskSettings: UserMask = {
	id: 'show',
	name: {
		firstname: 'show',
		lastname: 'mask',
	},
	created: 'show',
	active: 'show',
	passwordHash: 'hide',
	attributes: ['mask', 'show']
}
```

@category Object
*/
export type Schema<ObjectType, ValueType, Options extends SchemaOptions = {}> = ObjectType extends string
	? ValueType
	: ObjectType extends Map<unknown, unknown>
		? ValueType
		: ObjectType extends Set<unknown>
			? ValueType
			: ObjectType extends ReadonlyMap<unknown, unknown>
				? ValueType
				: ObjectType extends ReadonlySet<unknown>
					? ValueType
					: ObjectType extends Array<infer U>
						? Options['recurseIntoArrays'] extends false | undefined
							? ValueType
							: Array<Schema<U, ValueType>>
						: ObjectType extends (...arguments_: unknown[]) => unknown
							? ValueType
							: ObjectType extends Date
								? ValueType
								: ObjectType extends Function
									? ValueType
									: ObjectType extends RegExp
										? ValueType
										: ObjectType extends object
											? SchemaObject<ObjectType, ValueType, Options>
											: ValueType;

/**
Same as `Schema`, but accepts only `object`s as inputs. Internal helper for `Schema`.
*/
type SchemaObject<
	ObjectType extends object,
	K,
	Options extends SchemaOptions,
> = {
	[KeyType in keyof ObjectType]: ObjectType[KeyType] extends
	| readonly unknown[]
	| unknown[]
		? Options['recurseIntoArrays'] extends false | undefined
			? K
			: Schema<ObjectType[KeyType], K, Options>
		: Schema<ObjectType[KeyType], K, Options> | K;
};

/**
@see Schema
*/
export type SchemaOptions = {
	/**
	By default, this affects elements in array and tuple types. You can change this by passing `{recurseIntoArrays: false}` as the third type argument:
	- If `recurseIntoArrays` is set to `true` (default), array elements will be recursively processed as well.
	- If `recurseIntoArrays` is set to `false`, arrays will not be recursively processed, and the entire array will be replaced with the given value type.

	@example
	```
	type UserMask = Schema<User, 'mask' | 'hide' | 'show', {recurseIntoArrays: false}>;

	const userMaskSettings: UserMask = {
		id: 'show',
		name: {
			firstname: 'show',
			lastname: 'mask',
		},
		created: 'show',
		active: 'show',
		passwordHash: 'hide',
		attributes: 'hide'
	}
	```

	@default true
	*/
	readonly recurseIntoArrays?: boolean | undefined;
};
