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

const { BaseBuffer, GrowableBuffer } = require('./buffer.js');
const { Buffer } = require('buffer');
const constants = require("./constants.js");
const errors = require("../../errors.js");
const types = require("../../types.js");
const util = require("util");
const vector = require("./vector.js");
const nodbUtil = require("../../util.js");

/**
 * Class used for decoding
 */
class OsonDecoder extends BaseBuffer {

  //---------------------------------------------------------------------------
  // _decodeContainerNode()
  //
  // Decodes a container node (object or array) from the tree segment and
  // returns the JavaScript equivalent.
  //---------------------------------------------------------------------------
  _decodeContainerNode(nodeType) {

    // determine the number of children by examining the 4th and 5th most
    // significant bits of the node type; determine the offsets in the tree
    // segment to the field ids array and the value offsets array
    let container, offsetsPos, fieldIdsPos;
    const containerOffset = this.pos - this.treeSegPos - 1;
    let numChildren = this._getNumChildren(nodeType);
    const isObject = ((nodeType & 0x40) === 0);
    if (numChildren === undefined) {
      const offset = this._getOffset(nodeType);
      offsetsPos = this.pos;
      this.pos = this.treeSegPos + offset;
      const sharedNodeType = this.readUInt8();
      numChildren = this._getNumChildren(sharedNodeType);
      container = (isObject) ? {} : new Array(numChildren);
      fieldIdsPos = this.pos;
    } else if (isObject) {
      container = {};
      fieldIdsPos = this.pos;
      offsetsPos = this.pos + this.fieldIdLength * numChildren;
    } else {
      container = new Array(numChildren);
      offsetsPos = this.pos;
    }

    for (let i = 0; i < numChildren; i++) {
      let name;
      if (isObject) {
        let fieldId;
        if (this.fieldIdLength === 1) {
          fieldId = this.buf[fieldIdsPos];
        } else if (this.fieldIdLength == 2) {
          fieldId = this.buf.readUInt16BE(fieldIdsPos);
        } else {
          fieldId = this.buf.readUInt32BE(fieldIdsPos);
        }
        name = this.fieldNames[fieldId - 1];
        fieldIdsPos += this.fieldIdLength;
      }
      this.pos = offsetsPos;
      let offset = this._getOffset(nodeType);
      if (this.relativeOffsets) {
        offset += containerOffset;
      }
      offsetsPos = this.pos;
      this.pos = this.treeSegPos + offset;
      if (isObject) {
        container[name] = this._decodeNode();
      } else {
        container[i] = this._decodeNode();
      }
    }

    return container;
  }

  //---------------------------------------------------------------------------
  // _decodeNode()
  //
  // Decodes a node from the tree segment and returns the JavaScript
  // equivalent.
  //---------------------------------------------------------------------------
  _decodeNode() {

    // if the most significant bit is set the node refers to a container
    let nodeType = this.readUInt8();
    if (nodeType & 0x80) {
      return this._decodeContainerNode(nodeType);
    }

    // handle simple scalars
    if (nodeType === constants.TNS_JSON_TYPE_NULL) {
      return null;
    } else if (nodeType === constants.TNS_JSON_TYPE_TRUE) {
      return true;
    } else if (nodeType === constants.TNS_JSON_TYPE_FALSE) {
      return false;

    // handle fixed length scalars
    } else if (nodeType === constants.TNS_JSON_TYPE_DATE ||
        nodeType === constants.TNS_JSON_TYPE_TIMESTAMP7) {
      return this.parseOracleDate(this.readBytes(7));
    } else if (nodeType === constants.TNS_JSON_TYPE_TIMESTAMP) {
      return this.parseOracleDate(this.readBytes(11));
    } else if (nodeType === constants.TNS_JSON_TYPE_TIMESTAMP_TZ) {
      return this.parseOracleDate(this.readBytes(13));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_FLOAT) {
      return this.parseBinaryFloat(this.readBytes(4));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_DOUBLE) {
      return this.parseBinaryDouble(this.readBytes(8));

    // handle interval datatypes
    } else if (nodeType === constants.TNS_JSON_TYPE_INTERVAL_YM) {
      return this.parseOracleIntervalYM(this.readBytes(5));
    } else if (nodeType === constants.TNS_JSON_TYPE_INTERVAL_DS) {
      return this.parseOracleIntervalDS(this.readBytes(11));

    // handle scalars with lengths stored outside the node itself
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT8) {
      return this.readBytes(this.readUInt8()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT16) {
      return this.readBytes(this.readUInt16BE()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT32) {
      return this.readBytes(this.readUInt32BE()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_NUMBER_LENGTH_UINT8) {
      return parseFloat(this.readOracleNumber());
    } else if (nodeType === constants.TNS_JSON_TYPE_ID) {
      const buf = this.readBytes(this.readUInt8());
      const jsonId = new types.JsonId(buf.length);
      buf.copy(jsonId);
      return jsonId;
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT16) {
      return Buffer.from(this.readBytes(this.readUInt16BE()));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT32) {
      return Buffer.from(this.readBytes(this.readUInt32BE()));
    } else if (nodeType === constants.TNS_JSON_TYPE_EXTENDED) {
      nodeType = this.readUInt8();
      if (nodeType === constants.TNS_JSON_TYPE_VECTOR) {
        const vecImage = this.readBytes(this.readUInt32BE());
        const decoder = new vector.VectorDecoder(vecImage);
        return decoder.decode();
      }
    }

    // handle number/decimal with length stored inside the node itself
    const typeBits = nodeType & 0xf0;
    if (typeBits === 0x20 || typeBits === 0x60) {
      const len = nodeType & 0x0f;
      return parseFloat(this.parseOracleNumber(this.readBytes(len + 1)));

    // handle integer with length stored inside the node itself
    } else if (typeBits === 0x40 || typeBits === 0x50) {
      const len = nodeType & 0x0f;
      return parseFloat(this.parseOracleNumber(this.readBytes(len)));

    // handle string with length stored inside the node itself
    } else if ((nodeType & 0xe0) == 0) {
      if (nodeType === 0)
        return '';
      return this.readBytes(nodeType).toString();
    }

    errors.throwErr(errors.ERR_UNSUPPORTED_DATA_TYPE_IN_JSON, nodeType);
  }

  //---------------------------------------------------------------------------
  // _getNumChildren()
  //
  // Returns the number of children a container has. This is determined by
  // looking at the 4th and 5th most significant bits of the node type.
  //
  //   00 - number of children is uint8_t
  //   01 - number of children is uint16_t
  //   10 - number of children is uint32_t
  //   11 - field ids are shared with another object whose offset follows
  //
  // In the latter case the value undefined is returned and the number of
  // children must be read from the shared object at the specified offset.
  //---------------------------------------------------------------------------
  _getNumChildren(nodeType) {
    const childrenBits = (nodeType & 0x18);
    if (childrenBits === 0) {
      return this.readUInt8();
    } else if (childrenBits === 0x08) {
      return this.readUInt16BE();
    } else if (childrenBits === 0x10) {
      return this.readUInt32BE();
    }
  }

  //---------------------------------------------------------------------------
  // _getOffset()
  //
  // Returns an offset. The offset will be either a 16-bit or 32-bit value
  // depending on the value of the 3rd significant bit of the node type.
  //---------------------------------------------------------------------------
  _getOffset(nodeType) {
    if (nodeType & 0x20) {
      return this.readUInt32BE();
    } else {
      return this.readUInt16BE();
    }
  }

  //---------------------------------------------------------------------------
  // _getFieldNames
  //
  // Reads the field names from the buffer.
  //---------------------------------------------------------------------------
  _getFieldNames(arrStartPos, numFields, offsetsSize, fieldNamesSegSize, fieldNamesSize) {

    // skip the hash id array (1 byte * fieldNamesSize for each field)
    this.skipBytes(numFields * fieldNamesSize);

    // skip the field name offsets array for now
    const offsetsPos = this.pos;
    this.skipBytes(numFields * offsetsSize);
    const ptr = this.readBytes(fieldNamesSegSize);
    const finalPos = this.pos;

    // determine the names of the fields
    this.pos = offsetsPos;
    let offset;
    for (let i = arrStartPos; i < arrStartPos + numFields; i++) {
      if (offsetsSize === 2) {
        offset = this.readUInt16BE();
      } else {
        offset = this.readUInt32BE();
      }

      // get the field name object
      let temp;
      if (fieldNamesSize === 1) {
        // Short Field Name
        temp = ptr.readUInt8(offset);
      } else {
        // Long Field Name
        temp = ptr.readUInt16BE(offset);
      }
      this.fieldNames[i] = ptr.subarray(offset + fieldNamesSize, offset + temp + fieldNamesSize).toString();
    }
    this.pos = finalPos;
  }

  //---------------------------------------------------------------------------
  // decode()
  //
  // Decodes the OSON and returns a JavaScript object corresponding to its
  // contents.
  //---------------------------------------------------------------------------
  decode() {

    // parse root header
    const magic = this.readBytes(3);
    if (magic[0] !== constants.TNS_JSON_MAGIC_BYTE_1 ||
        magic[1] !== constants.TNS_JSON_MAGIC_BYTE_2 ||
        magic[2] !== constants.TNS_JSON_MAGIC_BYTE_3) {
      errors.throwErr(errors.ERR_UNEXPECTED_DATA, magic.toString('hex'));
    }
    const version = this.readUInt8();
    if (version !== constants.TNS_JSON_VERSION_MAX_FNAME_255 &&
        version !== constants.TNS_JSON_VERSION_MAX_FNAME_65535) {
      errors.throwErr(errors.ERR_OSON_VERSION_NOT_SUPPORTED, version);
    }
    const primaryFlags = this.readUInt16BE();
    this.relativeOffsets = primaryFlags & constants.TNS_JSON_FLAG_REL_OFFSET_MODE;

    // scalar values are much simpler
    if (primaryFlags & constants.TNS_JSON_FLAG_IS_SCALAR) {
      if (primaryFlags & constants.TNS_JSON_FLAG_TREE_SEG_UINT32) {
        this.skipBytes(4);
      } else {
        this.skipBytes(2);
      }
      return this._decodeNode();
    }

    // determine the number of short field names
    let numShortFieldNames;
    if (primaryFlags & constants.TNS_JSON_FLAG_NUM_FNAMES_UINT32) {
      numShortFieldNames = this.readUInt32BE();
      this.fieldIdLength = 4;
    } else if (primaryFlags & constants.TNS_JSON_FLAG_NUM_FNAMES_UINT16) {
      numShortFieldNames = this.readUInt16BE();
      this.fieldIdLength = 2;
    } else {
      numShortFieldNames = this.readUInt8();
      this.fieldIdLength = 1;
    }

    // determine the size of the short field names segment
    let shortFieldNameOffsetsSize, shortFieldNamesSegSize;
    if (primaryFlags & constants.TNS_JSON_FLAG_FNAMES_SEG_UINT32) {
      shortFieldNameOffsetsSize = 4;
      shortFieldNamesSegSize = this.readUInt32BE();
    } else {
      shortFieldNameOffsetsSize = 2;
      shortFieldNamesSegSize = this.readUInt16BE();
    }

    // if the version indicates that field names > 255 bytes exist, parse
    // the information about that segment
    let longFieldNameOffsetsSize, longFieldNamesSegSize;
    let numLongFieldNames = 0;
    if (version === constants.TNS_JSON_VERSION_MAX_FNAME_65535) {
      const secondaryFlags = this.readUInt16BE();
      if (secondaryFlags & constants.TNS_JSON_FLAG_SEC_FNAMES_SEG_UINT16) {
        longFieldNameOffsetsSize = 2;
      } else {
        longFieldNameOffsetsSize = 4;
      }
      numLongFieldNames = this.readUInt32BE();
      longFieldNamesSegSize = this.readUInt32BE();
    }

    // skip the size of the tree segment
    if (primaryFlags & constants.TNS_JSON_FLAG_TREE_SEG_UINT32) {
      this.skipBytes(4);
    } else {
      this.skipBytes(2);
    }

    // skip the number of "tiny" nodes
    this.skipBytes(2);

    this.fieldNames = new Array(numShortFieldNames + numLongFieldNames);

    // if there are any short names, read them now
    if (numShortFieldNames > 0) {
      this._getFieldNames(0, numShortFieldNames,
        shortFieldNameOffsetsSize, shortFieldNamesSegSize, 1);
    }

    // if there are any long names, read them now
    if (numLongFieldNames > 0) {
      this._getFieldNames(numShortFieldNames, numLongFieldNames,
        longFieldNameOffsetsSize, longFieldNamesSegSize, 2);
    }

    // determine tree segment position in the buffer
    this.treeSegPos = this.pos;

    // decode the root node
    return this._decodeNode();
  }

}

class OsonFieldName {

  constructor(name, maxFieldNameSize) {
    this.name = name;
    this.nameBytes = Buffer.from(name);
    if (this.nameBytes.length > maxFieldNameSize) {
      errors.throwErr(errors.ERR_OSON_FIELD_NAME_LIMITATION, maxFieldNameSize);
    }

    // BigInt constants for calculating Hash ID for the OSON Field Name
    const INITIAL_HASHID = 0x811C9DC5n;
    const HASH_MULTIPLIER = 16777619n;
    const HASH_MASK = 0xffffffffn;

    this.hashId = INITIAL_HASHID;
    for (let i = 0; i < this.nameBytes.length; i++) {
      const c = BigInt(this.nameBytes[i]);
      this.hashId = ((this.hashId ^ c) * HASH_MULTIPLIER) & HASH_MASK;
    }
    this.hashId = Number(this.hashId) & 0xff;
  }

}

class OsonFieldNamesSegment extends GrowableBuffer {

  constructor() {
    super();
    this.fieldNames = [];
  }

  //---------------------------------------------------------------------------
  // addName()
  //
  // Adds a name to the field names segment.
  //---------------------------------------------------------------------------
  addName(fieldName) {
    fieldName.offset = this.pos;
    if (fieldName.nameBytes.length <= 255) {
      this.writeUInt8(fieldName.nameBytes.length);
    } else {
      this.writeUInt16BE(fieldName.nameBytes.length);
    }
    this.writeBytes(fieldName.nameBytes);
    this.fieldNames.push(fieldName);
  }

  //---------------------------------------------------------------------------
  // _processFieldNames()
  //
  // Processes the field names in preparation for encoding within OSON.
  //---------------------------------------------------------------------------
  _processFieldNames(fieldIdOffset) {
    this.fieldNames.sort((a, b) => {
      if (a.hashId < b.hashId)
        return -1;
      if (a.hashId > b.hashId)
        return 1;
      if (a.nameBytes.length < b.nameBytes.length)
        return -1;
      if (a.nameBytes.length > b.nameBytes.length)
        return 1;
      if (a.name < b.name)
        return -1;
      if (a.name > b.name)
        return 1;
      return 0;
    });
    for (let i = 0; i < this.fieldNames.length; i++) {
      this.fieldNames[i].fieldId = fieldIdOffset + i + 1;
    }
    if (this.fieldNames.length < 256) {
      this.fieldIdSize = 1;
    } else if (this.fieldNames.length < 65536) {
      this.fieldIdSize = 2;
    } else {
      this.fieldIdSize = 4;
    }
  }

}

class OsonTreeSegment extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // _encodeArray()
  //
  // Encodes an array in the OSON tree segment.
  //---------------------------------------------------------------------------
  _encodeArray(value, encoder) {
    this._encodeContainer(constants.TNS_JSON_TYPE_ARRAY, value.length);
    const len = value.length * 4;
    const pos = this.reserveBytes(len);
    let offsetsBufPos = pos;
    for (const element of value) {
      this.buf.writeUInt32BE(this.pos, offsetsBufPos);
      offsetsBufPos += 4;
      this.encodeNode(element, encoder);
    }
  }

  //---------------------------------------------------------------------------
  // _encodeContainer()
  //
  // Encodes the first part of a container (array or object) in the OSON tree
  // segment.
  //---------------------------------------------------------------------------
  _encodeContainer(nodeType, numChildren) {
    nodeType |= 0x20;                   // use uint32_t for offsets
    if (numChildren > 65535) {
      nodeType |= 0x10;                 // num children is uint32_t
    } else if (numChildren > 255) {
      nodeType |= 0x08;                 // num children is uint16_t
    }
    this.writeUInt8(nodeType);
    if (numChildren < 256) {
      this.writeUInt8(numChildren);
    } else if (numChildren < 65536) {
      this.writeUInt16BE(numChildren);
    } else {
      this.writeUInt32BE(numChildren);
    }
  }

  //---------------------------------------------------------------------------
  // _encodeObject()
  //
  // Encodes an object in the OSON tree segment.
  //---------------------------------------------------------------------------
  _encodeObject(value, encoder) {
    const numChildren = value.values.length;
    this._encodeContainer(constants.TNS_JSON_TYPE_OBJECT, numChildren);
    let fieldIdOffset = this.pos;
    let valueOffset = this.pos + (numChildren * encoder.fieldIdSize);
    const finalOffset = valueOffset + numChildren * 4;
    this.reserveBytes(finalOffset - this.pos);

    for (let i = 0; i < value.fields.length; i++) {
      const fieldName = encoder.fieldNamesMap.get(value.fields[i]);
      if (encoder.fieldIdSize == 1) {
        this.buf[fieldIdOffset] = fieldName.fieldId;
      } else if (encoder.fieldIdSize == 2) {
        this.buf.writeUInt16BE(fieldName.fieldId, fieldIdOffset);
      } else {
        this.buf.writeUInt32BE(fieldName.fieldId, fieldIdOffset);
      }
      this.buf.writeUInt32BE(this.pos, valueOffset);
      fieldIdOffset += encoder.fieldIdSize;
      valueOffset += 4;
      this.encodeNode(value.values[i], encoder);
    }
  }

  //---------------------------------------------------------------------------
  // encodeNode()
  //
  // Encodes a value (node) in the OSON tree segment.
  //---------------------------------------------------------------------------
  encodeNode(value, encoder) {

    // handle null
    if (value === undefined || value === null) {
      this.writeUInt8(constants.TNS_JSON_TYPE_NULL);

    // handle booleans
    } else if (typeof value === 'boolean') {
      if (value) {
        this.writeUInt8(constants.TNS_JSON_TYPE_TRUE);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_FALSE);
      }

    // handle numbers
    } else if (typeof value === 'number') {
      this.writeUInt8(constants.TNS_JSON_TYPE_NUMBER_LENGTH_UINT8);
      this.writeOracleNumber(value.toString());

    // handle strings
    } else if (typeof value === 'string') {
      const buf = Buffer.from(value);
      if (buf.length < 256) {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT8);
        this.writeUInt8(buf.length);
      } else if (buf.length < 65536) {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT16);
        this.writeUInt16BE(buf.length);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT32);
        this.writeUInt32BE(buf.length);
      }
      if (buf.length > 0) {
        this.writeBytes(buf);
      }

    // handle dates
    } else if (util.types.isDate(value)) {
      if (value.getUTCMilliseconds() === 0) {
        this.writeUInt8(constants.TNS_JSON_TYPE_TIMESTAMP7);
        this.writeOracleDate(value, types.DB_TYPE_DATE, false);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_TIMESTAMP);
        this.writeOracleDate(value, types.DB_TYPE_TIMESTAMP, false);
      }

    // handle interval data types
    } else if (value instanceof types.IntervalYM) {
      this.writeUInt8(constants.TNS_JSON_TYPE_INTERVAL_YM);
      this.writeOracleIntervalYM(value, false);
    } else if (value instanceof types.IntervalDS) {
      this.writeUInt8(constants.TNS_JSON_TYPE_INTERVAL_DS);
      this.writeOracleIntervalDS(value, false);

    // handle buffers
    } else if (Buffer.isBuffer(value)) {
      if (value.length < 65536) {
        this.writeUInt8(constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT16);
        this.writeUInt16BE(value.length);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT32);
        this.writeUInt32BE(value.length);
      }
      this.writeBytes(value);

    // handle arrays
    } else if (Array.isArray(value)) {
      this._encodeArray(value, encoder);

    // handle vectors
    } else if (nodbUtil.isVectorValue(value)) {
      this.writeUInt8(constants.TNS_JSON_TYPE_EXTENDED);
      this.writeUInt8(constants.TNS_JSON_TYPE_VECTOR);
      const encoder = new vector.VectorEncoder();
      const buf = encoder.encode(value);
      this.writeUInt32BE(buf.length);
      this.writeBytes(buf);

    } else if (value instanceof types.JsonId) {
      this.writeUInt8(constants.TNS_JSON_TYPE_ID);
      this.writeUInt8(value.length);
      this.writeBytes(Buffer.from(value.buffer));

    // handle objects
    } else {
      this._encodeObject(value, encoder);
    }

  }

}

/**
 * Class used for encoding
 */

class OsonEncoder extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // _addFieldName()
  //
  // Add a field with the given name.
  //---------------------------------------------------------------------------
  _addFieldName(name) {
    const fieldName = new OsonFieldName(name, this.maxFieldNameSize);
    this.fieldNamesMap.set(name, fieldName);
    if (fieldName.nameBytes.length <= 255) {
      this.shortFieldNamesSeg.addName(fieldName);
    } else {
      if (!this.longFieldNamesSeg) {
        this.longFieldNamesSeg = new OsonFieldNamesSegment();
      }
      this.longFieldNamesSeg.addName(fieldName);
    }
  }

  //---------------------------------------------------------------------------
  // _examineNode()
  //
  // Examines the value. If it contains fields, unique names are retained. The
  // values are then examined to see if they also contain fields. Arrays are
  // examined to determine they contain elements that contain fields.
  //---------------------------------------------------------------------------
  _examineNode(value) {
    if (Array.isArray(value)) {
      for (const element of value) {
        this._examineNode(element);
      }
    } else if (value && Array.isArray(value.fields)) {
      for (let i = 0; i < value.fields.length; i++) {
        const name = value.fields[i];
        const element = value.values[i];
        if (!this.fieldNamesMap.has(name)) {
          this._addFieldName(name);
        }
        this._examineNode(element);
      }
    }
  }

  //---------------------------------------------------------------------------
  // _writeExtendedHeader()
  //
  // Write the extended header containing information about the short and long
  // field name segments.
  //---------------------------------------------------------------------------
  _writeExtendedHeader() {
    // write number of short field names
    if (this.fieldIdSize === 1) {
      this.writeUInt8(this.shortFieldNamesSeg.fieldNames.length);
    } else if (this.fieldIdSize === 2) {
      this.writeUInt16BE(this.shortFieldNamesSeg.fieldNames.length);
    } else {
      this.writeUInt32BE(this.shortFieldNamesSeg.fieldNames.length);
    }

    // write size of short field names segment
    if (this.shortFieldNamesSeg.pos < 65536) {
      this.writeUInt16BE(this.shortFieldNamesSeg.pos);
    } else {
      this.writeUInt32BE(this.shortFieldNamesSeg.pos);
    }

    // write fields for long field names segment, if applicable
    if (this.longFieldNamesSeg) {
      let secondaryFlags = 0;
      if (this.longFieldNamesSeg.pos < 65536) {
        secondaryFlags = constants.TNS_JSON_FLAG_SEC_FNAMES_SEG_UINT16;
      }
      this.writeUInt16BE(secondaryFlags);
      this.writeUInt32BE(this.longFieldNamesSeg.fieldNames.length);
      this.writeUInt32BE(this.longFieldNamesSeg.pos);
    }
  }

  //---------------------------------------------------------------------------
  // _writeFieldNamesSeg()
  //
  // Write the contents of the field names segment to the buffer.
  //---------------------------------------------------------------------------
  _writeFieldNamesSeg(fieldNamesSeg) {
    // write array of hash ids
    for (const fieldName of fieldNamesSeg.fieldNames) {
      if (fieldName.nameBytes.length <= 255) {
        this.writeUInt8(fieldName.hashId);
      } else {
        this.writeUInt16BE(fieldName.hashId);
      }
    }

    // write array of field name offsets for the short field names
    for (const fieldName of fieldNamesSeg.fieldNames) {
      if (fieldNamesSeg.pos < 65536) {
        this.writeUInt16BE(fieldName.offset);
      } else {
        this.writeUInt32BE(fieldName.offset);
      }
    }

    // write field names
    if (fieldNamesSeg.pos > 0) {
      this.writeBytes(fieldNamesSeg.buf.subarray(0, fieldNamesSeg.pos));
    }

  }

  //---------------------------------------------------------------------------
  // encode()
  //
  // Encodes the value as OSON and returns a buffer containing the OSON bytes.
  //---------------------------------------------------------------------------
  encode(value, maxFieldNameSize) {

    this.maxFieldNameSize = maxFieldNameSize;

    // determine the flags to use
    let flags = constants.TNS_JSON_FLAG_INLINE_LEAF;
    if (Array.isArray(value) || (value && Array.isArray(value.fields))) {
      // examine all values recursively to determine the unique set of field
      // names and whether they need to be added to the long field names
      // segment (> 255 bytes) or short field names segment (<= 255 bytes)
      this.fieldNamesMap = new Map();
      this.shortFieldNamesSeg = new OsonFieldNamesSegment();
      this._examineNode(value);

      // perform processing of field names segments and determine the total
      // number of unique field names in the value
      let totalNumFieldNames = 0;
      if (this.shortFieldNamesSeg) {
        this.shortFieldNamesSeg._processFieldNames(0);
        totalNumFieldNames += this.shortFieldNamesSeg.fieldNames.length;
      }
      if (this.longFieldNamesSeg) {
        this.longFieldNamesSeg._processFieldNames(totalNumFieldNames);
        totalNumFieldNames += this.longFieldNamesSeg.fieldNames.length;
      }

      // determine remaining flags and field id size
      flags |= constants.TNS_JSON_FLAG_HASH_ID_UINT8 |
        constants.TNS_JSON_FLAG_TINY_NODES_STAT;
      if (totalNumFieldNames > 65535) {
        flags |= constants.TNS_JSON_FLAG_NUM_FNAMES_UINT32;
        this.fieldIdSize = 4;
      } else if (totalNumFieldNames > 255) {
        flags |= constants.TNS_JSON_FLAG_NUM_FNAMES_UINT16;
        this.fieldIdSize = 2;
      } else {
        this.fieldIdSize = 1;
      }
      if (this.shortFieldNamesSeg.pos > 65535) {
        flags |= constants.TNS_JSON_FLAG_FNAMES_SEG_UINT32;
      }
    } else {
      // if the value is a simple scalar
      flags |= constants.TNS_JSON_FLAG_IS_SCALAR;
    }

    // encode values into the OSON tree segment
    const treeSeg = new OsonTreeSegment();
    treeSeg.encodeNode(value, this);
    if (treeSeg.pos > 65535) {
      flags |= constants.TNS_JSON_FLAG_TREE_SEG_UINT32;
    }

    // write initial header
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_1);
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_2);
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_3);
    if (this.longFieldNamesSeg) {
      this.writeUInt8(constants.TNS_JSON_VERSION_MAX_FNAME_65535);
    } else {
      this.writeUInt8(constants.TNS_JSON_VERSION_MAX_FNAME_255);
    }
    this.writeUInt16BE(flags);

    // write extended header (when value is not scalar)
    if (this.shortFieldNamesSeg) {
      this._writeExtendedHeader();
    }

    // write size of tree segment
    if (treeSeg.pos < 65536) {
      this.writeUInt16BE(treeSeg.pos);
    } else {
      this.writeUInt32BE(treeSeg.pos);
    }

    // write remainder of header and any data (when value is not scalar)
    if (this.shortFieldNamesSeg) {

      // write number of "tiny" nodes (always zero)
      this.writeUInt16BE(0);

      // write the field names segments
      this._writeFieldNamesSeg(this.shortFieldNamesSeg);
      if (this.longFieldNamesSeg) {
        this._writeFieldNamesSeg(this.longFieldNamesSeg);
      }
    }

    // write tree segment data
    this.writeBytes(treeSeg.buf.subarray(0, treeSeg.pos));

    return this.buf.subarray(0, this.pos);
  }

}

module.exports = {
  OsonDecoder,
  OsonEncoder
};
