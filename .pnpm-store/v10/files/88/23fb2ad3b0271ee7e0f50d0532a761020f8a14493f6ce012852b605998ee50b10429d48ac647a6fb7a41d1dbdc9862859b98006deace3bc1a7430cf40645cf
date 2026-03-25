// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import { FacadeVFS } from '../FacadeVFS.js';
import * as VFS from '../VFS.js';

// Sample in-memory filesystem.
export class MemoryVFS extends FacadeVFS {
  // Map of existing files, keyed by filename.
  mapNameToFile = new Map();

  // Map of open files, keyed by id (sqlite3_file pointer).
  mapIdToFile = new Map();

  static async create(name, module) {
    const vfs = new MemoryVFS(name, module);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module) {
    super(name, module);
  }

  close() {
    for (const fileId of this.mapIdToFile.keys()) {
      this.jClose(fileId);
    }
  }

  /**
   * @param {string?} filename 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number|Promise<number>}
   */
  jOpen(filename, fileId, flags, pOutFlags) {
    const url = new URL(filename || Math.random().toString(36).slice(2), 'file://');
    const pathname = url.pathname;

    let file = this.mapNameToFile.get(pathname);
    if (!file) {
      if (flags & VFS.SQLITE_OPEN_CREATE) {
        // Create a new file object.
        file = {
          pathname,
          flags,
          size: 0,
          data: new ArrayBuffer(0)
        };
        this.mapNameToFile.set(pathname, file);
      } else {
        return VFS.SQLITE_CANTOPEN;
      }
    }

    // Put the file in the opened files map.
    this.mapIdToFile.set(fileId, file);
    pOutFlags.setInt32(0, flags, true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @returns {number|Promise<number>}
   */
  jClose(fileId) {
    const file = this.mapIdToFile.get(fileId);
    this.mapIdToFile.delete(fileId);

    if (file.flags & VFS.SQLITE_OPEN_DELETEONCLOSE) {
      this.mapNameToFile.delete(file.pathname);
    }
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number|Promise<number>}
   */
  jRead(fileId, pData, iOffset) {
    const file = this.mapIdToFile.get(fileId);

    // Clip the requested read to the file boundary.
    const bgn = Math.min(iOffset, file.size);
    const end = Math.min(iOffset + pData.byteLength, file.size);
    const nBytes = end - bgn;

    if (nBytes) {
      pData.set(new Uint8Array(file.data, bgn, nBytes));
    }

    if (nBytes < pData.byteLength) {
      // Zero unused area of read buffer.
      pData.fill(0, nBytes);
      return VFS.SQLITE_IOERR_SHORT_READ;
    }
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number|Promise<number>}
   */
  jWrite(fileId, pData, iOffset) {
    const file = this.mapIdToFile.get(fileId);
    if (iOffset + pData.byteLength > file.data.byteLength) {
      // Resize the ArrayBuffer to hold more data.
      const newSize = Math.max(iOffset + pData.byteLength, 2 * file.data.byteLength);
      const data = new ArrayBuffer(newSize);
      new Uint8Array(data).set(new Uint8Array(file.data, 0, file.size));
      file.data = data;
    }

    // Copy data.
    new Uint8Array(file.data, iOffset, pData.byteLength).set(pData.subarray());
    file.size = Math.max(file.size, iOffset + pData.byteLength);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {number|Promise<number>}
   */
  jTruncate(fileId, iSize) {
    const file = this.mapIdToFile.get(fileId);

    // For simplicity we don't make the ArrayBuffer smaller.
    file.size = Math.min(file.size, iSize);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number|Promise<number>}
   */
  jFileSize(fileId, pSize64) {
    const file = this.mapIdToFile.get(fileId);

    pSize64.setBigInt64(0, BigInt(file.size), true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {string} name 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  jDelete(name, syncDir) {
    const url = new URL(name, 'file://');
    const pathname = url.pathname;

    this.mapNameToFile.delete(pathname);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {string} name 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number|Promise<number>}
   */
  jAccess(name, flags, pResOut) {
    const url = new URL(name, 'file://');
    const pathname = url.pathname;

    const file = this.mapNameToFile.get(pathname);
    pResOut.setInt32(0, file ? 1 : 0, true);
    return VFS.SQLITE_OK;
  }
}
