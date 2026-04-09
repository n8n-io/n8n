"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBObjectStore = _interopRequireDefault(require("./FDBObjectStore.js"));
var _FDBRequest = _interopRequireDefault(require("./FDBRequest.js"));
var _errors = require("./lib/errors.js");
var _FakeDOMStringList = _interopRequireDefault(require("./lib/FakeDOMStringList.js"));
var _FakeEvent = _interopRequireDefault(require("./lib/FakeEvent.js"));
var _FakeEventTarget = _interopRequireDefault(require("./lib/FakeEventTarget.js"));
var _scheduling = require("./lib/scheduling.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const prioritizedListenerTypes = ["error", "abort", "complete"];
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
class FDBTransaction extends _FakeEventTarget.default {
  _state = "active";
  _started = false;
  _rollbackLog = [];
  _objectStoresCache = new Map();
  _openRequest = null;
  error = null;
  onabort = null;
  oncomplete = null;
  onerror = null;
  _prioritizedListeners = new Map();
  _requests = [];
  _createdIndexes = new Set();
  _createdObjectStores = new Set();
  constructor(storeNames, mode, durability, db) {
    super();
    this._scope = new Set(storeNames);
    this.mode = mode;
    this.durability = durability;
    this.db = db;
    this.objectStoreNames = new _FakeDOMStringList.default(...Array.from(this._scope).sort());
    for (const type of prioritizedListenerTypes) {
      // Attach prioritized (internal) listeners before any external listeners are attached.
      // This ensures that these listeners run with the same timing regardless of whether
      // the user uses `on*` or `addEventListener` for event listeners.
      this.addEventListener(type, () => {
        this._prioritizedListeners.get(type)?.();
      });
    }
  }

  // https://w3c.github.io/IndexedDB/#abort-transaction
  _abort(errName) {
    for (const f of this._rollbackLog.reverse()) {
      f();
    }
    if (errName !== null) {
      const e = new DOMException(undefined, errName);
      this.error = e;
    }

    // Should this directly remove from _requests?
    for (const {
      request
    } of this._requests) {
      if (request.readyState !== "done") {
        request.readyState = "done"; // This will cancel execution of this request's operation
        if (request.source) {
          // https://w3c.github.io/IndexedDB/#ref-for-list-iterate%E2%91%A2
          // For each request of transaction’s request list, abort the steps to asynchronously
          // execute a request for request, set request’s processed flag to true, and queue a
          // database task to run these steps:
          (0, _scheduling.queueTask)(() => {
            // Set request’s result to undefined.
            request.result = undefined;
            // Set request’s error to a newly created "AbortError" DOMException.
            request.error = new _errors.AbortError();

            // Fire an event named error at request with its bubbles and cancelable attributes initialized
            // to true.
            const event = new _FakeEvent.default("error", {
              bubbles: true,
              cancelable: true
            });
            event.eventPath = [this.db, this];
            try {
              request.dispatchEvent(event);
            } catch (_err) {
              if (this._state === "active") {
                this._abort("AbortError");
              }
            }
          });
        }
      }
    }

    // Queue a database task to run these steps:
    (0, _scheduling.queueTask)(() => {
      // If transaction is an upgrade transaction, then set transaction’s connection’s associated database’s
      // upgrade transaction to null.
      // (i.e. remove it from the list of `db.connections`)
      const isUpgradeTransaction = this.mode === "versionchange";
      if (isUpgradeTransaction) {
        this.db._rawDatabase.connections = this.db._rawDatabase.connections.filter(connection => !connection._rawDatabase.transactions.includes(this));
      }
      // Fire an event named abort at transaction with its bubbles attribute initialized to true.
      const event = new _FakeEvent.default("abort", {
        bubbles: true,
        cancelable: false
      });
      event.eventPath = [this.db];
      this.dispatchEvent(event);

      // If transaction is an upgrade transaction, then:
      if (isUpgradeTransaction) {
        // Let request be the open request associated with transaction.
        const request = this._openRequest;
        // Set request’s transaction to null.
        request.transaction = null;
        // Set request’s result to undefined.
        request.result = undefined;
      }
    });
    this._state = "finished";
  }
  abort() {
    if (this._state === "committing" || this._state === "finished") {
      throw new _errors.InvalidStateError();
    }
    this._state = "active";
    this._abort(null);
  }

  // http://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore
  objectStore(name) {
    if (this._state !== "active") {
      throw new _errors.InvalidStateError();
    }
    const objectStore = this._objectStoresCache.get(name);
    if (objectStore !== undefined) {
      return objectStore;
    }
    const rawObjectStore = this.db._rawDatabase.rawObjectStores.get(name);
    if (!this._scope.has(name) || rawObjectStore === undefined) {
      throw new _errors.NotFoundError();
    }
    const objectStore2 = new _FDBObjectStore.default(this, rawObjectStore);
    this._objectStoresCache.set(name, objectStore2);
    return objectStore2;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
  _execRequestAsync(obj) {
    const source = obj.source;
    const operation = obj.operation;
    let request = Object.hasOwn(obj, "request") ? obj.request : null;
    if (this._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }

    // Request should only be passed for cursors
    if (!request) {
      if (!source) {
        // Special requests like indexes that just need to run some code
        request = new _FDBRequest.default();
      } else {
        request = new _FDBRequest.default();
        request.source = source;
        request.transaction = source.transaction;
      }
    }
    this._requests.push({
      operation,
      request
    });
    return request;
  }
  _start() {
    this._started = true;

    // Remove from request queue - cursor ones will be added back if necessary by cursor.continue and such
    let operation;
    let request;
    while (this._requests.length > 0) {
      const r = this._requests.shift();

      // This should only be false if transaction was aborted
      if (r && r.request.readyState !== "done") {
        request = r.request;
        operation = r.operation;
        break;
      }
    }
    if (request && operation) {
      if (!request.source) {
        // Special requests like indexes that just need to run some code, with error handling already built into
        // operation
        operation();
      } else {
        let defaultAction;
        let event;
        try {
          const result = operation();
          request.readyState = "done";
          request.result = result;
          request.error = undefined;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-a-success-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new _FakeEvent.default("success", {
            bubbles: false,
            cancelable: false
          });
        } catch (err) {
          request.readyState = "done";
          request.result = undefined;
          request.error = err;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-an-error-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new _FakeEvent.default("error", {
            bubbles: true,
            cancelable: true
          });
          defaultAction = this._abort.bind(this, err.name);
        }
        try {
          event.eventPath = [this.db, this];
          request.dispatchEvent(event);
        } catch (_err) {
          if (this._state === "active") {
            this._abort("AbortError");
            defaultAction = undefined; // do not abort again
          }
        }

        // Default action of event
        if (!event.canceled) {
          if (defaultAction) {
            defaultAction();
          }
        }
      }

      // Give it another chance for new handlers to be set before finishing
      (0, _scheduling.queueTask)(this._start.bind(this));
      return;
    }

    // Check if transaction complete event needs to be fired
    if (this._state !== "finished") {
      // Either aborted or committed already
      this._state = "finished";
      if (!this.error) {
        const event = new _FakeEvent.default("complete");
        this.dispatchEvent(event);
      }
    }
  }
  commit() {
    if (this._state !== "active") {
      throw new _errors.InvalidStateError();
    }
    this._state = "committing";
  }
  get [Symbol.toStringTag]() {
    return "IDBTransaction";
  }
}
var _default = exports.default = FDBTransaction;
module.exports = exports.default;