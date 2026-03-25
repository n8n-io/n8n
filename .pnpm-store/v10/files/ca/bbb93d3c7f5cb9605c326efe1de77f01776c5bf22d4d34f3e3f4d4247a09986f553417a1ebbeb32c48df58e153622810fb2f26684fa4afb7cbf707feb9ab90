import type {IsEmptyObject} from './empty-object';

/**
An if-else-like type that resolves depending on whether the given type is `{}`.

@see {@link IsEmptyObject}

@example
```
import type {IfEmptyObject} from 'type-fest';

type ShouldBeTrue = IfEmptyObject<{}>;
//=> true

type ShouldBeBar = IfEmptyObject<{key: any}, 'foo', 'bar'>;
//=> 'bar'
```

@category Type Guard
@category Utilities
*/
export type IfEmptyObject<
	T,
	TypeIfEmptyObject = true,
	TypeIfNotEmptyObject = false,
> = IsEmptyObject<T> extends true ? TypeIfEmptyObject : TypeIfNotEmptyObject;
