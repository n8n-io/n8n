'use strict';

var encoding = require('lib0/dist/encoding.cjs');
var decoding = require('lib0/dist/decoding.cjs');
var time = require('lib0/dist/time.cjs');
var math = require('lib0/dist/math.cjs');
var observable = require('lib0/dist/observable.cjs');
var f = require('lib0/dist/function.cjs');
require('yjs');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var encoding__namespace = /*#__PURE__*/_interopNamespaceDefault(encoding);
var decoding__namespace = /*#__PURE__*/_interopNamespaceDefault(decoding);
var time__namespace = /*#__PURE__*/_interopNamespaceDefault(time);
var math__namespace = /*#__PURE__*/_interopNamespaceDefault(math);
var f__namespace = /*#__PURE__*/_interopNamespaceDefault(f);

/**
 * @module awareness-protocol
 */


const outdatedTimeout = 30000;

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
class Awareness extends observable.Observable {
  /**
   * @param {Y.Doc} doc
   */
  constructor (doc) {
    super();
    this.doc = doc;
    /**
     * @type {number}
     */
    this.clientID = doc.clientID;
    /**
     * Maps from client id to client state
     * @type {Map<number, Object<string, any>>}
     */
    this.states = new Map();
    /**
     * @type {Map<number, MetaClientState>}
     */
    this.meta = new Map();
    this._checkInterval = /** @type {any} */ (setInterval(() => {
      const now = time__namespace.getUnixTime();
      if (this.getLocalState() !== null && (outdatedTimeout / 2 <= now - /** @type {{lastUpdated:number}} */ (this.meta.get(this.clientID)).lastUpdated)) {
        // renew local clock
        this.setLocalState(this.getLocalState());
      }
      /**
       * @type {Array<number>}
       */
      const remove = [];
      this.meta.forEach((meta, clientid) => {
        if (clientid !== this.clientID && outdatedTimeout <= now - meta.lastUpdated && this.states.has(clientid)) {
          remove.push(clientid);
        }
      });
      if (remove.length > 0) {
        removeAwarenessStates(this, remove, 'timeout');
      }
    }, math__namespace.floor(outdatedTimeout / 10)));
    doc.on('destroy', () => {
      this.destroy();
    });
    this.setLocalState({});
  }

  destroy () {
    this.emit('destroy', [this]);
    this.setLocalState(null);
    super.destroy();
    clearInterval(this._checkInterval);
  }

  /**
   * @return {Object<string,any>|null}
   */
  getLocalState () {
    return this.states.get(this.clientID) || null
  }

  /**
   * @param {Object<string,any>|null} state
   */
  setLocalState (state) {
    const clientID = this.clientID;
    const currLocalMeta = this.meta.get(clientID);
    const clock = currLocalMeta === undefined ? 0 : currLocalMeta.clock + 1;
    const prevState = this.states.get(clientID);
    if (state === null) {
      this.states.delete(clientID);
    } else {
      this.states.set(clientID, state);
    }
    this.meta.set(clientID, {
      clock,
      lastUpdated: time__namespace.getUnixTime()
    });
    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];
    if (state === null) {
      removed.push(clientID);
    } else if (prevState == null) {
      if (state != null) {
        added.push(clientID);
      }
    } else {
      updated.push(clientID);
      if (!f__namespace.equalityDeep(prevState, state)) {
        filteredUpdated.push(clientID);
      }
    }
    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit('change', [{ added, updated: filteredUpdated, removed }, 'local']);
    }
    this.emit('update', [{ added, updated, removed }, 'local']);
  }

  /**
   * @param {string} field
   * @param {any} value
   */
  setLocalStateField (field, value) {
    const state = this.getLocalState();
    if (state !== null) {
      this.setLocalState({
        ...state,
        [field]: value
      });
    }
  }

  /**
   * @return {Map<number,Object<string,any>>}
   */
  getStates () {
    return this.states
  }
}

/**
 * Mark (remote) clients as inactive and remove them from the list of active peers.
 * This change will be propagated to remote clients.
 *
 * @param {Awareness} awareness
 * @param {Array<number>} clients
 * @param {any} origin
 */
const removeAwarenessStates = (awareness, clients, origin) => {
  const removed = [];
  for (let i = 0; i < clients.length; i++) {
    const clientID = clients[i];
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      if (clientID === awareness.clientID) {
        const curMeta = /** @type {MetaClientState} */ (awareness.meta.get(clientID));
        awareness.meta.set(clientID, {
          clock: curMeta.clock + 1,
          lastUpdated: time__namespace.getUnixTime()
        });
      }
      removed.push(clientID);
    }
  }
  if (removed.length > 0) {
    awareness.emit('change', [{ added: [], updated: [], removed }, origin]);
    awareness.emit('update', [{ added: [], updated: [], removed }, origin]);
  }
};

/**
 * @param {Awareness} awareness
 * @param {Array<number>} clients
 * @return {Uint8Array}
 */
const encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
  const len = clients.length;
  const encoder = encoding__namespace.createEncoder();
  encoding__namespace.writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = clients[i];
    const state = states.get(clientID) || null;
    const clock = /** @type {MetaClientState} */ (awareness.meta.get(clientID)).clock;
    encoding__namespace.writeVarUint(encoder, clientID);
    encoding__namespace.writeVarUint(encoder, clock);
    encoding__namespace.writeVarString(encoder, JSON.stringify(state));
  }
  return encoding__namespace.toUint8Array(encoder)
};

/**
 * Modify the content of an awareness update before re-encoding it to an awareness update.
 *
 * This might be useful when you have a central server that wants to ensure that clients
 * cant hijack somebody elses identity.
 *
 * @param {Uint8Array} update
 * @param {function(any):any} modify
 * @return {Uint8Array}
 */
const modifyAwarenessUpdate = (update, modify) => {
  const decoder = decoding__namespace.createDecoder(update);
  const encoder = encoding__namespace.createEncoder();
  const len = decoding__namespace.readVarUint(decoder);
  encoding__namespace.writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = decoding__namespace.readVarUint(decoder);
    const clock = decoding__namespace.readVarUint(decoder);
    const state = JSON.parse(decoding__namespace.readVarString(decoder));
    const modifiedState = modify(state);
    encoding__namespace.writeVarUint(encoder, clientID);
    encoding__namespace.writeVarUint(encoder, clock);
    encoding__namespace.writeVarString(encoder, JSON.stringify(modifiedState));
  }
  return encoding__namespace.toUint8Array(encoder)
};

/**
 * @param {Awareness} awareness
 * @param {Uint8Array} update
 * @param {any} origin This will be added to the emitted change event
 */
const applyAwarenessUpdate = (awareness, update, origin) => {
  const decoder = decoding__namespace.createDecoder(update);
  const timestamp = time__namespace.getUnixTime();
  const added = [];
  const updated = [];
  const filteredUpdated = [];
  const removed = [];
  const len = decoding__namespace.readVarUint(decoder);
  for (let i = 0; i < len; i++) {
    const clientID = decoding__namespace.readVarUint(decoder);
    let clock = decoding__namespace.readVarUint(decoder);
    const state = JSON.parse(decoding__namespace.readVarString(decoder));
    const clientMeta = awareness.meta.get(clientID);
    const prevState = awareness.states.get(clientID);
    const currClock = clientMeta === undefined ? 0 : clientMeta.clock;
    if (currClock < clock || (currClock === clock && state === null && awareness.states.has(clientID))) {
      if (state === null) {
        // never let a remote client remove this local state
        if (clientID === awareness.clientID && awareness.getLocalState() != null) {
          // remote client removed the local state. Do not remote state. Broadcast a message indicating
          // that this client still exists by increasing the clock
          clock++;
        } else {
          awareness.states.delete(clientID);
        }
      } else {
        awareness.states.set(clientID, state);
      }
      awareness.meta.set(clientID, {
        clock,
        lastUpdated: timestamp
      });
      if (clientMeta === undefined && state !== null) {
        added.push(clientID);
      } else if (clientMeta !== undefined && state === null) {
        removed.push(clientID);
      } else if (state !== null) {
        if (!f__namespace.equalityDeep(state, prevState)) {
          filteredUpdated.push(clientID);
        }
        updated.push(clientID);
      }
    }
  }
  if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
    awareness.emit('change', [{
      added, updated: filteredUpdated, removed
    }, origin]);
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    awareness.emit('update', [{
      added, updated, removed
    }, origin]);
  }
};

exports.Awareness = Awareness;
exports.applyAwarenessUpdate = applyAwarenessUpdate;
exports.encodeAwarenessUpdate = encodeAwarenessUpdate;
exports.modifyAwarenessUpdate = modifyAwarenessUpdate;
exports.outdatedTimeout = outdatedTimeout;
exports.removeAwarenessStates = removeAwarenessStates;
//# sourceMappingURL=awareness.cjs.map
