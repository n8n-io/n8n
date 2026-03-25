"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBDatabase = _interopRequireDefault(require("./FDBDatabase.js"));
var _FDBOpenDBRequest = _interopRequireDefault(require("./FDBOpenDBRequest.js"));
var _FDBVersionChangeEvent = _interopRequireDefault(require("./FDBVersionChangeEvent.js"));
var _cmp = _interopRequireDefault(require("./lib/cmp.js"));
var _Database = _interopRequireDefault(require("./lib/Database.js"));
var _enforceRange = _interopRequireDefault(require("./lib/enforceRange.js"));
var _errors = require("./lib/errors.js");
var _FakeEvent = _interopRequireDefault(require("./lib/FakeEvent.js"));
var _scheduling = require("./lib/scheduling.js");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const waitForOthersClosedDelete = (databases, name, openDatabases, cb) => {
  const anyOpen = openDatabases.some(openDatabase2 => {
    return !openDatabase2._closed && !openDatabase2._closePending;
  });
  if (anyOpen) {
    (0, _scheduling.queueTask)(() => waitForOthersClosedDelete(databases, name, openDatabases, cb));
    return;
  }
  databases.delete(name);
  cb(null);
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-deleting-a-database
const deleteDatabase = (databases, name, request, cb) => {
  try {
    const db = databases.get(name);
    if (db === undefined) {
      cb(null);
      return;
    }
    db.deletePending = true;
    const openDatabases = db.connections.filter(connection => {
      return !connection._closed && !connection._closePending;
    });
    for (const openDatabase2 of openDatabases) {
      if (!openDatabase2._closePending) {
        const event = new _FDBVersionChangeEvent.default("versionchange", {
          newVersion: null,
          oldVersion: db.version
        });
        openDatabase2.dispatchEvent(event);
      }
    }
    const anyOpen = openDatabases.some(openDatabase3 => {
      return !openDatabase3._closed && !openDatabase3._closePending;
    });
    if (request && anyOpen) {
      const event = new _FDBVersionChangeEvent.default("blocked", {
        newVersion: null,
        oldVersion: db.version
      });
      request.dispatchEvent(event);
    }
    waitForOthersClosedDelete(databases, name, openDatabases, cb);
  } catch (err) {
    cb(err);
  }
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-running-a-versionchange-transaction
const runVersionchangeTransaction = (connection, version, request, cb) => {
  connection._runningVersionchangeTransaction = true;
  const oldVersion = connection.version;
  const openDatabases = connection._rawDatabase.connections.filter(otherDatabase => {
    return connection !== otherDatabase;
  });
  for (const openDatabase2 of openDatabases) {
    if (!openDatabase2._closed && !openDatabase2._closePending) {
      const event = new _FDBVersionChangeEvent.default("versionchange", {
        newVersion: version,
        oldVersion
      });
      openDatabase2.dispatchEvent(event);
    }
  }
  const anyOpen = openDatabases.some(openDatabase3 => {
    return !openDatabase3._closed && !openDatabase3._closePending;
  });
  if (anyOpen) {
    const event = new _FDBVersionChangeEvent.default("blocked", {
      newVersion: version,
      oldVersion
    });
    request.dispatchEvent(event);
  }
  const waitForOthersClosed = () => {
    const anyOpen2 = openDatabases.some(openDatabase2 => {
      return !openDatabase2._closed && !openDatabase2._closePending;
    });
    if (anyOpen2) {
      (0, _scheduling.queueTask)(waitForOthersClosed);
      return;
    }

    // Set the version of database to version. This change is considered part of the transaction, and so if the
    // transaction is aborted, this change is reverted.
    connection._rawDatabase.version = version;
    connection.version = version;

    // Get rid of this setImmediate?
    const transaction = connection.transaction(connection.objectStoreNames, "versionchange");
    request.result = connection;
    request.readyState = "done";
    request.transaction = transaction;
    transaction._rollbackLog.push(() => {
      connection._rawDatabase.version = oldVersion;
      connection.version = oldVersion;
    });
    const event = new _FDBVersionChangeEvent.default("upgradeneeded", {
      newVersion: version,
      oldVersion
    });
    request.dispatchEvent(event);
    transaction.addEventListener("error", () => {
      connection._runningVersionchangeTransaction = false;
      // throw arguments[0].target.error;
      // console.log("error in versionchange transaction - not sure if anything needs to be done here", e.target.error.name);
    });
    transaction.addEventListener("abort", () => {
      connection._runningVersionchangeTransaction = false;
      request.transaction = null;
      (0, _scheduling.queueTask)(() => {
        cb(new _errors.AbortError());
      });
    });
    transaction.addEventListener("complete", () => {
      connection._runningVersionchangeTransaction = false;
      request.transaction = null;
      // Let other complete event handlers run before continuing
      (0, _scheduling.queueTask)(() => {
        if (connection._closePending) {
          cb(new _errors.AbortError());
        } else {
          cb(null);
        }
      });
    });
  };
  waitForOthersClosed();
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-opening-a-database
const openDatabase = (databases, name, version, request, cb) => {
  let db = databases.get(name);
  if (db === undefined) {
    db = new _Database.default(name, 0);
    databases.set(name, db);
  }
  if (version === undefined) {
    version = db.version !== 0 ? db.version : 1;
  }
  if (db.version > version) {
    return cb(new _errors.VersionError());
  }
  const connection = new _FDBDatabase.default(db);
  if (db.version < version) {
    runVersionchangeTransaction(connection, version, request, err => {
      if (err) {
        // DO THIS HERE: ensure that connection is closed by running the steps for closing a database connection before these
        // steps are aborted.
        return cb(err);
      }
      cb(null, connection);
    });
  } else {
    cb(null, connection);
  }
};
class FDBFactory {
  cmp = _cmp.default;
  _databases = new Map();

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name
  deleteDatabase(name) {
    const request = new _FDBOpenDBRequest.default();
    request.source = null;
    (0, _scheduling.queueTask)(() => {
      const db = this._databases.get(name);
      const oldVersion = db !== undefined ? db.version : 0;
      deleteDatabase(this._databases, name, request, err => {
        if (err) {
          request.error = new DOMException(err.message, err.name);
          request.readyState = "done";
          const event = new _FakeEvent.default("error", {
            bubbles: true,
            cancelable: true
          });
          event.eventPath = [];
          request.dispatchEvent(event);
          return;
        }
        request.result = undefined;
        request.readyState = "done";
        const event2 = new _FDBVersionChangeEvent.default("success", {
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
    if (arguments.length > 1 && version !== undefined) {
      // Based on spec, not sure why "MAX_SAFE_INTEGER" instead of "unsigned long long", but it's needed to pass
      // tests
      version = (0, _enforceRange.default)(version, "MAX_SAFE_INTEGER");
    }
    if (version === 0) {
      throw new TypeError();
    }
    const request = new _FDBOpenDBRequest.default();
    request.source = null;
    (0, _scheduling.queueTask)(() => {
      openDatabase(this._databases, name, version, request, (err, connection) => {
        if (err) {
          request.result = undefined;
          request.readyState = "done";
          request.error = new DOMException(err.message, err.name);
          const event = new _FakeEvent.default("error", {
            bubbles: true,
            cancelable: true
          });
          event.eventPath = [];
          request.dispatchEvent(event);
          return;
        }
        request.result = connection;
        request.readyState = "done";
        const event2 = new _FakeEvent.default("success");
        event2.eventPath = [];
        request.dispatchEvent(event2);
      });
    });
    return request;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbfactory-databases
  databases() {
    return new Promise(resolve => {
      const result = [];
      for (const [name, database] of this._databases) {
        result.push({
          name,
          version: database.version
        });
      }
      resolve(result);
    });
  }
  toString() {
    return "[object IDBFactory]";
  }
}
var _default = exports.default = FDBFactory;
module.exports = exports.default;