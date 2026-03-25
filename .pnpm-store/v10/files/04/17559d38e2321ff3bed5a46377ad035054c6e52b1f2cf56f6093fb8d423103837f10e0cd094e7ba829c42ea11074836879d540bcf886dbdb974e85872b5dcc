export = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
declare class EventEmitter {

    /**
     * Constructs a new event emitter instance.
     * @classdesc A minimal event emitter.
     * @memberof util
     * @constructor
     */
    constructor();

    /**
     * Registers an event listener.
     * @param {string} evt Event name
     * @param {function} fn Listener
     * @param {*} [ctx] Listener context
     * @returns {util.EventEmitter} `this`
     */
    on(evt: string, fn: () => any, ctx?: any): EventEmitter;

    /**
     * Removes an event listener or any matching listeners if arguments are omitted.
     * @param {string} [evt] Event name. Removes all listeners if omitted.
     * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
     * @returns {util.EventEmitter} `this`
     */
    off(evt?: string, fn?: () => any): EventEmitter;

    /**
     * Emits an event by calling its listeners with the specified arguments.
     * @param {string} evt Event name
     * @param {...*} args Arguments
     * @returns {util.EventEmitter} `this`
     */
    emit(evt: string, ...args: any[]): EventEmitter;
}
