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
const zlib = require('zlib');
const Packet = require("./packet.js");
const NTTCP = require("./ntTcp.js");
const SessionAtts = require("./sessionAtts.js");
const constants = require("./constants.js");
const { createNode } = require('./connStrategy.js');
const errors = require("../../errors.js");
const { findNVPairRecurse, createNVPair, findValue } = require("./nvStrToNvPair.js");
const { Buffer } = require('buffer');
const EzConnect = require("./ezConnectResolver.js");
const { NLParamParser, tnsnamesFilePath } = require("./paramParser.js");
const process = require('process');
const downHostInstance = require("./connStrategy.js").SOLE_INST_DHCACHE;
const {ANO} = require("./ANO.js");
/**
 *
 * @param {string} userConfig
 * @returns serverinfo
 */

async function getConnectionInfo(userConfig) {
  const connStr = await resolveConnectStr(userConfig.connectString, userConfig.configDir);
  const addressNode = await createNode(connStr, userConfig);
  let nvpair;
  if (typeof connStr === 'string')
    nvpair = createNVPair(connStr);
  else
    nvpair = connStr;//Already a NVPair

  const serverVal = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SERVER"]);
  const connClass = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "POOL_CONNECTION_CLASS"]);
  const svcname =   findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SERVICE_NAME"]);
  const sid =   findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SID"]);
  const poolPurity = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "POOL_PURITY"]);

  return [serverVal, connClass, svcname, poolPurity, sid, addressNode];
}

/**
 * Resolve the connect string to a NV format address
 * @param {String} connStr Connect string
 * @returns AddressNode
 */
const nlParamParser =  new NLParamParser;
async function resolveConnectStr(connectString, configDir) {
  const connStr = connectString.trim();
  let resolvedVal = connStr;
  if ((connStr.indexOf(')') == -1) || (connStr.indexOf('(') != 0)) {
    if ((connStr.indexOf(':') != -1) || (connStr.indexOf('/') != -1)) {
      const ezcnObj = new EzConnect(connStr);
      resolvedVal = ezcnObj.getResolvedUrl();
      return resolvedVal;
    } else {
      //try tns alias
      const namesFilePath = tnsnamesFilePath(configDir);
      const p = await nlParamParser.initializeNlpa(namesFilePath);
      resolvedVal = p.get(connStr.toUpperCase());
      if (!resolvedVal)
        errors.throwErr(errors.ERR_TNS_ENTRY_NOT_FOUND, connStr, configDir ? configDir + '/tnsnames.ora' : process.env.TNS_ADMIN + '/tnsnames.ora');
      if (resolvedVal.rhsType == 1) {
        const rString = resolvedVal.atom;
        if ((rString.indexOf(':') != -1) || (rString.indexOf('/') != -1)) {
          return new EzConnect(rString).getResolvedUrl();
        }
      }
      resolvedVal = resolvedVal.getListElement(0);
    }

  }
  return resolvedVal;

}

async function resolveAddress(connStr, userConfig) {
  const connstr = await resolveConnectStr(connStr, userConfig.configDir);
  return createNode(connstr, userConfig);
}

/**
   * Timeout function
   * @param {Promise} asyncPromise input promise
   * @param {int} timeVal timeout value
   * @returns resolved value of input promise
   */
function timeout(asyncPromise, timeVal, oper, address, connID) {
  let timer;

  const timeoutPromise = new Promise((resolve, reject) => {
    // max possible value for 32-bit integer
    if (timeVal > 2147483647)
      timeVal = 2147483647;

    timer = setTimeout(() => reject(errors.getErr(errors.ERR_CONNECTION_TIMEDOUT, address.host, address.port, oper, timeVal / 1000, connID)), timeVal);
  });
  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timer);
    return result;
  }).catch((err) => {
    clearTimeout(timer);
    throw err;
  });
}

/**
 * Network Session. This will be used for communication with the server.
 * @param {object} userConfig Connection options
 */
class NetworkSession {

  constructor() {
    this.connected = false;
    this.isBreak = false;
    this.isReset = false;
    this.breakPosted = false;
    this.compressionEnabled = false;
  }

  async getAddress(addressNode, userConfig) {
    /* Get the next address */
    const address = await addressNode.execute(userConfig);

    /* Prepare connection attributes */
    const uuid = this.sAtts ? this.sAtts.uuid : null;
    this.sAtts = new SessionAtts(uuid);
    this.sAtts.setFrom(userConfig);
    this.sAtts.setFrom(address.desc.params);  /* Resolve attributes from Connect String */
    await this.sAtts.prepare(address.protocol, userConfig);

    /* Insert Connection ID */
    const rootNVPair = createNVPair(address.CNdata.join(""));
    const cdataNVPair = findNVPairRecurse(rootNVPair, "CONNECT_DATA");
    const connidStr = `(CONNECTION_ID=${this.sAtts.connectionId})`;
    const childNVPair = createNVPair(connidStr);
    cdataNVPair.addListElement(childNVPair);

    this.cData = Buffer.from(rootNVPair.toString(), 'ascii');
    this.cDataNVPair = rootNVPair;
    this.sAtts.nt.cDataNVPair = rootNVPair;

    return (address);
  }

  /**
   * Make the transport level connection
   */
  async transportConnect(address) {
    if (address.protocol.toUpperCase() == 'TCP' && address.httpsProxy) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS, 'https proxy requires protocol as', 'tcps ');
    }
    if (address.protocol && (address.protocol.toUpperCase() == 'TCP' || address.protocol.toUpperCase() == 'TCPS')) {
      this.ntAdapter = new NTTCP(this.sAtts.nt);
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS, address.protocol + " protocol not supported");
    }
    await this.ntAdapter.connect(address);
    this.ntAdapter.startRead();
    this.sAtts.ntCha = this.ntAdapter.cha;
    this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
    this.rcvDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
  }

  /**
   * Send the NSPTCN(connect) packet
   * @param {object} connectPkt Connect Packet
   */
  _sendConnect(connectPkt) {
    this.sendPacket(connectPkt.buf);
    if (connectPkt.overflow) {
      this._send(connectPkt.connectData, 0, connectPkt.connectDataLen);
      this.flush();
    }
  }

  /**
   * Establish network session. Make transport level connection, send
   * NSPTCN(connect packet) and read the response. @returns NetError.
   * (connection successfully established(NetError.CONNECTED)
   * or reason for failure)
   */
  async connect2(address, userConfig) {
    /* Sanitise SDU */
    if (this.sAtts.sdu) {
      if (this.sAtts.sdu > constants.NSPABSSDULN) {
        this.sAtts.sdu = constants.NSPABSSDULN;
      } else if (this.sAtts.sdu < constants.NSPMNSDULN) {
        this.sAtts.sdu = constants.NSPMNSDULN;
      }
    } else {
      this.sAtts.sdu = constants.NSPDFSDULN;
    }

    /* Transport connect */
    if (this.sAtts.transportConnectTimeout) {
      const asyncPromise = this.transportConnect(address);
      await timeout(asyncPromise, this.sAtts.transportConnectTimeout, "transportConnectTimeout", address, this.sAtts.connectionId);
    } else {
      await this.transportConnect(address);
    }

    /* Send the connect packet */
    let connectPkt = new Packet.ConnectPacket(this.cData, this.sAtts);
    this._sendConnect(connectPkt);

    /* Read the response */
      while (true) {  // eslint-disable-line
      const packet = await this._recvPacket();
      if (packet.type === constants.NSPTAC) /* ACCEPT */
        break;
      if (packet.type === constants.NSPTRF) { /* REFUSE */
        if (this.refusePkt.overflow) {
          await this._recvPacket();
          this.refusePkt.dataBuf = this.rcvDatapkt.buf.subarray(this.rcvDatapkt.offset, this.rcvDatapkt.len).toString();
        }
        const nvpair = createNVPair(this.refusePkt.dataBuf);
        this.refusePkt = null;
        const err = findValue(nvpair, ["DESCRIPTION", "ERR"]);
        if (err == "12514") {
          errors.throwErr(errors.ERR_INVALID_SERVICE_NAME, this.getOption(constants.SVCNAME), address.host, address.port, this.sAtts.connectionId);
        } else if (err == "12505") {
          errors.throwErr(errors.ERR_INVALID_SID, this.getOption(constants.SID), address.host, address.port, this.sAtts.connectionId);
        } else if (err) {
          errors.throwErr(errors.ERR_CONNECTION_REFUSED, address.host, address.port, this.sAtts.connectionId, "ORA-" + err);
        } else {
          errors.throwErr(errors.ERR_CONNECTION_REFUSED, address.host, address.port, this.sAtts.connectionId, "refused");
        }
      } else if (packet.type === constants.NSPTRS) { /* RESEND */
        if ((packet.flags & constants.NSPFSRN) == constants.NSPFSRN) {
          await this.ntAdapter.renegTLS();
          this.ntAdapter.startRead();
        }
        this._sendConnect(connectPkt);
      } else if (packet.type === constants.NSPTRD) { /* REDIRECT */
        let adrLen, adrStr, redirConnData;

        /* Read and connect to Redirect address */
        if (this.redirectPkt.overflow) {
          await this._recvPacket();
          this.redirectPkt.dataBuf = this.rcvDatapkt.buf.subarray(this.rcvDatapkt.offset, this.rcvDatapkt.len);
        }

        if (this.redirectPkt.flags & constants.NSPFRDS) {
          adrLen = this.redirectPkt.dataBuf.indexOf('\0', 0, 'ascii');
          adrStr = this.redirectPkt.dataBuf.toString('ascii', 0, adrLen);
          redirConnData = this.redirectPkt.dataBuf.subarray(adrLen + 1, this.redirectPkt.dataLen);
        } else {
          adrStr = this.redirectPkt.dataBuf.toString('ascii');
          redirConnData = this.cData;
        }

        const redirAddressNode = await resolveAddress(adrStr, userConfig);
        const host = address.hostname;
        address = await redirAddressNode.execute();
        if (address.desc)
          this.sAtts.setFrom(address.desc.params);  /* Add on attributes from redirect connect String */
        address.originHost = host;
        this.redirectPkt = null;
        this.ntAdapter.disconnect(constants.NSFIMM);

        if (this.sAtts.transportConnectTimeout) {
          const asyncPromise = this.transportConnect(address);
          await timeout(asyncPromise, this.sAtts.transportConnectTimeout, "transportConnectTimeout", address, this.sAtts.connectionId);
        } else {
          await this.transportConnect(address);
        }

        connectPkt = new Packet.ConnectPacket(redirConnData, this.sAtts, constants.NSPFRDR);
        this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
        this._sendConnect(connectPkt);
      }
    }

    /* Accepted  */

    this.connected = true;
    this.cData = null;
    this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
    this.markerPkt = new Packet.MarkerPacket(this.sAtts.largeSDU);
    this.controlPkt = new Packet.ControlPacket();
    this.ntAdapter.largeSDU = this.sAtts.largeSDU;
    this.sAtts.clearWallet();
    this.sAtts.nt.walletPassword = null;

    if (!this.sAtts.noNA) {
      const NAContext = new ANO(this.sAtts);
      const buf = NAContext.sendPacket();
      this._send(buf, 0, buf.length);
      this.flush();
      const packet = await this._recvPacket();
      NAContext.processPacket(packet.buf);
    }

    this.sndDatapkt.createPacket(constants.NSPDADAT); //Currently only used for disconnect
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
    this.sndDatapkt.len = this.sndDatapkt.bufLen;
    return (true);
  }

  /**
   * Try all available addresses for connection establishment
   */
  async connect1(address, addressNode, userConfig) {
    let connected, savedErr;
    do {
      try {
        if (this.sAtts.connectTimeout) {
          const asyncPromise = this.connect2(address, userConfig);
          connected = await timeout(asyncPromise, this.sAtts.connectTimeout, "connectTimeout", address, this.sAtts.connectionId);
        } else {
          connected = await this.connect2(address, userConfig);
        }
      } catch (err) {
        if (err.message.startsWith('NJS-510') && !this.ntAdapter.connected) {
          downHostInstance.markDownHost(address.host, Date.now()); // mark the host as down
          this.ntAdapter.connected = true; // Pretend as connected
        }
        if (this.ntAdapter) {
          this.ntAdapter.disconnect(constants.NSFIMM);
          this.ntAdapter = null;
        }
        this.sAtts.clearWallet();
        connected = false;
        savedErr = err;
        try {
          address = await this.getAddress(addressNode, userConfig);
        } catch (err) {
          break;
        }
      }
    } while (!connected);
    if (connected) {
      return;
    } else {
      throw (savedErr);
    }
  }

  /**
   * Process packet (Internal)
   */
  _processPacket(packet) {
    switch (packet.type) {
      case constants.NSPTDA: { /* DATA packet */
        const size = packet.buf.length;
        const dataFlags = packet.buf.readUInt16BE(constants.NSPDAFLG);
        if ((dataFlags & constants.NSPDAFCMP) != 0) { // compression enabled
          const packetHeader = packet.buf.subarray(0, constants.NSPDADAT);
          const buffertoDeCompress = packet.buf.subarray(constants.NSPDADAT, size);
          let deCompressedDataBuffer;
          try {
            if (this.sAtts.firstRecvCompressedPacket) {
              deCompressedDataBuffer = zlib.inflateSync(buffertoDeCompress, {finishFlush: zlib.constants.Z_SYNC_FLUSH});
              this.sAtts.firstRecvCompressedPacket = 0;
            } else {
              deCompressedDataBuffer = zlib.inflateRawSync(buffertoDeCompress, {finishFlush: zlib.constants.Z_SYNC_FLUSH});
            }
          } catch (err) {
            errors.throwErr(errors.ERR_DATA_COMPRESSION, err.message);
          }
          const resultLength = deCompressedDataBuffer.length;
          //concatenate packet header with decompressed data
          packet.buf = Buffer.concat([packetHeader, deCompressedDataBuffer]);
          const length = resultLength + constants.NSPDADAT;
          if (this.sAtts.largeSDU) {
            packet.buf.writeUInt32BE(length, constants.NSPHDLEN);
          } else {
            packet.buf.writeUInt16BE(length, constants.NSPHDLEN);
          }
        }
        this.rcvDatapkt.fromPacket(packet);
        break;
      }
      case constants.NSPTMK: /* MARKER packet */
        this.markerPkt.fromPacket(packet, this);
        break;
      case constants.NSPTCNL: /* CONTROL packet */
        this.controlPkt.fromPacket(packet);
        break;
      case constants.NSPTAC: /* ACCEPT */
        Packet.AcceptPacket(packet, this.sAtts);
        if (this.sAtts.version >= constants.TNS_VERSION_MIN_END_OF_RESPONSE
          && (packet.flags & constants.TNS_ACCEPT_FLAG_HAS_END_OF_REQUEST)) {
          this.endOfRequestSupport = true;
        }
        if (packet.flags & constants.TNS_ACCEPT_FLAG_FAST_AUTH) {
          this.supportsFastAuth = true;
        }
        break;
      case constants.NSPTRF: /* REFUSE */
        this.refusePkt = new Packet.RefusePacket(packet);
        break;
      case constants.NSPTRS: /* RESEND */
        break;
      case constants.NSPTRD: /* REDIRECT */
        this.redirectPkt = new Packet.RedirectPacket(packet);
        break;
      default:
        errors.throwErr(errors.ERR_CONNECTION_INVALID_PACKET);
    }
  }

  /**
   * Receive packet (Internal)
   * Control packets are consumed internally and discarded
   */
  async _recvPacket() {
    while (true) {  // eslint-disable-line
      const packet = await this.ntAdapter.receive();
      if (!packet)
        break;

      this._processPacket(packet);
      if (packet.type !== constants.NSPTCNL) {
        return packet;
      }
    }
  }

  /**
   * Send data (Internal)
   */
  sendPacket(buf) {
    const packetType = buf.readUInt8(constants.NSPHDTYP);
    // only data packets need to be compressed
    if (packetType == constants.NSPTDA) {
      const size = buf.length;
      let dataFlags = buf.readUInt16BE(constants.NSPDAFLG);
      if (this.sAtts.networkCompressionEnabled && size > this.sAtts.networkCompressionThreshold) {
        this.compressionEnabled = true;
        const buffertoCompress = buf.subarray(constants.NSPDADAT, size);
        const bufferHeader = buf.subarray(0, constants.NSPDADAT);
        let compressedDataBuffer;
        try {
          if (this.sAtts.firstSendCompressedPacket) {
            compressedDataBuffer = zlib.deflateSync(buffertoCompress, {finishFlush: zlib.
              constants.Z_SYNC_FLUSH});
            this.sAtts.firstSendCompressedPacket = 0;
          } else {
            compressedDataBuffer = zlib.deflateRawSync(buffertoCompress, {finishFlush: zlib.constants.Z_SYNC_FLUSH});
          }
        } catch (err) {
          errors.throwErr(errors.ERR_DATA_COMPRESSION, err.message);
        }
        const resultLength = compressedDataBuffer.length;
        if (resultLength < size - constants.NSPDADAT) {
          dataFlags |= constants.NSPDAFCMP;
          // concatenate buffer header with the compressed data
          buf = Buffer.concat([bufferHeader, compressedDataBuffer]);
          buf.writeUInt16BE(dataFlags, constants.NSPDAFLG);
          const pktOffset = resultLength + constants.NSPDADAT;
          if (this.sAtts.largeSDU) {
            buf.writeUInt32BE(pktOffset, constants.NSPHDLEN);
          } else {
            buf.writeUInt16BE(pktOffset, constants.NSPHDLEN);
          }
        }
      }
    }
    this.ntAdapter.send(buf);
  }

  /**
   * Break ongoing operation
   */
  sendBreak() {
    if (this.isBreak)
      return; /* Already in a break */

    if (!this.connected) {
      this.isBreak = true; /* Not yet connected. Post the break */
      this.breakPosted = true;
      return;
    }

    this.isBreak = true;
    this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQIMARK);
    this.sendPacket(this.markerPkt.buf);
  }

  /**
   * Reset the connection
   */
  async reset() {
    /* If posted send Break */
    if (this.breakPosted) {
      this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQBMARK);
      this.sendPacket(this.markerPkt.buf);
      this.breakPosted = false;
    }
    /* Send Reset */
    this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQRMARK);
    this.sendPacket(this.markerPkt.buf);

    /* Await Reset */
    while (!this.isReset) {
      await this._recvPacket();
    }

    /* reset packet buffers */
    this.sndDatapkt.dataPtr = this.sndDatapkt.dataLen = constants.NSPDADAT;
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
    this.sndDatapkt.len = this.sndDatapkt.bufLen;

    this.isBreak = this.isReset = false;
  }

  /**
  * Receive packet
  */
  async recvPacket() {
    return await this._recvPacket();
  }

  syncRecvPacket() {
    while (this.ntAdapter.packets.length > 0) {
      const packet = this.ntAdapter.syncReceive();
      if (!packet)
        break;
      this._processPacket(packet);
      if (packet.type !== constants.NSPTCNL)
        return packet;
    }
  }

  /**
   * Send data
   * @param {Buffer} userBuf User provided buffer
   * @param {*} offset from which to send data
   * @param {*} len number of bytes to send
   */
  _send(userBuf, offset, len) {
    if (this.isBreak) {
      return;
    }
    let bytesCopied = 0;

    this.sndDatapkt.dataLen = this.sndDatapkt.offset;
    if (this.sndDatapkt.dataLen < this.sndDatapkt.bufLen || !this.sndDatapkt.bufLen) {
      bytesCopied = this.sndDatapkt.fillBuf(userBuf, offset, len);
      len -= bytesCopied;
      offset += bytesCopied;
      this.sndDatapkt.offset = this.sndDatapkt.dataLen;
    }

    while (len) {
      this.sendPacket(this.sndDatapkt.dataBuf);

      /* If break throw error now */
      if (this.isBreak) {
        return;
      }

      this.sndDatapkt.dataLen = this.sndDatapkt.dataPtr;
      this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
      bytesCopied = this.sndDatapkt.fillBuf(userBuf, offset, len);
      len -= bytesCopied;
      offset += bytesCopied;
      this.sndDatapkt.offset = this.sndDatapkt.dataLen;
    }
  }

  /**
   * Flush send buffers
   */
  flush() {
    if (this.isBreak) {
      return;
    }
    this.sndDatapkt.dataLen = this.sndDatapkt.offset;
    this.sndDatapkt.prepare2Send();
    this.sendPacket(Buffer.from(this.sndDatapkt.dataBuf));
    this.sndDatapkt.dataLen = this.sndDatapkt.dataPtr;
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
  }

  /**
   * Establish network connection
  */
  async connect(userConfig) {
    const connStr = userConfig.connectString ? userConfig.connectString : userConfig.connectionString;
    let addressNode;
    if (userConfig._connInfo) {
      addressNode = userConfig._connInfo[5];
      addressNode.reset();
    } else {
      addressNode = await resolveAddress(connStr, userConfig);
    }
    let address;
    try {
      address = await this.getAddress(addressNode, userConfig);
    } catch (err) {
      if (err.message == "All options tried") /* Not even one valid address */
        errors.throwErr(errors.ERR_HOST_NOT_FOUND);
      else
        errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS, err.message);
    }
    await this.connect1(address, addressNode, userConfig);
  }

  /**
   * Force Disconnect the stream, primarily used
   * to disconnect dead/hung connections.
   */
  forceDisconnect(err) {
    if (!this.connected) {
      return;
    }
    this.ntAdapter.stream.destroy(err);
    this.connected = false;
  }

  /**
   * Disconnect
   * @param {int} type of disconnect
   */
  disconnect(type) {
    if (!this.connected) {
      return;
    }
    if (type != constants.NSFIMM && !this.ntAdapter.err) {
      /* Send EOF packet */
      this.sndDatapkt.dataLen = this.sndDatapkt.offset;
      this.sndDatapkt.prepare2Send(constants.NSPDAFEOF);
      this.sendPacket(this.sndDatapkt.dataBuf);
    }
    this.ntAdapter.disconnect(type);
    this.ntAdapter = null;
    this.connected = false;
  }

  /**
   * Get connection attributes
   * @param {int} opcode type of attribute
   * @returns attribute value
   */
  getOption(opcode) {
    switch (opcode) {

      case constants.NS_MOREDATA: /* Is there more data in read buffers */
        return (this.ntAdapter.packets.length > 0);

      case constants.SVCNAME: /* Service name */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SERVICE_NAME"]);

      case constants.SID: /* Service name */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SID"]);

      case constants.SERVERTYPE: /* Server type */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SERVER"]);

      case constants.REMOTEADDR: /* Peer address */
        if (this.ntAdapter) {
          return this.ntAdapter.getOption(opcode); // Pass through to NT
        } else {
          return null;
        }

      case constants.CONNCLASS: /* Connection Class */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "POOL_CONNECTION_CLASS"]);

      case constants.PURITY: /* Purity */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "POOL_PURITY"]);

      case constants.HEALTHCHECK: /* Is connection healthy */
        return (this.connected && this.ntAdapter.connected && !this.ntAdapter.err);

      default:
        errors.throwErr(errors.ERR_INTERNAL, "getOption not supported for opcode " + opcode);
    }
  }

  /**
   * receive inband notification
   * @param {Object} obj Return the notification into user provided object
   * @returns Error number sent from server, or error on the connection.
   * returns 0 if healthy connection
   */
  recvInbandNotif() {
    let error = 0;
    if (this.controlPkt.errno) {     /* Control pkt already read */
      error = this.controlPkt.errno;
      return (error);
    } else if (!this.getOption(constants.HEALTHCHECK)) {
      return errors.ERR_CONNECTION_CLOSED;
    } else {
      if (this.getOption(constants.NS_MOREDATA)) { //More data available
        const packet = this.ntAdapter.syncReceive();

        if (packet.type == constants.NSPTCNL) {
          this.controlPkt.fromPacket(packet);
          error = this.controlPkt.errno;
          return (error);
        } else {
          this.ntAdapter.packets.unshift(packet); /* Push packet back */
          return (0);
        }
      } else
        return (0);
    }
  }
}

module.exports = {
  NetworkSession,
  resolveAddress,
  getConnectionInfo
};
