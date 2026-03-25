// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

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
const constants = require("./constants.js");
const errors = require("../../errors.js");
const types = require("../../types.js");
const nodbUtil = require("../../util.js");

/**
 * Base buffer class used for managing buffered data without unnecessary
 * copying.
 */
class BaseBuffer {

  //---------------------------------------------------------------------------
  // constructor()
  //
  // The initializer is either an integer specifying the size of the buffer, or
  // an existing Buffer, which is used directly.
  //---------------------------------------------------------------------------
  constructor(initializer) {
    if (typeof initializer === 'number') {
      this.buf = Buffer.alloc(initializer);
      this.size = 0;
      this.maxSize = initializer;
    } else if (initializer) {
      this.buf = initializer;
      this.size = this.maxSize = initializer.length;
    }
    this.pos = 0;
  }

  //---------------------------------------------------------------------------
  // _grow()
  //
  // Called when the buffer needs to grow. The base function simply raises an
  // error.
  //---------------------------------------------------------------------------
  _grow(numBytes) {
    errors.throwErr(errors.ERR_BUFFER_LENGTH_INSUFFICIENT, this.numBytesLeft(),
      numBytes);
  }

  //---------------------------------------------------------------------------
  // _readBytesWithLength()
  //
  // Helper function that processes the number of bytes (if needed) and then
  // acquires the specified number of bytes from the buffer. The base function
  // simply uses the length as given.
  //---------------------------------------------------------------------------
  _readBytesWithLength(numBytes) {
    return this.readBytes(numBytes);
  }

  //---------------------------------------------------------------------------
  // _readInteger()
  //
  // Read an integer from the buffer of the specified maximum size and returns
  // it. The signed flag indicates whether the value is allowed to be signed or
  // not and the skip flag indicates whether the data should simply be skipped.
  //---------------------------------------------------------------------------
  _readInteger(maxSize, signed, skip) {
    let isNegative = false;
    let size = this.readUInt8();
    if (size === 0) {
      return 0;
    } else if (size & 0x80) {
      if (!signed) {
        errors.throwErr(errors.ERR_UNEXPECTED_NEGATIVE_INTEGER, this.pos, this.packetNum);
      }
      isNegative = true;
      size = size & 0x7f;
    }
    if (size > maxSize) {
      errors.throwErr(errors.ERR_INTEGER_TOO_LARGE, size, maxSize, this.pos, this.packetNum);
    }
    if (skip) {
      this.skipBytes(size);
    } else {
      const buf = this.readBytes(size);
      const value = buf.readUIntBE(0, size);
      return (isNegative) ? -value : value;
    }
  }

  //---------------------------------------------------------------------------
  // numBytesLeft()
  //
  // Returns the number of bytes that are remaining in the buffer.
  //---------------------------------------------------------------------------
  numBytesLeft() {
    return this.size - this.pos;
  }

  //---------------------------------------------------------------------------
  // parseBinaryDouble()
  //
  // Parses a binary double from the supplied buffer and returns a Number.
  // It is assumed at this point that the size of the buffer is 8 bytes. A copy
  // is made of the buffer in order to ensure that the original buffer is not
  // modified. If it is and data spans multiple packets, incorrect data may be
  // returned!
  //---------------------------------------------------------------------------
  parseBinaryDouble(buf) {
    buf = Buffer.from(buf);
    if (buf[0] & 0x80) {
      buf[0] &= 0x7f;
    } else {
      // complement the bits for a negative number
      buf[0] ^= 0xff;
      buf[1] ^= 0xff;
      buf[2] ^= 0xff;
      buf[3] ^= 0xff;
      buf[4] ^= 0xff;
      buf[5] ^= 0xff;
      buf[6] ^= 0xff;
      buf[7] ^= 0xff;
    }
    return buf.readDoubleBE();
  }

  //---------------------------------------------------------------------------
  // parseBinaryFloat()
  //
  // Parses a binary float from the supplied buffer and returns a Number.  It
  // is assumed at this point that the size of the buffer is 4 bytes. A copy is
  // made of the buffer in order to ensure that the original buffer is not
  // modified. If it is and data spans multiple packets, incorrect data may be
  // returned!
  //---------------------------------------------------------------------------
  parseBinaryFloat(buf) {
    buf = Buffer.from(buf);
    if (buf[0] & 0x80) {
      buf[0] &= 0x7f;
    } else {
      // complement the bits for a negative number
      buf[0] ^= 0xff;
      buf[1] ^= 0xff;
      buf[2] ^= 0xff;
      buf[3] ^= 0xff;
    }
    return buf.readFloatBE();
  }

  //---------------------------------------------------------------------------
  // parseOracleDate()
  //
  // Parses an Oracle date from the supplied buffer and returns a Date. It is
  // assumed at this point that the size of the buffer is either 7 bytes (date
  // or compressed timestamp), 11 bytes (timestamp) or 13 bytes (timestamp with
  // time zone). Time zone information is discarded because Node.js uses UTC
  // timestamps and the server returns the data in that format, too. The Date
  // type in Node.js doesn't support time zone information.
  //---------------------------------------------------------------------------
  parseOracleDate(buf, useLocalTime = true) {
    let fseconds = 0;
    if (buf.length >= 11) {
      fseconds = Math.floor(buf.readUInt32BE(7) / (1000 * 1000));
    }
    const year = (buf[0] - 100) * 100 + buf[1] - 100;
    return nodbUtil.makeDate(useLocalTime, year, buf[2], buf[3], buf[4] - 1,
      buf[5] - 1, buf[6] - 1, fseconds, 0);
  }

  //---------------------------------------------------------------------------
  // parseOracleIntervalYM()
  //
  // Parses an Oracle interval year-to-month (YM) from the supplied buffer
  // and returns a corresponding IntervalYM object representing that value.
  // This object contains attributes for years and months.
  //---------------------------------------------------------------------------
  parseOracleIntervalYM(buf) {
    const years = buf.readUInt32BE() - constants.TNS_DURATION_MID;
    const months = buf[4] - constants.TNS_DURATION_OFFSET;
    return new types.IntervalYM({ years: years, months: months });
  }

  //---------------------------------------------------------------------------
  // parseOracleIntervalDS()
  //
  // Parses an Oracle interval day-to-second (DS) from the supplied buffer
  // and returns a corresponding IntervalDS object representing that value.
  // This object contains attributes for day and time units.
  //---------------------------------------------------------------------------
  parseOracleIntervalDS(buf) {
    const days = buf.readUInt32BE() - constants.TNS_DURATION_MID;
    const fseconds = buf.readUInt32BE(7) - constants.TNS_DURATION_MID;
    const hours = buf[4] - constants.TNS_DURATION_OFFSET;
    const minutes = buf[5] - constants.TNS_DURATION_OFFSET;
    const seconds = buf[6] - constants.TNS_DURATION_OFFSET;
    return new types.IntervalDS({ days: days, hours: hours, minutes: minutes,
      seconds: seconds, fseconds: fseconds });
  }

  //---------------------------------------------------------------------------
  // parseOracleNumber()
  //
  // Parses an Oracle number from the supplied buffer and returns a Number. It
  // is assumed at this point that the buffer only contains the encoded numeric
  // data.
  //---------------------------------------------------------------------------
  parseOracleNumber(buf) {

    // the first byte is the exponent; positive numbers have the highest
    // order bit set, whereas negative numbers have the highest order bit
    // cleared and the bits inverted
    let exponent = buf[0];
    const isPositive = Boolean(exponent & 0x80);
    if (!isPositive) {
      exponent = (exponent ^ 0xFF);
    }
    exponent -= 193;
    let decimalPointIndex = exponent * 2 + 2;

    // a mantissa length of 0 implies a value of 0 (if positive) or a value
    // of -1e126 (if negative)
    if (buf.length === 1) {
      if (isPositive) {
        return "0";
      }
      return "-1e126";
    }

    // check for the trailing 102 byte for negative numbers and, if present,
    // reduce the number of mantissa digits
    let numBytes = buf.length;
    if (!isPositive && buf[buf.length - 1] === 102) {
      numBytes -= 1;
    }

    // process the mantissa bytes which are the remaining bytes; each
    // mantissa byte is a base-100 digit
    let base100Digit;
    const digits = [];
    for (let i = 1; i < numBytes; i++) {

      // positive numbers have 1 added to them; negative numbers are
      // subtracted from the value 101
      if (isPositive) {
        base100Digit = buf[i] - 1;
      } else {
        base100Digit = 101 - buf[i];
      }

      // process the first digit; leading zeroes are ignored
      let digit = Math.floor(base100Digit / 10);
      if (digit === 0 && i === 1) {
        decimalPointIndex -= 1;
      } else if (digit === 10) {
        digits.push("1");
        digits.push("0");
        decimalPointIndex += 1;
      } else if (digit !== 0 || i > 1) {
        digits.push(digit.toString());
      }

      // process the second digit; trailing zeroes are ignored
      digit = base100Digit % 10;
      if (digit !== 0 || i < numBytes - 1) {
        digits.push(digit.toString());
      }
    }

    // create string of digits for transformation to JS value
    const chars = [];

    // if negative, include the sign
    if (!isPositive) {
      chars.push("-");
    }

    // if the decimal point index is 0 or less, add the decimal point and
    // any leading zeroes that are needed
    if (decimalPointIndex <= 0) {
      chars.push(".");
      if (decimalPointIndex < 0)
        chars.push("0".repeat(-decimalPointIndex));
    }

    // add each of the digits
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i === decimalPointIndex) {
        chars.push(".");
      }
      chars.push(digits[i]);
    }

    // if the decimal point index exceeds the number of digits, add any
    // trailing zeroes that are needed
    if (decimalPointIndex > digits.length) {
      for (let i = digits.length; i < decimalPointIndex; i++) {
        chars.push("0");
      }
    }

    // convert result to a Number
    return chars.join("");
  }

  //---------------------------------------------------------------------------
  // readBinaryDouble()
  //
  // Reads a binary double value from the buffer and returns a Number or a
  // String, depending on the desired type.
  //---------------------------------------------------------------------------
  readBinaryDouble() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseBinaryDouble(buf);
  }

  //---------------------------------------------------------------------------
  // readBinaryFloat()
  //
  // Reads a binary float value from the buffer and returns a Number or a
  // String, depending on the desired type.
  //---------------------------------------------------------------------------
  readBinaryFloat() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseBinaryFloat(buf);
  }

  //---------------------------------------------------------------------------
  // readBinaryInteger()
  //
  // Reads a binary integer value from the buffer and returns a Number
  //---------------------------------------------------------------------------
  readBinaryInteger() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return 0;
    }
    if (buf.length > 4) {
      errors.throwErr(errors.ERR_INTEGER_TOO_LARGE, buf.length, 4, this.pos, this.packetNum);
    }
    return (buf.readIntBE(0, buf.length));
  }

  //---------------------------------------------------------------------------
  // readBool()
  //
  // Reads a boolean value from the buffer and returns a Boolean.
  //---------------------------------------------------------------------------
  readBool() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return (buf[buf.length - 1] === 1);
  }

  //---------------------------------------------------------------------------
  // readBytes()
  //
  // Returns a Buffer containing the specified number of bytes. If an
  // insufficient number of bytes are available an error is thrown.
  //---------------------------------------------------------------------------
  readBytes(numBytes) {
    const numBytesLeft = this.numBytesLeft();
    if (numBytes > numBytesLeft) {
      errors.throwErr(errors.ERR_UNEXPECTED_END_OF_DATA, numBytes,
        numBytesLeft);
    }
    const buf = this.buf.subarray(this.pos, this.pos + numBytes);
    this.pos += numBytes;
    return buf;
  }

  //---------------------------------------------------------------------------
  // readBytesWithLength()
  //
  // Reads the length from the buffer and then returns a Buffer containing the
  // specified number of bytes. If the length is 0 or the special null length
  // indicator value, null is returned instead.
  //---------------------------------------------------------------------------
  readBytesWithLength() {
    const numBytes = this.readUInt8();
    if (numBytes === 0 || numBytes === constants.TNS_NULL_LENGTH_INDICATOR)
      return null;
    return this._readBytesWithLength(numBytes);
  }

  //---------------------------------------------------------------------------
  // readDbObject()
  //
  // Reads a database object from the buffer and returns the implementation
  // object (or null, if the object is atomically null).
  //---------------------------------------------------------------------------
  readDbObject() {
    const obj = {};
    let numBytes = this.readUB4();
    if (numBytes > 0)
      obj.toid = Buffer.from(this.readBytesWithLength());
    numBytes = this.readUB4();
    if (numBytes > 0)
      obj.oid = Buffer.from(this.readBytesWithLength());
    numBytes = this.readUB4();
    if (numBytes > 0)
      obj.snapshot = Buffer.from(this.readBytesWithLength());
    this.skipUB2();                     // version
    numBytes = this.readUB4();
    this.skipUB2();                     // flags
    if (numBytes > 0)
      obj.packedData = Buffer.from(this.readBytesWithLength());
    return obj;
  }

  //---------------------------------------------------------------------------
  // readInt8()
  //
  // Reads a signed 8-bit integer from the buffer.
  //---------------------------------------------------------------------------
  readInt8() {
    const buf = this.readBytes(1);
    return buf.readInt8();
  }

  //---------------------------------------------------------------------------
  // readOracleDate()
  //
  // Reads an Oracle date from the buffer and returns a Date or a String,
  // depending on the desired type.
  //---------------------------------------------------------------------------
  readOracleDate(useLocalTime) {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseOracleDate(buf, useLocalTime);
  }

  //---------------------------------------------------------------------------
  // readOracleIntervalYM()
  //
  // Reads interval year to month value from the buffer and returns a
  // JavaScript object representing that value.
  //---------------------------------------------------------------------------
  readOracleIntervalYM() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseOracleIntervalYM(buf);
  }

  //---------------------------------------------------------------------------
  // readOracleIntervalDS()
  //
  // Reads interval day to second value from the buffer and returns a
  // JavaScript object representing that value.
  //---------------------------------------------------------------------------
  readOracleIntervalDS() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseOracleIntervalDS(buf);
  }

  //---------------------------------------------------------------------------
  // readOracleNumber()
  //
  // Reads an Oracle number from the buffer and returns a Number or a String,
  // depending on the desired type.
  //---------------------------------------------------------------------------
  readOracleNumber() {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    return this.parseOracleNumber(buf);
  }

  //---------------------------------------------------------------------------
  // readSB2()
  //
  // Reads a signed, variable length integer of up to 2 bytes in length.
  //---------------------------------------------------------------------------
  readSB2() {
    return this._readInteger(2, true, false);
  }

  //---------------------------------------------------------------------------
  // readSB4()
  //
  // Reads a signed, variable length integer of up to 4 bytes in length.
  //---------------------------------------------------------------------------
  readSB4() {
    return this._readInteger(4, true, false);
  }

  //---------------------------------------------------------------------------
  // readSB8()
  //
  // Reads a signed, variable length integer of up to 8 bytes in length.
  //---------------------------------------------------------------------------
  readSB8() {
    return this._readInteger(8, true, false);
  }

  //---------------------------------------------------------------------------
  // readStr()
  //
  // Reads a string from the buffer in the specified character set form.
  //---------------------------------------------------------------------------
  readStr(csfrm) {
    const buf = this.readBytesWithLength();
    if (!buf) {
      return null;
    }
    if (csfrm === constants.CSFRM_IMPLICIT)
      return buf.toString();

    // need a copy of the buffer since swap16() changes the buffer in place and
    // it is possible that the buffer may need to be rescanned (for the case
    // where insufficient packets are available during the initial scan)
    return Buffer.from(buf).swap16().toString('utf16le');
  }

  //---------------------------------------------------------------------------
  // readUB2()
  //
  // Reads an unsigned, variable length integer of up to 2 bytes in length.
  //---------------------------------------------------------------------------
  readUB2() {
    return this._readInteger(2, false, false);
  }

  //---------------------------------------------------------------------------
  // readUB4()
  //
  // Reads an unsigned, variable length integer of up to 4 bytes in length.
  //---------------------------------------------------------------------------
  readUB4() {
    return this._readInteger(4, false, false);
  }

  //---------------------------------------------------------------------------
  // readUB8()
  //
  // Reads an unsigned, variable length integer of up to 8 bytes in length.
  //---------------------------------------------------------------------------
  readUB8() {
    return this._readInteger(8, false, false);
  }

  //---------------------------------------------------------------------------
  // readUInt8()
  //
  // Reads an unsigned 8-bit integer from the buffer.
  //---------------------------------------------------------------------------
  readUInt8() {
    const buf = this.readBytes(1);
    return buf[0];
  }

  //---------------------------------------------------------------------------
  // readUInt16BE()
  //
  // Reads an unsigned 16-bit integer from the buffer in big endian order.
  //---------------------------------------------------------------------------
  readUInt16BE() {
    const buf = this.readBytes(2);
    return buf.readUInt16BE();
  }

  //---------------------------------------------------------------------------
  // readUInt16LE()
  //
  // Reads an unsigned 16-bit integer from the buffer in little endian order.
  //---------------------------------------------------------------------------
  readUInt16LE() {
    const buf = this.readBytes(2);
    return buf.readUInt16LE();
  }

  //---------------------------------------------------------------------------
  // readUInt32BE()
  //
  // Reads an unsigned 32-bit integer from the buffer in big endian order.
  //---------------------------------------------------------------------------
  readUInt32BE() {
    const buf = this.readBytes(4);
    return buf.readUInt32BE();
  }

  //---------------------------------------------------------------------------
  // reserveBytes()
  //
  // Reserves the specified number of bytes in the buffer. If not enough bytes
  // remain in the buffer, the buffer is grown.
  //---------------------------------------------------------------------------
  reserveBytes(numBytes) {
    if (numBytes > this.numBytesLeft()) {
      this._grow(this.pos + numBytes);
    }
    const pos = this.pos;
    this.pos += numBytes;
    return pos;
  }

  //---------------------------------------------------------------------------
  // skipBytes()
  //
  // Skips the specified number of bytes in the buffer.
  //---------------------------------------------------------------------------
  skipBytes(numBytes) {
    if (numBytes > this.numBytesLeft())
      errors.throwErr(errors.ERR_UNEXPECTED_END_OF_DATA);
    this.pos += numBytes;
  }

  //---------------------------------------------------------------------------
  // skipSB4()
  //
  // Skips a signed, variable length integer of up to 4 bytes in length.
  //---------------------------------------------------------------------------
  skipSB4() {
    return this._readInteger(4, true, true);
  }

  //---------------------------------------------------------------------------
  // skipUB1()
  //
  // Skips a single byte integer in the buffer.
  //---------------------------------------------------------------------------
  skipUB1() {
    this.skipBytes(1);
  }

  //---------------------------------------------------------------------------
  // skipUB2()
  //
  // Skips an unsigned, variable length integer of up to 2 bytes in length.
  //---------------------------------------------------------------------------
  skipUB2() {
    return this._readInteger(2, false, true);
  }

  //---------------------------------------------------------------------------
  // skipUB4()
  //
  // Skips an unsigned, variable length integer of up to 4 bytes in length.
  //---------------------------------------------------------------------------
  skipUB4() {
    return this._readInteger(4, false, true);
  }

  //---------------------------------------------------------------------------
  // skipUB8()
  //
  // Skips an unsigned, variable length integer of up to 8 bytes in length.
  //---------------------------------------------------------------------------
  skipUB8() {
    return this._readInteger(8, false, true);
  }

  //---------------------------------------------------------------------------
  // writeBinaryDouble()
  //
  // Writes the number in binary double format to the buffer.
  //---------------------------------------------------------------------------
  writeBinaryDouble(n, pos) {
    if (!pos) {
      pos = this.reserveBytes(8);
    }
    this.buf.writeDoubleBE(n, pos);
    if ((this.buf[pos] & 0x80) === 0) {
      this.buf[pos] |= 0x80;
    } else {
      // We complement the bits for a negative number
      this.buf[pos] ^= 0xff;
      this.buf[pos + 1] ^= 0xff;
      this.buf[pos + 2] ^= 0xff;
      this.buf[pos + 3] ^= 0xff;
      this.buf[pos + 4] ^= 0xff;
      this.buf[pos + 5] ^= 0xff;
      this.buf[pos + 6] ^= 0xff;
      this.buf[pos + 7] ^= 0xff;
    }
  }

  //---------------------------------------------------------------------------
  // writeBinaryFloat()
  //
  // Writes the number in binary float format to the buffer.
  //---------------------------------------------------------------------------
  writeBinaryFloat(n, pos) {
    if (!pos) {
      pos = this.reserveBytes(4);
    }
    this.buf.writeFloatBE(n, pos);
    if ((this.buf[pos] & 0x80) === 0) {
      this.buf[pos] |= 0x80;
    } else {
      // We complement the bits for a negative number
      this.buf[pos] ^= 0xff;
      this.buf[pos + 1] ^= 0xff;
      this.buf[pos + 2] ^= 0xff;
      this.buf[pos + 3] ^= 0xff;
    }
  }

  //---------------------------------------------------------------------------
  // writeBytes()
  //
  // Writes the bytes in the supplied buffer to the buffer.
  //---------------------------------------------------------------------------
  writeBytes(value) {
    let start = 0;
    let valueLen = value.length;
    while (valueLen > 0) {
      const bytesLeft = this.numBytesLeft();
      if (bytesLeft === 0) {
        this._grow(this.pos + valueLen);
      }
      const bytesToWrite = Math.min(bytesLeft, valueLen);
      value.copy(this.buf, this.pos, start, start + bytesToWrite);
      this.pos += bytesToWrite;
      start += bytesToWrite;
      valueLen -= bytesToWrite;
    }
  }

  // _writeRawBytesAndLength()
  //
  // Writes the length in the format required before
  // writing the bytes.
  //---------------------------------------------------------------------------
  _writeRawBytesAndLength(value, numBytes) {
    if (numBytes <= constants.TNS_MAX_SHORT_LENGTH) {
      this.writeUInt8(numBytes);
      if (numBytes > 0) {
        this.writeBytes(value);
      }
    } else {
      let start = 0;
      this.writeUInt8(constants.TNS_LONG_LENGTH_INDICATOR);
      while (numBytes > 0) {
        const chunkLen = Math.min(numBytes, constants.BUFFER_CHUNK_SIZE);
        this.writeUB4(chunkLen);
        this.writeBytes(value.subarray(start, start + chunkLen));
        numBytes -= chunkLen;
        start += chunkLen;
      }
      this.writeUB4(0);
    }
  }
  //---------------------------------------------------------------------------
  // writeBytesWithLength()
  //
  // Writes the bytes in the supplied buffer to the buffer, but first writes
  // the length. If the length exceeds a fixed value, the value is written in
  // chunks instead.
  //---------------------------------------------------------------------------
  writeBytesWithLength(value) {
    const numBytes = value.length;
    this._writeRawBytesAndLength(value, numBytes);
  }

  //---------------------------------------------------------------------------
  // writeDbObject()
  //
  // Writes a database object to the buffer.
  //---------------------------------------------------------------------------
  writeDbObject(obj) {
    this.writeUB4(obj.toid.length);
    this.writeBytesWithLength(obj.toid);
    if (obj.oid) {
      this.writeUB4(obj.oid.length);
      this.writeBytesWithLength(obj.oid);
    } else {
      this.writeUB4(0);
    }
    this.writeUB4(0);                   // snapshot
    this.writeUB4(0);                   // version
    const packedData = obj._getPackedData();
    this.writeUB4(packedData.length);
    this.writeUB4(obj.flags);
    this.writeBytesWithLength(packedData);
  }

  //---------------------------------------------------------------------------
  // writeOracleDate()
  //
  // Writes the date to the buffer using the given Oracle type. Note that if a
  // timestamp with zero milliseconds is written, the type is automatically
  // changed to DB_TYPE_DATE (except for DB_TYPE_TIMESTAMP_TZ which requires
  // the full amount to be written).
  //---------------------------------------------------------------------------
  writeOracleDate(date, type, writeLength = true) {
    let fsec;
    let length = type._bufferSizeFactor;
    if (length > 7) {
      fsec = date.getUTCMilliseconds() * 1000 * 1000;
      if (fsec === 0 && length <= 11)
        length = 7;
    }
    if (writeLength) {
      this.writeUInt8(length);
    }
    const pos = this.reserveBytes(length);
    if (type === types.DB_TYPE_DATE || type == types.DB_TYPE_TIMESTAMP) {
      const year = date.getFullYear();
      this.buf[pos] = Math.trunc(year / 100) + 100;
      this.buf[pos + 1] = year % 100 + 100;
      this.buf[pos + 2] = date.getMonth() + 1;
      this.buf[pos + 3] = date.getDate();
      this.buf[pos + 4] = date.getHours() + 1;
      this.buf[pos + 5] = date.getMinutes() + 1;
      this.buf[pos + 6] = date.getSeconds() + 1;
    } else {
      const year = date.getUTCFullYear();
      this.buf[pos] = Math.trunc(year / 100) + 100;
      this.buf[pos + 1] = year % 100 + 100;
      this.buf[pos + 2] = date.getUTCMonth() + 1;
      this.buf[pos + 3] = date.getUTCDate();
      this.buf[pos + 4] = date.getUTCHours() + 1;
      this.buf[pos + 5] = date.getUTCMinutes() + 1;
      this.buf[pos + 6] = date.getUTCSeconds() + 1;
    }
    if (length > 7) {
      this.buf.writeInt32BE(fsec, pos + 7);
      if (length > 11) {
        this.buf[pos + 11] = constants.TZ_HOUR_OFFSET;
        this.buf[pos + 12] = constants.TZ_MINUTE_OFFSET;
      }
    }
  }

  //---------------------------------------------------------------------------
  // writeOracleIntervalYM()
  //
  // Writes a time interval to the buffer in Oracle Interval Year To Month
  // format. It is assumed that the 'value' parameter is a valid IntervalYM
  // object at this stage.
  //---------------------------------------------------------------------------
  writeOracleIntervalYM(value, writeLength = true) {
    if (writeLength) {
      this.writeUInt8(5);
    }
    this.writeUInt32BE(value.years + constants.TNS_DURATION_MID);
    this.writeUInt8(value.months + constants.TNS_DURATION_OFFSET);
  }

  //---------------------------------------------------------------------------
  // writeOracleIntervalDS()
  //
  // Writes a time interval to the buffer in Oracle Interval Day To Second
  // format. It is assumed that the 'value' parameter is a valid IntervalDS
  // object at this stage.
  //---------------------------------------------------------------------------
  writeOracleIntervalDS(value, writeLength = true) {
    if (writeLength) {
      this.writeUInt8(11);
    }
    this.writeUInt32BE(value.days + constants.TNS_DURATION_MID);
    this.writeUInt8(value.hours + constants.TNS_DURATION_OFFSET);
    this.writeUInt8(value.minutes + constants.TNS_DURATION_OFFSET);
    this.writeUInt8(value.seconds + constants.TNS_DURATION_OFFSET);
    this.writeUInt32BE(value.fseconds + constants.TNS_DURATION_MID);
  }

  //---------------------------------------------------------------------------
  // writeOracleNumber()
  //
  // Writes the number (in string form) in Oracle Number format to the buffer.
  //---------------------------------------------------------------------------
  writeOracleNumber(value) {

    // determine if number is negative
    let isNegative = false;
    if (value[0] === '-') {
      isNegative = true;
      value = value.substring(1);
    }

    // parse the exponent, if one is present
    let exponent = 0;
    const exponentPos = value.indexOf('e');
    if (exponentPos > 0) {
      exponent = Number(value.substring(exponentPos + 1));
      value = value.substring(0, exponentPos);
    }

    // adjust the exponent and the value if there is a decimal point
    const decimalPos = value.indexOf('.');
    if (decimalPos > 0) {
      exponent -= (value.length - decimalPos - 1);
      value = value.substring(0, decimalPos) + value.substring(decimalPos + 1);
    }

    // strip any leading zeroes
    if (value[0] === '0') {
      value = value.replace(/^0+/, "");
    }

    // strip any trailing zeroes
    if (value.length > 0 && value[value.length - 1] === '0') {
      const trimmedValue = value.replace(/0+$/, "");
      exponent += (value.length - trimmedValue.length);
      value = trimmedValue;
    }

    // throw exception if number cannot be represented as an Oracle Number
    if (value.length > constants.NUMBER_MAX_DIGITS || exponent >= 126 ||
        exponent <= -131) {
      errors.throwErr(errors.ERR_ORACLE_NUMBER_NO_REPR);
    }

    // if the exponent is odd, append a zero
    if ((exponent > 0 && exponent % 2 === 1) ||
        (exponent < 0 && exponent % 2 === -1)) {
      exponent--;
      value += "0";
    }

    // add a leading zero if the number of digits is odd
    if (value.length % 2 === 1) {
      value = "0" + value;
    }

    // write the encoded data to the wire
    const appendSentinel =
      (isNegative && value.length < constants.NUMBER_MAX_DIGITS);
    const numPairs = value.length / 2;
    let exponentOnWire = ((exponent + value.length) / 2) + 192;
    if (isNegative) {
      exponentOnWire = (exponentOnWire ^ 0xFF);
    } else if (value.length === 0 && exponent === 0) {
      exponentOnWire = 128;
    }
    let pos = this.reserveBytes(numPairs + 2 + appendSentinel);
    this.buf[pos++] = numPairs + 1 + appendSentinel;
    this.buf[pos++] = exponentOnWire;
    for (let i = 0; i < value.length; i += 2) {
      const base100Digit = Number(value.substring(i, i + 2));
      if (isNegative) {
        this.buf[pos++] = 101 - base100Digit;
      } else {
        this.buf[pos++] = base100Digit + 1;
      }
    }
    if (appendSentinel) {
      this.buf[pos] = 102;
    }

  }

  //---------------------------------------------------------------------------
  // writeStr()
  //
  // Writes the string to the buffer.
  //---------------------------------------------------------------------------
  writeStr(s) {
    this.writeBytes(Buffer.from(s));
  }

  //---------------------------------------------------------------------------
  // writeInt32BE()
  //
  // Writes a signed 32-bit integer to the buffer in big endian order.
  //---------------------------------------------------------------------------
  writeInt32BE(n) {
    const pos = this.reserveBytes(4);
    this.buf.writeInt32BE(n, pos);
  }

  //---------------------------------------------------------------------------
  // writeUB4()
  //
  // Writes an unsigned integer (up to 4 bytes in length) in variable length
  // format to the buffer.
  //---------------------------------------------------------------------------
  writeUB4(value) {
    if (value === 0) {
      this.writeUInt8(0);
    } else if (value <= 0xff) {
      this.writeUInt8(1);
      this.writeUInt8(value);
    } else if (value <= 0xffff) {
      this.writeUInt8(2);
      this.writeUInt16BE(value);
    } else {
      this.writeUInt8(4);
      this.writeUInt32BE(value);
    }
  }

  //---------------------------------------------------------------------------
  // writeUB2()
  //
  // Writes an unsigned integer (up to 2 bytes in length) in variable length
  // format to the buffer.
  //---------------------------------------------------------------------------
  writeUB2(value) {
    if (value === 0) {
      this.writeUInt8(0);
    } else if (value <= 0xff) {
      this.writeUInt8(1);
      this.writeUInt8(value);
    } else {
      this.writeUInt8(2);
      this.writeUInt16BE(value);
    }
  }

  //---------------------------------------------------------------------------
  // writeUB8()
  //
  // Writes an unsigned integer (up to 8 bytes in length) in variable length
  // format to the buffer.
  //---------------------------------------------------------------------------
  writeUB8(value) {
    if (value === 0) {
      this.writeUInt8(0);
    } else if (value <= 0xff) {
      this.writeUInt8(1);
      this.writeUInt8(value);
    } else if (value <= 0xffff) {
      this.writeUInt8(2);
      this.writeUInt16BE(value);
    } else if (value <= 0xffffffff) {
      this.writeUInt8(4);
      this.writeUInt32BE(value);
    } else {
      this.writeUInt8(8);
      this.writeUInt64BE(value);
    }
  }

  //---------------------------------------------------------------------------
  // writeUInt8()
  //
  // Writes an unsigned 8-bit integer to the buffer.
  //---------------------------------------------------------------------------
  writeUInt8(n) {
    const pos = this.reserveBytes(1);
    this.buf[pos] = n;
  }

  // writeSB1()
  //
  // Writes an signed 8-bit integer to the buffer.
  //---------------------------------------------------------------------------
  writeSB1(n) {
    const pos = this.reserveBytes(1);
    this.buf[pos] = n;
  }

  //---------------------------------------------------------------------------
  // writeUInt16BE()
  //
  // Writes an unsigned 16-bit integer to the buffer in big endian order.
  //---------------------------------------------------------------------------
  writeUInt16BE(n) {
    const pos = this.reserveBytes(2);
    this.buf.writeUInt16BE(n, pos);
  }

  //---------------------------------------------------------------------------
  // writeUInt32BE()
  //
  // Writes an unsigned 32-bit integer to the buffer in big endian order.
  //---------------------------------------------------------------------------
  writeUInt32BE(n) {
    const pos = this.reserveBytes(4);
    this.buf.writeUInt32BE(n, pos);
  }

  //---------------------------------------------------------------------------
  // writeUInt64BE()
  //
  // Writes an unsigned 64-bit integer to the buffer in big endian order. Since
  // Node.js doesn't support anything above 32-bits without using BigInt, the
  // higher order bits are simply written as 0.
  //---------------------------------------------------------------------------
  writeUInt64BE(n) {
    const pos = this.reserveBytes(8);
    this.buf.writeUInt32BE(0, pos);
    this.buf.writeUInt32BE(n, pos + 4);
  }

  //---------------------------------------------------------------------------
  // writeUInt16LE()
  //
  // Writes an unsigned 16-bit integer to the buffer in little endian order.
  //---------------------------------------------------------------------------
  writeUInt16LE(n) {
    const pos = this.reserveBytes(2);
    this.buf.writeUInt16LE(n, pos);
  }

}

class GrowableBuffer extends BaseBuffer {

  //---------------------------------------------------------------------------
  // constructor()
  //
  // Initializes the buffer with an initial fixed chunk size.
  //---------------------------------------------------------------------------
  constructor(initializer) {
    if (initializer) {
      super(initializer);
    } else {
      super(constants.BUFFER_CHUNK_SIZE);
      this.size = this.maxSize;
    }
  }

  //---------------------------------------------------------------------------
  // _grow()
  //
  // Called when the buffer needs to grow. Ensures that sufficient space is
  // allocated to include the requested number of bytes, rounded to the nearest
  // chunk size.
  //---------------------------------------------------------------------------
  _grow(numBytes) {
    const remainder = numBytes % constants.BUFFER_CHUNK_SIZE;
    if (remainder > 0) {
      numBytes += (constants.BUFFER_CHUNK_SIZE - remainder);
    }
    const buf = Buffer.allocUnsafe(numBytes);
    this.buf.copy(buf);
    this.buf = buf;
    this.maxSize = this.size = numBytes;
  }
}

module.exports = {
  BaseBuffer,
  GrowableBuffer
};
