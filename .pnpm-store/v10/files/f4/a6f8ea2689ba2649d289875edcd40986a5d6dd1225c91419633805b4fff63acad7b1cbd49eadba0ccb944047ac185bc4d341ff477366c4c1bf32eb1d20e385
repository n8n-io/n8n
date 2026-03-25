import fakeIndexedDB from "../build/esm/fakeIndexedDB.js";
import FDBCursor from "../build/esm/FDBCursor.js";
import FDBCursorWithValue from "../build/esm/FDBCursorWithValue.js";
import FDBDatabase from "../build/esm/FDBDatabase.js";
import FDBFactory from "../build/esm/FDBFactory.js";
import FDBIndex from "../build/esm/FDBIndex.js";
import FDBKeyRange from "../build/esm/FDBKeyRange.js";
import FDBObjectStore from "../build/esm/FDBObjectStore.js";
import FDBOpenDBRequest from "../build/esm/FDBOpenDBRequest.js";
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
