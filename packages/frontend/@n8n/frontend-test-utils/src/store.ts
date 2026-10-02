import type { Store, StoreDefinition } from 'pinia';
import type { Mock } from 'vitest';
import type { ComputedRef } from 'vue';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Typescript helper for mocking pinia store actions return value
 *
 * This helper is generic over `StoreDefinition` and never names a concrete store, which is what
 * keeps it at L1: a module package can use it without this package reaching up to `@n8n/stores`.
 *
 * @see https://pinia.vuejs.org/cookbook/testing.html#Mocking-the-returned-value-of-an-action
 */
export const mockedStore = <TStoreDef extends (...args: never[]) => unknown>(
	useStore: TStoreDef,
	...args: Parameters<TStoreDef>
): TStoreDef extends StoreDefinition<infer Id, infer State, infer Getters, infer Actions>
	? Mutable<
			Store<
				Id,
				State,
				Record<string, never>,
				{
					[K in keyof Actions]: Actions[K] extends (...args: infer Args) => infer ReturnT
						? Mock<(...args: Args) => ReturnT>
						: Actions[K];
				}
			> & {
				[K in keyof Getters]: Getters[K] extends ComputedRef<infer T> ? T : never;
			}
		>
	: ReturnType<TStoreDef> => {
	// The cast is the whole point: the return type above describes what `createTestingPinia`
	// produces at runtime, and no signature of `useStore` can express it.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
	return useStore(...args) as any;
};

export type MockedStore<T extends (...args: never[]) => unknown> = ReturnType<
	typeof mockedStore<T>
>;
