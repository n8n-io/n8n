export type EventType = string | symbol;

// An event handler can take an optional event argument
// and should not return a value
export type Handler<T = any> = (event?: T) => void;
export type WildcardHandler = (type: EventType, event?: any) => void;

// An array of all currently registered event handlers for a type
export type EventHandlerList = Array<Handler>;
export type WildCardEventHandlerList = Array<WildcardHandler>;

// A map of event types and their corresponding event handlers.
export type EventHandlerMap = Map<EventType, EventHandlerList | WildCardEventHandlerList>;

export interface Emitter {
	all: EventHandlerMap;

	on<T = any>(type: EventType, handler: Handler<T>): void;
	on(type: '*', handler: WildcardHandler): void;

	off<T = any>(type: EventType, handler: Handler<T>): void;
	off(type: '*', handler: WildcardHandler): void;

	emit<T = any>(type: EventType, event?: T): void;
	emit(type: '*', event?: any): void;
}

/**
 * Mitt: Tiny (~200b) functional event emitter / pubsub.
 * @name mitt
 * @returns {Mitt}
 */
export default function mitt(all?: EventHandlerMap): Emitter {
	all = all || new Map();

	return {

		/**
		 * A Map of event names to registered handler functions.
		 */
		all,

		/**
		 * Register an event handler for the given type.
		 * @param {string|symbol} type Type of event to listen for, or `"*"` for all events
		 * @param {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
		on<T = any>(type: EventType, handler: Handler<T>) {
			const handlers = all.get(type);
			const added = handlers && handlers.push(handler);
			if (!added) {
				all.set(type, [handler]);
			}
		},

		/**
		 * Remove an event handler for the given type.
		 * @param {string|symbol} type Type of event to unregister `handler` from, or `"*"`
		 * @param {Function} handler Handler function to remove
		 * @memberOf mitt
		 */
		off<T = any>(type: EventType, handler: Handler<T>) {
			const handlers = all.get(type);
			if (handlers) {
				handlers.splice(handlers.indexOf(handler) >>> 0, 1);
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `"*"` handlers are invoked after type-matched handlers.
		 *
		 * Note: Manually firing "*" handlers is not supported.
		 *
		 * @param {string|symbol} type The event type to invoke
		 * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
		 * @memberOf mitt
		 */
		emit<T = any>(type: EventType, evt: T) {
			((all.get(type) || []) as EventHandlerList).slice().map((handler) => { handler(evt); });
			((all.get('*') || []) as WildCardEventHandlerList).slice().map((handler) => { handler(type, evt); });
		}
	};
}
