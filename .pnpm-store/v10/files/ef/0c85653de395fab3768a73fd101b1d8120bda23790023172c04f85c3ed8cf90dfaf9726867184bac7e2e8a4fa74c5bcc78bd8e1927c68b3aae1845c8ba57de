export const outdatedTimeout: 30000;
/**
 * @typedef {Object} MetaClientState
 * @property {number} MetaClientState.clock
 * @property {number} MetaClientState.lastUpdated unix timestamp
 */
/**
 * The Awareness class implements a simple shared state protocol that can be used for non-persistent data like awareness information
 * (cursor, username, status, ..). Each client can update its own local state and listen to state changes of
 * remote clients. Every client may set a state of a remote peer to `null` to mark the client as offline.
 *
 * Each client is identified by a unique client id (something we borrow from `doc.clientID`). A client can override
 * its own state by propagating a message with an increasing timestamp (`clock`). If such a message is received, it is
 * applied if the known state of that client is older than the new state (`clock < newClock`). If a client thinks that
 * a remote client is offline, it may propagate a message with
 * `{ clock: currentClientClock, state: null, client: remoteClient }`. If such a
 * message is received, and the known clock of that client equals the received clock, it will override the state with `null`.
 *
 * Before a client disconnects, it should propagate a `null` state with an updated clock.
 *
 * Awareness states must be updated every 30 seconds. Otherwise the Awareness instance will delete the client state.
 *
 * @extends {Observable<string>}
 */
export class Awareness extends Observable<string> {
    /**
     * @param {Y.Doc} doc
     */
    constructor(doc: Y.Doc);
    doc: Y.Doc;
    /**
     * @type {number}
     */
    clientID: number;
    /**
     * Maps from client id to client state
     * @type {Map<number, Object<string, any>>}
     */
    states: Map<number, {
        [x: string]: any;
    }>;
    /**
     * @type {Map<number, MetaClientState>}
     */
    meta: Map<number, MetaClientState>;
    _checkInterval: any;
    /**
     * @return {Object<string,any>|null}
     */
    getLocalState(): {
        [x: string]: any;
    } | null;
    /**
     * @param {Object<string,any>|null} state
     */
    setLocalState(state: {
        [x: string]: any;
    } | null): void;
    /**
     * @param {string} field
     * @param {any} value
     */
    setLocalStateField(field: string, value: any): void;
    /**
     * @return {Map<number,Object<string,any>>}
     */
    getStates(): Map<number, {
        [x: string]: any;
    }>;
}
export function removeAwarenessStates(awareness: Awareness, clients: Array<number>, origin: any): void;
export function encodeAwarenessUpdate(awareness: Awareness, clients: Array<number>, states?: Map<number, {
    [x: string]: any;
}>): Uint8Array;
export function modifyAwarenessUpdate(update: Uint8Array, modify: (arg0: any) => any): Uint8Array;
export function applyAwarenessUpdate(awareness: Awareness, update: Uint8Array, origin: any): void;
export type MetaClientState = {
    clock: number;
    /**
     * unix timestamp
     */
    lastUpdated: number;
};
import { Observable } from 'lib0/observable';
import * as Y from 'yjs';
//# sourceMappingURL=awareness.d.ts.map