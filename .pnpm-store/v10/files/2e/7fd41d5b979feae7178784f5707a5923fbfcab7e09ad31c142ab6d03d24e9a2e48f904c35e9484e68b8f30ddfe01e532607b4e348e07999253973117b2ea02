import type {Except} from './except';
import type {IfAny} from './if-any';
import type {IfNever} from './if-never';
import type {IfNotAnyOrNever} from './internal';

/**
Create a type that requires at least one of the given keys. The remaining keys are kept as is.

@example
```
import type {RequireAtLeastOne} from 'type-fest';

type Responder = {
	text?: () => string;
	json?: () => string;
	secure?: boolean;
};

const responder: RequireAtLeastOne<Responder, 'text' | 'json'> = {
	json: () => '{"message": "ok"}',
	secure: true
};
```

@category Object
*/
export type RequireAtLeastOne<
	ObjectType,
	KeysType extends keyof ObjectType = keyof ObjectType,
> =
	IfNotAnyOrNever<ObjectType,
	IfNever<KeysType,
	never,
	_RequireAtLeastOne<ObjectType, IfAny<KeysType, keyof ObjectType, KeysType>>
	>>;

type _RequireAtLeastOne<
	ObjectType,
	KeysType extends keyof ObjectType,
> = {
	// For each `Key` in `KeysType` make a mapped type:
	[Key in KeysType]-?: Required<Pick<ObjectType, Key>> & // 1. Make `Key`'s type required
	// 2. Make all other keys in `KeysType` optional
	Partial<Pick<ObjectType, Exclude<KeysType, Key>>>;
}[KeysType] &
// 3. Add the remaining keys not in `KeysType`
Except<ObjectType, KeysType>;
