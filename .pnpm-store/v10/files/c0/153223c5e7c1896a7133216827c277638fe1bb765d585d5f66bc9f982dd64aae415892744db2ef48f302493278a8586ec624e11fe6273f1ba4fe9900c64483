const fakeIndexedDB = require("../build/cjs/fakeIndexedDB.js");
const FDBCursor = require("../build/cjs/FDBCursor.js");
const FDBCursorWithValue = require("../build/cjs/FDBCursorWithValue.js");
const FDBDatabase = require("../build/cjs/FDBDatabase.js");
const FDBFactory = require("../build/cjs/FDBFactory.js");
const FDBIndex = require("../build/cjs/FDBIndex.js");
const FDBKeyRange = require("../build/cjs/FDBKeyRange.js");
const FDBObjectStore = require("../build/cjs/FDBObjectStore.js");
const FDBRecord = require("../build/cjs/FDBRecord.js");
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

// Partly match the native behavior for `globalThis.indexedDB`, `globalThis.IDBCursor`, etc.
// Per the IDL, `indexedDB` is readonly but the others are readwrite. For us, though, we want it to still
// be overwritable with `globalThis.<global> = ...`, so we make them all readwrite.
// https://w3c.github.io/IndexedDB/#idl-index
const createPropertyDescriptor = (value) => {
    return {
        value,
        enumerable: false,
        configurable: true,
        writable: true,
    };
};

Object.defineProperties(globalVar, {
    indexedDB: createPropertyDescriptor(fakeIndexedDB),
    IDBCursor: createPropertyDescriptor(FDBCursor),
    IDBCursorWithValue: createPropertyDescriptor(FDBCursorWithValue),
    IDBDatabase: createPropertyDescriptor(FDBDatabase),
    IDBFactory: createPropertyDescriptor(FDBFactory),
    IDBIndex: createPropertyDescriptor(FDBIndex),
    IDBKeyRange: createPropertyDescriptor(FDBKeyRange),
    IDBObjectStore: createPropertyDescriptor(FDBObjectStore),
    IDBOpenDBRequest: createPropertyDescriptor(FDBOpenDBRequest),
    IDBRecord: createPropertyDescriptor(FDBRecord),
    IDBRequest: createPropertyDescriptor(FDBRequest),
    IDBTransaction: createPropertyDescriptor(FDBTransaction),
    IDBVersionChangeEvent: createPropertyDescriptor(FDBVersionChangeEvent),
});
