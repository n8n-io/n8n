import type {IsNull} from './is-null';

/**
An if-else-like type that resolves depending on whether the given type is `null`.

@see {@link IsNull}

@example
```
import type {IfNull} from 'type-fest';

type ShouldBeTrue = IfNull<null>;
//=> true

type ShouldBeBar = IfNull<'not null', 'foo', 'bar'>;
//=> 'bar'
```

@category Type Guard
@category Utilities
*/
export type IfNull<T, TypeIfNull = true, TypeIfNotNull = false> = (
	IsNull<T> extends true ? TypeIfNull : TypeIfNotNull
);
