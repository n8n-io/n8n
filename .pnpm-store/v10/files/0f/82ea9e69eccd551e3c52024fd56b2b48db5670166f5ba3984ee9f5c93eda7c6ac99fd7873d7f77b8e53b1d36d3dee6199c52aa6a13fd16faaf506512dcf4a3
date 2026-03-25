// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import { FacadeVFS } from '../FacadeVFS.js';
import * as VFS from '../VFS.js';
import { WebLocksMixin } from '../WebLocksMixin.js';

const LOCK_NOTIFY_INTERVAL = 1000;

const hasUnsafeAccessHandle =
  globalThis.FileSystemSyncAccessHandle.prototype.hasOwnProperty('mode');

/**
 * @param {string} pathname 
 * @param {boolean} create 
 * @returns {Promise<[FileSystemDirectoryHandle, string]>}
 */
async function getPathComponents(pathname, create) {
  const [_, directories, filename] = pathname.match(/[/]?(.*)[/](.*)$/);

  let directoryHandle = await navigator.storage.getDirectory();
  for (const directory of directories.split('/')) {
    if (directory) {
      directoryHandle = await directoryHandle.getDirectoryHandle(directory, { create });
    }
  }
  return [directoryHandle, filename];
};

class File {
  /** @type {string} */ pathname;
  /** @type {number} */ flags;
  /** @type {FileSystemFileHandle} */ fileHandle;
  /** @type {FileSystemSyncAccessHandle} */ accessHandle;

  // The rest of the properties are for platforms without readwrite-unsafe
  // access handles. Only one connection can have an open access handle
  // so coordination is needed in addition to the SQLite locking model.
  //
  // Opening and closing the access handle is expensive so we leave the
  // handle open unless another connection signals on BroadcastChannel.
  /** @type {BroadcastChannel} */ handleRequestChannel;
  /** @type {function} */ handleLockReleaser = null;
  /** @type {boolean} */ isHandleRequested = false;
  /** @type {boolean} */ isFileLocked = false;

  // SQLite makes one read on file open that is not protected by a lock.
  // This needs to be handled as a special case.
  /** @type {function} */ openLockReleaser = null;

  constructor(pathname, flags) {
    this.pathname = pathname;
    this.flags = flags;
  }
}

export class OPFSAdaptiveVFS extends WebLocksMixin(FacadeVFS) {
  /** @type {Map<number, File>} */ mapIdToFile = new Map();
  lastError = null;

  log = null;

  static async create(name, module, options) {
    const vfs = new OPFSAdaptiveVFS(name, module, options);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module, options = {}) {
    super(name, module, options);
  }
  
  getFilename(fileId) {
    const pathname = this.mapIdToFile.get(fileId).pathname;
    return `OPFS:${pathname}`
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
      const pathname = url.pathname;

      const file = new File(pathname, flags);
      this.mapIdToFile.set(fileId, file);

      const create = !!(flags & VFS.SQLITE_OPEN_CREATE);
      const [directoryHandle, filename] = await getPathComponents(pathname, create);
      file.fileHandle = await directoryHandle.getFileHandle(filename, { create });

      if ((flags & VFS.SQLITE_OPEN_MAIN_DB) && !hasUnsafeAccessHandle) {
        file.handleRequestChannel = new BroadcastChannel(this.getFilename(fileId));

        // Acquire the access handle lock. The first read of a database
        // file is done outside xLock/xUnlock so we get that lock here.
        function notify() {
          file.handleRequestChannel.postMessage(null);
        }
        const notifyId = setInterval(notify, LOCK_NOTIFY_INTERVAL);
        setTimeout(notify);

        file.openLockReleaser = await new Promise((resolve, reject) => {
          navigator.locks.request(this.getFilename(fileId), lock => {
            clearInterval(notifyId);
            if (!lock) return reject();
            return new Promise(release => {
              resolve(release);
            });
          });
        });
        this.log?.('access handle acquired for open');
      }

      // @ts-ignore
      file.accessHandle = await file.fileHandle.createSyncAccessHandle({
        mode: 'readwrite-unsafe'
      });
  
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
      const pathname = url.pathname;
   
      const [directoryHandle, name] = await getPathComponents(pathname, false);
      const result = directoryHandle.removeEntry(name, { recursive: false });
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

      const [directoryHandle, dbName] = await getPathComponents(pathname, false);
      const fileHandle = await directoryHandle.getFileHandle(dbName, { create: false });
      pResOut.setInt32(0, 1, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      if (e.name === 'NotFoundError') {
        pResOut.setInt32(0, 0, true);
        return VFS.SQLITE_OK;
      }
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
      await file?.accessHandle?.close();

      if (file?.flags & VFS.SQLITE_OPEN_DELETEONCLOSE) {
        const [directoryHandle, name] = await getPathComponents(file.pathname, false);
        await directoryHandle.removeEntry(name, { recursive: false });
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_DELETE;
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
      const bytesRead = file.accessHandle.read(pData.subarray(), { at: iOffset });
      if (file.openLockReleaser) {
        // We obtained the access handle on file open.
        file.accessHandle.close();
        file.accessHandle = null;
        file.openLockReleaser();
        file.openLockReleaser = null;
        this.log?.('access handle released for open');
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
      file.accessHandle.write(pData.subarray(), { at: iOffset });
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
      file.accessHandle.truncate(iSize);
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
      file.accessHandle.flush();
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
      const size = file.accessHandle.getSize();
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
   * @returns {Promise<number>}
   */
  async jLock(fileId, lockType) {
    if (hasUnsafeAccessHandle) return super.jLock(fileId, lockType);

    const file = this.mapIdToFile.get(fileId);
    if (!file.isFileLocked) {
      file.isFileLocked = true;
      if (!file.handleLockReleaser) {
        // Listen for other connections wanting the access handle.
        file.handleRequestChannel.onmessage = event => {
          if(!file.isFileLocked) {
            // We have the access handle but the file is not locked.
            // Release the access handle for the requester.
            file.accessHandle.close();
            file.accessHandle = null;
            file.handleLockReleaser();
            file.handleLockReleaser = null;
            this.log?.('access handle requested and released');
          } else {
            // We're still using the access handle, so mark it to be
            // released when we're done.
            file.isHandleRequested = true;
            this.log?.('access handle requested');
          }
          file.handleRequestChannel.onmessage = null;
        };

        // We don't have the access handle. First acquire the lock.
        file.handleLockReleaser = await new Promise((resolve, reject) => {
          // Tell everyone we want the access handle.
          function notify() {
            file.handleRequestChannel.postMessage(null);
          }
          const notifyId = setInterval(notify, LOCK_NOTIFY_INTERVAL);
          setTimeout(notify);

          navigator.locks.request(this.getFilename(fileId), lock => {
            clearInterval(notifyId);
            if (!lock) return reject();
            return new Promise(release => {
              resolve(release);
            });
          });
        });

        // The access handle should now be available.
        file.accessHandle = await file.fileHandle.createSyncAccessHandle();
        this.log?.('access handle acquired');
      }

    }
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jUnlock(fileId, lockType) {
    if (hasUnsafeAccessHandle) return super.jUnlock(fileId, lockType);

    if (lockType === VFS.SQLITE_LOCK_NONE) {
      const file = this.mapIdToFile.get(fileId);
      if (file.isHandleRequested) {
        if (file.handleLockReleaser) {
          // Another connection wants the access handle.
          file.accessHandle.close();
          file.accessHandle = null;
          file.handleLockReleaser();
          file.handleLockReleaser = null;
          this.log?.('access handle released');
        }
        file.isHandleRequested = false;
      }
      file.isFileLocked = false;
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
          this.log?.('xFileControl', file.pathname, 'PRAGMA', key, value);
          switch (key.toLowerCase()) {
            case 'journal_mode':
              if (value &&
                  !hasUnsafeAccessHandle && 
                  !['off', 'memory', 'delete', 'wal'].includes(value.toLowerCase())) {
                throw new Error('journal_mode must be "off", "memory", "delete", or "wal"');
              }
              break;
            case 'write_hint':
              return super.jFileControl(fileId, WebLocksMixin.WRITE_HINT_OP_CODE, null);
          }
          break;
      }
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return super.jFileControl(fileId, op, pArg);
  }

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