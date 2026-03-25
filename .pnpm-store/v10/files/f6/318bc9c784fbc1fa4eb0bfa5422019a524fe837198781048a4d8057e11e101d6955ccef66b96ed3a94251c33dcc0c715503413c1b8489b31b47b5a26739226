import { Emitter, EventMap } from 'strict-event-emitter'

/**
 * Emits an event on the given emitter but executes
 * the listeners sequentially. This accounts for asynchronous
 * listeners (e.g. those having "sleep" and handling the request).
 */
export async function emitAsync<
  Events extends EventMap,
  EventName extends keyof Events
>(
  emitter: Emitter<Events>,
  eventName: EventName,
  ...data: Events[EventName]
): Promise<void> {
  const listners = emitter.listeners(eventName)

  if (listners.length === 0) {
    return
  }

  for (const listener of listners) {
    await listener.apply(emitter, data)
  }
}
