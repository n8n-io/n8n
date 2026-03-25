import FDBObjectStore from "./FDBObjectStore.js";
import FDBRequest from "./FDBRequest.js";
import { AbortError, InvalidStateError, NotFoundError, TransactionInactiveError } from "./lib/errors.js";
import FakeDOMStringList from "./lib/FakeDOMStringList.js";
import FakeEvent from "./lib/FakeEvent.js";
import FakeEventTarget from "./lib/FakeEventTarget.js";
import { queueTask } from "./lib/scheduling.js";
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
class FDBTransaction extends FakeEventTarget {
  _state = "active";
  _started = false;
  _rollbackLog = [];
  _objectStoresCache = new Map();
  error = null;
  onabort = null;
  oncomplete = null;
  onerror = null;
  _requests = [];
  constructor(storeNames, mode, db) {
    super();
    this._scope = new Set(storeNames);
    this.mode = mode;
    this.db = db;
    this.objectStoreNames = new FakeDOMStringList(...Array.from(this._scope).sort());
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-aborting-a-transaction
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
          request.result = undefined;
          request.error = new AbortError();
          const event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true
          });
          event.eventPath = [this.db, this];
          request.dispatchEvent(event);
        }
      }
    }
    queueTask(() => {
      const event = new FakeEvent("abort", {
        bubbles: true,
        cancelable: false
      });
      event.eventPath = [this.db];
      this.dispatchEvent(event);
    });
    this._state = "finished";
  }
  abort() {
    if (this._state === "committing" || this._state === "finished") {
      throw new InvalidStateError();
    }
    this._state = "active";
    this._abort(null);
  }

  // http://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore
  objectStore(name) {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }
    const objectStore = this._objectStoresCache.get(name);
    if (objectStore !== undefined) {
      return objectStore;
    }
    const rawObjectStore = this.db._rawDatabase.rawObjectStores.get(name);
    if (!this._scope.has(name) || rawObjectStore === undefined) {
      throw new NotFoundError();
    }
    const objectStore2 = new FDBObjectStore(this, rawObjectStore);
    this._objectStoresCache.set(name, objectStore2);
    return objectStore2;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
  _execRequestAsync(obj) {
    const source = obj.source;
    const operation = obj.operation;
    let request = Object.hasOwn(obj, "request") ? obj.request : null;
    if (this._state !== "active") {
      throw new TransactionInactiveError();
    }

    // Request should only be passed for cursors
    if (!request) {
      if (!source) {
        // Special requests like indexes that just need to run some code
        request = new FDBRequest();
      } else {
        request = new FDBRequest();
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
          event = new FakeEvent("success", {
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
          event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true
          });
          defaultAction = this._abort.bind(this, err.name);
        }
        try {
          event.eventPath = [this.db, this];
          request.dispatchEvent(event);
        } catch (err) {
          if (this._state !== "committing") {
            this._abort("AbortError");
          }
          throw err;
        }

        // Default action of event
        if (!event.canceled) {
          if (defaultAction) {
            defaultAction();
          }
        }
      }

      // Give it another chance for new handlers to be set before finishing
      queueTask(this._start.bind(this));
      return;
    }

    // Check if transaction complete event needs to be fired
    if (this._state !== "finished") {
      // Either aborted or committed already
      this._state = "finished";
      if (!this.error) {
        const event = new FakeEvent("complete");
        this.dispatchEvent(event);
      }
    }
  }
  commit() {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }
    this._state = "committing";
  }
  toString() {
    return "[object IDBRequest]";
  }
}
export default FDBTransaction;