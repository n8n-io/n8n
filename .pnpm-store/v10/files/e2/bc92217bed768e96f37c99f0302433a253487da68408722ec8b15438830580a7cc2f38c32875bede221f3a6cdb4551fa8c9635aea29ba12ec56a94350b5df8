import type {RequireExactlyOne} from './require-exactly-one';
import type {RequireNone} from './internal';

/**
Create a type that requires exactly one of the given keys and disallows more, or none of the given keys. The remaining keys are kept as is.

@example
```
import type {RequireOneOrNone} from 'type-fest';

type Responder = RequireOneOrNone<{
	text: () => string;
	json: () => string;
	secure: boolean;
}, 'text' | 'json'>;

const responder1: Responder = {
	secure: true
};

const responder2: Responder = {
	text: () => '{"message": "hi"}',
	secure: true
};

const responder3: Responder = {
	json: () => '{"message": "ok"}',
	secure: true
};
```

@category Object
*/
export type RequireOneOrNone<ObjectType, KeysType extends keyof ObjectType = keyof ObjectType> = (
	| RequireExactlyOne<ObjectType, KeysType>
	| RequireNone<KeysType>
) & Omit<ObjectType, KeysType>; // Ignore unspecified keys.
