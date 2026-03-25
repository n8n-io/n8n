export class MessageHandler {
    constructor(sourceName: any, targetName: any, comObj: any);
    sourceName: any;
    targetName: any;
    comObj: any;
    callbackId: number;
    streamId: number;
    streamSinks: any;
    streamControllers: any;
    callbackCapabilities: any;
    actionHandler: any;
    on(actionName: any, handler: any): void;
    /**
     * Sends a message to the comObj to invoke the action with the supplied data.
     * @param {string} actionName - Action to call.
     * @param {JSON} data - JSON data to send.
     * @param {Array} [transfers] - List of transfers/ArrayBuffers.
     */
    send(actionName: string, data: JSON, transfers?: any[]): void;
    /**
     * Sends a message to the comObj to invoke the action with the supplied data.
     * Expects that the other side will callback with the response.
     * @param {string} actionName - Action to call.
     * @param {JSON} data - JSON data to send.
     * @param {Array} [transfers] - List of transfers/ArrayBuffers.
     * @returns {Promise} Promise to be resolved with response data.
     */
    sendWithPromise(actionName: string, data: JSON, transfers?: any[]): Promise<any>;
    /**
     * Sends a message to the comObj to invoke the action with the supplied data.
     * Expect that the other side will callback to signal 'start_complete'.
     * @param {string} actionName - Action to call.
     * @param {JSON} data - JSON data to send.
     * @param {Object} queueingStrategy - Strategy to signal backpressure based on
     *                 internal queue.
     * @param {Array} [transfers] - List of transfers/ArrayBuffers.
     * @returns {ReadableStream} ReadableStream to read data in chunks.
     */
    sendWithStream(actionName: string, data: JSON, queueingStrategy: Object, transfers?: any[]): ReadableStream;
    destroy(): void;
    #private;
}
export function wrapReason(ex: any): PasswordException | UnknownErrorException | InvalidPDFException | ResponseException | AbortException;
import { PasswordException } from "./util.js";
import { UnknownErrorException } from "./util.js";
import { InvalidPDFException } from "./util.js";
import { ResponseException } from "./util.js";
import { AbortException } from "./util.js";
