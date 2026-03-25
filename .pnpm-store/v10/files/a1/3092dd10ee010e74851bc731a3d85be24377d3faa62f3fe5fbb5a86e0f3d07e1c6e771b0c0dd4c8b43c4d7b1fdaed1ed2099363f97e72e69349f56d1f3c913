const fakeIndexedDB = require("../build/cjs/fakeIndexedDB.js");
const FDBCursor = require("../build/cjs/FDBCursor.js");
const FDBCursorWithValue = require("../build/cjs/FDBCursorWithValue.js");
const FDBDatabase = require("../build/cjs/FDBDatabase.js");
const FDBFactory = require("../build/cjs/FDBFactory.js");
const FDBIndex = require("../build/cjs/FDBIndex.js");
const FDBKeyRange = require("../build/cjs/FDBKeyRange.js");
const FDBObjectStore = require("../build/cjs/FDBObjectStore.js");
const FDBOpenDBRequest = require("../build/cjs/FDBOpenDBRequest.js");
const FDBRequest = require("../build/cjs/FDBRequest.js");
const FDBTransaction = require("../build/cjs/FDBTransaction.js");
const FDBVersionChangeEvent = require("../build/cjs/FDBVersionChangeEvent.js");

// http://stackoverflow.com/a/33268326/786644 - works in browser, worker, and Node.js
var globalVar =
    typeof window !== "undefined"
        ? window
        : typeof WorkerGlobalScope !== "undefined"
        ? self
        : typeof global !== "undefined"
        ? global
        : Function("return this;")();

globalVar.indexedDB = fakeIndexedDB;
globalVar.IDBCursor = FDBCursor;
globalVar.IDBCursorWithValue = FDBCursorWithValue;
globalVar.IDBDatabase = FDBDatabase;
globalVar.IDBFactory = FDBFactory;
globalVar.IDBIndex = FDBIndex;
globalVar.IDBKeyRange = FDBKeyRange;
globalVar.IDBObjectStore = FDBObjectStore;
globalVar.IDBOpenDBRequest = FDBOpenDBRequest;
globalVar.IDBRequest = FDBRequest;
globalVar.IDBTransaction = FDBTransaction;
globalVar.IDBVersionChangeEvent = FDBVersionChangeEvent;
