import type {IsNull} from './is-null';

/**
Returns a boolean for whether the given type is `unknown`.

@link https://github.com/dsherret/conditional-type-checks/pull/16

Useful in type utilities, such as when dealing with unknown data from API calls.

@example
```
import type {IsUnknown} from 'type-fest';

// https://github.com/pajecawav/tiny-global-store/blob/master/src/index.ts
type Action<TState, TPayload = void> =
	IsUnknown<TPayload> extends true
		? (state: TState) => TState,
		: (state: TState, payload: TPayload) => TState;

class Store<TState> {
	constructor(private state: TState) {}

	execute<TPayload = void>(action: Action<TState, TPayload>, payload?: TPayload): TState {
		this.state = action(this.state, payload);
		return this.state;
	}

	// ... other methods
}

const store = new Store({value: 1});
declare const someExternalData: unknown;

store.execute(state => ({value: state.value + 1}));
//=> `TPayload` is `void`

store.execute((state, payload) => ({value: state.value + payload}), 5);
//=> `TPayload` is `5`

store.execute((state, payload) => ({value: state.value + payload}), someExternalData);
//=> Errors: `action` is `(state: TState) => TState`
```

@category Utilities
*/
export type IsUnknown<T> = (
	unknown extends T // `T` can be `unknown` or `any`
		? IsNull<T> extends false // `any` can be `null`, but `unknown` can't be
			? true
			: false
		: false
);
