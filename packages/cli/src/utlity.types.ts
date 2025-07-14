/**
 * Display an intersection type without implementation details.
 * @doc https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-types
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };
