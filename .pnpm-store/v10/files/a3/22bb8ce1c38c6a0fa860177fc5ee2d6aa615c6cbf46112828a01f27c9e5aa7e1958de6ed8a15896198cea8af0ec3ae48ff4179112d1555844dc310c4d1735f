// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import { FacadeVFS } from '../FacadeVFS.js';
import * as VFS from '../VFS.js';

const DEFAULT_TEMPORARY_FILES = 10;
const LOCK_NOTIFY_INTERVAL = 1000;

const DB_RELATED_FILE_SUFFIXES = ['', '-journal', '-wal'];

const finalizationRegistry = new FinalizationRegistry(releaser => releaser());

class File {
  /** @type {string} */ path
  /** @type {number} */ flags;
  /** @type {FileSystemSyncAccessHandle} */ accessHandle;

  /** @type {PersistentFile?} */ persistentFile;

  constructor(path, flags) {
    this.path = path;
    this.flags = flags;
  }
}

class PersistentFile {
  /** @type {FileSystemFileHandle} */ fileHandle
  /** @type {FileSystemSyncAccessHandle} */ accessHandle = null

  // The following properties are for main database files.

  /** @type {boolean} */ isLockBusy = false;
  /** @type {boolean} */ isFileLocked = false;
  /** @type {boolean} */ isRequestInProgress = false;
  /** @type {function} */ handleLockReleaser = null;

  /** @type {BroadcastChannel} */ handleRequestChannel;
  /** @type {boolean} */ isHandleRequested = false;

  constructor(fileHandle) {
    this.fileHandle = fileHandle;
  }
}

export class OPFSCoopSyncVFS extends FacadeVFS {
  /** @type {Map<number, File>} */ mapIdToFile = new Map();

  lastError = null;
  log = null; //function(...args) { console.log(`[${contextName}]`, ...args) };
  
  /** @type {Map<string, PersistentFile>} */ persistentFiles = new Map();
  /** @type {Map<string, FileSystemSyncAccessHandle>} */ boundAccessHandles = new Map();
  /** @type {Set<FileSystemSyncAccessHandle>} */ unboundAccessHandles = new Set();
  /** @type {Set<string>} */ accessiblePaths = new Set();
  releaser = null;

  static async create(name, module) {
    const vfs = new OPFSCoopSyncVFS(name, module);
    await Promise.all([
      vfs.isReady(),
      vfs.#initialize(DEFAULT_TEMPORARY_FILES),
    ]);
    return vfs;
  }

  constructor(name, module) {
    super(name, module);
  }

  async #initialize(nTemporaryFiles) {
    // Delete temporary directories no longer in use.
    const root = await navigator.storage.getDirectory();
    // @ts-ignore
    for await (const entry of root.values()) {
      if (entry.kind === 'directory' && entry.name.startsWith('.ahp-')) {
        // A lock with the same name as the directory protects it from
        // being deleted.
        await navigator.locks.request(entry.name, { ifAvailable: true }, async lock => {
          if (lock) {
            this.log?.(`Deleting temporary directory ${entry.name}`);
            await root.removeEntry(entry.name, { recursive: true });
          } else {
            this.log?.(`Temporary directory ${entry.name} is in use`);
          }
        });
      }
    }

    // Create our temporary directory.
    const tmpDirName = `.ahp-${Math.random().toString(36).slice(2)}`;
    this.releaser = await new Promise(resolve => {
      navigator.locks.request(tmpDirName, () => {
        return new Promise(release => {
          resolve(release);
        });
      });
    });
    finalizationRegistry.register(this, this.releaser);
    const tmpDir = await root.getDirectoryHandle(tmpDirName, { create: true });

    // Populate temporary directory.
    for (let i = 0; i < nTemporaryFiles; i++) {
      const tmpFile = await tmpDir.getFileHandle(`${i}.tmp`, { create: true });
      const tmpAccessHandle = await tmpFile.createSyncAccessHandle();
      this.unboundAccessHandles.add(tmpAccessHandle);
    }
  }

  /**
   * @param {string?} zName 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number}
   */
  jOpen(zName, fileId, flags, pOutFlags) {
    try {
      const url = new URL(zName || Math.random().toString(36).slice(2), 'file://');
      const path = url.pathname;

      if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
        const persistentFile = this.persistentFiles.get(path);
        if (persistentFile?.isRequestInProgress) {
          // Should not reach here unless SQLite itself retries an open.
          // Otherwise, asynchronous operations started on a previous
          // open try should have completed.
          return VFS.SQLITE_BUSY;
        } else if (!persistentFile) {
          // This is the usual starting point for opening a database.
          // Register a Promise that resolves when the database and related
          // files are ready to be used.
          this.log?.(`creating persistent file for ${path}`);
          const create = !!(flags & VFS.SQLITE_OPEN_CREATE);
          this._module.retryOps.push((async () => {
            try {
              // Get the path directory handle.
              let dirHandle = await navigator.storage.getDirectory();
              const directories = path.split('/').filter(d => d);
              const filename = directories.pop();
              for (const directory of directories) {
                dirHandle = await dirHandle.getDirectoryHandle(directory, { create });
              }

              // Get file handles for the database and related files,
              // and create persistent file instances.
              for (const suffix of DB_RELATED_FILE_SUFFIXES) {
                const fileHandle = await dirHandle.getFileHandle(filename + suffix, { create });
                await this.#createPersistentFile(fileHandle);
              }

              // Get access handles for the files.
              const file = new File(path, flags);
              file.persistentFile = this.persistentFiles.get(path);
              await this.#requestAccessHandle(file);
            } catch (e) {
              // Use an invalid persistent file to signal this error
              // for the retried open.
              const persistentFile = new PersistentFile(null);
              this.persistentFiles.set(path, persistentFile);
              console.error(e);
            }
          })());
          return VFS.SQLITE_BUSY;
        } else if (!persistentFile.fileHandle) {
          // The asynchronous open operation failed.
          this.persistentFiles.delete(path);
          return VFS.SQLITE_CANTOPEN;
        } else if (!persistentFile.accessHandle) {
          // This branch is reached if the database was previously opened
          // and closed.
          this._module.retryOps.push((async () => {
            const file = new File(path, flags);
            file.persistentFile = this.persistentFiles.get(path);
            await this.#requestAccessHandle(file);
          })());
          return VFS.SQLITE_BUSY;
        }
      }

      if (!this.accessiblePaths.has(path) &&
          !(flags & VFS.SQLITE_OPEN_CREATE)) {
        throw new Error(`File ${path} not found`);
      }

      const file = new File(path, flags);
      this.mapIdToFile.set(fileId, file);

      if (this.persistentFiles.has(path)) {
        file.persistentFile = this.persistentFiles.get(path);
      } else if (this.boundAccessHandles.has(path)) {
        // This temporary file was previously created and closed. Reopen
        // the same access handle.
        file.accessHandle = this.boundAccessHandles.get(path);
      } else if (this.unboundAccessHandles.size) {
        // Associate an unbound access handle to this file.
        file.accessHandle = this.unboundAccessHandles.values().next().value;
        file.accessHandle.truncate(0);
        this.unboundAccessHandles.delete(file.accessHandle);
        this.boundAccessHandles.set(path, file.accessHandle);
      }
      this.accessiblePaths.add(path);
  
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
   * @returns {number}
   */
  jDelete(zName, syncDir) {
    try {
      const url = new URL(zName, 'file://');
      const path = url.pathname;
      if (this.persistentFiles.has(path)) {
        const persistentFile = this.persistentFiles.get(path);
        persistentFile.accessHandle.truncate(0);
      } else {
        this.boundAccessHandles.get(path)?.truncate(0);
      }
      this.accessiblePaths.delete(path);
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
   * @returns {number}
   */
  jAccess(zName, flags, pResOut) {
    try {
      const url = new URL(zName, 'file://');
      const path = url.pathname;
      pResOut.setInt32(0, this.accessiblePaths.has(path) ? 1 : 0, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_ACCESS;
    } 
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  jClose(fileId) {
    try {
      const file = this.mapIdToFile.get(fileId);
      this.mapIdToFile.delete(fileId);

      if (file?.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        if (file.persistentFile?.handleLockReleaser) {
          this.#releaseAccessHandle(file);
        }
      } else if (file?.flags & VFS.SQLITE_OPEN_DELETEONCLOSE) {
        file.accessHandle.truncate(0);
        this.accessiblePaths.delete(file.path);
        if (!this.persistentFiles.has(file.path)) {
          this.boundAccessHandles.delete(file.path);
          this.unboundAccessHandles.add(file.accessHandle);
        }
      }
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
   * @returns {number}
   */
  jRead(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);

      // On Chrome (at least), passing pData to accessHandle.read() is
      // an error because pData is a Proxy of a Uint8Array. Calling
      // subarray() produces a real Uint8Array and that works.
      const accessHandle = file.accessHandle || file.persistentFile.accessHandle;
      const bytesRead = accessHandle.read(pData.subarray(), { at: iOffset });

      // Opening a database file performs one read without a xLock call.
      if ((file.flags & VFS.SQLITE_OPEN_MAIN_DB) && !file.persistentFile.isFileLocked) {
        this.#releaseAccessHandle(file);
      }

      if (bytesRead < pData.byteLength) {
        pData.fill(0, bytesRead);
        return VFS.SQLITE_IOERR_SHORT_READ;
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

      // On Chrome (at least), passing pData to accessHandle.write() is
      // an error because pData is a Proxy of a Uint8Array. Calling
      // subarray() produces a real Uint8Array and that works.
      const accessHandle = file.accessHandle || file.persistentFile.accessHandle;
      const nBytes = accessHandle.write(pData.subarray(), { at: iOffset });
      if (nBytes !== pData.byteLength) throw new Error('short write');
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
      const accessHandle = file.accessHandle || file.persistentFile.accessHandle;
      accessHandle.truncate(iSize);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_TRUNCATE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} flags 
   * @returns {number}
   */
  jSync(fileId, flags) {
    try {
      const file = this.mapIdToFile.get(fileId);
      const accessHandle = file.accessHandle || file.persistentFile.accessHandle;
      accessHandle.flush();
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
      const accessHandle = file.accessHandle || file.persistentFile.accessHandle;
      const size = accessHandle.getSize();
      pSize64.setBigInt64(0, BigInt(size), true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_FSTAT;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {number}
   */
  jLock(fileId, lockType) {
    const file = this.mapIdToFile.get(fileId);
    if (file.persistentFile.isRequestInProgress) {
      file.persistentFile.isLockBusy = true;
      return VFS.SQLITE_BUSY;
    }

    file.persistentFile.isFileLocked = true;
    if (!file.persistentFile.handleLockReleaser) {
      // Start listening for notifications from other connections.
      // This is before we actually get access handles, but waiting to
      // listen until then allows a race condition where notifications
      // are missed. 
      file.persistentFile.handleRequestChannel.onmessage = () => {
        this.log?.(`received notification for ${file.path}`);
        if (file.persistentFile.isFileLocked) {
          // We're still using the access handle, so mark it to be
          // released when we're done.
          file.persistentFile.isHandleRequested = true;
        } else {
          // Release the access handles immediately.
          this.#releaseAccessHandle(file);
        }
        file.persistentFile.handleRequestChannel.onmessage = null;
      };

      this.#requestAccessHandle(file);
      this.log?.('returning SQLITE_BUSY');
      file.persistentFile.isLockBusy = true;
      return VFS.SQLITE_BUSY;
    }
    file.persistentFile.isLockBusy = false;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {number}
   */
  jUnlock(fileId, lockType) {
    const file = this.mapIdToFile.get(fileId);
    if (lockType === VFS.SQLITE_LOCK_NONE) {
      // Don't change any state if this unlock is because xLock returned
      // SQLITE_BUSY.
      if (!file.persistentFile.isLockBusy) {
        if (file.persistentFile.isHandleRequested) {
            // Another connection wants the access handle.
          this.#releaseAccessHandle(file);
          file.persistentFile.isHandleRequested = false;
        }
        file.persistentFile.isFileLocked = false;
      }
    }
    return VFS.SQLITE_OK;
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
          switch (key.toLowerCase()) {
            case 'journal_mode':
              if (value &&
                  !['off', 'memory', 'delete', 'wal'].includes(value.toLowerCase())) {
                throw new Error('journal_mode must be "off", "memory", "delete", or "wal"');
              }
              break;
          }
          break;
      }
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return VFS.SQLITE_NOTFOUND;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns 
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

  /**
   * @param {FileSystemFileHandle} fileHandle 
   * @returns {Promise<PersistentFile>}
   */
  async #createPersistentFile(fileHandle) {
    const persistentFile = new PersistentFile(fileHandle);
    const root = await navigator.storage.getDirectory();
    const relativePath = await root.resolve(fileHandle);
    const path = `/${relativePath.join('/')}`;
    persistentFile.handleRequestChannel = new BroadcastChannel(`ahp:${path}`);
    this.persistentFiles.set(path, persistentFile);

    const f = await fileHandle.getFile();
    if (f.size) {
      this.accessiblePaths.add(path);
    }
    return persistentFile;
  }

  /**
   * @param {File} file 
   */
  #requestAccessHandle(file) {
    console.assert(!file.persistentFile.handleLockReleaser);
    if (!file.persistentFile.isRequestInProgress) {
      file.persistentFile.isRequestInProgress = true;
      this._module.retryOps.push((async () => {
        // Acquire the Web Lock.
        file.persistentFile.handleLockReleaser = await this.#acquireLock(file.persistentFile);
        try {
          // Get access handles for the database and releated files in parallel.
          this.log?.(`creating access handles for ${file.path}`)
          await Promise.all(DB_RELATED_FILE_SUFFIXES.map(async suffix => {
            const persistentFile = this.persistentFiles.get(file.path + suffix);
            if (persistentFile) {
              persistentFile.accessHandle =
                await persistentFile.fileHandle.createSyncAccessHandle();
            }
          }));
        } catch (e) {
          this.log?.(`failed to create access handles for ${file.path}`, e);
          // Close any of the potentially opened access handles
          this.#releaseAccessHandle(file);
          throw e;
        } finally {
          file.persistentFile.isRequestInProgress = false;
        }
      })());
      return this._module.retryOps.at(-1);
    }
    return Promise.resolve();
  }

  /**
   * @param {File} file 
   */
  #releaseAccessHandle(file) {
    DB_RELATED_FILE_SUFFIXES.forEach(suffix => {
      const persistentFile = this.persistentFiles.get(file.path + suffix);
      if (persistentFile) {
        persistentFile.accessHandle?.close();
        persistentFile.accessHandle = null;
      }
    });
    this.log?.(`access handles closed for ${file.path}`)

    file.persistentFile.handleLockReleaser?.();
    file.persistentFile.handleLockReleaser = null;
    this.log?.(`lock released for ${file.path}`)
  }

  /**
   * @param {PersistentFile} persistentFile 
   * @returns  {Promise<function>} lock releaser
   */
  #acquireLock(persistentFile) {
    return new Promise(resolve => {
      // Tell other connections we want the access handle.
      const lockName = persistentFile.handleRequestChannel.name;
      const notify = () => {
        this.log?.(`notifying for ${lockName}`);
        persistentFile.handleRequestChannel.postMessage(null);
      }
      const notifyId = setInterval(notify, LOCK_NOTIFY_INTERVAL);
      setTimeout(notify);

      this.log?.(`lock requested: ${lockName}`)
      navigator.locks.request(lockName, lock => {
        // We have the lock. Stop asking other connections for it.
        this.log?.(`lock acquired: ${lockName}`, lock);
        clearInterval(notifyId);
        return new Promise(resolve);
      });
    });
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