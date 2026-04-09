import { Observable } from '../Observable';
import { ObservedValueOf, ObservableInput } from '../types';
/**
 * Creates an Observable that, on subscribe, calls an Observable factory to
 * make an Observable for each new Observer.
 *
 * <span class="informal">Creates the Observable lazily, that is, only when it
 * is subscribed.
 * </span>
 *
 * ![](defer.png)
 *
 * `defer` allows you to create an Observable only when the Observer
 * subscribes. It waits until an Observer subscribes to it, calls the given
 * factory function to get an Observable -- where a factory function typically
 * generates a new Observable -- and subscribes the Observer to this Observable.
 * In case the factory function returns a falsy value, then EMPTY is used as
 * Observable instead. Last but not least, an exception during the factory
 * function call is transferred to the Observer by calling `error`.
 *
 * ## Example
 *
 * Subscribe to either an Observable of clicks or an Observable of interval, at random
 *
 * ```ts
 * import { defer, fromEvent, interval } from 'rxjs';
 *
 * const clicksOrInterval = defer(() => {
 *   return Math.random() > 0.5
 *     ? fromEvent(document, 'click')
 *     : interval(1000);
 * });
 * clicksOrInterval.subscribe(x => console.log(x));
 *
 * // Results in the following behavior:
 * // If the result of Math.random() is greater than 0.5 it will listen
 * // for clicks anywhere on the "document"; when document is clicked it
 * // will log a MouseEvent object to the console. If the result is less
 * // than 0.5 it will emit ascending numbers, one every second(1000ms).
 * ```
 *
 * @see {@link Observable}
 *
 * @param observableFactory The Observable factory function to invoke for each
 * Observer that subscribes to the output Observable. May also return any
 * `ObservableInput`, which will be converted on the fly to an Observable.
 * @return An Observable whose Observers' subscriptions trigger an invocation of the
 * given Observable factory function.
 */
export declare function defer<R extends ObservableInput<any>>(observableFactory: () => R): Observable<ObservedValueOf<R>>;
//# sourceMappingURL=defer.d.ts.map