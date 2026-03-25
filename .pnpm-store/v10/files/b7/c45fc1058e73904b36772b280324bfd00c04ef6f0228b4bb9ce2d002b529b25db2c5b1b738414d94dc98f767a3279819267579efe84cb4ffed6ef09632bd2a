import { OperatorFunction, ObservableInput } from '../types';
/**
 * Compares all values of two observables in sequence using an optional comparator function
 * and returns an observable of a single boolean value representing whether or not the two sequences
 * are equal.
 *
 * <span class="informal">Checks to see of all values emitted by both observables are equal, in order.</span>
 *
 * ![](sequenceEqual.png)
 *
 * `sequenceEqual` subscribes to source observable and `compareTo` `ObservableInput` (that internally
 * gets converted to an observable) and buffers incoming values from each observable. Whenever either
 * observable emits a value, the value is buffered and the buffers are shifted and compared from the bottom
 * up; If any value pair doesn't match, the returned observable will emit `false` and complete. If one of the
 * observables completes, the operator will wait for the other observable to complete; If the other
 * observable emits before completing, the returned observable will emit `false` and complete. If one observable never
 * completes or emits after the other completes, the returned observable will never complete.
 *
 * ## Example
 *
 * Figure out if the Konami code matches
 *
 * ```ts
 * import { from, fromEvent, map, bufferCount, mergeMap, sequenceEqual } from 'rxjs';
 *
 * const codes = from([
 *   'ArrowUp',
 *   'ArrowUp',
 *   'ArrowDown',
 *   'ArrowDown',
 *   'ArrowLeft',
 *   'ArrowRight',
 *   'ArrowLeft',
 *   'ArrowRight',
 *   'KeyB',
 *   'KeyA',
 *   'Enter', // no start key, clearly.
 * ]);
 *
 * const keys = fromEvent<KeyboardEvent>(document, 'keyup').pipe(map(e => e.code));
 * const matches = keys.pipe(
 *   bufferCount(11, 1),
 *   mergeMap(last11 => from(last11).pipe(sequenceEqual(codes)))
 * );
 * matches.subscribe(matched => console.log('Successful cheat at Contra? ', matched));
 * ```
 *
 * @see {@link combineLatest}
 * @see {@link zip}
 * @see {@link withLatestFrom}
 *
 * @param compareTo The `ObservableInput` sequence to compare the source sequence to.
 * @param comparator An optional function to compare each value pair.
 *
 * @return A function that returns an Observable that emits a single boolean
 * value representing whether or not the values emitted by the source
 * Observable and provided `ObservableInput` were equal in sequence.
 */
export declare function sequenceEqual<T>(compareTo: ObservableInput<T>, comparator?: (a: T, b: T) => boolean): OperatorFunction<T, boolean>;
//# sourceMappingURL=sequenceEqual.d.ts.map