// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import { MemoryVFS } from './MemoryVFS.js';

// Sample asynchronous in-memory filesystem. This filesystem requires an
// asynchronous WebAssembly build (Asyncify or JSPI).
export class MemoryAsyncVFS extends MemoryVFS {

  static async create(name, module) {
    const vfs = new MemoryVFS(name, module);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module) {
    super(name, module);
  }

  async close() {
    for (const fileId of this.mapIdToFile.keys()) {
      await this.xClose(fileId);
    }
  }

  /**
   * @param {string?} name 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {Promise<number>}
   */
  async jOpen(name, fileId, flags, pOutFlags) {
    return super.jOpen(name, fileId, flags, pOutFlags);
  }

  /**
   * @param {number} fileId 
   * @returns {Promise<number>}
   */
  async jClose(fileId) {
    return super.jClose(fileId);
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {Promise<number>}
   */
  async jRead(fileId, pData, iOffset) {
    return super.jRead(fileId, pData, iOffset);
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {Promise<number>}
   */
  async jWrite(fileId, pData, iOffset) {
    return super.jWrite(fileId, pData, iOffset);
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {Promise<number>}
   */
  async xTruncate(fileId, iSize) {
    return super.jTruncate(fileId, iSize);
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {Promise<number>}
   */
  async jFileSize(fileId, pSize64) {
    return super.jFileSize(fileId, pSize64);
  }

  /**
   * 
   * @param {string} name 
   * @param {number} syncDir 
   * @returns {Promise<number>}
   */
  async jDelete(name, syncDir) {
    return super.jDelete(name, syncDir);
  }

  /**
   * @param {string} name 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async jAccess(name, flags, pResOut) {
    return super.jAccess(name, flags, pResOut);
  }
}
