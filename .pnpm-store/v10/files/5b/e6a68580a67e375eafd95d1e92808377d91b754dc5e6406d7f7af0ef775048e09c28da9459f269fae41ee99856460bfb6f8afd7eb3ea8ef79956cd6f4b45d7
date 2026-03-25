import { FacadeVFS } from '../FacadeVFS.js';
import * as VFS from '../VFS.js';

// Options for navigator.locks.request().
/** @type {LockOptions} */ const SHARED = { mode: 'shared' };
/** @type {LockOptions} */ const POLL_SHARED = { ifAvailable: true, mode: 'shared' };
/** @type {LockOptions} */ const POLL_EXCLUSIVE = { ifAvailable: true, mode: 'exclusive' };

// Used only for debug logging.
const contextId = Math.random().toString(36).slice(2);

/**
 * @typedef {Object} Transaction
 * @property {string} [path]
 * @property {number} txId
 * @property {Map<number, Uint8Array?>} [blocks]
 * @property {number} [fileSize]
 */

class File {
  /** @type {string} */ path;
  /** @type {number} */ flags;

  /** @type {number} */ blockSize;
  /** @type {Map<number, Uint8Array>} */ blocks;

  // Members below are only used for SQLITE_OPEN_MAIN_DB.

  /** @type {Transaction} */ viewTx; // last transaction incorporated
  /** @type {function?} */ viewReleaser;

  /** @type {BroadcastChannel} */ broadcastChannel;
  /** @type {Transaction[]} */ broadcastReceived;

  /** @type {number} */ lockState;
  /** @type {{write?: function, reserved?: function, hint?: function}} */ locks;

  /** @type {AbortController} */ abortController;

  /** @type {Transaction?} */ txActive;
  /** @type {boolean} */ txWriteHint;
  /** @type {boolean} */ txOverwrite;

  /** @type {string} */ synchronous;

  constructor(pathname, flags) {
    this.path = pathname;
    this.flags = flags;

    this.blockSize = 0;
    this.blocks = new Map();
    if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
      this.viewTx = null;
      this.viewReleaser = null;
      this.broadcastChannel = new BroadcastChannel('mirror:' + pathname);
      this.broadcastReceived = [];
      this.lockState = VFS.SQLITE_LOCK_NONE;
      this.locks = {};
      this.txActive = null;
      this.txWriteHint = false;
      this.txOverwrite = false;
      this.synchronous = 'full';
    }
  }
}

export class IDBMirrorVFS extends FacadeVFS {
  /** @type {Map<number, File>} */ #mapIdToFile = new Map();
  /** @type {Map<string, File>} */ #mapPathToFile = new Map();
  #lastError = null;

  /** @type {IDBDatabase} */ #idb;

  log = null; // console.log;

  /** @type {Promise} */ #isReady;

  static async create(name, module, options) {
    const instance = new IDBMirrorVFS(name, module, options);
    await instance.isReady();
    return instance;
  }

  constructor(name, module, options = {}) {
    super(name, module);
    this.#isReady = this.#initialize(name);
  }

  async #initialize(name) {
    // Open IndexedDB database, creating it if necessary.
    this.#idb = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        switch (event.oldVersion) {
          case 0:
            db.createObjectStore('blocks', { keyPath: ['path', 'offset'] });
            db.createObjectStore('tx', { keyPath: ['path', 'txId'] });
            break;
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  close() {
    return this.#idb.close();
  }

  async isReady() {
    await super.isReady();
    return this.#isReady;
  }

  /**
   * @param {string?} zName 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {Promise<number>}
   */
  async jOpen(zName, fileId, flags, pOutFlags) {
    try {
      const url = new URL(zName || Math.random().toString(36).slice(2), 'file://');
      const path = url.pathname;

      let file;
      if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
        // TODO
        file = new File(path, flags);

        const idbTx = this.#idb.transaction(['blocks', 'tx'], 'readwrite');
        const blocks = idbTx.objectStore('blocks');
        if (await idbX(blocks.count([path, 0])) === 0) {
          // File does not yet exist.
          if (flags & VFS.SQLITE_OPEN_CREATE) {
            await idbX(blocks.put({ path, offset: 0, data: new Uint8Array(0) }));
          } else {
            throw new Error('File not found');
          }
        }
  
        // Load pages into memory from IndexedDB.
        await new Promise((resolve, reject) => {
          const range = IDBKeyRange.bound([path, 0], [path, Infinity]);
          const request = blocks.openCursor(range);
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              const { offset, data } = cursor.value;
              file.blocks.set(offset, data);
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
        file.blockSize = file.blocks.get(0)?.byteLength ?? 0;

        // Get the last transaction id.
        const transactions = idbTx.objectStore('tx');
        file.viewTx = await new Promise((resolve, reject) => {
          const range = IDBKeyRange.bound([path, 0], [path, Infinity]);
          const request = transactions.openCursor(range, 'prev');
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              resolve(cursor.value);
            } else {
              resolve({ txId: 0 });
            }
          };
          request.onerror = () => reject(request.error);
        });

        // Publish our view of the database. This prevents other connections
        // from overwriting file data we still need.
        await this.#setView(file, file.viewTx);

        // Listen for broadcasts. Messages are cached until the database
        // is unlocked.
        file.broadcastChannel.addEventListener('message', event => {
          file.broadcastReceived.push(event.data);
          if (file.lockState === VFS.SQLITE_LOCK_NONE) {
            this.#processBroadcasts(file);
          }
        });
      } else {
        // Not a main database so not stored in IndexedDB.
        file = this.#mapPathToFile.get(path);
        if (!file) {
          if (flags & VFS.SQLITE_OPEN_CREATE) {
            file = new File(path, flags);
            file.blocks.set(0, new Uint8Array(0));
          } else {
            throw new Error('File not found');
          }
        }
      }

      pOutFlags.setInt32(0, flags, true);
      this.#mapIdToFile.set(fileId, file);
      this.#mapPathToFile.set(path, file);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.#lastError = e;
      return VFS.SQLITE_CANTOPEN;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} syncDir 
   * @returns {Promise<number>}
   */
  async jDelete(zName, syncDir) {
    try {
      const url = new URL(zName, 'file://');
      const pathname = url.pathname;

      const result = await this.#deleteFile(pathname);
      if (syncDir) {
        await result;
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_DELETE;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async jAccess(zName, flags, pResOut) {
    try {
      const url = new URL(zName, 'file://');
      const pathname = url.pathname;

      // This test ignores main database files that have not been opened
      // with this connection. SQLite does not call jAccess() on main
      // database files, so avoiding an IndexedDB test saves time.
      const exists = this.#mapPathToFile.has(pathname);
      pResOut.setInt32(0, exists ? 1 : 0, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.#lastError = e;
      return VFS.SQLITE_IOERR_ACCESS;
    }
  }

  /**
   * @param {number} fileId 
   * @returns {Promise<number>}
   */
  async jClose(fileId) {
    try {
      const file = this.#mapIdToFile.get(fileId);
      this.#mapIdToFile.delete(fileId);

      if (file?.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        file.broadcastChannel.close();
        file.viewReleaser?.();
      }

      if (file?.flags & VFS.SQLITE_OPEN_DELETEONCLOSE) {
        this.#deleteFile(file.path);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_CLOSE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jRead(fileId, pData, iOffset) {
    try {
      const file = this.#mapIdToFile.get(fileId);

      let bytesRead = 0;
      let pDataOffset = 0;
      while (pDataOffset < pData.byteLength) {
        // File data is stored in fixed-size blocks. Get the next block
        // needed.
        const fileOffset = iOffset + pDataOffset;
        const blockIndex = Math.floor(fileOffset / file.blockSize);
        const blockOffset = fileOffset % file.blockSize;
        const block =
          file.txActive?.blocks.get(blockIndex * file.blockSize) ??
          file.blocks.get(blockIndex * file.blockSize);
        if (!block) {
          break;
        }

        // Copy block data to the read buffer.
        const blockLength = Math.min(
          block.byteLength - blockOffset,
          pData.byteLength - pDataOffset);
        pData.set(block.subarray(blockOffset, blockOffset + blockLength), pDataOffset);
        pDataOffset += blockLength;
        bytesRead += blockLength;
      }

      if (bytesRead < pData.byteLength) {
        pData.fill(0, bytesRead);
        return VFS.SQLITE_IOERR_SHORT_READ;
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.#lastError = e;
      return VFS.SQLITE_IOERR_READ;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jWrite(fileId, pData, iOffset) {
    try {
      const file = this.#mapIdToFile.get(fileId);

      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        this.#requireTxActive(file);
        // SQLite is not necessarily written sequentially, so fill in the
        // unwritten blocks here.
        for (let fillOffset = file.txActive.fileSize;
             fillOffset < iOffset; fillOffset += pData.byteLength) {
          file.txActive.blocks.set(fillOffset, new Uint8Array(pData.byteLength));
        }
        file.txActive.blocks.set(iOffset, pData.slice());
        file.txActive.fileSize = Math.max(file.txActive.fileSize, iOffset + pData.byteLength);
        file.blockSize = pData.byteLength;
      } else {
        // All files that are not main databases are stored in a single
        // block.
        let block = file.blocks.get(0);
        if (iOffset + pData.byteLength > block.byteLength) {
          // Resize the block buffer.
          const newSize = Math.max(iOffset + pData.byteLength, 2 * block.byteLength);
          const newBlock = new Uint8Array(newSize);
          newBlock.set(block);
          file.blocks.set(0, newBlock);
          block = newBlock;
        }
        block.set(pData, iOffset);
        file.blockSize = Math.max(file.blockSize, iOffset + pData.byteLength);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_WRITE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {number}
   */
  jTruncate(fileId, iSize) {
    try {
      const file = this.#mapIdToFile.get(fileId);

      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        this.#requireTxActive(file);
        file.txActive.fileSize = iSize;
      } else {
        // All files that are not main databases are stored in a single
        // block.
        if (iSize < file.blockSize) {
          const block = file.blocks.get(0);
          file.blocks.set(0, block.subarray(0, iSize));
          file.blockSize = iSize;
        }
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      console.error(e);
      this.lastError = e;
      return VFS.SQLITE_IOERR_TRUNCATE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number|Promise<number>}
   */
  jFileSize(fileId, pSize64) {
    const file = this.#mapIdToFile.get(fileId);
    const size = file.txActive?.fileSize ?? file.blockSize * file.blocks.size;
    pSize64.setBigInt64(0, BigInt(size), true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jLock(fileId, lockType) {
    const file = this.#mapIdToFile.get(fileId);
    if (lockType <= file.lockState) return VFS.SQLITE_OK;
    switch (lockType) {
      case VFS.SQLITE_LOCK_SHARED:
        if (file.txWriteHint) {
            // xFileControl() has hinted that this transaction will
            // write. Acquire the hint lock, which is required to reach
            // the RESERVED state.
            if (!await this.#lock(file, 'hint')) {
              return VFS.SQLITE_BUSY;
            }
        }
        break;
      case VFS.SQLITE_LOCK_RESERVED:
        // Ideally we should already have the hint lock, but if not
        // poll for it here.
        if (!file.locks.hint && !await this.#lock(file, 'hint', POLL_EXCLUSIVE)) {
          return VFS.SQLITE_BUSY;
        }

        if (!await this.#lock(file, 'reserved', POLL_EXCLUSIVE)) {
          file.locks.hint();
          return VFS.SQLITE_BUSY;
        }

        // In order to write, our view of the database must be up to date.
        // To check this, first fetch all transactions in IndexedDB equal to
        // or greater than our view.
        const idbTx = this.#idb.transaction(['blocks', 'tx']);
        const range = IDBKeyRange.bound(
          [file.path, file.viewTx.txId],
          [file.path, Infinity]);

        /** @type {Transaction[]} */
        const entries = await idbX(idbTx.objectStore('tx').getAll(range));

        // Ideally the fetched list of transactions should contain one
        // entry matching our view. If not then our view is out of date.
        if (entries.length && entries.at(-1).txId > file.viewTx.txId) {
          // There are newer transactions in IndexedDB that we haven't
          // seen via broadcast. Ensure that they are incorporated on unlock,
          // and force the application to retry.
          const blocks = idbTx.objectStore('blocks');
          for (const entry of entries) {
            // When transactions are stored to IndexedDB, the page data is
            // stripped to save time and space. Restore the page data here.
            for (const offset of Array.from(entry.blocks.keys())) {
              const value = await idbX(blocks.get([file.path, offset]));
              entry.blocks.set(offset, value.data);
            }
          }
          file.broadcastReceived.push(...entries);
          file.locks.reserved();
          return VFS.SQLITE_BUSY
        }

        console.assert(entries[0]?.txId === file.viewTx.txId || !file.viewTx.txId);
        break;
      case VFS.SQLITE_LOCK_EXCLUSIVE:
        await this.#lock(file, 'write');
        break;
    }
    file.lockState = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {number}
   */
  jUnlock(fileId, lockType) {
    const file = this.#mapIdToFile.get(fileId);
    if (lockType >= file.lockState) return VFS.SQLITE_OK;
    switch (lockType) {
      case VFS.SQLITE_LOCK_SHARED:
        file.locks.write?.();
        file.locks.reserved?.();
        file.locks.hint?.();
        break;
      case VFS.SQLITE_LOCK_NONE:
        // Don't release the read lock here. It will be released on demand
        // when a broadcast notifies us that another connections wants to
        // VACUUM.
        this.#processBroadcasts(file);
        file.locks.write?.();
        file.locks.reserved?.();
        file.locks.hint?.();
        break;
    }
    file.lockState = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async jCheckReservedLock(fileId, pResOut) {
    try {
      const file = this.#mapIdToFile.get(fileId);
      console.assert(file.flags & VFS.SQLITE_OPEN_MAIN_DB);
      if (await this.#lock(file, 'reserved', POLL_SHARED)) {
        // This looks backwards, but if we get the lock then no one
        // else had it.
        pResOut.setInt32(0, 0, true);
        file.locks.reserved();
      } else {
        pResOut.setInt32(0, 1, true);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      console.error(e);
      this.lastError = e;
      return VFS.SQLITE_IOERR_LOCK;
    }
  }

  /**
   * @param {number} fileId
   * @param {number} op
   * @param {DataView} pArg
   * @returns {Promise<number>}
   */
  async jFileControl(fileId, op, pArg) {
    try {
      const file = this.#mapIdToFile.get(fileId);
      switch (op) {
        case VFS.SQLITE_FCNTL_PRAGMA:
          const key = cvtString(pArg, 4);
          const value = cvtString(pArg, 8);
          this.log?.('xFileControl', file.path, 'PRAGMA', key, value);
          switch (key.toLowerCase()) {
            case 'page_size':
              // Don't allow changing the page size.
              if (value && file.blockSize && Number(value) !== file.blockSize) {
                return VFS.SQLITE_ERROR;
              }
              break;
            case 'synchronous':
              // This VFS only recognizes 'full' and not 'full'.
              if (value) {
                switch (value.toLowerCase()) {
                  case 'full':
                  case '2':
                  case 'extra':
                  case '3':
                    file.synchronous = 'full';
                    break;
                  case 'normal':
                  case '1':
                    file.synchronous = 'normal';
                    break;
                  default:
                    console.warn(`unsupported synchronous mode: ${value}`);
                    return VFS.SQLITE_ERROR;
                  }
              }
              break;
            }
          break;
        case VFS.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE:
          this.log?.('xFileControl', 'BEGIN_ATOMIC_WRITE', file.path);
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE:
          this.log?.('xFileControl', 'COMMIT_ATOMIC_WRITE', file.path);
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE:
          this.#dropTx(file);
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_SYNC:
          // Propagate database writes to IndexedDB and other clients. Most
          // often this is a SQLite transaction, but it can also be a
          // journal rollback.
          //
          // If SQLITE_FCNTL_OVERWRITE has been received then propagation is
          // deferred until SQLITE_FCNTL_COMMIT_PHASETWO for file truncation.
          this.log?.('xFileControl', 'SYNC', file.path);
          if (file.txActive && !file.txOverwrite) {
            await this.#commitTx(file);
          }
          break;
        case VFS.SQLITE_FCNTL_OVERWRITE:
          // Marks the beginning of a VACUUM.
          file.txOverwrite = true;
          break;
        case VFS.SQLITE_FCNTL_COMMIT_PHASETWO:
            // Commit database writes for VACUUM. Other writes will already
            // be propagated by SQLITE_FCNTL_SYNC.
            this.log?.('xFileControl', 'COMMIT_PHASETWO', file.path);
            if (file.txActive) {
              await this.#commitTx(file);
            }
            file.txOverwrite = false;
            break;
        }
    } catch (e) {
      this.#lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return VFS.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} fileId
   * @returns {number|Promise<number>}
   */
  jDeviceCharacteristics(fileId) {
    return 0
    | VFS.SQLITE_IOCAP_BATCH_ATOMIC
    | VFS.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number}
   */
  jGetLastError(zBuf) {
    if (this.#lastError) {
      console.error(this.#lastError);
      const outputArray = zBuf.subarray(0, zBuf.byteLength - 1);
      const { written } = new TextEncoder().encodeInto(this.#lastError.message, outputArray);
      zBuf[written] = 0;
    }
    return VFS.SQLITE_OK
  }

  /**
   * 
   * @param {File} file 
   * @param {Transaction} tx 
   */
  #acceptTx(file, tx) {
    // Add/update transaction pages.
    for (const [offset, data] of tx.blocks) {
      file.blocks.set(offset, data);
      if (file.blockSize === 0) {
        file.blockSize = data.byteLength;
      }
    }

    let truncated = tx.fileSize + file.blockSize;
    while (file.blocks.delete(truncated)) {
      truncated += file.blockSize;
    }

    file.viewTx = tx;
  }

  /**
   * @param {File} file 
   */
  async #commitTx(file) {
    // Advance our own view. Even if we received our own broadcasts (we
    // don't), we want our view to be updated synchronously.
    this.#acceptTx(file, file.txActive);
    this.#setView(file, file.txActive);

    const oldestTxId = await this.#getOldestTxInUse(file);

    // Update IndexedDB page data.
    const idbTx = this.#idb.transaction(['blocks', 'tx'], 'readwrite');
    const blocks = idbTx.objectStore('blocks');
    for (const [offset, data] of file.txActive.blocks) {
      blocks.put({ path: file.path, offset, data });
    }

    // Delete obsolete transactions no longer needed.
    const oldRange = IDBKeyRange.bound(
      [file.path, -Infinity], [file.path, oldestTxId],
      false, true);
    idbTx.objectStore('tx').delete(oldRange);

    // Save transaction object. Omit page data as an optimization.
    const txSansData = Object.assign({}, file.txActive);
    txSansData.blocks = new Map(Array.from(file.txActive.blocks, ([k]) => [k, null]));
    idbTx.objectStore('tx').put(txSansData);

    // Broadcast transaction once it commits.
    const complete = new Promise((resolve, reject) => {
      const message = file.txActive;
      idbTx.oncomplete = () => {
        file.broadcastChannel.postMessage(message);
        resolve();
      };
      idbTx.onabort = () => reject(idbTx.error);
      idbTx.commit();
    });

    if (file.synchronous === 'full') {
      await complete;
    }

    file.txActive = null;
    file.txWriteHint = false;
  }

  /**
   * @param {File} file 
   */
  #dropTx(file) {
    file.txActive = null;
    file.txWriteHint = false;
  }

  /**
   * @param {File} file 
   */
  #requireTxActive(file) {
    if (!file.txActive) {
      file.txActive = {
        path: file.path,
        txId: file.viewTx.txId + 1,
        blocks: new Map(),
        fileSize: file.blockSize * file.blocks.size,
      };
    }
  }

  /**
   * @param {string} path 
   * @returns {Promise}
   */
  async #deleteFile(path) {
    this.#mapPathToFile.delete(path);

    // Only main databases are stored in IndexedDB and SQLite never
    // deletes main databases, but delete blocks here anyway for
    // standalone use.
    const request = this.#idb.transaction(['blocks'], 'readwrite')
      .objectStore('blocks')
      .delete(IDBKeyRange.bound([path, 0], [path, Infinity]));
    await new Promise((resolve, reject) => {
      const idbTx = request.transaction;
      idbTx.oncomplete = resolve;
      idbTx.onerror = () => reject(idbTx.error);
    });
  }

  /**
   * @param {File} file 
   * @returns {Promise<number>}
   */
  async #getOldestTxInUse(file) {
    // Each connection holds a shared Web Lock with a name that encodes
    // the latest transaction it knows about. We can find the oldest
    // transaction by listing the those locks and extracting the earliest
    // transaction id.
    const TX_LOCK_REGEX = /^(.*)@@\[(\d+)\]$/;
    let oldestTxId = file.viewTx.txId;
    const locks = await navigator.locks.query();
    for (const { name } of locks.held) {
      const m = TX_LOCK_REGEX.exec(name);
      if (m && m[1] === file.path) {
        oldestTxId = Math.min(oldestTxId, Number(m[2]));
      }
    }
    return oldestTxId;
  }

  /**
   * Acquire one of the database file internal Web Locks.
   * @param {File} file 
   * @param {'write'|'reserved'|'hint'} name 
   * @param {LockOptions} options 
   * @returns {Promise<boolean>}
   */
  #lock(file, name, options = {}) {
    return new Promise(resolve => {
      const lockName = `${file.path}@@${name}`;
      navigator.locks.request(lockName, options, lock => {
        if (lock) {
          return new Promise(release => {
            file.locks[name] = () => {
              release();
              file.locks[name] = null;
            };
            resolve(true);
          });
        } else {
          file.locks[name] = null;
          resolve(false);
        }
      }).catch(e => {
        if (e.name !== 'AbortError') throw e;
      });
    });
  }

  /**
   * Handle prevously received messages from other connections.
   * @param {File} file 
   */
  #processBroadcasts(file) {
    // Sort transaction messages by id.
    file.broadcastReceived.sort((a, b) => a.txId - b.txId);

    let nHandled = 0;
    let newTx = file.viewTx;
    for (const message of file.broadcastReceived) {
      if (message.txId <= newTx.txId) {
        // This transaction is already incorporated into our view.
      } else if (message.txId === newTx.txId + 1) {
        // This is the next expected transaction.
        this.log?.(`accept tx ${message.txId}`);
        this.#acceptTx(file, message);
        newTx = message;
      } else {
        // There is a gap in the transaction sequence.
        console.warn(`missing tx ${newTx.txId + 1} (got ${message.txId})`);
        break;
      }
      nHandled++;
    }

    // Remove handled messages from the list.
    file.broadcastReceived.splice(0, nHandled);

    // Tell other connections about a change in our view.
    if (newTx.txId > file.viewTx.txId) {
      // No need to await here.
      this.#setView(file, newTx);
    }
  }

  /**
   * @param {File} file 
   * @param {Transaction} tx 
   */
  async #setView(file, tx) {
    // Publish our view of the database with a lock name that includes
    // the transaction id. As long as we hold the lock, no other connection
    // will overwrite data we are using.
    file.viewTx = tx;
    const lockName = `${file.path}@@[${tx.txId}]`;
    const newReleaser = await new Promise(resolve => {
      navigator.locks.request(lockName, SHARED, lock => {
        return new Promise(release => {
          resolve(release);
        });
      });
    });

    // The new lock is acquired so release the old one.
    file.viewReleaser?.();
    file.viewReleaser = newReleaser;
  }
}

/**
 * Wrap IndexedDB request with a Promise.
 * @param {IDBRequest} request 
 * @returns 
 */
function idbX(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Extract a C string from WebAssembly memory.
 * @param {DataView} dataView 
 * @param {number} offset 
 * @returns 
 */
function cvtString(dataView, offset) {
  const p = dataView.getUint32(offset, true);
  if (p) {
    const chars = new Uint8Array(dataView.buffer, p);
    return new TextDecoder().decode(chars.subarray(0, chars.indexOf(0)));
  }
  return null;
}
