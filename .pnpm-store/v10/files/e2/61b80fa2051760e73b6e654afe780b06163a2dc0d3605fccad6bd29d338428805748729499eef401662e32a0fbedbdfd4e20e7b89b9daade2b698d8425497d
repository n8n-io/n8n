import { ObservableInputTuple, OperatorFunction, Cons } from '../types';
/**
 * Create an observable that combines the latest values from all passed observables and the source
 * into arrays and emits them.
 *
 * Returns an observable, that when subscribed to, will subscribe to the source observable and all
 * sources provided as arguments. Once all sources emit at least one value, all of the latest values
 * will be emitted as an array. After that, every time any source emits a value, all of the latest values
 * will be emitted as an array.
 *
 * This is a useful operator for eagerly calculating values based off of changed inputs.
 *
 * ## Example
 *
 * Simple concatenation of values from two inputs
 *
 * ```ts
 * import { fromEvent, combineLatestWith, map } from 'rxjs';
 *
 * // Setup: Add two inputs to the page
 * const input1 = document.createElement('input');
 * document.body.appendChild(input1);
 * const input2 = document.createElement('input');
 * document.body.appendChild(input2);
 *
 * // Get streams of changes
 * const input1Changes$ = fromEvent(input1, 'change');
 * const input2Changes$ = fromEvent(input2, 'change');
 *
 * // Combine the changes by adding them together
 * input1Changes$.pipe(
 *   combineLatestWith(input2Changes$),
 *   map(([e1, e2]) => (<HTMLInputElement>e1.target).value + ' - ' + (<HTMLInputElement>e2.target).value)
 * )
 * .subscribe(x => console.log(x));
 * ```
 *
 * @param otherSources the other sources to subscribe to.
 * @return A function that returns an Observable that emits the latest
 * emissions from both source and provided Observables.
 */
export declare function combineLatestWith<T, A extends readonly unknown[]>(...otherSources: [...ObservableInputTuple<A>]): OperatorFunction<T, Cons<T, A>>;
//# sourceMappingURL=combineLatestWith.d.ts.map