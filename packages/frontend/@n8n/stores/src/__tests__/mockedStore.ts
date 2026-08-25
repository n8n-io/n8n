import type { Store, StoreDefinition } from 'pinia';
import type { Mock } from 'vitest';
import type { ComputedRef } from 'vue';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Typescript helper for mocking pinia store actions return value
 *
 * @see https://pinia.vuejs.org/cookbook/testing.html#Mocking-the-returned-value-of-an-action
 *
 * Lives here rather than in the shell so a module package's own suite can mock a
 * store without importing from editor-ui.
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
	return useStore(...args) as any;
};

export type MockedStore<T extends (...args: never[]) => unknown> = ReturnType<
	typeof mockedStore<T>
>;
