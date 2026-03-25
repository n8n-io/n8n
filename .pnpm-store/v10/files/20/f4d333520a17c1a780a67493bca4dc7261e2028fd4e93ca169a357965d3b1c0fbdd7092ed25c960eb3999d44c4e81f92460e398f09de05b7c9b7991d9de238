// Copyright (c) 2022, 2024, Oracle and/or its affiliates.

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

const { BaseBuffer } = require('../../impl/datahandlers/buffer.js');
const { Buffer } = require('buffer');
const constants = require('./constants.js');
const oson = require('../../impl/datahandlers/oson.js');
const utils = require('./utils.js');
const vector = require('../../impl/datahandlers/vector.js');
const errors = require("../../errors.js");

const TNS_BASE64_ALPHABET_ARRAY = Buffer.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", 'utf8');
const FAST_AUTH_END_OF_RPC_VALUE = 0x800;
const FAST_AUTH_END_OF_RPC_OFFSET = 0x8;
const MSG_TYPE_OFFSET = 11;

/**
 * Class used for byte chunks used in the ChunkedBytesBuffer.
 */
class BytesChunk {

  /**
   * Constructor.
   * @param {Number} number of bytes to add to the chunk (rounded to the
   * nearest chunk size to avoid unnecessary allocations and copies)
   */
  constructor(numBytes) {
    this.allocLen = numBytes;
    const remainder = numBytes % constants.CHUNKED_BYTES_CHUNK_SIZE;
    if (remainder > 0) {
      this.allocLen += (constants.CHUNKED_BYTES_CHUNK_SIZE - remainder);
    }
    this.buf = Buffer.allocUnsafe(this.allocLen);
    this.actualLen = 0;
  }

}


/**
 * Class used for handling chunked reads.
 */
class ChunkedBytesBuffer {

  /**
   * Constructor.
   */
  constructor() {
    this.chunks = [];
  }

  /**
   * End the chunked read and return a consolidated buffer.
   */
  endChunkedRead() {
    if (this.chunks.length > 1) {
      let totalNumBytes = 0;
      for (const chunk of this.chunks) {
        totalNumBytes += chunk.actualLen;
      }
      let pos = 0;
      const consolidatedChunk = new BytesChunk(totalNumBytes);
      for (const chunk of this.chunks) {
        chunk.buf.copy(consolidatedChunk.buf, pos, 0, chunk.actualLen);
        pos += chunk.actualLen;
      }
      consolidatedChunk.actualLen = totalNumBytes;
      this.chunks = [consolidatedChunk];
    }
    const chunk = this.chunks[0];
    return chunk.buf.subarray(0, chunk.actualLen);
  }

  /**
   * Constructor.
   */
  getBuf(numBytes) {
    let chunk;
    if (this.chunks.length > 0) {
      chunk = this.chunks[this.chunks.length - 1];
      if (chunk.allocLen - chunk.actualLen < numBytes) {
        chunk = undefined;
      }
    }
    if (!chunk) {
      chunk = new BytesChunk(numBytes);
      this.chunks.push(chunk);
    }
    const buf = chunk.buf.subarray(chunk.actualLen,
      chunk.actualLen + numBytes);
    chunk.actualLen += numBytes;
    return buf;
  }

  /**
   * Start a chunked read. This ensures that only one chunk is available and
   * its actual length is set to zero.
   */
  startChunkedRead() {
    if (this.chunks.length > 0) {
      this.chunks = this.chunks.splice(0, 1);
      this.chunks[0].actualLen = 0;
    }
  }

}


/**
 * Encapsulates the Network Read Buffer
 *
 * @class ReadPacket
 */

class ReadPacket extends BaseBuffer {

  /**
   * Constructor.
   * @param {Object} adapter used for sending/receiving data
   * @param {Object} capabilities
   */

  constructor(nsi, caps) {
    super();
    this.nsi = nsi;
    this.caps = caps;
    this.chunkedBytesBuf = new ChunkedBytesBuffer();
  }

  /**
   * Helper function that processes the length. If the length is defined as
   * TNS_LONG_LENGTH_INDICATOR, a chunked read is performed.
   */
  _readBytesWithLength(numBytes) {
    if (numBytes !== constants.TNS_LONG_LENGTH_INDICATOR) {
      return this.readBytes(numBytes);
    }
    this.chunkedBytesBuf.startChunkedRead();
    while (true) { // eslint-disable-line
      const numBytesInChunk = this.readUB4();
      if (numBytesInChunk === 0) {
        break;
      }
      this.readBytes(numBytesInChunk, true);
    }
    return this.chunkedBytesBuf.endChunkedRead();
  }

  skipBytes(numBytes) {

    // if no bytes are left in the buffer, a new packet needs to be fetched
    // before anything else can take place
    if (this.pos === this.size) {
      this.receivePacket();
    }

    // if there is enough room in the buffer to satisfy the number of bytes
    // requested, return the buffer directly
    const numBytesLeft = this.numBytesLeft();
    if (numBytes <= numBytesLeft) {
      this.pos += numBytes;
      return;
    }
    numBytes -= numBytesLeft;

    // acquire packets until the requested number of bytes is satisfied
    while (numBytes > 0) {
      this.receivePacket();
      const numSplitBytes = Math.min(numBytes, this.size - this.pos);
      this.pos += numSplitBytes;
      numBytes -= numSplitBytes;
    }
  }

  /**
   * Returns a buffer containing the specified number of bytes. If an
   * insufficient number of bytes are available, a new packet is read.
   * @param {Number} specifies the number of bytes to read from the buffer
   */
  readBytes(numBytes, inChunkedRead = false) {

    // if no bytes are left in the buffer, a new packet needs to be fetched
    // before anything else can take place
    if (this.pos === this.size) {
      this.receivePacket();
    }

    // if there is enough room in the buffer to satisfy the number of bytes
    // requested, return the buffer directly
    const numBytesLeft = this.numBytesLeft();
    if (numBytes <= numBytesLeft) {
      let buf;
      if (inChunkedRead) {
        buf = this.chunkedBytesBuf.getBuf(numBytes);
        this.buf.copy(buf, 0, this.pos, this.pos + numBytes);
      } else {
        buf = this.buf.subarray(this.pos, this.pos + numBytes);
      }
      this.pos += numBytes;
      return buf;
    }

    // the requested bytes are split across multiple packets; if a chunked read
    // is in progress, a chunk is acquired that will accommodate the requested
    // bytes; otherwise, a separate buffer will be allocated to accommodate the
    // requested bytes
    let buf;
    if (inChunkedRead) {
      buf = this.chunkedBytesBuf.getBuf(numBytes);
    } else {
      buf = Buffer.allocUnsafe(numBytes);
    }

    // copy the bytes to the buffer from the remainder of this packet
    let offset = 0;
    this.buf.copy(buf, offset, this.pos, this.pos + numBytesLeft);
    offset += numBytesLeft;
    numBytes -= numBytesLeft;

    // acquire packets until the requested number of bytes is satisfied
    while (numBytes > 0) {
      this.receivePacket();
      const numSplitBytes = Math.min(numBytes, this.size - this.pos);
      this.buf.copy(buf, offset, this.pos, this.pos + numSplitBytes);
      this.pos += numSplitBytes;
      offset += numSplitBytes;
      numBytes -= numSplitBytes;
    }

    return buf;

  }

  /**
   * Receives a packet from the adapter.
   */
  receivePacket() {
    if (this.savedPacketPos === this.savedPackets.length) {
      const packet = this.nsi.syncRecvPacket();
      if (!packet || this.nsi.isBreak)
        throw new utils.OutOfPacketsError();
      this.savedPackets.push(packet);
    }
    this.startPacket(this.savedPackets[this.savedPacketPos++]);
  }

  restorePoint() {
    this.savedPacketPos = 0;
    this.startPacket(this.savedPackets[this.savedPacketPos++]);
    this.pos = this.savedPos;
  }

  savePoint() {
    if (this.savedPackets) {
      this.savedPackets = this.savedPackets.splice(this.savedPacketPos - 1);
    } else {
      this.savedPackets = [this.packet];
    }
    this.savedPacketPos = 1;
    this.savedPos = this.pos;
  }

  startPacket(packet) {
    this.packet = packet;
    this.buf = packet.buf;
    this.pos = 10;                      // skip packet heaader and data flags
    this.size = packet.buf.length;
    this.packetNum = packet.num;
  }

  /**
   * Read packets from network.
   * If checkRequestBoundary is passed as true, it
   * would read all packets until end of request
   * boundary is seen in nwk header.
   */
  async waitForPackets(checkRequestBoundary = false) {
    let packet = await this.nsi.recvPacket();
    if (!this.savedPackets) {
      this.savedPackets = [packet];
      this.savedPacketPos = 0;
    } else {
      this.savedPackets.push(packet);
    }
    if (checkRequestBoundary && this.nsi.endOfRequestSupport) {
      while (packet.type === constants.TNS_PACKET_TYPE_DATA) {
        // End Marker
        if ((packet.buf.readUInt16BE(8) &
            constants.TNS_DATA_FLAGS_END_OF_REQUEST)) {
          break;
        }

        // Single Byte 1D packet
        if (packet.buf.length === MSG_TYPE_OFFSET &&
            packet.buf[MSG_TYPE_OFFSET - 1] ===
            constants.TNS_MSG_TYPE_END_OF_REQUEST) {
          break;
        }
        packet = await this.nsi.recvPacket();
        this.savedPackets.push(packet);
      }
    }
    this.startPacket(this.savedPackets[this.savedPacketPos++]);
  }

  /**
   * Reads OSON (QLocator followed by data) and decodes it into a JavaScript
   * object.
   */
  readOson() {
    const numBytes = this.readUB4();
    if (numBytes === 0) {
      return null;
    }
    this.skipUB8();                     // size (unused)
    this.skipUB4();                     // chunk size (unused)
    const decoder = new oson.OsonDecoder(this.readBytesWithLength());
    this.skipBytesChunked();            // locator (unused)
    return decoder.decode();
  }

  readURowID() {
    let outputOffset = 0, inputOffset = 1;
    let buf = this.readBytesWithLength();
    if (buf === null)
      return null;
    buf = this.readBytesWithLength();
    let inputLen = buf.length;

    // Handle physical rowid
    if (buf && buf[0] === 1) {
      const rba = buf.readUInt32BE(1);
      const partitionID = buf.readUInt16BE(5);
      const blockNum = buf.readUInt32BE(7);
      const slotNum = buf.readUInt16BE(11);
      return utils.encodeRowID({rba, partitionID, blockNum, slotNum});
    }

    // handle logical rowid
    let outputLen = Math.floor(inputLen / 3) * 4;
    const remainder = inputLen % 3;
    if (remainder === 1) {
      outputLen += 1;
    } else if (remainder === 2) {
      outputLen += 3;
    }

    const outputValue =  Buffer.allocUnsafe(outputLen);
    inputLen -= 1;
    outputValue[0] = 42;
    outputOffset += 1;
    while (inputLen > 0) {
      // produce first byte of quadruple
      let pos = buf[inputOffset] >> 2;
      outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
      outputOffset += 1;

      // produce second byte of quadruple, but if only one byte is left,
      // produce that one byte and exit
      pos = (buf[inputOffset] & 0x3) << 4;
      if (inputLen == 1) {
        outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
        break;
      }
      inputOffset += 1;
      pos |= ((buf[inputOffset] & 0xf0) >> 4);
      outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
      outputOffset += 1;

      // produce third byte of quadruple, but if only two bytes are left,
      // produce that one byte and exit
      pos = (buf[inputOffset] & 0xf) << 2;
      if (inputLen == 2) {
        outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
        break;
      }
      inputOffset += 1;
      pos |= ((buf[inputOffset] & 0xc0) >> 6);
      outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
      outputOffset += 1;

      // produce final byte of quadruple
      pos = buf[inputOffset] & 0x3f;
      outputValue[outputOffset] = TNS_BASE64_ALPHABET_ARRAY[pos];
      outputOffset += 1;
      inputOffset += 1;
      inputLen -= 3;
    }
    return outputValue.toString('utf-8');
  }

  readRowID() {
    const rba = this.readUB4();
    const partitionID = this.readUB2();
    this.skipUB1();
    const blockNum = this.readUB4();
    const slotNum = this.readUB2();
    return {rba, partitionID, blockNum, slotNum};
  }

  /**
   * Reads VECTOR data (QLocator followed by data) and decodes it into a
   * JavaScript object.
   */
  readVector() {
    const numBytes = this.readUB4();
    if (numBytes === 0) {
      return null;
    }
    this.skipUB8();                     // size (unused)
    this.skipUB4();                     // chunk size (unused)
    const decoder = new vector.VectorDecoder(this.readBytesWithLength());
    this.skipBytesChunked();            // locator (unused)
    return decoder.decode();
  }

  skipBytesChunked() {
    const numBytes = this.readUInt8();
    if (numBytes === 0 || numBytes === constants.TNS_NULL_LENGTH_INDICATOR) {
      return;
    }
    if (numBytes !== constants.TNS_LONG_LENGTH_INDICATOR) {
      this.skipBytes(numBytes);
    } else {
      while (true) { // eslint-disable-line
        const tempNumBytes = this.readUB4();
        if (tempNumBytes === 0)
          break;
        this.skipBytes(tempNumBytes);
      }
    }
  }

  readNullTerminatedBytes(maxSize = 50) {
    let offset = 0;
    const tmp = Buffer.allocUnsafe(maxSize);
    while (offset < maxSize) {
      tmp[offset] = this.readUInt8();
      if (tmp[offset] === 0) {
        break;
      }
      offset = offset + 1;
    }
    if (offset === maxSize) {
      const reason = `Byte Arrray Exceeded MaxSize ${maxSize}`;
      errors.throwErr(errors.ERR_INTERNAL, reason);
    }
    return tmp.subarray(0, offset + 1);
  }

}


/**
 * Encapsulates the Network Write Buffer
 *
 * @class WritePacket
 */
class WritePacket extends BaseBuffer {

  constructor(nsi, caps, protocol) {
    super(nsi.sAtts.sdu);
    this.size = this.maxSize;
    this.isLargeSDU = nsi.sAtts.version >= constants.TNS_VERSION_MIN_LARGE_SDU;
    this.protocol = protocol;
    this.packetType = constants.TNS_PACKET_TYPE_DATA;
    this.caps = caps;
    this.nsi = nsi;
  }

  /**
   * Grows the buffer by sending the existing buffer on the transport. A copy
   * is made so that the existing buffer can be used for the next batch of data
   * that needs to be sent
   */
  _grow() {
    this._sendPacket();
  }

  /**
   * Sends the data in the buffer on the transport. First, the packet header is
   * set up by writing the size and packet type.
   */
  _sendPacket(finalPacket = false) {
    const size = this.pos;
    this.pos = 0;
    if (this.isLargeSDU) {
      this.writeUInt32BE(size);
    } else {
      this.writeUInt16BE(size);
      this.writeUInt16BE(0);
    }
    this.writeUInt8(this.packetType);
    this.writeUInt8(0);
    this.writeUInt16BE(0);
    let buf = this.buf.subarray(0, size);
    if (!finalPacket) {
      buf = Buffer.from(buf);
      this.startPacket();
    } else {
      // Write End of RPC bit in last packet used only for fastAuth Message.
      this.buf.writeUInt16BE(FAST_AUTH_END_OF_RPC_VALUE,
        FAST_AUTH_END_OF_RPC_OFFSET);
    }
    if (!this.nsi.ntAdapter) {
      errors.throwErr(errors.ERR_INVALID_CONNECTION);
    }
    this.nsi.sendPacket(buf);
  }

  /**
   * Starts a packet.
   */
  startPacket(dataFlags = 0) {
    this.pos = constants.PACKET_HEADER_SIZE;
    if (this.packetType === constants.TNS_PACKET_TYPE_DATA) {
      this.writeUInt16BE(dataFlags);
    }
  }

  /**
   * Starts a database request.
   */
  startRequest(packetType, dataFlags = 0) {
    this.packetType = packetType;
    this.startPacket(dataFlags);
  }

  /**
   * Ends a database request.
   */
  endRequest() {
    if (this.pos > constants.PACKET_HEADER_SIZE) {
      this._sendPacket(true);
    }
  }

  writeKeyValue(key, value, flags = 0) {
    const keyBytesLen = Buffer.byteLength(key);
    const valBytesLen = Buffer.byteLength(value);
    this.writeUB4(keyBytesLen);
    this.writeBytesWithLength(Buffer.from(key));
    this.writeUB4(valBytesLen);
    if (valBytesLen > 0) {
      this.writeBytesWithLength(Buffer.from(value));
    }
    this.writeUB4(flags);
  }

  /**
   * Encodes a JavaScript object into OSON and then writes it (QLocator
   * followed by data) to the buffer.
   */
  writeOson(value, osonMaxFieldSize) {
    const encoder = new oson.OsonEncoder();
    const buf = encoder.encode(value, osonMaxFieldSize);
    this.writeQLocator(buf.length);
    this.writeBytesWithLength(buf);
  }

  writeSeqNum() {
    this.writeUInt8(this.protocol.sequenceId);
    this.protocol.sequenceId = (this.protocol.sequenceId + 1) % 256;
  }

  /**
   * Encodes a JavaScript object into VECTOR data and then writes it (QLocator
   * followed by data) to the buffer.
   */
  writeVector(value) {
    const encoder = new vector.VectorEncoder();
    const buf = encoder.encode(value);
    this.writeQLocator(buf.length);
    this.writeBytesWithLength(buf);
  }

  //---------------------------------------------------------------------------
  // writeQLocator()
  //
  // Writes a QLocator. QLocators are always 40 bytes in length.
  //---------------------------------------------------------------------------
  writeQLocator(numBytes) {
    this.writeUB4(40);                  // QLocator length
    this.writeUInt8(40);                // repeated length
    this.writeUInt16BE(38);             // internal length
    this.writeUInt16BE(constants.TNS_LOB_QLOCATOR_VERSION);
    this.writeUInt8(constants.TNS_LOB_LOC_FLAGS_VALUE_BASED |
      constants.TNS_LOB_LOC_FLAGS_BLOB | constants.TNS_LOB_LOC_FLAGS_ABSTRACT);
    this.writeUInt8(constants.TNS_LOB_LOC_FLAGS_INIT);
    this.writeUInt16BE(0);              // additional flags
    this.writeUInt16BE(1);              // byt1
    this.writeUInt64BE(numBytes);
    this.writeUInt16BE(0);              // unused
    this.writeUInt16BE(0);              // csid
    this.writeUInt16BE(0);              // unused
    this.writeUInt64BE(0);              // unused
    this.writeUInt64BE(0);              // unused
  }

}

module.exports = {
  ReadPacket,
  WritePacket
};
