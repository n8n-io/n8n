import { Observable } from '../Observable';
import { innerFrom } from './innerFrom';
import { Subscription } from '../Subscription';
import { ObservableInput, ObservableInputTuple } from '../types';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { createOperatorSubscriber } from '../operators/OperatorSubscriber';
import { Subscriber } from '../Subscriber';

export function race<T extends readonly unknown[]>(inputs: [...ObservableInputTuple<T>]): Observable<T[number]>;
export function race<T extends readonly unknown[]>(...inputs: [...ObservableInputTuple<T>]): Observable<T[number]>;

/**
 * Returns an observable that mirrors the first source observable to emit an item.
 *
 * ![](race.png)
 *
 * `race` returns an observable, that when subscribed to, subscribes to all source observables immediately.
 * As soon as one of the source observables emits a value, the result unsubscribes from the other sources.
 * The resulting observable will forward all notifications, including error and completion, from the "winning"
 * source observable.
 *
 * If one of the used source observable throws an errors before a first notification
 * the race operator will also throw an error, no matter if another source observable
 * could potentially win the race.
 *
 * `race` can be useful for selecting the response from the fastest network connection for
 * HTTP or WebSockets. `race` can also be useful for switching observable context based on user
 * input.
 *
 * ## Example
 *
 * Subscribes to the observable that was the first to start emitting.
 *
 * ```ts
 * import { interval, map, race } from 'rxjs';
 *
 * const obs1 = interval(7000).pipe(map(() => 'slow one'));
 * const obs2 = interval(3000).pipe(map(() => 'fast one'));
 * const obs3 = interval(5000).pipe(map(() => 'medium one'));
 *
 * race(obs1, obs2, obs3)
 *   .subscribe(winner => console.log(winner));
 *
 * // Outputs
 * // a series of 'fast one'
 * ```
 *
 * @param {...Observables} ...observables sources used to race for which Observable emits first.
 * @return {Observable} an Observable that mirrors the output of the first Observable to emit an item.
 */
export function race<T>(...sources: (ObservableInput<T> | ObservableInput<T>[])[]): Observable<any> {
  sources = argsOrArgArray(sources);
  // If only one source was passed, just return it. Otherwise return the race.
  return sources.length === 1 ? innerFrom(sources[0] as ObservableInput<T>) : new Observable<T>(raceInit(sources as ObservableInput<T>[]));
}

/**
 * An observable initializer function for both the static version and the
 * operator version of race.
 * @param sources The sources to race
 */
export function raceInit<T>(sources: ObservableInput<T>[]) {
  return (subscriber: Subscriber<T>) => {
    let subscriptions: Subscription[] = [];

    // Subscribe to all of the sources. Note that we are checking `subscriptions` here
    // Is is an array of all actively "racing" subscriptions, and it is `null` after the
    // race has been won. So, if we have racer that synchronously "wins", this loop will
    // stop before it subscribes to any more.
    for (let i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
      subscriptions.push(
        innerFrom(sources[i] as ObservableInput<T>).subscribe(
          createOperatorSubscriber(subscriber, (value) => {
            if (subscriptions) {
              // We're still racing, but we won! So unsubscribe
              // all other subscriptions that we have, except this one.
              for (let s = 0; s < subscriptions.length; s++) {
                s !== i && subscriptions[s].unsubscribe();
              }
              subscriptions = null!;
            }
            subscriber.next(value);
          })
        )
      );
    }
  };
}
