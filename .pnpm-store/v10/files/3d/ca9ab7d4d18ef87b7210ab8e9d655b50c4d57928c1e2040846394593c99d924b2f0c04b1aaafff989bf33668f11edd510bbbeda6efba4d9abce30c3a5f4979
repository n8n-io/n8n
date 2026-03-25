import type {IsUnknown} from './is-unknown';

/**
An if-else-like type that resolves depending on whether the given type is `unknown`.

@see {@link IsUnknown}

@example
```
import type {IfUnknown} from 'type-fest';

type ShouldBeTrue = IfUnknown<unknown>;
//=> true

type ShouldBeBar = IfUnknown<'not unknown', 'foo', 'bar'>;
//=> 'bar'
```

@category Type Guard
@category Utilities
*/
export type IfUnknown<T, TypeIfUnknown = true, TypeIfNotUnknown = false> = (
	IsUnknown<T> extends true ? TypeIfUnknown : TypeIfNotUnknown
);
