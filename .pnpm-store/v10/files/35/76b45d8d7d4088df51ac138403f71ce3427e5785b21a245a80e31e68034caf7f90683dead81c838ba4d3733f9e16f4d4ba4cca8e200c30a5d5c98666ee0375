import type {Except} from './except';
import type {Simplify} from './simplify';

/**
Create a type that changes the type of the given keys.

Use-cases:
- Creating variations of a base model.
- Fixing incorrect external types.

@see `Merge` if you need to change multiple properties to different types.

@example
```
import type {SetFieldType} from 'type-fest';

type MyModel = {
	id: number;
	createdAt: Date;
	updatedAt: Date;
};

type MyModelApi = SetFieldType<MyModel, 'createdAt' | 'updatedAt', string>;
// {
// 	id: number;
// 	createdAt: string;
// 	updatedAt: string;
// }
```

@category Object
*/
export type SetFieldType<BaseType, Keys extends keyof BaseType, NewType> =
	Simplify<
	Except<BaseType, Keys> &
	Record<Keys, NewType>
	>;
