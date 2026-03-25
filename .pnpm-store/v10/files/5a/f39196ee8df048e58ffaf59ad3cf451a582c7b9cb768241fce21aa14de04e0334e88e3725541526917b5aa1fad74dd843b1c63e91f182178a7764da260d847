// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.

// Uncomment one of the following imports to choose which SQLite build
// to use. Note that an asynchronous VFS requires an asynchronous build
// (Asyncify or JSPI). As of 2024-05-26, JSPI is only available behind
// a flag on Chromium browsers.
// import SQLiteESMFactory from '../../dist/wa-sqlite.mjs';
import SQLiteESMFactory from '../../dist/wa-sqlite-async.mjs';
// import SQLiteESMFactory from '../../dist/wa-sqlite-jspi.mjs';

// Uncomment one of the following imports to choose a VFS. Note that an
// asynchronous VFS requires an asynchronous build, and an VFS using
// FileSystemSyncAccessHandle (generally any OPFS VFS) will run only
// in a Worker.
//
// Note that certain VFS classes cannot read each others' databases, e.g.
// IDBBatchAtomicVFS and IDBMirrorVFS, OPFSPermutedVFS and any other OPFS
// VFS. If you change this demo to use a different VFS, you may need to
// clear the appropriate storage for things to work.
import { IDBBatchAtomicVFS as MyVFS } from '../../src/examples/IDBBatchAtomicVFS.js';
// import { IDBMirrorVFS as MyVFS } from '../../src/examples/IDBMirrorVFS.js';
// import { AccessHandlePoolVFS as MyVFS } from '../../src/examples/AccessHandlePoolVFS.js';
// import { OPFSAdaptiveVFS as MyVFS } from '../../src/examples/OPFSAdaptiveVFS.js';
// import { OPFSAnyContextVFS as MyVFS } from '../../src/examples/OPFSAnyContextVFS.js';
// import { OPFSCoopSyncVFS as MyVFS } from '../../src/examples/OPFSCoopSyncVFS.js';
// import { OPFSPermutedVFS as MyVFS } from '../../src/examples/OPFSPermutedVFS.js';

import * as SQLite from '../../src/sqlite-api.js';

Promise.resolve().then(async () => {
  // Set up communications with the main thread.
  const messagePort = await new Promise(resolve => {
    addEventListener('message', function handler(event) {
      if (event.data === 'messagePort') {
        resolve(event.ports[0]);
        removeEventListener('message', handler);
      }
    });
  });

  // Initialize SQLite.
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  // Register a custom file system.
  const vfs = await MyVFS.create('hello', module);
  // @ts-ignore
  sqlite3.vfs_register(vfs, true);

  // Open the database.
  const db = await sqlite3.open_v2('test');

  // Handle SQL from the main thread.
  messagePort.addEventListener('message', async event => {
    const sql = event.data;
    try {
      // Query the database. Note that although sqlite3.exec() accepts
      // multiple statements in a single call, this usage is not recommended
      // unless the statements are idempotent (i.e. resubmitting them is
      // harmless) or you know your VFS will never return SQLITE_BUSY.
      // See https://github.com/rhashimoto/wa-sqlite/discussions/171
      const results = [];
      await sqlite3.exec(db, sql, (row, columns) => {
        if (columns != results.at(-1)?.columns) {
          results.push({ columns, rows: [] });
        }
        results.at(-1).rows.push(row);
      });

      // Return the results.
      messagePort.postMessage(results);
    } catch (error) {
      messagePort.postMessage({ error: error.message });
    }
  });
  messagePort.start();
});
