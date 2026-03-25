import * as VFS from "../../src/VFS.js";
import { IDBBatchAtomicVFS as MyVFS } from "../../src/examples/IDBBatchAtomicVFS.js";
// import { IDBMirrorVFS as MyVFS } from "../../src/examples/IDBMirrorVFS.js";

// Install the service worker as soon as possible.
globalThis.addEventListener('install', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(globalThis.skipWaiting());
});
globalThis.addEventListener('activate', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(globalThis.clients.claim());
});

globalThis.addEventListener('fetch', async (/** @type {FetchEvent} */ event) => {
  const url = new URL(event.request.url);
  if (!url.href.includes(globalThis.registration.scope)) return;
  if (!url.pathname.endsWith('export')) return;

  // A "check" request just returns a valid response. This lets any
  // client context test whether the service worker is active.
  if (url.searchParams.has('check')) {
    return event.respondWith(new Response('OK'));
  }

  // Keep the service worker alive until the download is complete.
  let releaseEvent;
  event.waitUntil(new Promise(resolve => releaseEvent = resolve));

  return event.respondWith((async () => {
    // Create the VFS and streaming source using the request parameters.
    const vfs = await MyVFS.create(url.searchParams.get('idb'), null);
    const path = url.searchParams.get('db');
    const source = new DatabaseSource(vfs, path);

    source.isDone.finally(() => {
      vfs.close();
      releaseEvent();
    });

    return new Response(new ReadableStream(source), {
      headers: {
        "Content-Type": 'application/vnd.sqlite3',
        "Content-Disposition": `attachment; filename=${path.match(/[^/]+$/)[0]}`
      }
    });
  })());
});

// This is a stateful source object for a ReadableStream.
class DatabaseSource {
  isDone;

  #vfs;
  #path;
  #fileId = Math.floor(Math.random() * 0x100000000);
  #iOffset = 0;
  #bytesRemaining = 0;

  #onDone = [];
  #resolve;
  #reject;

  constructor(vfs, path) {
    this.#vfs = vfs;
    this.#path = path;
    this.isDone = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    }).finally(async () => {
      while (this.#onDone.length) {
        await this.#onDone.pop()();
      }
    });
  }

  async start(controller) {
    try {
      // Open the file for reading.
      const flags = VFS.SQLITE_OPEN_MAIN_DB | VFS.SQLITE_OPEN_READONLY;
      await check(this.#vfs.jOpen(this.#path, this.#fileId, flags, {setInt32(){}}));
      this.#onDone.push(() => this.#vfs.jClose(this.#fileId));
      await check(this.#vfs.jLock(this.#fileId, VFS.SQLITE_LOCK_SHARED));
      this.#onDone.push(() => this.#vfs.jUnlock(this.#fileId, VFS.SQLITE_LOCK_NONE));

      // Get the file size.
      const fileSize = new DataView(new ArrayBuffer(8));
      await check(this.#vfs.jFileSize(this.#fileId, fileSize));
      this.#bytesRemaining = Number(fileSize.getBigUint64(0, true));
    } catch (e) {
      controller.error(e);
      this.#reject(e);
    }
  }

  async pull(controller) {
    try {
      const buffer = new Uint8Array(Math.min(this.#bytesRemaining, 65536));
      await check(this.#vfs.jRead(this.#fileId, buffer, this.#iOffset));
      controller.enqueue(buffer);

      this.#iOffset += buffer.byteLength;
      this.#bytesRemaining -= buffer.byteLength;
      if (this.#bytesRemaining === 0) {
        controller.close();
        this.#resolve();
      }
    } catch (e) {
      controller.error(e);
      this.#reject(e);
    }
  }

  cancel(reason) {
    this.#reject(new Error(reason));
  }
};

async function check(code) {
  if (await code !== VFS.SQLITE_OK) {
    throw new Error(`Error code: ${await code}`);
  }
}