import { asArray } from './as-array';

/**
 * A callback function that can be used to notify listeners.
 */
export type Listener<EVENT> = (event: EVENT) => PromiseLike<void> | void;

/**
 * Notifies all provided callbacks with the given event.
 * Errors in callbacks do not break the generation flow.
 */
export async function notify<EVENT>(options: {
  event: EVENT;
  callbacks?: Listener<EVENT> | Array<Listener<EVENT> | undefined | null>;
}): Promise<void> {
  for (const callback of asArray(options.callbacks)) {
    if (callback == null) continue;
    try {
      await callback(options.event);
    } catch (_ignored) {}
  }
}
