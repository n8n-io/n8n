export type WaitOnEventOrTimeoutParameters = {
    /**
     * - The event target, can for example be:
     * `window`, `document`, a DOM element, or an {EventBus} instance.
     */
    target: Object;
    /**
     * - The name of the event.
     */
    name: string;
    /**
     * - The delay, in milliseconds, after which the
     * timeout occurs (if the event wasn't already dispatched).
     */
    delay: number;
};
/**
 * Simple event bus for an application. Listeners are attached using the `on`
 * and `off` methods. To raise an event, the `dispatch` method shall be used.
 */
export class EventBus {
    /**
     * @param {string} eventName
     * @param {function} listener
     * @param {Object} [options]
     */
    on(eventName: string, listener: Function, options?: Object): void;
    /**
     * @param {string} eventName
     * @param {function} listener
     * @param {Object} [options]
     */
    off(eventName: string, listener: Function, options?: Object): void;
    /**
     * @param {string} eventName
     * @param {Object} data
     */
    dispatch(eventName: string, data: Object): void;
    /**
     * @ignore
     */
    _on(eventName: any, listener: any, options?: null): void;
    /**
     * @ignore
     */
    _off(eventName: any, listener: any, options?: null): void;
    #private;
}
/**
 * NOTE: Only used in the Firefox build-in pdf viewer.
 */
export class FirefoxEventBus extends EventBus {
    constructor(globalEventNames: any, externalServices: any, isInAutomation: any);
    dispatch(eventName: any, data: any): void;
    #private;
}
/**
 * @typedef {Object} WaitOnEventOrTimeoutParameters
 * @property {Object} target - The event target, can for example be:
 *   `window`, `document`, a DOM element, or an {EventBus} instance.
 * @property {string} name - The name of the event.
 * @property {number} delay - The delay, in milliseconds, after which the
 *   timeout occurs (if the event wasn't already dispatched).
 */
/**
 * Allows waiting for an event or a timeout, whichever occurs first.
 * Can be used to ensure that an action always occurs, even when an event
 * arrives late or not at all.
 *
 * @param {WaitOnEventOrTimeoutParameters}
 * @returns {Promise} A promise that is resolved with a {WaitOnType} value.
 */
export function waitOnEventOrTimeout({ target, name, delay }: WaitOnEventOrTimeoutParameters): Promise<any>;
export namespace WaitOnType {
    let EVENT: string;
    let TIMEOUT: string;
}
