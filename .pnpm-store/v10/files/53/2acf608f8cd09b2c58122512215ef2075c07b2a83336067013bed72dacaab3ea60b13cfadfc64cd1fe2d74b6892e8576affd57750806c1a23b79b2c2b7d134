/*
 * Note that we cannot apply the `internal` tag here because the declaration
 * needs to survive the `stripInternal` option. Otherwise, `AnyCatcher` will
 * be `any` in the `.d.ts` files.
 */
declare const anyCatcherSymbol: unique symbol;

/**
 * This is just a type that we're using to identify `any` being passed to
 * function overloads. This is used because of situations like {@link forkJoin},
 * where it could return an `Observable<T[]>` or an `Observable<{ [key: K]: T }>`,
 * so `forkJoin(any)` would mean we need to return `Observable<unknown>`.
 */
export type AnyCatcher = typeof anyCatcherSymbol;
