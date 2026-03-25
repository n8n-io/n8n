// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
import * as VFS from './VFS.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

// Convenience base class for a JavaScript VFS.
// The raw xOpen, xRead, etc. function signatures receive only C primitives
// which aren't easy to work with. This class provides corresponding calls
// like jOpen, jRead, etc., which receive JavaScript-friendlier arguments
// such as string, Uint8Array, and DataView.
export class FacadeVFS extends VFS.Base {
  /**
   * @param {string} name 
   * @param {object} module 
   */
  constructor(name, module) {
    super(name, module);
  }

  /**
   * Override to indicate which methods are asynchronous.
   * @param {string} methodName 
   * @returns {boolean}
   */
  hasAsyncMethod(methodName) {
    // The input argument is a string like "xOpen", so convert to "jOpen".
    // Then check if the method exists and is async.
    const jMethodName = `j${methodName.slice(1)}`;
    return this[jMethodName] instanceof AsyncFunction;
  }
  
  /**
   * Return the filename for a file id for use by mixins.
   * @param {number} pFile 
   * @returns {string}
   */
  getFilename(pFile) {
    throw new Error('unimplemented');
  }

  /**
   * @param {string?} filename 
   * @param {number} pFile 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number|Promise<number>}
   */
  jOpen(filename, pFile, flags, pOutFlags) {
    return VFS.SQLITE_CANTOPEN;
  }

  /**
   * @param {string} filename 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  jDelete(filename, syncDir) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {string} filename 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number|Promise<number>}
   */
  jAccess(filename, flags, pResOut) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {string} filename 
   * @param {Uint8Array} zOut 
   * @returns {number|Promise<number>}
   */
  jFullPathname(filename, zOut) {
    // Copy the filename to the output buffer.
    const { read, written } = new TextEncoder().encodeInto(filename, zOut);
    if (read < filename.length) return VFS.SQLITE_IOERR;
    if (written >= zOut.length) return VFS.SQLITE_IOERR;
    zOut[written] = 0;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number|Promise<number>}
   */
  jGetLastError(zBuf) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  jClose(pFile) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {Uint8Array} pData 
   * @param {number} iOffset 
   * @returns {number|Promise<number>}
   */
  jRead(pFile, pData, iOffset) {
    pData.fill(0);
    return VFS.SQLITE_IOERR_SHORT_READ;
  }

  /**
   * @param {number} pFile 
   * @param {Uint8Array} pData 
   * @param {number} iOffset 
   * @returns {number|Promise<number>}
   */
  jWrite(pFile, pData, iOffset) {
    return VFS.SQLITE_IOERR_WRITE;
  }

  /**
   * @param {number} pFile 
   * @param {number} size 
   * @returns {number|Promise<number>}
   */
  jTruncate(pFile, size) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} flags 
   * @returns {number|Promise<number>}
   */
  jSync(pFile, flags) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pSize
   * @returns {number|Promise<number>}
   */
  jFileSize(pFile, pSize) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jLock(pFile, lockType) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jUnlock(pFile, lockType) {
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pResOut 
   * @returns {number|Promise<number>}
   */
  jCheckReservedLock(pFile, pResOut) {
    pResOut.setInt32(0, 0, true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number|Promise<number>}
   */
  jFileControl(pFile, op, pArg) {
    return VFS.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} pFile
   * @returns {number|Promise<number>}
   */
  jSectorSize(pFile) {
    return super.xSectorSize(pFile);
  }

  /**
   * @param {number} pFile
   * @returns {number|Promise<number>}
   */
  jDeviceCharacteristics(pFile) {
    return 0;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} pFile 
   * @param {number} flags 
   * @param {number} pOutFlags 
   * @returns {number|Promise<number>}
   */
  xOpen(pVfs, zName, pFile, flags, pOutFlags) {
    const filename = this.#decodeFilename(zName, flags);
    const pOutFlagsView = this.#makeTypedDataView('Int32', pOutFlags);
    this['log']?.('jOpen', filename, pFile, '0x' + flags.toString(16));
    return this.jOpen(filename, pFile, flags, pOutFlagsView);
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  xDelete(pVfs, zName, syncDir) {
    const filename = this._module.UTF8ToString(zName);
    this['log']?.('jDelete', filename, syncDir);
    return this.jDelete(filename, syncDir);
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} flags 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xAccess(pVfs, zName, flags, pResOut) {
    const filename = this._module.UTF8ToString(zName);
    const pResOutView = this.#makeTypedDataView('Int32', pResOut);
    this['log']?.('jAccess', filename, flags);
    return this.jAccess(filename, flags, pResOutView);
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} nOut 
   * @param {number} zOut 
   * @returns {number|Promise<number>}
   */
  xFullPathname(pVfs, zName, nOut, zOut) {
    const filename = this._module.UTF8ToString(zName);
    const zOutArray = this._module.HEAPU8.subarray(zOut, zOut + nOut);
    this['log']?.('jFullPathname', filename, nOut);
    return this.jFullPathname(filename, zOutArray);
  }

  /**
   * @param {number} pVfs 
   * @param {number} nBuf 
   * @param {number} zBuf 
   * @returns {number|Promise<number>}
   */
  xGetLastError(pVfs, nBuf, zBuf) {
    const zBufArray = this._module.HEAPU8.subarray(zBuf, zBuf + nBuf);
    this['log']?.('jGetLastError', nBuf);
    return this.jGetLastError(zBufArray);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xClose(pFile) {
    this['log']?.('jClose', pFile);
    return this.jClose(pFile);
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xRead(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    const pDataArray = this.#makeDataArray(pData, iAmt);
    const iOffset = delegalize(iOffsetLo, iOffsetHi);
    this['log']?.('jRead', pFile, iAmt, iOffset);
    return this.jRead(pFile, pDataArray, iOffset);
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xWrite(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    const pDataArray = this.#makeDataArray(pData, iAmt);
    const iOffset = delegalize(iOffsetLo, iOffsetHi);
    this['log']?.('jWrite', pFile, pDataArray, iOffset);
    return this.jWrite(pFile, pDataArray, iOffset);
  }

  /**
   * @param {number} pFile 
   * @param {number} sizeLo 
   * @param {number} sizeHi 
   * @returns {number|Promise<number>}
   */
  xTruncate(pFile, sizeLo, sizeHi) {
    const size = delegalize(sizeLo, sizeHi);
    this['log']?.('jTruncate', pFile, size);
    return this.jTruncate(pFile, size);
  }

  /**
   * @param {number} pFile 
   * @param {number} flags 
   * @returns {number|Promise<number>}
   */
  xSync(pFile, flags) {
    this['log']?.('jSync', pFile, flags);
    return this.jSync(pFile, flags);
  }

  /**
   * 
   * @param {number} pFile 
   * @param {number} pSize 
   * @returns {number|Promise<number>}
   */
  xFileSize(pFile, pSize) {
    const pSizeView = this.#makeTypedDataView('BigInt64', pSize);
    this['log']?.('jFileSize', pFile);
    return this.jFileSize(pFile, pSizeView);
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xLock(pFile, lockType) {
    this['log']?.('jLock', pFile, lockType);
    return this.jLock(pFile, lockType);
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xUnlock(pFile, lockType) {
    this['log']?.('jUnlock', pFile, lockType);
    return this.jUnlock(pFile, lockType);
  } 

  /**
   * @param {number} pFile 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xCheckReservedLock(pFile, pResOut) {
    const pResOutView = this.#makeTypedDataView('Int32', pResOut);
    this['log']?.('jCheckReservedLock', pFile);
    return this.jCheckReservedLock(pFile, pResOutView);
  }

  /**
   * @param {number} pFile 
   * @param {number} op 
   * @param {number} pArg 
   * @returns {number|Promise<number>}
   */
  xFileControl(pFile, op, pArg) {
    const pArgView = new DataView(
      this._module.HEAPU8.buffer,
      this._module.HEAPU8.byteOffset + pArg);
    this['log']?.('jFileControl', pFile, op, pArgView);
    return this.jFileControl(pFile, op, pArgView);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xSectorSize(pFile) {
    this['log']?.('jSectorSize', pFile);
    return this.jSectorSize(pFile);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xDeviceCharacteristics(pFile) {
    this['log']?.('jDeviceCharacteristics', pFile);
    return this.jDeviceCharacteristics(pFile);
  }

  /**
   * Wrapped DataView for pointer arguments.
   * Pointers to a single value are passed using a DataView-like class.
   * This wrapper class prevents use of incorrect type or endianness, and
   * reacquires the underlying buffer when the WebAssembly memory is resized.
   * @param {'Int32'|'BigInt64'} type 
   * @param {number} byteOffset 
   * @returns {DataView}
   */
  #makeTypedDataView(type, byteOffset) {
    // @ts-ignore
    return new DataViewProxy(this._module, byteOffset, type);
  }

  /**
   * Wrapped Uint8Array for buffer arguments.
   * Memory blocks are passed as a Uint8Array-like class. This wrapper
   * class reacquires the underlying buffer when the WebAssembly memory
   * is resized.
   * @param {number} byteOffset 
   * @param {number} byteLength 
   * @returns {Uint8Array}
   */
  #makeDataArray(byteOffset, byteLength) {
    // @ts-ignore
    return new Uint8ArrayProxy(this._module, byteOffset, byteLength);
  }

  #decodeFilename(zName, flags) {
    if (flags & VFS.SQLITE_OPEN_URI) {
      // The first null-terminated string is the URI path. Subsequent
      // strings are query parameter keys and values.
      // https://www.sqlite.org/c3ref/open.html#urifilenamesinsqlite3open
      let pName = zName;
      let state = 1;
      const charCodes = [];
      while (state) {
        const charCode = this._module.HEAPU8[pName++];
        if (charCode) {
          charCodes.push(charCode);
        } else {
          if (!this._module.HEAPU8[pName]) state = null;
          switch (state) {
            case 1: // path
              charCodes.push('?'.charCodeAt(0));
              state = 2;
              break;
            case 2: // key
              charCodes.push('='.charCodeAt(0));
              state = 3;
              break;
            case 3: // value
              charCodes.push('&'.charCodeAt(0));
              state = 2;
              break;
          }
        }
      }
      return  new TextDecoder().decode(new Uint8Array(charCodes));
    }
    return zName ? this._module.UTF8ToString(zName) : null;
  }
}

// Emscripten "legalizes" 64-bit integer arguments by passing them as
// two 32-bit signed integers.
function delegalize(lo32, hi32) {
  return (hi32 * 0x100000000) + lo32 + (lo32 < 0 ? 2**32 : 0);
}

// This class provides a Uint8Array-like interface for a WebAssembly memory
// buffer. It is used to access memory blocks passed as arguments to
// xRead, xWrite, etc. The class reacquires the underlying buffer when the
// WebAssembly memory is resized, which can happen when the memory is
// detached and resized by the WebAssembly module.
//
// Note that although this class implements the same methods as Uint8Array,
// it is not a real Uint8Array and passing it to functions that expect
// a Uint8Array may not work. Use subarray() to get a real Uint8Array
// if needed.
class Uint8ArrayProxy {
  #module;

  #_array = new Uint8Array()
  get #array() {
    if (this.#_array.buffer.byteLength === 0) {
      // WebAssembly memory resize detached the buffer so re-create the
      // array with the new buffer.
      this.#_array = this.#module.HEAPU8.subarray(
        this.byteOffset,
        this.byteOffset + this.byteLength);
    }
    return this.#_array;
  }

  /**
   * @param {*} module
   * @param {number} byteOffset 
   * @param {number} byteLength 
   */
  constructor(module, byteOffset, byteLength) {
    this.#module = module;
    this.byteOffset = byteOffset;
    this.length = this.byteLength = byteLength;
  }

  get buffer() {
    return this.#array.buffer;
  }

  at(index) {
    return this.#array.at(index);
  }
  copyWithin(target, start, end) {
    this.#array.copyWithin(target, start, end);
  }
  entries() {
    return this.#array.entries();
  }
  every(predicate) {
    return this.#array.every(predicate);
  }
  fill(value, start, end) {
    this.#array.fill(value, start, end);
  }
  filter(predicate) {
    return this.#array.filter(predicate);
  }
  find(predicate) {
    return this.#array.find(predicate);
  }
  findIndex(predicate) {
    return this.#array.findIndex(predicate);
  }
  findLast(predicate) {
    return this.#array.findLast(predicate);
  }
  findLastIndex(predicate) {
    return this.#array.findLastIndex(predicate);
  }
  forEach(callback) {
    this.#array.forEach(callback);
  }
  includes(value, start) {
    return this.#array.includes(value, start);
  }
  indexOf(value, start) {
    return this.#array.indexOf(value, start);
  }
  join(separator) {
    return this.#array.join(separator);
  }
  keys() {
    return this.#array.keys();
  }
  lastIndexOf(value, start) {
    return this.#array.lastIndexOf(value, start);
  }
  map(callback) {
    return this.#array.map(callback);
  }
  reduce(callback, initialValue) {
    return this.#array.reduce(callback, initialValue);
  }
  reduceRight(callback, initialValue) {
    return this.#array.reduceRight(callback, initialValue);
  }
  reverse() {
    this.#array.reverse();
  }
  set(array, offset) {
    this.#array.set(array, offset);
  }
  slice(start, end) {
    return this.#array.slice(start, end);
  }
  some(predicate) {
    return this.#array.some(predicate);
  }
  sort(compareFn) {
    this.#array.sort(compareFn);
  }
  subarray(begin, end) {
    return this.#array.subarray(begin, end);
  }
  toLocaleString(locales, options) {
    // @ts-ignore
    return this.#array.toLocaleString(locales, options);
  }
  toReversed() {
    return this.#array.toReversed();
  }
  toSorted(compareFn) {
    return this.#array.toSorted(compareFn);
  }
  toString() {
    return this.#array.toString();
  }
  values() {
    return this.#array.values();
  }
  with(index, value) {
    return this.#array.with(index, value);
  }
  [Symbol.iterator]() {
    return this.#array[Symbol.iterator]();
  }
}

// This class provides a DataView-like interface for a WebAssembly memory
// buffer, restricted to either Int32 or BigInt64 types. It also reacquires
// the underlying buffer when the WebAssembly memory is resized, which can
// happen when the memory is detached and resized by the WebAssembly module.
class DataViewProxy {
  #module;
  #type;

  #_view = new DataView(new ArrayBuffer(0));
  get #view() {
    if (this.#_view.buffer.byteLength === 0) {
      // WebAssembly memory resize detached the buffer so re-create the
      // view with the new buffer.
      this.#_view = new DataView(
        this.#module.HEAPU8.buffer,
        this.#module.HEAPU8.byteOffset + this.byteOffset);
    }
    return this.#_view;
  }

  /**
   * @param {*} module
   * @param {number} byteOffset 
   * @param {'Int32'|'BigInt64'} type
   */
  constructor(module, byteOffset, type) {
    this.#module = module;
    this.byteOffset = byteOffset;
    this.#type = type;
  }

  get buffer() {
    return this.#view.buffer;
  }
  get byteLength() {
    return this.#type === 'Int32' ? 4 : 8;
  }

  getInt32(byteOffset, littleEndian) {
    if (this.#type !== 'Int32') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    return this.#view.getInt32(byteOffset, littleEndian);
  }
  setInt32(byteOffset, value, littleEndian) {
    if (this.#type !== 'Int32') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    this.#view.setInt32(byteOffset, value, littleEndian);
  }
  getBigInt64(byteOffset, littleEndian) {
    if (this.#type !== 'BigInt64') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    return this.#view.getBigInt64(byteOffset, littleEndian);
  }
  setBigInt64(byteOffset, value, littleEndian) {
    if (this.#type !== 'BigInt64') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    this.#view.setBigInt64(byteOffset, value, littleEndian);
  }
}