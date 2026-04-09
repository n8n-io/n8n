import fakeIndexedDB from "../build/esm/fakeIndexedDB.js";
import FDBCursor from "../build/esm/FDBCursor.js";
import FDBCursorWithValue from "../build/esm/FDBCursorWithValue.js";
import FDBDatabase from "../build/esm/FDBDatabase.js";
import FDBFactory from "../build/esm/FDBFactory.js";
import FDBIndex from "../build/esm/FDBIndex.js";
import FDBKeyRange from "../build/esm/FDBKeyRange.js";
import FDBObjectStore from "../build/esm/FDBObjectStore.js";
import FDBOpenDBRequest from "../build/esm/FDBOpenDBRequest.js";
import FDBRecord from "../build/esm/FDBRecord.js";
import FDBRequest from "../build/esm/FDBRequest.js";
import FDBTransaction from "../build/esm/FDBTransaction.js";
import FDBVersionChangeEvent from "../build/esm/FDBVersionChangeEvent.js";

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
