/**
 * This function takes one parameter and just returns it. Simply put,
 * this is like `<T>(x: T): T => x`.
 *
 * ## Examples
 *
 * This is useful in some cases when using things like `mergeMap`
 *
 * ```ts
 * import { interval, take, map, range, mergeMap, identity } from 'rxjs';
 *
 * const source$ = interval(1000).pipe(take(5));
 *
 * const result$ = source$.pipe(
 *   map(i => range(i)),
 *   mergeMap(identity) // same as mergeMap(x => x)
 * );
 *
 * result$.subscribe({
 *   next: console.log
 * });
 * ```
 *
 * Or when you want to selectively apply an operator
 *
 * ```ts
 * import { interval, take, identity } from 'rxjs';
 *
 * const shouldLimit = () => Math.random() < 0.5;
 *
 * const source$ = interval(1000);
 *
 * const result$ = source$.pipe(shouldLimit() ? take(5) : identity);
 *
 * result$.subscribe({
 *   next: console.log
 * });
 * ```
 *
 * @param x Any value that is returned by this function
 * @returns The value passed as the first parameter to this function
 */
export declare function identity<T>(x: T): T;
//# sourceMappingURL=identity.d.ts.map