import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * A basic scan operation. This is used for `scan` and `reduce`.
 * @param accumulator The accumulator to use
 * @param seed The seed value for the state to accumulate
 * @param hasSeed Whether or not a seed was provided
 * @param emitOnNext Whether or not to emit the state on next
 * @param emitBeforeComplete Whether or not to emit the before completion
 */

export function scanInternals<V, A, S>(
  accumulator: (acc: V | A | S, value: V, index: number) => A,
  seed: S,
  hasSeed: boolean,
  emitOnNext: boolean,
  emitBeforeComplete?: undefined | true
) {
  return (source: Observable<V>, subscriber: Subscriber<any>) => {
    // Whether or not we have state yet. This will only be
    // false before the first value arrives if we didn't get
    // a seed value.
    let hasState = hasSeed;
    // The state that we're tracking, starting with the seed,
    // if there is one, and then updated by the return value
    // from the accumulator on each emission.
    let state: any = seed;
    // An index to pass to the accumulator function.
    let index = 0;

    // Subscribe to our source. All errors and completions are passed through.
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          // Always increment the index.
          const i = index++;
          // Set the state
          state = hasState
            ? // We already have state, so we can get the new state from the accumulator
              accumulator(state, value, i)
            : // We didn't have state yet, a seed value was not provided, so

              // we set the state to the first value, and mark that we have state now
              ((hasState = true), value);

          // Maybe send it to the consumer.
          emitOnNext && subscriber.next(state);
        },
        // If an onComplete was given, call it, otherwise
        // just pass through the complete notification to the consumer.
        emitBeforeComplete &&
          (() => {
            hasState && subscriber.next(state);
            subscriber.complete();
          })
      )
    );
  };
}
