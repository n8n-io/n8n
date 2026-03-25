import { Observable } from '../Observable';
import { MonoTypeOperatorFunction, ObservableInput } from '../types';
/**
 * Returns an Observable that mirrors the source Observable with the exception of a `complete`. If the source
 * Observable calls `complete`, this method will emit to the Observable returned from `notifier`. If that Observable
 * calls `complete` or `error`, then this method will call `complete` or `error` on the child subscription. Otherwise
 * this method will resubscribe to the source Observable.
 *
 * ![](repeatWhen.png)
 *
 * ## Example
 *
 * Repeat a message stream on click
 *
 * ```ts
 * import { of, fromEvent, repeatWhen } from 'rxjs';
 *
 * const source = of('Repeat message');
 * const documentClick$ = fromEvent(document, 'click');
 *
 * const result = source.pipe(repeatWhen(() => documentClick$));
 *
 * result.subscribe(data => console.log(data))
 * ```
 *
 * @see {@link repeat}
 * @see {@link retry}
 * @see {@link retryWhen}
 *
 * @param notifier Function that receives an Observable of notifications with
 * which a user can `complete` or `error`, aborting the repetition.
 * @return A function that returns an `ObservableInput` that mirrors the source
 * Observable with the exception of a `complete`.
 * @deprecated Will be removed in v9 or v10. Use {@link repeat}'s {@link RepeatConfig#delay delay} option instead.
 * Instead of `repeatWhen(() => notify$)`, use: `repeat({ delay: () => notify$ })`.
 */
export declare function repeatWhen<T>(notifier: (notifications: Observable<void>) => ObservableInput<any>): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=repeatWhen.d.ts.map