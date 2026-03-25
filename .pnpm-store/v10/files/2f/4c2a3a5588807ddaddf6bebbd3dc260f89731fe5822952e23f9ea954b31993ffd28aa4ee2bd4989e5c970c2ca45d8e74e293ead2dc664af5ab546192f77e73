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

const Buffer = require("buffer").Buffer;
const constants = require("./constants.js");
const errors = require("../../errors.js");
const MAX_CDATA_LEN = 230;
const NSPCNL = 74;

/**
 * Connect Packet (NSPTCN)
 * @param {Buffer} connectData Outgoing Connect Data
 * @param {Object} sAtts Session Attributes
 */
function ConnectPacket(connectData, sAtts, flags = 0) {
  this.connectData = connectData;
  this.connectDataLen = connectData.length;
  this.overflow = false;

  let size;

  if (this.connectDataLen <= MAX_CDATA_LEN) {
    size = NSPCNL + this.connectDataLen;
  } else {
    size = NSPCNL;
    this.overflow = true;
  }

  /* Building Connect Packet */
  this.buf = Buffer.allocUnsafe(size).fill(0);
  this.buf.writeUInt16BE(size, constants.NSPHDLEN);
  this.buf.writeUInt8(flags, constants.NSPHDFLGS);
  this.buf.writeUInt8(constants.NSPTCN, constants.NSPHDTYP);

  this.buf.writeUInt16BE(
    constants.TNS_VERSION_DESIRED,
    constants.NSPCNVSN
  ); /* My version */
  this.buf.writeUInt16BE(
    constants.TNS_VERSION_MINIMUM,
    constants.NSPCNLOV
  ); /* Lowest version*/

  /* Options:
        Note : Node JS does not support TCP Out-of-band so not setting NSGSENDATTN or NSGRECVATTN
  */
  const options = constants.NSGDONTCARE;
  //options = options | constants.NSGUSEVIO  /* Vectored I/O support.Uncomment when support is added */
  this.buf.writeUInt16BE(options, constants.NSPCNOPT);

  /* SDU */
  if (sAtts.sdu > constants.NSPMXSDULN) {
    this.buf.writeUInt16BE(constants.NSPMXSDULN, constants.NSPCNSDU);
  } else {
    this.buf.writeUInt16BE(sAtts.sdu, constants.NSPCNSDU);
  }

  /* TDU */
  if (sAtts.tdu > constants.NSPMXSDULN) {
    this.buf.writeUInt16BE(constants.NSPMXSDULN, constants.NSPCNTDU);
  } else {
    this.buf.writeUInt16BE(sAtts.tdu, constants.NSPCNTDU);
  }

  this.buf.writeUInt16BE(
    sAtts.ntCha,
    constants.NSPCNNTC
  ); /* Protocol characteristics */

  this.buf.writeUInt16BE(
    1,
    constants.NSPCNONE
  ); /* Endianness does not matter for Node */

  this.buf.writeUInt16BE(
    this.connectDataLen,
    constants.NSPCNLEN
  ); /* Connect data Length */

  this.buf.writeUInt16BE(
    constants.NSPCNDAT,
    constants.NSPCNOFF
  ); /* Connect data offset */

  this.buf.writeUInt8(
    sAtts.NAFlags,
    constants.NSPCNFL0
  ); /* NA disabled */

  this.buf.writeUInt8(
    sAtts.NAFlags,
    constants.NSPCNFL1
  ); /* NA disabled *

  /* Connection Pool is not supported */
  this.buf.writeUInt16BE(0, constants.NSPCNTMO);
  this.buf.writeUInt16BE(0, constants.NSPCNTCK);
  this.buf.writeUInt16BE(0, constants.NSPCNADL);
  this.buf.writeUInt16BE(0, constants.NSPCNAOF);

  this.buf.writeUInt32BE(sAtts.sdu, constants.NSPCNLSD); /* SDU */
  this.buf.writeUInt32BE(sAtts.tdu, constants.NSPCNLTD); /* TDU */
  let compressionFieldBuilder = 0; // we will be using just the last 2 bytes
  /*
     * For the 2 byte field, the first bit represent ON/OFF , second is empty
      * After that every 4 bits represent a value in the user preference of sch
  eme
     * scheme values are 1 = LZO, 2 = ZLIB, 3 = GZIP ( only ZLIB supported in node-oracledb) */

  if (sAtts.networkCompression) {
    compressionFieldBuilder = constants.NSPACCFON << 8 ; // set the ON bit
    const schemeShiftCounter = 10; // shifting by 10 puts the 4 bit field in the right place
    if (sAtts.networkCompressionLevels.includes('high'))
      compressionFieldBuilder |= constants.NETWORK_COMPRESSION_ZLIB << schemeShiftCounter;
  }

  this.buf.writeUInt16BE(compressionFieldBuilder, constants.NSPCNCFL); /* Compression field added */

  this.buf.writeUInt32BE(
    0,
    constants.NSPCNCFL2
  ); /* No OOB path check support */

  if (!this.overflow && this.connectDataLen) {
    this.buf.write(connectData.toString('ascii'), constants.NSPCNDAT, this.connectDataLen, "ascii");
  }
}

/**
 * Data Pakcet (NSPTDA)
 * @param {int} size of Data Packet
 * @param {boolean} isLargeSDU Large SDU
 */
function DataPacket(isLargeSDU) {
  this.dataPtr = 0; /* data offset start */
  this.dataLen = 0; /* data offset end */
  this.offset = 0; /* Offset for buffer read/write (fastpath) */
  this.len = 0; /* Length of buffer read/write (fastpath) */
  this.bufLen = 0; /* Length of buffer */

  /**
   * Create the Data Packet(Internal)
   */
  this.createPacket = function(len) {
    /* Building Data Packet */
    this.dataPtr = constants.NSPDADAT;
    this.dataLen = constants.NSPDADAT;
    this.buf = Buffer.allocUnsafe(len).fill(0);
    this.buf.writeUInt8(0, constants.NSPHDFLGS);
    this.buf.writeUInt8(constants.NSPTDA, constants.NSPHDTYP);
    this.bufLen = len; /* Length of buffer */
  };

  /**
   * Populate the Data Packet
   * @param {Buffer} userbuf User Buffer
   * @param {int} offset from which to fill data
   * @param {int} len length of data
   * @returns number of bytes copied
   */
  this.fillBuf = function(userbuf, offset, len, flags = 0) {
    let bytes2Copy;

    if (!this.buf) {
      this.createPacket(len + constants.NSPDADAT); //Currently NS data packets are being used only in the connect/disconnect phase
    }

    if (len > this.bufLen - this.dataLen) {
      bytes2Copy = this.bufLen - this.dataLen;
    } else {
      bytes2Copy = len;
    }
    if (bytes2Copy) {
      userbuf.copy(this.buf, this.dataLen, offset, offset + bytes2Copy);
    }
    this.dataLen += bytes2Copy;

    this.prepare2Send(flags);

    return bytes2Copy;
  };

  /**
   * Prepare Data Packet for send
   * @param {int} flags Data flags
   */
  this.prepare2Send = function(flags = 0) {
    if (isLargeSDU) {
      this.buf.writeUInt32BE(this.dataLen, constants.NSPHDLEN);
    } else {
      this.buf.writeUInt16BE(this.dataLen, constants.NSPHDLEN);
    }

    this.buf.writeUInt16BE(flags, constants.NSPDAFLG);
    this.dataBuf = this.buf.subarray(0, this.dataLen);
  };

  /**
   * Construct Data Packet from receive data
   * @param {Packet} packet NS packet
   */
  this.fromPacket = function(packet) {
    this.buf = packet.buf;
    this.dataLen = packet.buf.length;
    this.dataPtr = constants.NSPDADAT;
    this.offset = this.dataPtr;
    this.len = this.dataLen;
    packet.dataOffset = this.dataPtr;
  };
}

/**
 * Accept Packet (NSPTAC)
 * @param {Packet} packet NS packet
 * @param {*} sAtts session Attributes
 */
function AcceptPacket(packet, sAtts) {
  this.buf = packet.buf;
  this.len = packet.buf.length;

  /* Set negotiated values */
  sAtts.version = packet.buf.readUInt16BE(constants.NSPACVSN);
  sAtts.options = packet.buf.readUInt16BE(constants.NSPACOPT);
  sAtts.sdu = packet.buf.readUInt16BE(constants.NSPACSDU);
  sAtts.tdu = packet.buf.readUInt16BE(constants.NSPACTDU);

  if (sAtts.version >= 315) {
    /* Large SDU Support */
    sAtts.sdu = packet.buf.readUInt32BE(constants.NSPACLSD);
    sAtts.tdu = packet.buf.readUInt32BE(constants.NSPACLTD);
    sAtts.largeSDU = true;
    this.cflag = packet.buf.readUInt8(constants.NSPACCFL); // 00001000
    if ((this.cflag & constants.NSPACCFON) != 0) { // compression ON
      sAtts.negotiatedNetworkCompressionScheme = (this.cflag & 0x3c) >> 2; // 0x3c
      sAtts.networkCompressionEnabled = true;
      sAtts.firstRecvCompressedPacket = true;
      sAtts.firstSendCompressedPacket = true;
    } else {
      sAtts.networkCompressionEnabled = false;
    }
  }

  /* Accept flags */
  this.flag0 = packet.buf.readUInt8(constants.NSPACFL0);
  this.flag1 = packet.buf.readUInt8(constants.NSPACFL1);

  sAtts.noNA = ((this.flag1 & constants.NSINANOSERVICES) == constants.NSINANOSERVICES);
  if (!sAtts.noNA)
    sAtts.noNA = ((this.flag0 & constants.NSINADISABLEDFORCONNECTION) == constants.NSINADISABLEDFORCONNECTION);


  if (sAtts.version >= constants.TNS_VERSION_MIN_DATA_FLAGS) {
    packet.flags = packet.buf.readUInt32BE(constants.NSPACFL2);
  }
}

/**
 * Refuse Packet
 * @param {*} packet NS packet
 */
function RefusePacket(packet) {
  this.buf = packet.buf;
  this.len = packet.buf.length;
  this.userReason = packet.buf.readUInt8(constants.NSPRFURS);
  this.systemReason = packet.buf.readUInt8(constants.NSPRFURS);
  this.dataLen = packet.buf.readUInt16BE(constants.NSPRFLEN);
  this.dataOff = constants.NSPRFDAT;

  if (this.len > this.dataOff) {
    this.dataBuf = this.buf.toString('ascii', this.dataOff, this.len);
    this.overflow = false;
  } else {
    this.overflow = true;
  }
}

/**
 * Redirect Packet (NSPTRD)
 * @param {*} packet NS packet
 */
function RedirectPacket(packet) {
  this.buf = packet.buf;
  this.len = packet.buf.length;
  this.flags = packet.flags;
  this.dataLen = packet.buf.readUInt16BE(constants.NSPRDLEN);
  this.dataOff = constants.NSPRDDAT;

  if (this.len > this.dataOff) {
    this.dataBuf = this.buf.subarray(this.dataOff, this.len);
    this.overflow = false;
  } else {
    this.overflow = true;
  }
}

/**
 * Marker Packet (NSPTMK)
 * @param {int} isLargeSDU Large SDU
 */
function MarkerPacket(isLargeSDU) {
  this.len = constants.NSPMKDAT + 1; /* Packet length */

  // Packet Buffer
  this.buf = Buffer.allocUnsafe(constants.NSPMKDAT + 1).fill(0);

  if (isLargeSDU) {
    this.buf.writeUInt32BE(this.len, constants.NSPHDLEN);
  } else {
    this.buf.writeUInt16BE(this.len, constants.NSPHDLEN);
  }
  this.buf.writeUInt8(0, constants.NSPHDFLGS);
  this.buf.writeUInt8(constants.NSPTMK, constants.NSPHDTYP);

  /**
   * Prepare Marker packet for write
   * @param {Uint8} type of Marker
   * @param {Uint8} data Marker byte
   */
  this.prepare = function(type, data) {
    this.buf.writeUInt8(type, constants.NSPMKTYP);
    this.buf.writeUInt8(data, constants.NSPMKDAT);
  };

  /**
   * Marker Packet receive
   * @param {Packet} packet NS packet
   * @param {NetworkSession} nsi Network Session
   */
  this.fromPacket = function(packet, nsi) {
    this.type = packet.buf.readUInt8(constants.NSPMKTYP);

    switch (this.type) {
      case constants.NSPMKTD0:
        nsi.isBreak = true;
        break;
      case constants.NSPMKTD1:
        this.data = packet.buf.readUInt8(constants.NSPMKDAT);
        nsi.isBreak = true;
        if (this.data == constants.NIQRMARK) {
          nsi.isReset = true;
          nsi.isBreak = true;
        }
        break;
      default:
        errors.throwErr(errors.ERR_INVALID_PACKET);
    }
  };
}

/**
 * Control Packet NSPTCTL
 */

function ControlPacket() {
  /**
   * Clear(reset) the packet
   */
  this.clear = function() {
    this.errno = 0;
    this.notif = null;
    this.notifLen = 0;
    this.cmd = 0;
  };

  /**
   * Control Packet receive
   * @param {*} packet NS packet
   */
  this.fromPacket = function(packet) {
    const NSECMANSHUT = 12572; // CMAN SHUTDOWN
    const NSESENDMESG = 12573; // SEND MESSAGE
    const ORA_ERROR_EMFI_NUMBER = 22; //ORA -error
    let emfi;
    let err1;
    let err2;

    this.cmd = packet.buf.readUInt16BE(constants.NSPCTLCMD);
    switch (this.cmd) {
      case constants.NSPCTL_SERR:
        emfi = packet.buf.readUInt32BE(constants.NSPCTLDAT);
        err1 = packet.buf.readUInt32BE(constants.NSPCTLDAT + 4);
        err2 = packet.buf.readUInt32BE(constants.NSPCTLDAT + 8);

        if (err1 == NSECMANSHUT) {
          this.errno = err1;
        } else if (err1 == NSESENDMESG) {
          this.errno = err1;
          this.notifLen = err2;
          this.notif = Buffer.allocUnsafe(err2 + 1).fill(0);
          this.buf.copy(this.notif, 0, constants.NSPCTLDAT + 12, constants.NSPCTLDAT + 12 + err2);
        } else {
          this.errno = err1;
          if (emfi == ORA_ERROR_EMFI_NUMBER) {
            errors.throwErr(errors.ERR_CONNECTION_INBAND, "ORA" + "-" + err1);
          } else {
            errors.throwErr(errors.ERR_CONNECTION_INBAND, "TNS" + "-" + err1);
          }
        }
        break;
      default:
        errors.throwErr(errors.ERR_INVALID_PACKET);
    }
  };
}

module.exports = {
  ConnectPacket,
  DataPacket,
  AcceptPacket,
  RefusePacket,
  RedirectPacket,
  MarkerPacket,
  ControlPacket
};
