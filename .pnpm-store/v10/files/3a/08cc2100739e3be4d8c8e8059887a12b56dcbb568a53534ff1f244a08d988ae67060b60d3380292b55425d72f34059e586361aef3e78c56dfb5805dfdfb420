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

const errors = require("../../errors.js");
const constants = require("./constants.js");

const AUTHENTICATION = 1;
const ENCRYPTION = 2;
const DATAINTEGRITY = 3;
const SUPERVISOR = 4;

const MAGIC = 0xdeadbeef;

const NO_ERROR = 0;
const SUPERVISOR_OK = 0x1f;
const AUTHENTICATION_OK = 0xfaff;
const AUTHENTICATION_DONT_USE_AUTH = 0xfbff;

const HEADER_SIZE = 4 + 2 + 4 + 2 + 1; /* magic + length + version + services + flag */
const SERVICE_HEADER_SIZE = 2 + 2 + 4; /* service type + no of subpackets + error */
const ARRAY_PACKET_SIZE = 4 + 2 + 4;  /* magic + ub2 + ub4 */
const SUBPACKET_SIZE = 4;

const VERSION_LENGTH = 4;
const VERSION = 0x17700000 ; /* Version 23.7.0.0.0 */

const STRING_TYPE = 0;
const RAW_TYPE = 1;
const UB1_TYPE = 2;
const UB2_TYPE = 3;
const VERSION_TYPE = 5;
const STATUS_TYPE  = 6;

const CID_SIZE = 8;

const CLIENT_SERVER = 0xe0e1; /* cli/svr connection */
const AUTH_NOT_REQUIRED = 0xfcff; /* Auth. not required */
const AUTH_TCPS_ID = 2;
const AUTH_TCPS_NAME = "tcps";

const serviceMap = [-1, 0, 1, 2, 3];

class NetworkService {

  constructor(sAtts) {
    this.flags = constants.NSINAWANTED;
    this.sAtts = sAtts;
  }

  getDataSize() {
    return SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH + SUBPACKET_SIZE;
  }

  sendHeader(buf, pos) {
    pos = buf.writeUInt16BE(this.service, pos);
    pos = buf.writeUInt16BE(this.numSubPackets, pos);
    pos = buf.writeUInt32BE(0, pos);
    return pos;
  }

  sendVersion(buf, pos) {
    pos = buf.writeUInt16BE(4, pos);
    pos = buf.writeUInt16BE(VERSION_TYPE, pos);
    pos = buf.writeUInt32BE(VERSION, pos);
    return pos;
  }

  sendRaw(buf, rawData, length, pos) {
    pos = buf.writeUInt16BE(length, pos);
    pos = buf.writeUInt16BE(RAW_TYPE, pos);
    pos += rawData.copy(buf, pos, 0, length);
    return pos;
  }

  sendArray(buf, array, pos) {
    pos = buf.writeUInt16BE(ARRAY_PACKET_SIZE + array.length * 2, pos);
    pos = buf.writeUInt16BE(RAW_TYPE, pos);
    pos = buf.writeUInt32BE(MAGIC, pos);
    pos = buf.writeUInt16BE(UB2_TYPE, pos);
    pos = buf.writeUInt32BE(array.length, pos);
    for (let i = 0; i < array.length; i++) {
      pos = buf.writeUInt16BE(array[i], pos);
    }
    return pos;
  }

  sendStatus(buf, status, pos) {
    pos = buf.writeUInt16BE(2, pos);
    pos = buf.writeUInt16BE(STATUS_TYPE, pos);
    pos = buf.writeUInt16BE(status, pos);
    return pos;
  }

  sendString(buf, string, pos) {
    pos = buf.writeUInt16BE(string.length, pos);
    pos = buf.writeUInt16BE(STRING_TYPE, pos);
    pos += buf.write(string, pos);
    return pos;
  }

  sendUB1(buf, data, pos) {
    pos = buf.writeUInt16BE(1, pos);
    pos = buf.writeUInt16BE(UB1_TYPE, pos);
    pos = buf.writeUInt8(data, pos);
    return pos;
  }

  sendUB2(buf, data, pos) {
    pos = buf.writeUInt16BE(2, pos);
    pos = buf.writeUInt16BE(UB2_TYPE, pos);
    pos = buf.writeUInt16BE(data, pos);
    return pos;
  }

  static receiveHeader(pkt, ret, pos) {
    ret[0] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[1] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[2] = pkt.readUInt32BE(pos);
    pos += 4;

    return pos;
  }

  receiveType(pkt, type, ret, pos) {
    const len = pkt.readUInt16BE(pos);
    pos += 2;
    const receivedType = pkt.readUInt16BE(pos);
    pos += 2;

    if (receivedType != type) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }

    let version, status;
    switch (type) {
      case VERSION_TYPE:
        version = pkt.readUInt32BE(pos);
        pos += 4;
        ret[0] = version;
        return pos;
      case STATUS_TYPE:
        status = pkt.readUInt16BE(pos);
        pos += 2;
        ret[0] = status;
        return pos;
      case RAW_TYPE:
        ret[0] = len;
        return pos;
      case STRING_TYPE:
        ret[0] = len;
        return pos;
    }
  }

  receiveUB2Array(pkt, ret, pos) {
    const ret1 = [];
    pos = this.receiveType(pkt, RAW_TYPE, ret1, pos);

    if (pkt.readUInt32BE(pos) != MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 4;

    const type = pkt.readUInt16BE(pos);
    pos += 2;

    if (type != UB2_TYPE) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }

    const arrayLen = pkt.readUInt32BE(pos);
    pos += 4;

    for (let i = 0; i < arrayLen; i++) {
      ret[i] = pkt.readUInt16BE(pos);
      pos += 2;
    }

    return pos;
  }

  receiveString(pkt, ret, pos) {
    const ret1 = [];
    pos = this.receiveType(pkt, STRING_TYPE, ret1, pos);
    const string = pkt.toString('utf8', pos, pos + ret1[0]);
    pos += ret1[0];
    ret[0] = string;
    return pos;
  }

  receiveServiceData(pkt, numSubPakcets, pos) {
    const ret = [];
    ret[0] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[1] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[2] = pkt.readUInt32BE(pos);
    pos += 4;
    ret[3] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[4] = pkt.readUInt16BE(pos);
    pos += 2;
    ret [5] = pkt.readUInt8(pos);
    pos += 1;

    return pos;
  }
}

class SupervisorService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = SUPERVISOR;
    this.serviceList = [AUTHENTICATION, ENCRYPTION, DATAINTEGRITY, SUPERVISOR];
    this.numSubPackets = 3; /* version, raw, services array */
  }

  getDataSize() {
    return SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + CID_SIZE + SUBPACKET_SIZE +
            ARRAY_PACKET_SIZE + this.serviceList.length * 2;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    pos = this.sendRaw(buf, Buffer.from(this.sAtts.uuid, "base64"), 8, pos);
    pos = this.sendArray(buf, this.serviceList, pos);
    return pos;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    const serverServices = [], version = [], status = [];
    pos = this.receiveType(pkt, VERSION_TYPE, version, pos);
    pos = this.receiveType(pkt, STATUS_TYPE, status, pos);
    if (status[0] != SUPERVISOR_OK) {
      errors.throwErr(errors.ERR_ANO_STATUS, "Supervisor");
    }
    pos = this.receiveUB2Array(pkt, serverServices, pos);
    return pos;
  }
}

class AuthenticationService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = AUTHENTICATION;
    this.status = AUTH_NOT_REQUIRED;
    this.numSubPackets = 3 + 1 * 2; /* We support only tcps */
    this.serviceList = [AUTH_TCPS_NAME];
    this.authActivated = false;
  }

  getDataSize() {
    let len =  SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + 2 + SUBPACKET_SIZE + 2;

    for (let i = 0; i < this.serviceList.length; i++) {
      len += SUBPACKET_SIZE + 1;
      len += SUBPACKET_SIZE + this.serviceList[i].length;
    }
    return len;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    pos = this.sendUB2(buf, CLIENT_SERVER, pos);
    pos = this.sendStatus(buf, this.status, pos);

    /* send Auth drivers - we support only tcps */
    pos = this.sendUB1(buf, AUTH_TCPS_ID, pos);
    pos = this.sendString(buf, AUTH_TCPS_NAME, pos);
    return pos;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    const version = [], status = [], service = [];

    pos = this.receiveType(pkt, VERSION_TYPE, version, pos);
    pos = this.receiveType(pkt, STATUS_TYPE, status, pos);

    if (status[0] == AUTHENTICATION_OK && numSubPackets > 2) {
      pos += 5;
      pos = this.receiveString(pkt, service, pos);
      this.authActivated = true;
    } else if (status[0] == AUTHENTICATION_DONT_USE_AUTH) {
      this.authActivated = false;
    } else {
      errors.throwErr(errors.ERR_ANO_STATUS, "Authentication");
    }
    return pos;
  }
}

class EncryptionService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = ENCRYPTION;
    this.numSubPackets = 2;
  }

  getDataSize() {
    return  SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + 1;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    const drivers = Buffer.from([0x00]); /* No encryption drivers supported */
    pos = this.sendRaw(buf, drivers, 1, pos);
    return pos;
  }
}

class DataIntegrityService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = DATAINTEGRITY;
    this.numSubPackets = 2;
  }

  getDataSize() {
    return   SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + 1;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    const drivers = Buffer.from([0x00]); /* No data integrity drivers supported */
    pos = this.sendRaw(buf, drivers, 1, pos);
    return pos;
  }
}

/* Advanced Networking Options */
class ANO {

  constructor(sAtts) {
    this.serviceList = [new AuthenticationService(sAtts), new EncryptionService(sAtts),
      new DataIntegrityService(sAtts), new SupervisorService(sAtts)];
  }

  sendPacket() {
    let bufSize = HEADER_SIZE;
    for (let i = 0; i < this.serviceList.length; i++) {
      bufSize += this.serviceList[i].getDataSize();
    }
    const buf = Buffer.allocUnsafe(bufSize).fill(0);
    let pos = buf.writeUInt32BE(MAGIC);
    pos = buf.writeUInt16BE(bufSize, pos);
    pos = buf.writeUInt32BE(VERSION, pos);
    pos = buf.writeUInt16BE(this.serviceList.length, pos);
    pos = buf.writeUInt8(0, pos);

    /* Send in order of Supervisor, Auth, Encryption, Data Integrity */
    pos = this.serviceList[3].sendServiceData(buf, pos);
    pos = this.serviceList[0].sendServiceData(buf, pos);
    pos = this.serviceList[1].sendServiceData(buf, pos);
    this.serviceList[2].sendServiceData(buf, pos);

    return buf;
  }

  processPacket(pkt) {
    let pos = 10;
    if (pkt.readUInt32BE(pos) != MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 4;
    //const pktLen = pkt.readUInt16BE(pos);
    pos += 2;
    //const version = pkt.readUInt32BE(pos);
    pos += 4;
    const services = pkt.readUInt16BE(pos);
    pos += 2;
    //const error = pkt.readUInt8(pos);
    pos += 1;

    /* Receive service headers */
    const ret = [];
    for (let i = 0; i < services; i++) {
      pos = NetworkService.receiveHeader(pkt, ret, pos);

      if (ret[2] != NO_ERROR) {
        errors.throwErrWithORAError(errors.ERR_ANO_NEGOTIATION, ret[2]);
      }
      const serviceId = serviceMap[ret[0]];

      pos = this.serviceList[serviceId].receiveServiceData(pkt, ret[1], pos);

    }
  }
}

function getFlags(protocol, userConfig) {

  /* Do the NA negotiation only if external Auth and tpcs Authentication service is requested for a tcps connection */
  if (protocol.toUpperCase() == 'TCPS' && userConfig.externalAuth && !userConfig.token)
    return constants.NSINAWANTED;
  else
    return constants.NSINANOSERVICES;
}

module.exports = { ANO, getFlags};
