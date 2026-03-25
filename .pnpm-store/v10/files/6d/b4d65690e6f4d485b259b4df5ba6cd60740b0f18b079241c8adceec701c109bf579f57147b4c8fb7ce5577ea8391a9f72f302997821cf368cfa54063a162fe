import SQLiteESMFactory from '../../dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS as MyVFS } from '../../src/examples/IDBBatchAtomicVFS.js';
import * as SQLite from '../../src/sqlite-api.js';

addEventListener('message', async event => {
  try {
    const config = event.data;
    if (config.index === 0) {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('write_hint');
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });

      await navigator.locks.request('reset', { steal: true }, () => {});
    }
    await navigator.locks.request('reset', { mode: 'shared' }, () => {});

    const module = await SQLiteESMFactory();
    const sqlite3 = SQLite.Factory(module);
    const vfs = await MyVFS.create('write_hint', module, {
      lockPolicy: config.writeHint ? 'shared+hint' : 'shared'
    });
    // @ts-ignore
    sqlite3.vfs_register(vfs, true);
    const db = await sqlite3.open_v2('test');

    if (config.index === 0) {
      await sqlite3.exec(db, config.preamble);
    }

    await new Promise(resolve => {
      const broadcast = new BroadcastChannel('write_hint');
      broadcast.addEventListener('message', resolve, { once: true });
      postMessage('ready');
    });

    let nBusy = 0;
    let nSuccess = 0;
    while (true) {
      try {
        const rows = [];
        await sqlite3.exec(db, config.transaction, row => rows.push(row));
        if (!rows.length) break;
        nSuccess++;
      } catch (e) {
        if (e.code !== SQLite.SQLITE_BUSY) throw e;
        nBusy++;
      }
    }

    await sqlite3.close(db);
    postMessage({ index: config.index, nBusy, nSuccess });
  } catch (e) {
    postMessage({ error: e.message });
    throw e;
  }
});