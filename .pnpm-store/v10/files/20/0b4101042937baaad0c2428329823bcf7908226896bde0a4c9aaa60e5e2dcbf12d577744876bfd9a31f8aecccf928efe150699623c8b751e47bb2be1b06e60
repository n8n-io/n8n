import { ObservableInputTuple, OperatorFunction } from '../types';
/**
 * Emits all of the values from the source observable, then, once it completes, subscribes
 * to each observable source provided, one at a time, emitting all of their values, and not subscribing
 * to the next one until it completes.
 *
 * `concat(a$, b$, c$)` is the same as `a$.pipe(concatWith(b$, c$))`.
 *
 * ## Example
 *
 * Listen for one mouse click, then listen for all mouse moves.
 *
 * ```ts
 * import { fromEvent, map, take, concatWith } from 'rxjs';
 *
 * const clicks$ = fromEvent(document, 'click');
 * const moves$ = fromEvent(document, 'mousemove');
 *
 * clicks$.pipe(
 *   map(() => 'click'),
 *   take(1),
 *   concatWith(
 *     moves$.pipe(
 *       map(() => 'move')
 *     )
 *   )
 * )
 * .subscribe(x => console.log(x));
 *
 * // 'click'
 * // 'move'
 * // 'move'
 * // 'move'
 * // ...
 * ```
 *
 * @param otherSources Other observable sources to subscribe to, in sequence, after the original source is complete.
 * @return A function that returns an Observable that concatenates
 * subscriptions to the source and provided Observables subscribing to the next
 * only once the current subscription completes.
 */
export declare function concatWith<T, A extends readonly unknown[]>(...otherSources: [...ObservableInputTuple<A>]): OperatorFunction<T, T | A[number]>;
//# sourceMappingURL=concatWith.d.ts.map