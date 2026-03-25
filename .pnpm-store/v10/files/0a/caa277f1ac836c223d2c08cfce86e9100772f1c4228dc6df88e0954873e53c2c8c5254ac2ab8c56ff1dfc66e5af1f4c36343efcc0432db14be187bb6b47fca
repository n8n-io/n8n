import SQLiteESMFactory from '../../dist/wa-sqlite-async.mjs';
import * as SQLite from '../../src/sqlite-api.js';
import { IDBBatchAtomicVFS as MyVFS } from "../../src/examples/IDBBatchAtomicVFS.js";
// import { IDBMirrorVFS as MyVFS } from "../../src/examples/IDBMirrorVFS.js";

const SEARCH_PARAMS = new URLSearchParams(location.search);
const IDB_NAME = SEARCH_PARAMS.get('idb') ?? 'sqlite-vfs';
const DB_NAME = SEARCH_PARAMS.get('db') ?? 'sqlite.db';

(async function() {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = await MyVFS.create(IDB_NAME, module);
  // @ts-ignore
  sqlite3.vfs_register(vfs, true);

  const db = await sqlite3.open_v2(DB_NAME, SQLite.SQLITE_OPEN_READWRITE, IDB_NAME);

  const results = []
  await sqlite3.exec(db, 'PRAGMA integrity_check;', (row, columns) => {
    results.push(row[0]);
  });
  await sqlite3.close(db);
  
  postMessage(results);
})();