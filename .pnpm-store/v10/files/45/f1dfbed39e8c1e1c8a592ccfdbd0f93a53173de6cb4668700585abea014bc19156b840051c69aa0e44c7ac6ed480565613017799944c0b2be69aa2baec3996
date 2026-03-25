// Copyright (c) 2023, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const constants = require('./protocol/constants.js');
const errors = require('../errors.js');
const types = require('../types.js');
const DbObjectImpl = require('../impl/dbObject.js');
const { GrowableBuffer } = require('../impl/datahandlers/buffer.js');
const ThinLobImpl = require('./lob.js');

class DbObjectPickleBuffer extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // _readBytesWithLength()
  //
  // Helper function that processes the number of bytes (if needed) and then
  // acquires the specified number of bytes from the buffer.
  //---------------------------------------------------------------------------
  _readBytesWithLength(numBytes) {
    if (numBytes === constants.TNS_LONG_LENGTH_INDICATOR) {
      numBytes = this.readUInt32BE();
    }
    return this.readBytes(numBytes);
  }

  //---------------------------------------------------------------------------
  // getIsAtomicNull()
  //
  // Reads the next byte and checks to see if the value is atomically null. If
  // not, the byte is returned to the buffer for further processing.
  //---------------------------------------------------------------------------
  getIsAtomicNull(isCollection) {
    const value = this.readUInt8();
    if (value === constants.TNS_OBJ_ATOMIC_NULL ||
      (isCollection && value === constants.TNS_NULL_LENGTH_INDICATOR)) {
      return true;
    }
    this.pos -= 1;
    return false;
  }

  //---------------------------------------------------------------------------
  // readHeader()
  //
  // Reads the header of the pickled data.
  //---------------------------------------------------------------------------
  readHeader(obj) {
    obj.imageFlags = this.readUInt8();
    obj.imageVersion = this.readUInt8();
    this.readLength();
    if ((obj.imageFlags & constants.TNS_OBJ_NO_PREFIX_SEG) === 0) {
      const prefixSegLength = this.readLength();
      this.skipBytes(prefixSegLength);
    }
  }

  //---------------------------------------------------------------------------
  // readLength()
  //
  // Read the length from the buffer. This will be a single byte, unless the
  // value meets or exeeds TNS_LONG_LENGTH_INDICATOR. In that case, the value
  // is stored as a 4-byte integer.
  //---------------------------------------------------------------------------
  readLength() {
    const shortLength = this.readUInt8();
    if (shortLength !== constants.TNS_LONG_LENGTH_INDICATOR) {
      return shortLength;
    }
    return this.readUInt32BE();
  }

  //---------------------------------------------------------------------------
  // writeHeader()
  //
  // Writes the header of the pickled data. Since the size is unknown at this
  // point, zero is written initially and the actual size is written later.
  //---------------------------------------------------------------------------
  writeHeader(obj) {
    this.writeUInt8(obj.imageFlags);
    this.writeUInt8(obj.imageVersion);
    this.writeUInt8(constants.TNS_LONG_LENGTH_INDICATOR);
    this.writeUInt32BE(0);
    if (obj._objType.isCollection) {
      this.writeUInt8(1);               // length of prefix segment
      this.writeUInt8(1);               // prefix segment contents
    }
  }

  //---------------------------------------------------------------------------
  // writeLength()
  //
  // Writes the length to the buffer.
  //---------------------------------------------------------------------------
  writeLength(length) {
    if (length <= constants.TNS_OBJ_MAX_SHORT_LENGTH) {
      this.writeUInt8(length);
    } else {
      this.writeUInt8(constants.TNS_LONG_LENGTH_INDICATOR);
      this.writeUInt32BE(length);
    }
  }

  //---------------------------------------------------------------------------
  // _writeRawBytesAndLength()
  //
  // Writes the length in the format required before
  // writing the bytes.
  //---------------------------------------------------------------------------
  _writeRawBytesAndLength(value, numBytes) {
    this.writeLength(numBytes);
    this.writeBytes(value);
  }
}

class ThinDbObjectImpl extends DbObjectImpl {

  constructor(objType, packedData) {
    if (typeof objType === 'function') {
      objType = objType.prototype._objType;
    }
    super(objType);
    this.packedData = packedData;
    this.unpackedAttrs = new Map();
    if (packedData) {
      this.unpackedAssocArray = new Map();
      this.unpackedAssocKeys = undefined;
    } else if (objType) {
      const prefix = Buffer.from([0, 0x22, constants.TNS_OBJ_NON_NULL_OID,
        constants.TNS_OBJ_HAS_EXTENT_OID]);
      this.toid = Buffer.concat([prefix, objType.oid, constants.TNS_EXTENT_OID]);
      this.flags = constants.TNS_OBJ_TOP_LEVEL;
      this.imageFlags = constants.TNS_OBJ_IS_VERSION_81;
      this.imageVersion = constants.TNS_OBJ_IMAGE_VERSION;
      if (objType.isCollection) {
        this.imageFlags |= constants.TNS_OBJ_IS_COLLECTION;
        if (objType.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
          this.unpackedAssocArray = new Map();
        } else {
          this.unpackedArray = [];
        }
      } else {
        this.imageFlags |= constants.TNS_OBJ_NO_PREFIX_SEG;
      }
    }
  }

  //---------------------------------------------------------------------------
  // _ensureAssocKeys()
  //
  // Ensure that the keys for the associative array have been calculated.
  // PL/SQL associative arrays keep their keys in sorted order so this must be
  // calculated when indices are required.
  //---------------------------------------------------------------------------
  _ensureAssocKeys() {
    if (!this.unpackedAssocKeys) {
      // Associative arrays indexed by integer are only supported now
      this.unpackedAssocKeys = [...this.unpackedAssocArray.keys()].sort((x, y) => x - y);
    }
  }

  //---------------------------------------------------------------------------
  // _ensureUnpacked()
  //
  // Ensure that the data has been unpacked.
  //---------------------------------------------------------------------------
  _ensureUnpacked() {
    if (this.packedData) {
      this._unpackData();
    }
  }

  //---------------------------------------------------------------------------
  // _getPackedData()
  //
  // Returns the packed data for the object. This will either be the value
  // retrieved from the database or generated packed data (for new objects and
  // those that have had their data unpacked already).
  //---------------------------------------------------------------------------
  _getPackedData() {
    if (this.packedData)
      return this.packedData;
    const buf = new DbObjectPickleBuffer();
    buf.writeHeader(this);
    this._packData(buf);
    const size = buf.pos;
    buf.pos = 3;
    buf.writeUInt32BE(size);
    return buf.buf.subarray(0, size);
  }

  //---------------------------------------------------------------------------
  // _packData()
  //
  // Packs the data from the object into the buffer.
  //---------------------------------------------------------------------------
  _packData(buf) {
    const objType = this._objType;
    if (objType.isCollection) {
      buf.writeUInt8(objType.collectionFlags);
      if (objType.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
        this._ensureAssocKeys();
        buf.writeLength(this.unpackedAssocKeys.length);
        for (const index of this.unpackedAssocKeys) {
          buf.writeInt32BE(index);
          this._packValue(buf, objType.elementType, objType.elementTypeClass,
            this.unpackedAssocArray.get(index));
        }
      } else {
        buf.writeLength(this.unpackedArray.length);
        for (const value of this.unpackedArray) {
          this._packValue(buf, objType.elementType, objType.elementTypeClass,
            value);
        }
      }
    } else {
      for (const attr of objType.attributes) {
        this._packValue(buf, attr.type, attr.typeClass,
          this.unpackedAttrs.get(attr.name));
      }
    }
  }

  //---------------------------------------------------------------------------
  // _packValue()
  //
  // Packs a value into the buffer. At this point it is assumed that the value
  // matches the correct type.
  //---------------------------------------------------------------------------
  _packValue(buf, type, typeClass, value) {
    if (value === null || value === undefined) {
      if (typeClass && !typeClass.prototype.isCollection) {
        buf.writeUInt8(constants.TNS_OBJ_ATOMIC_NULL);
      } else {
        buf.writeUInt8(constants.TNS_NULL_LENGTH_INDICATOR);
      }
    } else {
      switch (type) {
        case types.DB_TYPE_CHAR:
        case types.DB_TYPE_VARCHAR:
          buf.writeBytesWithLength(Buffer.from(value));
          break;
        case types.DB_TYPE_NCHAR:
        case types.DB_TYPE_NVARCHAR:
          buf.writeBytesWithLength(Buffer.from(value, 'utf16le').swap16());
          break;
        case types.DB_TYPE_NUMBER:
          buf.writeOracleNumber(value.toString());
          break;
        case types.DB_TYPE_BINARY_INTEGER:
        case types.DB_TYPE_BOOLEAN:
          buf.writeUInt8(4);
          buf.writeUInt32BE(value);
          break;
        case types.DB_TYPE_RAW:
          buf.writeBytesWithLength(value);
          break;
        case types.DB_TYPE_BINARY_DOUBLE:
          buf.writeUInt8(8);
          buf.writeBinaryDouble(value);
          break;
        case types.DB_TYPE_BINARY_FLOAT:
          buf.writeUInt8(4);
          buf.writeBinaryFloat(value);
          break;
        case types.DB_TYPE_DATE:
        case types.DB_TYPE_TIMESTAMP:
        case types.DB_TYPE_TIMESTAMP_LTZ:
        case types.DB_TYPE_TIMESTAMP_TZ:
          buf.writeOracleDate(value, type);
          break;
        case types.DB_TYPE_OBJECT:
          if (this._objType.isCollection || value._objType.isCollection) {
            buf.writeBytesWithLength(value._getPackedData());
          } else {
            value._packData(buf);
          }
          break;
        default:
          errors.throwErr(errors.ERR_NOT_IMPLEMENTED, type);
      }
    }
  }

  //---------------------------------------------------------------------------
  // _unpackData()
  //
  // Unpacks the packed data into a map of JavaScript values.
  //---------------------------------------------------------------------------
  _unpackData() {
    const buf = new DbObjectPickleBuffer(this.packedData);
    buf.readHeader(this);
    this._unpackDataFromBuf(buf);
    this.packedData = undefined;
  }

  //---------------------------------------------------------------------------
  // _unpackDataFromBuf()
  //
  // Unpacks the data in the buffer into a map of JavaScript values.
  //---------------------------------------------------------------------------
  _unpackDataFromBuf(buf) {
    let unpackedArray, unpackedAssocArray, assocIndex, unpackedAttrs;
    const objType = this._objType;
    if (objType.isCollection) {
      if (objType.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
        unpackedAssocArray = new Map();
      } else {
        unpackedArray = [];
      }
      this.collectionFlags = buf.readUInt8();
      const numElements = buf.readLength();
      for (let i = 0; i < numElements; i++) {
        if (objType.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
          assocIndex = buf.readUInt32BE();
        }
        const value = this._unpackValue(buf, objType.elementType,
          objType.elementTypeClass);
        if (objType.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
          unpackedAssocArray.set(assocIndex, value);
        } else {
          unpackedArray.push(value);
        }
      }
    } else {
      unpackedAttrs = new Map();
      for (const attr of objType.attributes) {
        const value = this._unpackValue(buf, attr.type, attr.typeClass);
        unpackedAttrs.set(attr.name, value);
      }
    }
    this.unpackedAttrs = unpackedAttrs;
    this.unpackedArray = unpackedArray;
    this.unpackedAssocArray = unpackedAssocArray;
  }

  //---------------------------------------------------------------------------
  // _unpackValue()
  //
  // Unpacks a single value and returns it.
  //---------------------------------------------------------------------------
  _unpackValue(buf, type, typeClass) {
    let isNull, obj, value, isCollection;
    switch (type) {
      case types.DB_TYPE_NUMBER:
        return buf.readOracleNumber();
      case types.DB_TYPE_BINARY_INTEGER:
        return buf.readBinaryInteger();
      case types.DB_TYPE_VARCHAR:
      case types.DB_TYPE_CHAR:
        return buf.readStr(constants.CSFRM_IMPLICIT);
      case types.DB_TYPE_NVARCHAR:
      case types.DB_TYPE_NCHAR:
        return buf.readStr(constants.CSFRM_NCHAR);
      case types.DB_TYPE_RAW:
        value = buf.readBytesWithLength();
        if (value !== null)
          value = Buffer.from(value);
        return value;
      case types.DB_TYPE_BINARY_DOUBLE:
        return buf.readBinaryDouble();
      case types.DB_TYPE_BINARY_FLOAT:
        return buf.readBinaryFloat();
      case types.DB_TYPE_DATE:
      case types.DB_TYPE_TIMESTAMP:
        return buf.readOracleDate(true);
      case types.DB_TYPE_TIMESTAMP_LTZ:
      case types.DB_TYPE_TIMESTAMP_TZ:
        return buf.readOracleDate(false);
      case types.DB_TYPE_BOOLEAN:
        return buf.readBool();
      case types.DB_TYPE_OBJECT:
      case types.DB_TYPE_XMLTYPE:
        obj = new ThinDbObjectImpl(typeClass);
        isCollection = obj._objType.isCollection ||
          this._objType.isCollection;
        isNull = buf.getIsAtomicNull(isCollection);
        if (isNull)
          return null;
        if (obj._objType.isXmlType) {
          return readXML(obj._objType._connection, buf.readBytesWithLength());
        }
        if (isCollection) {
          obj.packedData = Buffer.from(buf.readBytesWithLength());
        } else {
          obj._unpackDataFromBuf(buf);
        }
        return obj;
      default:
        errors.throwErr(errors.ERR_NOT_IMPLEMENTED, type);
    }
  }

  //---------------------------------------------------------------------------
  // append()
  //
  // Appends an element to the collection.
  //---------------------------------------------------------------------------
  append(value) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      const objType = this._objType;
      if (objType.maxNumElements > 0 &&
          this.unpackedArray.length >= objType.maxNumElements) {
        errors.throwErr(errors.ERR_INVALID_COLL_INDEX_SET,
          this.unpackedArray.length, 0, objType.maxNumElements - 1);
      }
      this.unpackedArray.push(value);
    } else {
      this._ensureAssocKeys();
      let newIndex;
      if (this.unpackedAssocKeys.length === 0) {
        newIndex = 0;
      } else {
        const keyIndex = this.unpackedAssocKeys.length - 1;
        newIndex = this.unpackedAssocKeys[keyIndex] + 1;
      }
      this.unpackedAssocArray.set(newIndex, value);
      this.unpackedAssocKeys.push(newIndex);
    }
  }

  //---------------------------------------------------------------------------
  // copy
  //
  // Creates and returns a copy of the ThinDBObjectImpl object. The copy is
  // independent of the original object that was copied.
  //---------------------------------------------------------------------------
  copy() {
    // We send in marshalled data of the original object to the constructor
    // when we create the object copy
    const newObjImpl = new ThinDbObjectImpl(this._objType, this._getPackedData());

    // Set other properties
    newObjImpl.toid = this.toid;
    newObjImpl.flags = this.flags;
    newObjImpl.imageFlags = this.imageFlags;
    newObjImpl.imageVersion = this.imageVersion;

    return newObjImpl;
  }

  //---------------------------------------------------------------------------
  // deleteElement()
  //
  // Deletes an element from a collection.
  //---------------------------------------------------------------------------
  deleteElement(index) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      if (this._objType.collectionType == constants.TNS_OBJ_VARRAY) {
        errors.throwErr(errors.ERR_DELETE_ELEMENTS_OF_VARRAY);
      }
      this.unpackedArray.splice(index, 1);
    } else {
      this.unpackedAssocKeys = undefined;
      this.unpackedAssocArray.delete(index);
    }
  }

  //---------------------------------------------------------------------------
  // getAttrValue()
  //
  // Returns the value of the given attribute on the object.
  //---------------------------------------------------------------------------
  getAttrValue(attr) {
    this._ensureUnpacked();
    const value = this.unpackedAttrs.get(attr.name);
    if (value === undefined)
      return null;
    return value;
  }

  //---------------------------------------------------------------------------
  // getElement()
  //
  // Returns an element from the collection.
  //---------------------------------------------------------------------------
  getElement(index) {
    let value;
    this._ensureUnpacked();
    if (this.unpackedArray) {
      value = this.unpackedArray[index];
    } else {
      value = this.unpackedAssocArray.get(index);
    }
    if (value === undefined) {
      errors.throwErr(errors.ERR_INVALID_COLL_INDEX_GET, index);
    }
    return value;
  }

  //---------------------------------------------------------------------------
  // getFirstIndex()
  //
  // Returns the first index in a collection.
  //---------------------------------------------------------------------------
  getFirstIndex() {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      return 0;
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      return this.unpackedAssocKeys[0];
    }
  }

  //---------------------------------------------------------------------------
  // getKeys()
  //
  // Returns the keys of the collection in a JavaScript array.
  //---------------------------------------------------------------------------
  getKeys() {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      return Array.from(this.unpackedArray.keys());
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      return Array.from(this.unpackedAssocKeys);
    }
    return [];
  }

  //---------------------------------------------------------------------------
  // getLastIndex()
  //
  // Returns the last index in a collection.
  //---------------------------------------------------------------------------
  getLastIndex() {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      if (this.unpackedArray.length > 0)
        return this.unpackedArray.length - 1;
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      return this.unpackedAssocKeys[this.unpackedAssocKeys.length - 1];
    }
  }

  //---------------------------------------------------------------------------
  // getNextIndex()
  //
  // Returns the next index in a collection.
  // For associative arrays indexed by integers, if the passed-in index
  // parameter is not present, it will return the next higher index found
  // in the associative array.
  //---------------------------------------------------------------------------
  getNextIndex(index) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      if (index + 1 < this.unpackedArray.length) {
        return index + 1;
      }
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      for (const key of this.unpackedAssocKeys) {
        if (key > index)
          return key;
      }
    }
  }

  //---------------------------------------------------------------------------
  // getPrevIndex()
  //
  // Returns the previous index in a collection.
  // For associative arrays indexed by integers, if the passed-in index
  // parameter is not present, it will return the next lower index found
  // in the associative array.
  //---------------------------------------------------------------------------
  getPrevIndex(index) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      if (index > 0) {
        return index - 1;
      }
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      let prev;
      for (const key of this.unpackedAssocKeys) {
        if (key >= index)
          return prev;
        prev = key;
      }
    }
  }

  //---------------------------------------------------------------------------
  // getValues()
  //
  // Returns the values of the collection in a JavaScript array.
  //---------------------------------------------------------------------------
  getValues() {
    const result = [];
    this._ensureUnpacked();
    if (this.unpackedArray) {
      return Array.from(this.unpackedArray);
    } else if (this.unpackedAssocArray) {
      this._ensureAssocKeys();
      for (const key of this.unpackedAssocKeys) {
        result.push(this.unpackedAssocArray.get(key));
      }
    }
    return result;
  }

  //---------------------------------------------------------------------------
  // getLength
  //
  // Gets the size of the database object if it is a collection. Else returns
  // undefined.
  //---------------------------------------------------------------------------
  getLength() {
    this._ensureUnpacked();
    if (this.unpackedArray)
      return this.unpackedArray.length;
    if (this.unpackedAssocArray)
      return this.unpackedAssocArray.size;
  }

  //---------------------------------------------------------------------------
  // hasElement()
  //
  // Returns whether an element exists at the given index.
  //---------------------------------------------------------------------------
  hasElement(index) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      return (index >= 0 && index < this.unpackedArray.length);
    }
    return this.unpackedAssocArray.has(index);
  }

  //---------------------------------------------------------------------------
  // setAttrValue()
  //
  // Sets the value of the attribute on the object to the given value.
  //---------------------------------------------------------------------------
  setAttrValue(attr, value) {
    this._ensureUnpacked();
    this.unpackedAttrs.set(attr.name, value);
  }

  //---------------------------------------------------------------------------
  // setElement()
  //
  // Sets an entry in a collection that is indexed by integers.
  //---------------------------------------------------------------------------
  setElement(index, value) {
    this._ensureUnpacked();
    if (this.unpackedArray) {
      const maxIndex = Math.max(this.unpackedArray.length - 1, 0);
      if (index > maxIndex) {
        errors.throwErr(errors.ERR_INVALID_COLL_INDEX_SET, index, 0, maxIndex);
      }
      this.unpackedArray[index] = value;
    } else {
      if (!this.unpackedAssocArray.has(index))
        this.unpackedAssocKeys = undefined;
      this.unpackedAssocArray.set(index, value);
    }
  }

  //---------------------------------------------------------------------------
  // trim()
  //
  // Trim the specified number of elements from the end of the collection.
  //---------------------------------------------------------------------------
  trim(numToTrim) {
    this._ensureUnpacked();
    if (numToTrim > 0) {
      this.unpackedArray = this.unpackedArray.slice(0,
        this.unpackedArray.length - numToTrim);
    }
  }

}

//---------------------------------------------------------------------------
// readXML()
//
// Decodes the raw Bytes to XML string or LOB object.
//
//---------------------------------------------------------------------------
function readXML(conn, buf) {
  let colValue;

  const xmlObj = new DbObjectPickleBuffer(buf);
  const tempobj = {};
  xmlObj.readHeader(tempobj);
  xmlObj.skipBytes(1);
  const xmlflag = xmlObj.readUInt32BE();
  if (xmlflag & constants.TNS_XML_TYPE_FLAG_SKIP_NEXT_4) {
    xmlObj.skipBytes(4);
  }
  const numBytesLeft = xmlObj.numBytesLeft();
  const ptr = xmlObj.readBytes(numBytesLeft);
  if (xmlflag & constants.TNS_XML_TYPE_STRING) {
    colValue = ptr.toString();
  } else if (xmlflag & constants.TNS_XML_TYPE_LOB) {
    const lobImpl = new ThinLobImpl();
    const locator = Buffer.from(ptr);
    lobImpl.init(conn, locator, types.DB_TYPE_CLOB, 0, 0);
    colValue = lobImpl;
  } else {
    // We only support String and Clob type.
    errors.throwErr(errors.ERR_UNEXPECTED_XML_TYPE, xmlflag);
  }
  return colValue;
}

module.exports = { ThinDbObjectImpl, readXML };
