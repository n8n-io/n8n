import FDBDatabase from "./FDBDatabase.js";
import FDBOpenDBRequest from "./FDBOpenDBRequest.js";
import FDBVersionChangeEvent from "./FDBVersionChangeEvent.js";
import cmp from "./lib/cmp.js";
import Database from "./lib/Database.js";
import enforceRange from "./lib/enforceRange.js";
import { AbortError, VersionError } from "./lib/errors.js";
import FakeEvent from "./lib/FakeEvent.js";
import { queueTask } from "./lib/scheduling.js";
import { validateRequiredArguments } from "./lib/validateRequiredArguments.js";
// https://w3c.github.io/IndexedDB/#connection-queue
const runTaskInConnectionQueue = (connectionQueues, name, task) => {
  // Let queue be the connection queue for storageKey and name.
  // (note FakeIndexedDB does not support storageKeys currently)
  // Add request to queue.
  // Wait until all previous requests in queue have been processed.
  const queue = connectionQueues.get(name) ?? Promise.resolve();
  connectionQueues.set(name, queue.then(task));
};
const waitForOthersClosedDelete = (databases, name, openDatabases, cb) => {
  const anyOpen = openDatabases.some(openDatabase2 => {
    return !openDatabase2._closed && !openDatabase2._closePending;
  });
  if (anyOpen) {
    queueTask(() => waitForOthersClosedDelete(databases, name, openDatabases, cb));
    return;
  }
  databases.delete(name);
  cb(null);
};

// https://w3c.github.io/IndexedDB/#delete-a-database
const deleteDatabase = (databases, connectionQueues, name, request, cb) => {
  const deleteDBTask = () => {
    return new Promise(resolve => {
      const db = databases.get(name);
      const oldVersion = db !== undefined ? db.version : 0;
      const onComplete = err => {
        try {
          if (err) {
            cb(err);
          } else {
            cb(null, oldVersion);
          }
        } finally {
          resolve();
        }
      };
      try {
        const db = databases.get(name);
        if (db === undefined) {
          onComplete(null);
          return;
        }

        // Let openConnections be the set of all connections associated with db.
        const openConnections = db.connections.filter(connection => {
          return !connection._closed;
        });

        // For each entry of openConnections that does not have its close pending flag set to true, queue a
        // database task to fire a version change event named versionchange at entry with db’s version and null.
        for (const openDatabase2 of openConnections) {
          if (!openDatabase2._closePending) {
            queueTask(() => {
              const event = new FDBVersionChangeEvent("versionchange", {
                newVersion: null,
                oldVersion: db.version
              });
              openDatabase2.dispatchEvent(event);
            });
          }
        }

        // Wait for all of the events to be fired. (i.e. queue a task)
        queueTask(() => {
          // If any of the connections in openConnections are still not closed, queue a database task to
          // fire a version change event named blocked at request with db’s version and null.

          const anyOpen = openConnections.some(openDatabase3 => {
            return !openDatabase3._closed && !openDatabase3._closePending;
          });

          // If any of the connections in openConnections are still not closed, queue a database task to
          // fire a version change event named blocked at request with db’s version and null.
          if (anyOpen) {
            queueTask(() => {
              const event = new FDBVersionChangeEvent("blocked", {
                newVersion: null,
                oldVersion: db.version
              });
              request.dispatchEvent(event);
            });
          }

          // Wait until all connections in openConnections are closed.
          waitForOthersClosedDelete(databases, name, openConnections, onComplete);
        });
      } catch (err) {
        onComplete(err);
      }
    });
  };
  runTaskInConnectionQueue(connectionQueues, name, deleteDBTask);
};

// https://w3c.github.io/IndexedDB/#ref-for-database-version%E2%91%A0%E2%91%A2
const runVersionchangeTransaction = (connection, version, request, cb) => {
  connection._runningVersionchangeTransaction = true;
  const oldVersion = connection._oldVersion = connection.version;

  // Let openConnections be the set of all connections, except connection, associated with db.
  const openConnections = connection._rawDatabase.connections.filter(otherDatabase => {
    return connection !== otherDatabase;
  });

  // For each entry of openConnections that does not have its close pending flag set to true, queue a
  // database task to fire a version change event named versionchange at entry with db’s version and version.
  for (const openDatabase2 of openConnections) {
    if (!openDatabase2._closed && !openDatabase2._closePending) {
      queueTask(() => {
        const event = new FDBVersionChangeEvent("versionchange", {
          newVersion: version,
          oldVersion
        });
        openDatabase2.dispatchEvent(event);
      });
    }
  }

  // Wait for all of the events to be fired.
  // (i.e. queue a task)
  queueTask(() => {
    const anyOpen = openConnections.some(openDatabase3 => {
      return !openDatabase3._closed && !openDatabase3._closePending;
    });

    // If any of the connections in openConnections are still not closed, queue a database task to fire a version change event named blocked at request with db’s version and version.
    if (anyOpen) {
      queueTask(() => {
        const event = new FDBVersionChangeEvent("blocked", {
          newVersion: version,
          oldVersion
        });
        request.dispatchEvent(event);
      });
    }

    // Wait until all connections in openConnections are closed.
    const waitForOthersClosed = () => {
      const anyOpen2 = openConnections.some(openDatabase2 => {
        return !openDatabase2._closed && !openDatabase2._closePending;
      });
      if (anyOpen2) {
        queueTask(waitForOthersClosed);
        return;
      }

      // Set the version of database to version. This change is considered part of the transaction, and so if the
      // transaction is aborted, this change is reverted.
      connection._rawDatabase.version = version;
      connection.version = version;

      // Get rid of this setImmediate?
      const transaction = connection.transaction(Array.from(connection.objectStoreNames), "versionchange");

      // associate the transaction with the open request for later lookup
      transaction._openRequest = request;

      // https://w3c.github.io/IndexedDB/#upgrade-a-database
      // Set request’s result to connection.
      request.result = connection;
      // Set request’s done flag to true.
      request.readyState = "done";
      // Set request’s transaction to transaction.
      request.transaction = transaction;
      transaction._rollbackLog.push(() => {
        connection._rawDatabase.version = oldVersion;
        connection.version = oldVersion;
      });

      // Set transaction’s state to active.
      transaction._state = "active";

      // Let didThrow be the result of firing a version change event named upgradeneeded at request with old version and version.
      const event = new FDBVersionChangeEvent("upgradeneeded", {
        newVersion: version,
        oldVersion
      });
      let didThrow = false;
      try {
        request.dispatchEvent(event);
      } catch (_err) {
        didThrow = true;
      }
      const concludeUpgrade = () => {
        // If transaction’s state is active, then:
        if (transaction._state === "active") {
          // Set transaction’s state to inactive.
          transaction._state = "inactive";
          if (didThrow) {
            // If didThrow is true, run abort a transaction with transaction and a newly created "AbortError" DOMException.
            transaction._abort("AbortError");
          }
        }
      };

      // The "upgrade a database" steps are supposed to run as a database task on the database access task source
      // (i.e. off the main thread), but since we're actually running on the main thread, we have to be tricky:
      // 1. If any `upgradeneeded` event handlers errored, abort synchronously
      // 2. Else yield to allow any microtasks to run in response to that event
      if (didThrow) {
        concludeUpgrade();
      } else {
        queueTask(concludeUpgrade);
      }
      transaction._prioritizedListeners.set("error", () => {
        connection._runningVersionchangeTransaction = false;
        connection._oldVersion = undefined;
        // throw arguments[0].target.error;
        // console.log("error in versionchange transaction - not sure if anything needs to be done here", e.target.error.name);
      });
      transaction._prioritizedListeners.set("abort", () => {
        connection._runningVersionchangeTransaction = false;
        connection._oldVersion = undefined;
        queueTask(() => {
          // Reset transaction in a tick after onabort (upgrade-transaction-lifecycle-user-aborted.any)
          request.transaction = null;
          cb(new AbortError());
        });
      });
      transaction._prioritizedListeners.set("complete", () => {
        connection._runningVersionchangeTransaction = false;
        connection._oldVersion = undefined;
        // Let other complete event handlers run before continuing
        queueTask(() => {
          // Reset transaction in a tick after oncomplete (upgrade-transaction-lifecycle-committed.any.js)
          request.transaction = null;
          if (connection._closePending) {
            cb(new AbortError());
          } else {
            cb(null);
          }
        });
      });
    };
    waitForOthersClosed();
  });
};

// https://w3c.github.io/IndexedDB/#opening
const openDatabase = (databases, connectionQueues, name, version, request, cb) => {
  const openDBTask = () => {
    return new Promise(resolve => {
      const onComplete = err => {
        try {
          if (err) {
            // DO THIS HERE: ensure that connection is closed by running the steps for closing a database connection before these
            // steps are aborted.
            cb(err);
          } else {
            cb(null, connection);
          }
        } finally {
          resolve();
        }
      };

      // Let db be the database named name in storageKey, or null otherwise.
      let db = databases.get(name);
      if (db === undefined) {
        // If db is null, let db be a new database with name `name`, version 0 (zero), and with no object stores.
        db = new Database(name, 0);
        databases.set(name, db);
      }

      // If version is undefined, let version be 1 if db is null, or db’s version otherwise.
      if (version === undefined) {
        version = db.version !== 0 ? db.version : 1;
      }

      // If db’s version is greater than version, return a newly created "VersionError" DOMException and abort these steps.
      if (db.version > version) {
        return onComplete(new VersionError());
      }

      // Let connection be a new connection to db.
      const connection = new FDBDatabase(db);

      // If db’s version is less than version, then:
      if (db.version < version) {
        // (run a version change transaction and resolve so that the next promise in the queue will execute)
        runVersionchangeTransaction(connection, version, request, err => {
          onComplete(err);
        });
      } else {
        onComplete(null);
      }
    });
  };
  runTaskInConnectionQueue(connectionQueues, name, openDBTask);
};
class FDBFactory {
  _databases = new Map();
  // https://w3c.github.io/IndexedDB/#connection-queue
  _connectionQueues = new Map(); // promise chain as lightweight FIFO task queue

  // https://w3c.github.io/IndexedDB/#dom-idbfactory-cmp
  cmp(first, second) {
    validateRequiredArguments(arguments.length, 2, "IDBFactory.cmp");
    return cmp(first, second);
  }

  // https://w3c.github.io/IndexedDB/#dom-idbfactory-deletedatabase
  deleteDatabase(name) {
    validateRequiredArguments(arguments.length, 1, "IDBFactory.deleteDatabase");
    const request = new FDBOpenDBRequest();
    request.source = null;
    queueTask(() => {
      deleteDatabase(this._databases, this._connectionQueues, name, request, (err, oldVersion) => {
        if (err) {
          request.error = new DOMException(err.message, err.name);
          request.readyState = "done";
          const event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true
          });
          event.eventPath = [];
          request.dispatchEvent(event);
          return;
        }
        request.result = undefined;
        request.readyState = "done";
        const event2 = new FDBVersionChangeEvent("success", {
          newVersion: null,
          oldVersion
        });
        request.dispatchEvent(event2);
      });
    });
    return request;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-open-IDBOpenDBRequest-DOMString-name-unsigned-long-long-version
  open(name, version) {
    validateRequiredArguments(arguments.length, 1, "IDBFactory.open");
    if (arguments.length > 1 && version !== undefined) {
      // Based on spec, not sure why "MAX_SAFE_INTEGER" instead of "unsigned long long", but it's needed to pass
      // tests
      version = enforceRange(version, "MAX_SAFE_INTEGER");
    }
    if (version === 0) {
      throw new TypeError("Database version cannot be 0");
    }
    const request = new FDBOpenDBRequest();
    request.source = null;
    queueTask(() => {
      openDatabase(this._databases, this._connectionQueues, name, version, request, (err, connection) => {
        if (err) {
          request.result = undefined;
          request.readyState = "done";
          request.error = new DOMException(err.message, err.name);
          const event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true
          });
          event.eventPath = [];
          request.dispatchEvent(event);
          return;
        }
        request.result = connection;
        request.readyState = "done";
        const event2 = new FakeEvent("success");
        event2.eventPath = [];
        request.dispatchEvent(event2);
      });
    });
    return request;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbfactory-databases
  databases() {
    return Promise.resolve(Array.from(this._databases.entries(), ([name, database]) => {
      const activeVersionChangeConnection = database.connections.find(connection => connection._runningVersionchangeTransaction);
      // If a versionchange is in progress, report the old version. See `get-databases.any.js` test:
      // "The result of databases() should contain the versions of databases at the time of calling,
      // regardless of versionchange transactions currently running."
      const version = activeVersionChangeConnection ? activeVersionChangeConnection._oldVersion : database.version;
      return {
        name,
        version
      };
    }).filter(({
      version
    }) => {
      // Ignore newly-created DBs with active versionchange transactions. See `get-databases.any.js` test:
      // "The result of databases() should be only those databases which have been created at the
      // time of calling, regardless of versionchange transactions currently running."
      return version > 0;
    }));
  }
  get [Symbol.toStringTag]() {
    return "IDBFactory";
  }
}
export default FDBFactory;