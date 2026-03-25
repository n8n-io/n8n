// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import { FacadeVFS } from '../FacadeVFS.js';
import * as VFS from '../VFS.js';
import { WebLocksMixin } from '../WebLocksMixin.js';

const RETRYABLE_ERRORS = new Set([
  'TransactionInactiveError',
  'InvalidStateError'
]);

/**
 * @typedef Metadata
 * @property {string} name
 * @property {number} fileSize
 * @property {number} version
 * @property {number} [pendingVersion]
 */

class File {
  /** @type {string} */ path;
  /** @type {number} */ flags;

  /** @type {Metadata} */ metadata;
  /** @type {number} */ fileSize = 0;

  /** @type {boolean} */ needsMetadataSync = false;
  /** @type {Metadata} */ rollback = null;
  /** @type {Set<number>} */ changedPages = new Set();

  /** @type {string} */ synchronous = 'full';
  /** @type {IDBTransactionOptions} */ txOptions = { durability: 'strict' };

  constructor(path, flags, metadata) {
    this.path = path;
    this.flags = flags;
    this.metadata = metadata;
  }
}

export class IDBBatchAtomicVFS extends WebLocksMixin(FacadeVFS) {
  /** @type {Map<number, File>} */ mapIdToFile = new Map();
  lastError = null;

  log = null; // console.log

  /** @type {Promise} */ #isReady;
  /** @type {IDBContext} */ #idb;

  static async create(name, module, options) {
    const vfs = new IDBBatchAtomicVFS(name, module, options);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module, options = {}) {
    super(name, module, options);
    this.#isReady = this.#initialize(options.idbName ?? name);
  }

  async #initialize(name) {
    this.#idb = await IDBContext.create(name);
  }

  close() {
    this.#idb.close();
  }
  
  async isReady() {
    await super.isReady();
    await this.#isReady;
  }

  getFilename(fileId) {
    const pathname = this.mapIdToFile.get(fileId).path;
    return `IDB(${this.name}):${pathname}`
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

      let meta = await this.#idb.q(({ metadata }) => metadata.get(path));
      if (!meta && (flags & VFS.SQLITE_OPEN_CREATE)) {
        meta = {
          name: path,
          fileSize: 0,
          version: 0
        };
        await this.#idb.q(({ metadata }) => metadata.put(meta), 'rw');
      }
      
      if (!meta) {
        throw new Error(`File ${path} not found`);
      }

      const file = new File(path, flags, meta);
      this.mapIdToFile.set(fileId, file);
      pOutFlags.setInt32(0, flags, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
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
      const path = url.pathname;

      this.#idb.q(({ metadata, blocks }) => {
        const range = IDBKeyRange.bound([path, -Infinity], [path, Infinity]);
        blocks.delete(range);
        metadata.delete(path);
      }, 'rw');

      if (syncDir) {
        await this.#idb.sync(false);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
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
      const path = url.pathname;

      const meta = await this.#idb.q(({ metadata }) => metadata.get(path));
      pResOut.setInt32(0, meta ? 1 : 0, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_ACCESS;
    } 
  }

  /**
   * @param {number} fileId 
   * @returns {Promise<number>}
   */
  async jClose(fileId) {
    try {
      const file = this.mapIdToFile.get(fileId);
      this.mapIdToFile.delete(fileId);

      if (file.flags & VFS.SQLITE_OPEN_DELETEONCLOSE) {
        await this.#idb.q(({ metadata, blocks }) => {
          metadata.delete(file.path);
          blocks.delete(IDBKeyRange.bound([file.path, 0], [file.path, Infinity]));
        }, 'rw');        
      }

      if (file.needsMetadataSync) {
        this.#idb.q(({ metadata }) => metadata.put(file.metadata), 'rw');
      }
      await this.#idb.sync(file.synchronous === 'full');
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_CLOSE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {Promise<number>}
   */
  async jRead(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);

      let pDataOffset = 0;
      while (pDataOffset < pData.byteLength) {
        // Fetch the IndexedDB block for this file location.
        const fileOffset = iOffset + pDataOffset;
        const block = await this.#idb.q(({ blocks }) => {
          const range = IDBKeyRange.bound([file.path, -fileOffset], [file.path, Infinity]);
          return blocks.get(range);
        });       
        
        if (!block || block.data.byteLength - block.offset <= fileOffset) {
          pData.fill(0, pDataOffset);
          return VFS.SQLITE_IOERR_SHORT_READ;
        }

        // Copy block data.
        const dst = pData.subarray(pDataOffset);
        const srcOffset = fileOffset + block.offset;
        const nBytesToCopy = Math.min(
          Math.max(block.data.byteLength - srcOffset, 0),
          dst.byteLength);
        dst.set(block.data.subarray(srcOffset, srcOffset + nBytesToCopy));
        pDataOffset += nBytesToCopy;
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
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
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        if (!file.rollback) {
          // Begin a new write transaction.
          // Add pendingVersion to the metadata in IndexedDB. If we crash
          // during the transaction, this lets subsequent connections
          // know to remove blocks from the failed transaction.
          const pending = Object.assign(
            { pendingVersion: file.metadata.version - 1 },
            file.metadata);
          this.#idb.q(({ metadata }) => metadata.put(pending), 'rw', file.txOptions);

          file.rollback = Object.assign({}, file.metadata);
          file.metadata.version--;
        }
      }

      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        file.changedPages.add(iOffset);
      }

      const data = pData.slice();
      const version = file.metadata.version;
      const isOverwrite = iOffset < file.metadata.fileSize;
      if (!isOverwrite ||
          file.flags & VFS.SQLITE_OPEN_MAIN_DB ||
          file.flags & VFS.SQLITE_OPEN_TEMP_DB) {
        const block = {
          path: file.path,
          offset: -iOffset,
          version: version,
          data: pData.slice()
        };
        this.#idb.q(({ blocks }) => {
          blocks.put(block);
          file.changedPages.add(iOffset);
        }, 'rw', file.txOptions);
      } else {
        this.#idb.q(async ({ blocks }) => {
          // Read the existing block.
          const range = IDBKeyRange.bound(
            [file.path, -iOffset],
            [file.path, Infinity]);
          const block = await blocks.get(range);

          // Modify the block data.
          // @ts-ignore
          block.data.subarray(iOffset + block.offset).set(data);

          // Write back.
          blocks.put(block);
        }, 'rw', file.txOptions);

      }

      if (file.metadata.fileSize < iOffset + pData.length) {
        file.metadata.fileSize = iOffset + pData.length;
        file.needsMetadataSync = true;
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
      const file = this.mapIdToFile.get(fileId);
      if (iSize < file.metadata.fileSize) {
        this.#idb.q(({ blocks }) => {
          const range = IDBKeyRange.bound(
            [file.path, -Infinity],
            [file.path, -iSize, Infinity]);
          blocks.delete(range);
        }, 'rw', file.txOptions);
        file.metadata.fileSize = iSize;
        file.needsMetadataSync = true;
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_TRUNCATE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} flags 
   * @returns {Promise<number>}
   */
  async jSync(fileId, flags) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.needsMetadataSync) {
        this.#idb.q(({ metadata }) => metadata.put(file.metadata), 'rw', file.txOptions);
        file.needsMetadataSync = false;
      }

      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        // Sync is only needed here for durability. Visibility for other
        // connections is ensured in jUnlock().
        if (file.synchronous === 'full') {
          await this.#idb.sync(true);
        }
      } else {
        await this.#idb.sync(file.synchronous === 'full');
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_FSYNC;
    }
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number}
   */
  jFileSize(fileId, pSize64) {
    try {
      const file = this.mapIdToFile.get(fileId);
      pSize64.setBigInt64(0, BigInt(file.metadata.fileSize), true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_FSTAT;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jLock(fileId, lockType) {
    // Call the actual lock implementation.
    const file = this.mapIdToFile.get(fileId);
    const result = await super.jLock(fileId, lockType);

    if (lockType === VFS.SQLITE_LOCK_SHARED) {
      // Update metadata.
      file.metadata = await this.#idb.q(async ({ metadata, blocks }) => {
        // @ts-ignore
        /** @type {Metadata} */ const m = await metadata.get(file.path);
        if (m.pendingVersion) {
          console.warn(`removing failed transaction ${m.pendingVersion}`);
          await new Promise((resolve, reject) => {
            const range = IDBKeyRange.bound([m.name, -Infinity], [m.name, Infinity]);
            const request = blocks.openCursor(range);
            request.onsuccess = () => {
              const cursor = request.result;
              if (cursor) {
                const block = cursor.value;
                if (block.version < m.version) {
                  cursor.delete();
                }
                cursor.continue();
              } else {
                resolve();
              }
            };
            request.onerror = () => reject(request.error);
          })

          delete m.pendingVersion;
          metadata.put(m);
        }
        return m;
      }, 'rw', file.txOptions);
    }
    return result;
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jUnlock(fileId, lockType) {
    if (lockType === VFS.SQLITE_LOCK_NONE) {
      const file = this.mapIdToFile.get(fileId);
      await this.#idb.sync(file.synchronous === 'full');
    }

    // Call the actual unlock implementation.
    return super.jUnlock(fileId, lockType);
  }

  /**
   * @param {number} fileId
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number|Promise<number>}
   */
  jFileControl(fileId, op, pArg) {
    try {
      const file = this.mapIdToFile.get(fileId);
      switch (op) {
        case VFS.SQLITE_FCNTL_PRAGMA:
          const key = extractString(pArg, 4);
          const value = extractString(pArg, 8);
          this.log?.('xFileControl', file.path, 'PRAGMA', key, value);
          const setPragmaResponse = response => {
            const encoded = new TextEncoder().encode(response);
            const out = this._module._sqlite3_malloc(encoded.byteLength);
            const outArray = this._module.HEAPU8.subarray(out, out + encoded.byteLength);
            outArray.set(encoded);
            pArg.setUint32(0, out, true);
            return VFS.SQLITE_ERROR;
          };
          switch (key.toLowerCase()) {
            case 'page_size':
              if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
                // Don't allow changing the page size.
                if (value && file.metadata.fileSize) {
                  return VFS.SQLITE_ERROR;
                }
              }
              break;
            case 'synchronous':
              if (value) {
                switch (value.toLowerCase()) {
                  case '0':
                  case 'off':
                    file.synchronous = 'off';
                    file.txOptions = { durability: 'relaxed' };
                    break;
                  case '1':
                  case 'normal':
                    file.synchronous = 'normal';
                    file.txOptions = { durability: 'relaxed' };
                    break;
                  case '2':
                  case '3':
                  case 'full':
                  case 'extra':
                    file.synchronous = 'full';
                    file.txOptions = { durability: 'strict' };
                    break;
                }
              }
              break;
            case 'write_hint':
              return super.jFileControl(fileId, WebLocksMixin.WRITE_HINT_OP_CODE, null);
            }
          break;
        case VFS.SQLITE_FCNTL_SYNC:
          this.log?.('xFileControl', file.path, 'SYNC');
          if (file.rollback) {
            const commitMetadata = Object.assign({}, file.metadata);
            const prevFileSize = file.rollback.fileSize
            this.#idb.q(({ metadata, blocks }) => {
              metadata.put(commitMetadata);

              // Remove old page versions.
              for (const offset of file.changedPages) {
                if (offset < prevFileSize) {
                  const range = IDBKeyRange.bound(
                    [file.path, -offset, commitMetadata.version],
                    [file.path, -offset, Infinity],
                    true);
                  blocks.delete(range);
                }
              }
              file.changedPages.clear();
            }, 'rw', file.txOptions);
            file.needsMetadataSync = false;
            file.rollback = null;
          }
          break;
        case VFS.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE:
          // Every write transaction is atomic, so this is a no-op.
          this.log?.('xFileControl', file.path, 'BEGIN_ATOMIC_WRITE');
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE:
          // Every write transaction is atomic, so this is a no-op.
          this.log?.('xFileControl', file.path, 'COMMIT_ATOMIC_WRITE');
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE:
          this.log?.('xFileControl', file.path, 'ROLLBACK_ATOMIC_WRITE');
          file.metadata = file.rollback;
          const rollbackMetadata = Object.assign({}, file.metadata);
          this.#idb.q(({ metadata, blocks }) => {
            metadata.put(rollbackMetadata);

            // Remove pages.
            for (const offset of file.changedPages) {
              blocks.delete([file.path, -offset, rollbackMetadata.version - 1]);
            }
            file.changedPages.clear();
          }, 'rw', file.txOptions);
          file.needsMetadataSync = false;
          file.rollback = null;
          return VFS.SQLITE_OK;
      }
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return super.jFileControl(fileId, op, pArg);
  }
  
  /**
   * @param {number} pFile
   * @returns {number|Promise<number>}
   */
  jDeviceCharacteristics(pFile) {
    return 0
    | VFS.SQLITE_IOCAP_BATCH_ATOMIC
    | VFS.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number|Promise<number>}
   */
  jGetLastError(zBuf) {
    if (this.lastError) {
      console.error(this.lastError);
      const outputArray = zBuf.subarray(0, zBuf.byteLength - 1);
      const { written } = new TextEncoder().encodeInto(this.lastError.message, outputArray);
      zBuf[written] = 0;
    }
    return VFS.SQLITE_OK
  }
}

function extractString(dataView, offset) {
  const p = dataView.getUint32(offset, true);
  if (p) {
    const chars = new Uint8Array(dataView.buffer, p);
    return new TextDecoder().decode(chars.subarray(0, chars.indexOf(0)));
  }
  return null;
}

export class IDBContext {
  /** @type {IDBDatabase} */ #database;

  /** @type {Promise} */ #chain = null;
  /** @type {Promise<any>} */ #txComplete = Promise.resolve();
  /** @type {IDBRequest?} */ #request = null;
  /** @type {WeakSet<IDBTransaction>} */ #txPending = new WeakSet();
  
  log = null;

  static async create(name) {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 6);
      request.onupgradeneeded = async event => {
        const db = request.result;
        if (event.oldVersion) {
          console.log(`Upgrading IndexedDB from version ${event.oldVersion}`);
        }
        switch (event.oldVersion) {
          case 0:
            // Start with the original schema.
            db.createObjectStore('blocks', { keyPath: ['path', 'offset', 'version']})
              .createIndex('version', ['path', 'version']);
            // fall through intentionally
          case 5:
            const tx = request.transaction;
            const blocks = tx.objectStore('blocks');
            blocks.deleteIndex('version');
            const metadata = db.createObjectStore('metadata', { keyPath: 'name' });

            await new Promise((resolve, reject) => {
              // Iterate over all the blocks.
              let lastBlock = {};
              const request = tx.objectStore('blocks').openCursor();
              request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                  const block = cursor.value;
                  if (typeof block.offset !== 'number' ||
                      (block.path === lastBlock.path && block.offset === lastBlock.offset)) {
                    // Remove superceded block (or the "purge" info).
                    cursor.delete();
                  } else if (block.offset === 0) {
                    // Move metadata to its own store.
                    metadata.put({
                      name: block.path,
                      fileSize: block.fileSize,
                      version: block.version
                    });

                    delete block.fileSize;
                    cursor.update(block);
                  }
                  lastBlock = block;
                  cursor.continue();
                } else {
                  resolve();
                }
              };
              request.onerror = () => reject(request.error);
            });
            break;
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new IDBContext(database);
  }

  constructor(database) {
    this.#database = database;
  }

  close() {
    this.#database.close();
  }

  /**
   * @param {(stores: Object.<string, IDBObjectStore>) => any} f 
   * @param {'ro'|'rw'} mode 
   * @returns {Promise<any>}
   */
  q(f, mode = 'ro', options = {}) {
    /** @type {IDBTransactionMode} */
    const txMode = mode === 'ro' ? 'readonly' : 'readwrite';
    const txOptions = Object.assign({
      /** @type {IDBTransactionDurability} */ durability: 'default'
    }, options);

    // Ensure that queries run sequentially. If any function rejects,
    // or any request has an error, or the transaction does not commit,
    // then no subsequent functions will run until sync() or reset().
    this.#chain = (this.#chain || Promise.resolve())
      .then(() => this.#q(f, txMode, txOptions));
    return this.#chain;
  }

  /**
   * @param {(stores: Object.<string, IDBObjectStore>) => any} f 
   * @param {IDBTransactionMode} mode 
   * @param {IDBTransactionOptions} options
   * @returns {Promise<any>}
   */
  async #q(f, mode, options) {
    /** @type {IDBTransaction} */ let tx;
    if (this.#request &&
        this.#txPending.has(this.#request.transaction) &&
        this.#request.transaction.mode >= mode &&
        this.#request.transaction.durability === options.durability) {
      // The previous request transaction is compatible and has
      // not yet completed.
      tx = this.#request.transaction;

      // If the previous request is pending, wait for it to complete.
      // This ensures that the transaction will be active.
      if (this.#request.readyState === 'pending') {
        await new Promise(resolve => {
          this.#request.addEventListener('success', resolve, { once: true });
          this.#request.addEventListener('error', resolve, { once: true });
        });
      }
    }

    for (let i = 0; i < 2; ++i) {
      if (!tx) {
        // The current transaction is missing or doesn't match so
        // replace it with a new one. wait for the previous
        // transaction to complete so the lifetimes do not overlap.
        await this.#txComplete;

        // Create the new transaction.
        // @ts-ignore
        tx = this.#database.transaction(this.#database.objectStoreNames, mode, options);
        this.log?.('IDBTransaction open', mode);
        this.#txPending.add(tx);
        this.#txComplete = new Promise((resolve, reject) => {
          tx.addEventListener('complete', () => {
            this.log?.('IDBTransaction complete');
            this.#txPending.delete(tx);
            resolve();
          });
          tx.addEventListener('abort', () => {
            this.#txPending.delete(tx);
            reject(new Error('transaction aborted'));
          });
        });
      }

      try {
        // @ts-ignore
        // Create object store proxies.
        const objectStores = [...tx.objectStoreNames].map(name => {
          return [name, this.proxyStoreOrIndex(tx.objectStore(name))];
        });

        // Execute the function.
        return await f(Object.fromEntries(objectStores));
      } catch (e) {
        // Use a new transaction if this one was inactive. This will
        // happen if the last request in the transaction completed
        // in a previous task but the transaction has not yet committed.
        if (!i && RETRYABLE_ERRORS.has(e.name)) {
          this.log?.(`${e.name}, retrying`);
          tx = null;
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Object store methods that return an IDBRequest, except for cursor
   * creation, are wrapped to return a Promise. In addition, the
   * request is used internally for chaining.
   * @param {IDBObjectStore} objectStore 
   * @returns 
   */
  proxyStoreOrIndex(objectStore) {
    return new Proxy(objectStore, {
      get: (target, property, receiver) => {
        const result = Reflect.get(target, property, receiver);
        if (typeof result === 'function') {
          return (...args) => {
            const maybeRequest = Reflect.apply(result, target, args);
            // @ts-ignore
            if (maybeRequest instanceof IDBRequest && !property.endsWith('Cursor')) {
              // // Debug logging.
              // this.log?.(`${target.name}.${String(property)}`, args);
              // maybeRequest.addEventListener('success', () => {
              //   this.log?.(`${target.name}.${String(property)} success`, maybeRequest.result);
              // });
              // maybeRequest.addEventListener('error', () => {
              //   this.log?.(`${target.name}.${String(property)} error`, maybeRequest.error);
              // });
              
              // Save the request.
              this.#request = maybeRequest;

              // Abort the transaction on error.
              maybeRequest.addEventListener('error', () => {
                console.error(maybeRequest.error);
                maybeRequest.transaction.abort();
              }, { once: true });              

              // Return a Promise.
              return wrap(maybeRequest);
            }
            return maybeRequest;
          }
        }
        return result;
      }
    });
  }

  /**
   * @param {boolean} durable 
   */
  async sync(durable) {
    if (this.#chain) {
      // This waits for all IndexedDB calls to be made.
      await this.#chain;
      if (durable) {
        // This waits for the final transaction to commit.
        await this.#txComplete;
      }
      this.reset();
    }
  }

  reset() {
    this.#chain = null;
    this.#txComplete = Promise.resolve();
    this.#request = null;
  }
}

/**
 * @param {IDBRequest} request 
 * @returns {Promise}
 */
function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

