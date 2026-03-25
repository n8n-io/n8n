import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { Subscribable } from '../types';

/**
 * Used to convert a subscribable to an observable.
 *
 * Currently, this is only used within internals.
 *
 * TODO: Discuss ObservableInput supporting "Subscribable".
 * https://github.com/ReactiveX/rxjs/issues/5909
 *
 * @param subscribable A subscribable
 */
export function fromSubscribable<T>(subscribable: Subscribable<T>) {
  return new Observable((subscriber: Subscriber<T>) => subscribable.subscribe(subscriber));
}
