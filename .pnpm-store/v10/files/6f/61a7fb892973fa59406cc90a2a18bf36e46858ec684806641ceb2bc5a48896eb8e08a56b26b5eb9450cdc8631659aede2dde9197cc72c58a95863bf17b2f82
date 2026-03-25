import { OperatorFunction, ObservableNotification, ValueFromNotification } from '../types';
/**
 * Converts an Observable of {@link ObservableNotification} objects into the emissions
 * that they represent.
 *
 * <span class="informal">Unwraps {@link ObservableNotification} objects as actual `next`,
 * `error` and `complete` emissions. The opposite of {@link materialize}.</span>
 *
 * ![](dematerialize.png)
 *
 * `dematerialize` is assumed to operate an Observable that only emits
 * {@link ObservableNotification} objects as `next` emissions, and does not emit any
 * `error`. Such Observable is the output of a `materialize` operation. Those
 * notifications are then unwrapped using the metadata they contain, and emitted
 * as `next`, `error`, and `complete` on the output Observable.
 *
 * Use this operator in conjunction with {@link materialize}.
 *
 * ## Example
 *
 * Convert an Observable of Notifications to an actual Observable
 *
 * ```ts
 * import { NextNotification, ErrorNotification, of, dematerialize } from 'rxjs';
 *
 * const notifA: NextNotification<string> = { kind: 'N', value: 'A' };
 * const notifB: NextNotification<string> = { kind: 'N', value: 'B' };
 * const notifE: ErrorNotification = { kind: 'E', error: new TypeError('x.toUpperCase is not a function') };
 *
 * const materialized = of(notifA, notifB, notifE);
 *
 * const upperCase = materialized.pipe(dematerialize());
 * upperCase.subscribe({
 *   next: x => console.log(x),
 *   error: e => console.error(e)
 * });
 *
 * // Results in:
 * // A
 * // B
 * // TypeError: x.toUpperCase is not a function
 * ```
 *
 * @see {@link materialize}
 *
 * @return A function that returns an Observable that emits items and
 * notifications embedded in Notification objects emitted by the source
 * Observable.
 */
export declare function dematerialize<N extends ObservableNotification<any>>(): OperatorFunction<N, ValueFromNotification<N>>;
//# sourceMappingURL=dematerialize.d.ts.map