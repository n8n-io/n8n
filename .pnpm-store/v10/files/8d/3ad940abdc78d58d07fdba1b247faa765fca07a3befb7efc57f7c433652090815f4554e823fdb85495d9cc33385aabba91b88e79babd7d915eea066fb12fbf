import { MonoTypeOperatorFunction, Observer } from '../types';
/**
 * An extension to the {@link Observer} interface used only by the {@link tap} operator.
 *
 * It provides a useful set of callbacks a user can register to do side-effects in
 * cases other than what the usual {@link Observer} callbacks are
 * ({@link guide/glossary-and-semantics#next next},
 * {@link guide/glossary-and-semantics#error error} and/or
 * {@link guide/glossary-and-semantics#complete complete}).
 *
 * ## Example
 *
 * ```ts
 * import { fromEvent, switchMap, tap, interval, take } from 'rxjs';
 *
 * const source$ = fromEvent(document, 'click');
 * const result$ = source$.pipe(
 *   switchMap((_, i) => i % 2 === 0
 *     ? fromEvent(document, 'mousemove').pipe(
 *         tap({
 *           subscribe: () => console.log('Subscribed to the mouse move events after click #' + i),
 *           unsubscribe: () => console.log('Mouse move events #' + i + ' unsubscribed'),
 *           finalize: () => console.log('Mouse move events #' + i + ' finalized')
 *         })
 *       )
 *     : interval(1_000).pipe(
 *         take(5),
 *         tap({
 *           subscribe: () => console.log('Subscribed to the 1-second interval events after click #' + i),
 *           unsubscribe: () => console.log('1-second interval events #' + i + ' unsubscribed'),
 *           finalize: () => console.log('1-second interval events #' + i + ' finalized')
 *         })
 *       )
 *   )
 * );
 *
 * const subscription = result$.subscribe({
 *   next: console.log
 * });
 *
 * setTimeout(() => {
 *   console.log('Unsubscribe after 60 seconds');
 *   subscription.unsubscribe();
 * }, 60_000);
 * ```
 */
export interface TapObserver<T> extends Observer<T> {
    /**
     * The callback that `tap` operator invokes at the moment when the source Observable
     * gets subscribed to.
     */
    subscribe: () => void;
    /**
     * The callback that `tap` operator invokes when an explicit
     * {@link guide/glossary-and-semantics#unsubscription unsubscribe} happens. It won't get invoked on
     * `error` or `complete` events.
     */
    unsubscribe: () => void;
    /**
     * The callback that `tap` operator invokes when any kind of
     * {@link guide/glossary-and-semantics#finalization finalization} happens - either when
     * the source Observable `error`s or `complete`s or when it gets explicitly unsubscribed
     * by the user. There is no difference in using this callback or the {@link finalize}
     * operator, but if you're already using `tap` operator, you can use this callback
     * instead. You'd get the same result in either case.
     */
    finalize: () => void;
}
export declare function tap<T>(observerOrNext?: Partial<TapObserver<T>> | ((value: T) => void)): MonoTypeOperatorFunction<T>;
/** @deprecated Instead of passing separate callback arguments, use an observer argument. Signatures taking separate callback arguments will be removed in v8. Details: https://rxjs.dev/deprecations/subscribe-arguments */
export declare function tap<T>(next?: ((value: T) => void) | null, error?: ((error: any) => void) | null, complete?: (() => void) | null): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=tap.d.ts.map