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
const net = require("net");
const process = require("process");
const tls = require("tls");
const http = require("http");
const Timers = require('timers');
const constants = require("./constants.js");
const errors = require("../../errors.js");
const { findValue, findNVPair } = require("./nvStrToNvPair.js");

const PACKET_HEADER_SIZE = 8;
const DEFAULT_PORT = 1521;
const DEFAULT_HTTPS_PROXY_PORT = 80;

/* Protocol characteristics */
const TCPCHA = 1 << 1 |    /* ASYNC support */
  1 << 2 |    /* Callback support */
  1 << 3 |    /* More Data support */
  1 << 8 |    /* Read/Write Readiness support */
  1 << 9 |    /* Full Duplex support */
  1 << 12;    /* SIGPIPE Support */

const sniAllowedCDParams = ["SERVICE_NAME", "INSTANCE_NAME", "SERVER", "COLOCATION_TAG", "CONNECTION_ID", "POOL_BOUNDARY",
  "POOL_PURITY", "POOL_CONNECTION_CLASS", "POOL_NAME", "SERVICE_TAG", "CID"];
const sniParams = ["SERVICE_NAME", "INSTANCE_NAME", "SERVER", "COLOCATION_TAG"];
const sniMap = ['S', 'I', 'T', 'C'];
const SNI_MAX_BYTES = 256;

let streamNum = 1;

/**
 * Network Transport TCP/TCPS adapter
 * @param {Address} address Destination Address
 * @param {Object} atts Transport Attributes
 */
class NTTCP {

  constructor(atts) {
    this.atts = atts;
    this.cha = TCPCHA;
    this.connected = false;
    this.err = false;
    this.needsDrain = false;
    this.numPacketsSinceLastWait = 0;
    this.secure = false;
    this.largeSDU = false;
    this.streamNum = streamNum++;
    this.packetNum = 1;
    this.doDNMatch = true;
  }

  /**
   * DN matching function(used with TLS)
   */
  dnMatch(serverName, cert) {
    if (this.atts.sslServerDNMatch && this.doDNMatch) {
      const toObject = str =>str .split(',').map(x => x.split('=').map(y => y.trim())).reduce((a, x) => {
        a[x[0]] = x[1];
        return a;
      }, {});
      if (this.atts.sslServerCertDN) { /* Full DN Match */
        const obj = toObject(this.atts.sslServerCertDN);
        if (Object.keys(obj).length == Object.keys(cert.subject).length) {
          for (const key in obj) {
            if (obj[key] != cert.subject[key]) {
              return (errors.getErr(errors.ERR_TLS_DNMATCH_FAILURE));
            }
          }
        } else {
          return (errors.getErr(errors.ERR_TLS_DNMATCH_FAILURE));
        }
      } else {
        if (tls.checkServerIdentity(this.hostName, cert) && (!this.originHost || tls.checkServerIdentity(this.originHost, cert))) { /* Hostname match */
          if (this.atts.sslAllowWeakDNMatch) {
            const serviceName = findValue(this.atts.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SERVICE_NAME"]); /* Service Name match */
            if (serviceName != cert.subject.CN) {
              return (errors.getErr(errors.ERR_TLS_DNMATCH_FAILURE));
            }
          } else {
            const hostName = this.hostName + " "  + (this.originHost ? "or " + this.originHost : "");
            return (errors.getErr(errors.ERR_TLS_HOSTMATCH_FAILURE, hostName));
          }
        }
      }
    }
  }

  /**
   * TLS connection establishment
   * @returns Promise
   */
  async tlsConnect(secureContext, connStream) {
    this.stream.removeAllListeners();
    let connectErrCause, sni = null;
    if (this.atts.useSNI)
      sni = this.generateSNI();
    const tlsOptions = {
      host: this.host,
      socket: connStream,
      servername: sni,
      rejectUnauthorized: true,
      secureContext: secureContext,
      enableTrace: false,
      checkServerIdentity: this.dnMatch.bind(this)
    };

    await new Promise((resolve) => {
      this.stream = tls.connect(tlsOptions, () => {
        if (!this.stream.authorized) {
          connectErrCause = "server certificate unauthorized";
        }
        resolve();
      }).on('error', (err) => {
        connectErrCause = err.message;
        resolve();
      });
    });
    if (connectErrCause)
      errors.throwErr(errors.ERR_TLS_AUTH_FAILURE, this.host, this.port, this.atts.connectionId, connectErrCause);
    this.connStream = connStream;
  }

  /**
   * TCP connection establishment
   * @returns Promise
   */
  async ntConnect(address) {
    if (!address.port) {
      address.port = DEFAULT_PORT;
    }

    let connectErrCause, proxyConnectErrCause, req;
    const httpsProxy = address.httpsProxy || this.atts.httpsProxy;
    let httpsProxyPort = address.httpsProxyPort || this.atts.httpsProxyPort;

    await new Promise((resolve) => {
      if (httpsProxy) {
        if (!httpsProxyPort) {
          httpsProxyPort = DEFAULT_HTTPS_PROXY_PORT;
        }
        req = http.request({
          host: httpsProxy,
          port: httpsProxyPort,
          method: 'CONNECT',
          path: address.host + ':' + address.port,
        });
        req.once('connect', (res, socket) => {
          if (res.statusCode == 200) {
            this.connected = true;
            this.stream = socket;
          } else {
            proxyConnectErrCause = res.statusCode;
          }
          resolve();
        });
        req.once('error', (err) => {
          proxyConnectErrCause = err.message;
          resolve();
        });
        req.end();
      } else {
        this.stream = net.connect(address.port, address.host, () => {
          this.connected = true;
          resolve();
        });
        this.stream.once('error', (err) => {
          connectErrCause = err.message;
          resolve();
        });
      }
    });
    if (req)
      req.removeAllListeners();
    if (!this.connected) {
      if (proxyConnectErrCause) {
        errors.throwErr(errors.ERR_PROXY_CONNECTION_FAILURE, httpsProxy, httpsProxyPort, this.atts.connectionId, proxyConnectErrCause);
      } else {
        errors.throwErr(errors.ERR_CONNECTION_INCOMPLETE, this.host, this.port, this.atts.connectionId, connectErrCause);
      }
    }
  }

  /**
   * Network Transport connection establishment
   * @returns Promise
   */
  async connect(address) {  /* Connect function for TCP sockets */
    this.originHost = address.originHost;
    this.host = address.host;
    this.hostName = address.hostname;
    this.port = address.port;

    try {
      await this.ntConnect(address);
      if (this.atts.expireTime || this.atts.enableDCD) {  /* Set KeepAlives */
        if (this.atts.expireTime) {
          this.stream.setKeepAlive(true, this.atts.expireTime);
        } else {
          this.stream.setKeepAlive(true);
        }
      }
      if (this.atts.tcpNoDelay) {  /* Turn off Nagle's unless explicitly enabled by user */
        this.stream.setNoDelay(true);
      }
      if (address.protocol.toUpperCase() == "TCPS") {
        let secureContext;
        this.secure = true;
        if (this.atts.sslAllowWeakDNMatch)
          this.doDNMatch = false; //Don't match initial connect
        try {
          secureContext = tls.createSecureContext({
            cert: this.atts.wallet,
            key: this.atts.wallet,
            passphrase: this.atts.walletPassword,
            ca: this.atts.wallet,
          });
        } catch (err) {
          errors.throwErr(errors.ERR_TLS_INIT_FAILURE, err.message);
        }
        await this.tlsConnect(secureContext, this.stream);
      }
    } finally {
      if (this.stream) {
        this.setupEventHandlers();
      }
    }
  }

  /**
   * Disconnect Network Transoprt
   * @param {int} type
   * @returns Promise
   */
  disconnect(type) {   /* Disconnect function for TCP sockets */
    if (this.connected && !this.err) {
      if (type == constants.NSFIMM)
        this.stream.destroy();
      else
        this.stream.end();
    }
    this.stream = null;
    this.connected = false;
    this.drainWaiter = null;
    this.readWaiter = null;
  }

  /**
   * Get the string containing a packet dump.
   * @param {Buffer} buffer containing packet data
   */
  getPacketDump(buffer) {
    const lines = [];
    for (let i = 0; i < buffer.length; i += 8) {
      const address = i.toString().padStart(4, '0');
      const block = buffer.slice(i, i + 8);
      const hexDumpValues = [];
      const printableValues = [];
      for (const hexByte of block) {
        hexDumpValues.push(hexByte.toString(16).toUpperCase().padStart(2, '0'));
        if (hexByte > 0x20 && hexByte < 0x7f) {
          printableValues.push(String.fromCharCode(hexByte));
        } else {
          printableValues.push(".");
        }
      }
      while (hexDumpValues.length < 8) {
        hexDumpValues.push("  ");
        printableValues.push(" ");
      }
      const hexValuesBlock = hexDumpValues.join(" ");
      const printableBlock = printableValues.join("");
      lines.push(`${address} : ${hexValuesBlock} |${printableBlock}|`);
    }
    return lines.join("\n");
  }

  /**
   * Print the packet to the console.
   * @param {String} operation which was performed
   * @param {Buffer} buffer containing packet data
   */
  printPacket(operation, buffer) {
    const now = new Date();
    const formattedDate =
      `${now.getFullYear()}-${now.getMonth().toString().padStart(2, '0')}-` +
      `${now.getDay().toString().padStart(2, '0')} ` +
      `${now.getHours().toString().padStart(2, '0')}:` +
      `${now.getMinutes().toString().padStart(2, '0')}:` +
      `${now.getSeconds().toString().padStart(2, '0')}.` +
      `${now.getMilliseconds().toString().padStart(3, '0')}`;
    const packetDump = this.getPacketDump(buffer);
    console.log(`${formattedDate} ${operation}:\n${packetDump}\n`);
  }

  /**
   * Check for errors
   */
  checkErr() {
    if (!this.connected || this.err) {
      let err;
      if (this.savedErr) {
        err = errors.getErr(errors.ERR_CONNECTION_LOSTCONTACT,
          this.host, this.port,  this.atts.connectionId, this.savedErr.message);
      } else {
        err = errors.getErr(errors.ERR_CONNECTION_EOF, this.host, this.port, this.atts.connectionId,);
      }
      /* Wrap around NJS-500 */
      const newErr = errors.getErr(errors.ERR_CONNECTION_CLOSED);
      newErr.message = newErr.message + "\n" + err.message;
      throw (newErr);
    }
  }

  /**
   * Transport Send
   * @param {Buffer} buf Buffer to send
   * @returns Promise
   */
  send(buf) {
    this.checkErr();
    if (process.env.NODE_ORACLEDB_DEBUG_PACKETS)
      this.printPacket(`Sending packet ${this.packetNum} on stream ${this.streamNum}`, buf);
    const result = this.stream.write(buf, (err) => {
      if (err) {
        this.savedErr = err;
        this.err = true;
        this._notifyWaiters();
      }
    });
    if (!result) {
      this.needsDrain = true;
    }
    this.numPacketsSinceLastWait++;
    this.packetNum++;
  }

  /**
   * Should writing to the transport be paused? This occurs if draining is
   * required or if the number of packets written since the last pause exceeds
   * 100 (in order to avoid starvation of the event loop during large writes).
   */
  shouldPauseWrite() {
    return (this.needsDrain || this.numPacketsSinceLastWait >= 100);
  }

  /**
   * Perform a wait -- if draining is required, then until the drain event is
   * emitted or if draining is not required, then a simple setImmediate() that
   * ensures that the event loop is not starved.
   */
  async pauseWrite() {
    this.checkErr();
    if (this.needsDrain) {
      await new Promise((resolve) => {
        this.drainWaiter = resolve;
      });
      this.checkErr();
    } else {
      await new Promise((resolve) => Timers.setImmediate(resolve));
    }
    this.numPacketsSinceLastWait = 0;
  }

  /**
   * Start Async reads
   */
  startRead() {
    let tempBuf;
    this.packets = [];
    this.stream.on('data', (chunk) => {

      // append buffer if previous chunk(s) were insufficient for a full packet
      if (tempBuf) {
        tempBuf = Buffer.concat([tempBuf, chunk]);
      } else {
        tempBuf = chunk;
      }

      while (tempBuf.length >= PACKET_HEADER_SIZE) {

        // determine the length of the packet
        let len;
        if (this.largeSDU) {
          len = tempBuf.readUInt32BE();
        } else {
          len = tempBuf.readUInt16BE();
        }

        // not enough for a full packet so wait for more data to arrive
        if (len > tempBuf.length)
          break;

        // enough for a full packet, extract details from the packet header
        // and pass them along for processing
        const packet = {
          buf: tempBuf.subarray(0, len),
          type: tempBuf[4],
          flags: tempBuf[5],
          num: this.packetNum++
        };
        this.packets.push(packet);
        if (this.readWaiter) {
          this.readWaiter();
          this.readWaiter = null;
        }
        if (process.env.NODE_ORACLEDB_DEBUG_PACKETS)
          this.printPacket(`Receiving packet ${packet.num} on stream ${this.streamNum}`, packet.buf);

        // if the packet consumed all of the bytes (most common scenario), then
        // simply clear the temporary buffer; otherwise, retain whatever bytes
        // are unused and see if sufficient data is available for another
        // packet
        if (len === tempBuf.length) {
          tempBuf = null;
          break;
        } else {
          tempBuf = tempBuf.subarray(len);
        }

      }

    });
  }

  /**
   * Synchronous receive
   * @returns a single packet or undefined if no packets are available
   */
  syncReceive() {
    return this.packets.shift();
  }

  /**
   * Asynchronous receive
   * @returns a single packet
   */
  async receive() {
    if (this.packets.length === 0) {
      this.checkErr();
      await new Promise((resolve) => {
        this.readWaiter = resolve;
        this.numPacketsSinceLastWait = 0;
      });
      this.checkErr();
    }
    return this.packets.shift();
  }

  /**
   * TLS renegotiate
   * @returns Promise
   */
  async renegTLS() {
    let initTLSDone = false;
    this.checkErr();
    try {
      this.doDNMatch = true;
      const secureContext = tls.createSecureContext({
        cert: this.atts.wallet,
        key: this.atts.wallet,
        passphrase: this.atts.walletPassword,
        ca: this.atts.wallet,
      });
      initTLSDone = true;
      await this.tlsConnect(secureContext, this.connStream);
    } catch (err) {
      if (!initTLSDone)
        errors.throwErr(errors.ERR_TLS_INIT_FAILURE, err.message);
      else throw err;
    } finally {
      this.setupEventHandlers();
    }
  }

  /**
   * Setup handling of events
   */
  setupEventHandlers() {
    this.stream.removeAllListeners();

    this.stream.on('error', (err) => {
      this.savedErr = err;
      this.err = true;
      this._notifyWaiters();
    });

    this.stream.on('end', () => {
      this.err = true;
      this._notifyWaiters();
    });

    this.stream.on('close', () => {
      this.connected = false;
      this._notifyWaiters();
    });

    this.stream.on('drain', () => {
      this.needsDrain = false;
      if (this.drainWaiter) {
        this.drainWaiter();
        this.drainWaiter = null;
      }
    });

  }

  /**
   * Get Transport Attributes
   * @param {int} opcode type of attribute
   * @returns attribute value
   */
  getOption(opcode) {
    this.checkErr();
    switch (opcode) {
      case constants.NT_MOREDATA: /* More data available to read */
        return (this.packets.length > 0);
      case constants.REMOTEADDR: /* Remote Address */
      {
        const socket = this.secure ? this.connStream : this.stream;
        return (socket.remoteAddress + ":" + socket.remotePort);
      }
      default:
        errors.throwErr(errors.ERR_INTERNAL, "getOption not supported for opcode " + opcode);
    }
  }

  /**
   * Notify the waiters (drain and read) and reset them, if applicable.
   */
  _notifyWaiters() {
    if (this.drainWaiter) {
      this.drainWaiter();
      this.drainWaiter = null;
    }
    if (this.readWaiter) {
      this.readWaiter();
      this.readWaiter = null;
    }
  }

  /**
   * Generate SNI data.
   */
  generateSNI() {
    /* No SNI if source route is set */
    if ((findValue(this.atts.cDataNVPair, ["DESCRIPTION", "SOURCE_ROUTE"]) == "yes") ||
       (findValue(this.atts.cDataNVPair, ["DESCRIPTION", "ADDRESS_LIST", "SOURCE_ROUTE"]) == "yes"))
      return null;

    const cdnvp = findNVPair(this.atts.cDataNVPair, "CONNECT_DATA");
    /* Loop through the list of params */
    for (let i = 0; i < cdnvp.getListSize(); i++) {
      const child = cdnvp.getListElement(i);
      if (!sniAllowedCDParams.includes(child.name.toUpperCase()))
        return null; /* No SNI for unsupported Connect Data params */
    }

    /* Generate SNI */
    let value, sni = "";
    for (let i = 0; i < sniParams.length; i++) {
      if ((value = findValue(this.atts.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", sniParams[i]]))) {
        if (sniParams[i] == 'SERVER') /* For server type just pick the first letter */
          sni += sniMap[i] + "1" + "." + value[0] + ".";
        else
          sni += sniMap[i] + value.length + "." + value + ".";
      }
    }
    sni += "V3." + constants.TNS_VERSION_DESIRED; /* Version */

    const match_pattern = new RegExp("^[A-Za-z0-9._-]+$");
    if (!(sni.match(match_pattern)))
      return null; /* No SNI if special characters are present */

    if (sni.length > SNI_MAX_BYTES)
      return null; /* Max allowed length */

    return sni;
  }
}

module.exports = NTTCP;
