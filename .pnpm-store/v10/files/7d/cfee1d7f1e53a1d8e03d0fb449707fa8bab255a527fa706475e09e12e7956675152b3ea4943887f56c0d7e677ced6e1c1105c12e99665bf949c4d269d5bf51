import { not } from '../util/not';
import { filter } from './filter';
import { Observable } from '../Observable';
import { UnaryFunction } from '../types';

/**
 * Splits the source Observable into two, one with values that satisfy a
 * predicate, and another with values that don't satisfy the predicate.
 *
 * <span class="informal">It's like {@link filter}, but returns two Observables:
 * one like the output of {@link filter}, and the other with values that did not
 * pass the condition.</span>
 *
 * ![](partition.png)
 *
 * `partition` outputs an array with two Observables that partition the values
 * from the source Observable through the given `predicate` function. The first
 * Observable in that array emits source values for which the predicate argument
 * returns true. The second Observable emits source values for which the
 * predicate returns false. The first behaves like {@link filter} and the second
 * behaves like {@link filter} with the predicate negated.
 *
 * ## Example
 *
 * Partition click events into those on DIV elements and those elsewhere
 *
 * ```ts
 * import { fromEvent } from 'rxjs';
 * import { partition } from 'rxjs/operators';
 *
 * const div = document.createElement('div');
 * div.style.cssText = 'width: 200px; height: 200px; background: #09c;';
 * document.body.appendChild(div);
 *
 * const clicks = fromEvent(document, 'click');
 * const [clicksOnDivs, clicksElsewhere] = clicks.pipe(partition(ev => (<HTMLElement>ev.target).tagName === 'DIV'));
 *
 * clicksOnDivs.subscribe(x => console.log('DIV clicked: ', x));
 * clicksElsewhere.subscribe(x => console.log('Other clicked: ', x));
 * ```
 *
 * @see {@link filter}
 *
 * @param predicate A function that evaluates each value emitted by the source
 * Observable. If it returns `true`, the value is emitted on the first Observable
 * in the returned array, if `false` the value is emitted on the second Observable
 * in the array. The `index` parameter is the number `i` for the i-th source
 * emission that has happened since the subscription, starting from the number `0`.
 * @param thisArg An optional argument to determine the value of `this` in the
 * `predicate` function.
 * @return A function that returns an array with two Observables: one with
 * values that passed the predicate, and another with values that did not pass
 * the predicate.
 * @deprecated Replaced with the {@link partition} static creation function. Will be removed in v8.
 */
export function partition<T>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): UnaryFunction<Observable<T>, [Observable<T>, Observable<T>]> {
  return (source: Observable<T>) =>
    [filter(predicate, thisArg)(source), filter(not(predicate, thisArg))(source)] as [Observable<T>, Observable<T>];
}
