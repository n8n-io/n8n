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
const constants = require("../constants.js");
const errors = require("../../../errors.js");
const process = require("process");
const ED = require("../encryptDecrypt.js");
const Message = require("./base.js");
const util = require("../../util.js");
const cInfo = util.CLIENT_INFO;
const crypto = require('crypto');

/**
 * Executes OSESSKEY and OAUTH RPC functions
 *
 * @class AuthMessage
 * @extends {Message}
 */
class AuthMessage extends Message {
  /**
   * Represents the data required for OAUTH and OSESSKEY rpc.
   *
   * @param {object} conn Connection object
   * @param {object} config Dynamic Configuration like change password config after connection is established
   */
  constructor(conn, config) {
    super(conn);
    this.functionCode = constants.TNS_FUNC_AUTH_PHASE_ONE;
    this.messageType = constants.TNS_MSG_TYPE_FUNCTION;
    this.sessionData = {};
    this.conn = conn;
    this.sessionKey = "";
    this.encodedPassword = "";
    this.changePassword = false;
    Object.defineProperty(this, 'password', {
      enumerable: false,
      value: config.password,
    });
    this.username = config.user;
    if (this.username === undefined) {
      this.username = "";
    } else {
      // trim leading and trailing spaces
      this.username = this.username.trim();
    }
    this.schemaUser = '';
    this.proxyUser = '';
    this.proxyStatus = -1;
    if (this.username.length !== 0) {
      this.proxyStatusObj = util.checkProxyUserValidity(this.username);
      if (this.proxyStatusObj.status === 0) {
        this.proxyStatus = 0;
        this.proxyUser = this.proxyStatusObj.proxyUser;
        this.schemaUser = this.proxyStatusObj.schemaUser;
        this.username = this.proxyUser;
      }
    }
    this.newPassword = config.newPassword;
    if (config.changePassword) {
      // ChangePassword issued after login would use the same comboKey
      // used in initial Login. We issue only OAUTH.
      this.changePassword = true;
      this.functionCode = constants.TNS_FUNC_AUTH_PHASE_TWO;
    }
    if (this.username) {
      this.userByteLen = Buffer.byteLength(this.username); // Get utf8 encoded number of bytes
    } else {
      this.userByteLen = 0;
    }
    this.token = config.token;
    if (config.externalAuth) {
      this.functionCode = constants.TNS_FUNC_AUTH_PHASE_TWO;
      this.externalAuth = true;
    }
    this.privateKey = config.privateKey;
    if (this.privateKey) {
      this.privateKey = util.normalizePrivateKey(this.privateKey);
    }
    this.serviceName = this.conn.serviceName;
    this.remoteAddress = this.conn.remoteAddress;
    this.driverName = config.driverName;
    this.machine = config.machine;
    this.osUser = config.osUser;
    this.program = config.program;
    this.terminal = config.terminal;
    if (config.edition) {
      this.edition = config.edition;
    } else if (process.env.ORA_EDITION) {
      this.edition = process.env.ORA_EDITION;
    }
    this.appContext = config.appContext;
    this.setAuthMode(config);
  }

  setAuthMode(config) {
    if (!this.newPassword) {
      this.authMode = constants.TNS_AUTH_MODE_LOGON;
    }
    if (config.privilege & constants.SYSDBA) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSDBA;
    }
    if (config.privilege & constants.SYSOPER) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSOPER;
    }
    if (config.privilege & constants.SYSASM) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSASM;
    }
    if (config.privilege & constants.SYSBKP) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSBKP;
    }
    if (config.privilege & constants.SYSDG) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSDGD;
    }
    if (config.privilege & constants.SYSKM) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSKMT;
    }
    if (config.privilege & constants.SYSRAC) {
      this.authMode |= constants.TNS_AUTH_MODE_SYSRAC;
    }
    if (this.privateKey) {
      this.authMode |= constants.TNS_AUTH_MODE_IAM_TOKEN;
    }
    if (this.newPassword) {
      this.authMode |= constants.TNS_AUTH_MODE_CHANGE_PASSWORD;
    }
    if (!config.externalAuth) {
      this.authMode |= constants.TNS_AUTH_MODE_WITH_PASSWORD;
    }
  }

  getAlterTimezoneStatement() {
    let sign, tzRepr;
    if (process.env.ORA_SDTZ) {
      tzRepr = process.env.ORA_SDTZ;
    } else {
      const date = new Date();
      const timezoneMinutes = date.getTimezoneOffset();
      let tzHour = Math.trunc(timezoneMinutes / 60);
      const tzMinutes = Math.abs((timezoneMinutes - tzHour * 60) % 60);
      if (tzHour < 0) {
        sign = '+';  // getTimezoneOffset() = localtime - timeUTC
        tzHour = -tzHour;
      } else {
        sign = '-';
      }
      tzHour = tzHour.toLocaleString('en-US', {minimumIntegerDigits: 2});
      tzRepr = `${sign}${tzHour}:${tzMinutes}`;
    }
    return `ALTER SESSION SET TIME_ZONE ='${tzRepr}'\x00`;
  }

  encode(buf) {
    let verifier11G = false;
    this.writeFunctionHeader(buf);
    if (this.userByteLen > 0) {
      buf.writeUInt8(1);
    } else {
      buf.writeUInt8(0);
    }
    buf.writeUB4(this.userByteLen);
    buf.writeUB4(this.authMode);

    if (this.functionCode === constants.TNS_FUNC_AUTH_PHASE_ONE) {
      buf.writeUInt8(1);
      buf.writeUB4(5);
      buf.writeUInt8(0);
      buf.writeUInt8(1);
      if (this.userByteLen > 0) {
        buf.writeBytesWithLength(Buffer.from(this.username));
      }
      buf.writeKeyValue("AUTH_TERMINAL", this.terminal ?? cInfo.terminal);
      buf.writeKeyValue("AUTH_PROGRAM_NM", this.program ?? cInfo.program);
      buf.writeKeyValue("AUTH_MACHINE", this.machine ?? cInfo.hostName);
      buf.writeKeyValue("AUTH_PID", cInfo.pid);
      buf.writeKeyValue("AUTH_SID", this.osUser ?? cInfo.userName);
    } else {
      let numPairs = 0;

      if (this.changePassword) {
        ED.updatePasswordsWithComboKey(this.password, this.newPassword, this.conn.comboKey, this);
        numPairs = 2;
      } else {
        numPairs = 4;
        if (this.externalAuth) {
          numPairs += 5;
          if (this.token)
            numPairs += 1;
        } else {
          numPairs += 2;
          if (this.verifierType === constants.TNS_VERIFIER_TYPE_11G_1 ||
          this.verifierType === constants.TNS_VERIFIER_TYPE_11G_2) {
            verifier11G = true;
          } else if (this.verifierType !== constants.TNS_VERIFIER_TYPE_12C) {
            errors.throwErr(errors.ERR_UNSUPPORTED_VERIFIER_TYPE,
              this.verifierType.toString(16));
          } else {
            numPairs += 1;
          }
          ED.updateVerifierData(this.sessionData, this.password, this.newPassword, verifier11G, this);

          // The comboKey is cached inside the conn which is used
          // for changePassword issued on the connection
          this.conn.comboKey = this.comboKey;
          if (this.newPassword) {
            numPairs += 1;
          }
        }

        if (this.privateKey) {
          numPairs += 2;
        }
        if (this.conn.connectionClass) {
          numPairs += 1;
        }
        if (this.conn.purity) {
          numPairs += 1;
        }
        if (this.conn.jdwpData) {
          this.encryptedJDWPData = ED.getEncryptedJSWPData(this.sessionKey, this.conn.jdwpData);
          numPairs += 1;
        }
        if (this.edition) {
          numPairs += 1;
        }
        if (this.appContext) {
          numPairs += this.appContext.length * 3;
        }
        if (this.schemaUser.length !== 0) {
          numPairs += 1;
        }
      }

      buf.writeUInt8(1);
      buf.writeUB4(numPairs);
      buf.writeUInt8(1);
      buf.writeUInt8(1);
      if (this.userByteLen > 0)
        buf.writeBytesWithLength(Buffer.from(this.username));
      if (this.externalAuth) {
        buf.writeKeyValue("AUTH_TERMINAL", this.terminal ?? cInfo.terminal);
        buf.writeKeyValue("AUTH_PROGRAM_NM", this.program ?? cInfo.program);
        buf.writeKeyValue("AUTH_MACHINE", this.machine ?? cInfo.hostName);
        buf.writeKeyValue("AUTH_PID", cInfo.pid);
        buf.writeKeyValue("AUTH_SID", this.osUser ?? cInfo.userName);
      }
      if (this.token) {
        buf.writeKeyValue("AUTH_TOKEN", this.token);
      } else {
        if (!this.changePassword && !this.externalAuth) {
          buf.writeKeyValue("AUTH_SESSKEY", this.sessionKey, 1);
          if (!verifier11G) {
            buf.writeKeyValue("AUTH_PBKDF2_SPEEDY_KEY", this.speedyKey);
          }
        }
      }
      if (!this.changePassword) {
        buf.writeKeyValue("SESSION_CLIENT_CHARSET", "873");
        buf.writeKeyValue("SESSION_CLIENT_DRIVER_NAME",
          this.driverName ?? constants.DRIVER_NAME);
        buf.writeKeyValue("SESSION_CLIENT_VERSION",
          constants.CLIENT_VERSION.toString());
        buf.writeKeyValue("AUTH_ALTER_SESSION", this.getAlterTimezoneStatement(), 1);
      }
      if (this.encodedPassword) {
        buf.writeKeyValue("AUTH_PASSWORD", this.encodedPassword);
      }
      if (this.proxyStatus === 0) {
        buf.writeKeyValue("PROXY_CLIENT_NAME", this.schemaUser);
      }
      if (this.encodedNewPassword) {
        buf.writeKeyValue("AUTH_NEWPASSWORD", this.encodedNewPassword);
      }
      if (this.conn.connectionClass) {
        buf.writeKeyValue("AUTH_KPPL_CONN_CLASS", this.conn.connectionClass);
      }
      if (this.conn.purity) {
        buf.writeKeyValue("AUTH_KPPL_PURITY", '' + this.conn.purity);
      }
      if (this.privateKey) {
        const currentDate = new Date();
        const currentDateFormatted = currentDate.toGMTString();

        const header = "date: " + currentDateFormatted + "\n" +
          "(request-target): " + this.serviceName  + "\n" +
          "host: " + this.remoteAddress;

        const signature = crypto.createSign('RSA-SHA256')
          .update(header)
          .sign(this.privateKey, 'base64');

        buf.writeKeyValue("AUTH_HEADER", header);
        buf.writeKeyValue("AUTH_SIGNATURE", signature);
      }
      if (this.conn.jdwpData) {
        buf.writeKeyValue("AUTH_ORA_DEBUG_JDWP", this.encryptedJDWPData);
      }
      if (this.edition) {
        buf.writeKeyValue("AUTH_ORA_EDITION", this.edition);
      }
      if (this.appContext) {
        // NOTE: these keys require a trailing null character as the server
        // expects it!
        for (const entry of this.appContext) {
          buf.writeKeyValue("AUTH_APPCTX_NSPACE\0", entry[0]);
          buf.writeKeyValue("AUTH_APPCTX_ATTR\0", entry[1]);
          buf.writeKeyValue("AUTH_APPCTX_VALUE\0", entry[2]);
        }
      }

    }
  }

  processReturnParameter(buf) {
    const numParams = buf.readUB2();
    for (let i = 0; i < numParams;i++) {
      buf.skipUB4();
      const key = buf.readStr(constants.CSFRM_IMPLICIT);
      let value = "";
      const numBytes = buf.readUB4();
      if (numBytes > 0) {
        value = buf.readStr(constants.CSFRM_IMPLICIT);
      }
      const flag = buf.readUB4();
      if (key === "AUTH_VFR_DATA") {
        this.verifierType = flag;
      }
      this.sessionData[key] = value;

    }
    if (this.functionCode === constants.TNS_FUNC_AUTH_PHASE_ONE) {
      this.functionCode = constants.TNS_FUNC_AUTH_PHASE_TWO;
    } else {
      let releaseNum;
      let updateNum;
      let portReleaseNum;
      let portUpdateNum;

      this.conn.dbDomain = this.sessionData['AUTH_SC_DB_DOMAIN'];
      this.conn.dbName = this.sessionData['AUTH_DBNAME'];
      this.conn.maxOpenCursors = Number(this.sessionData['AUTH_MAX_OPEN_CURSORS'] || 0);
      this.conn.serviceName = this.sessionData['AUTH_SC_SERVICE_NAME'];
      this.conn.instanceName = this.sessionData['AUTH_INSTANCENAME'];
      this.conn.maxIdentifierLength = Number(this.sessionData['AUTH_MAX_IDEN_LENGTH'] || 30);
      const fullVersionNum = Number(this.sessionData['AUTH_VERSION_NO']);
      const versionNum = (fullVersionNum >> 24) & 0xFF;
      this.conn.warning = this.warning;
      if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_18_1_EXT_1) {
        releaseNum = (fullVersionNum >> 16) & 0xFF;
        updateNum = (fullVersionNum >> 12) & 0x0F;
        portReleaseNum = (fullVersionNum >> 4) & 0xFF;
        portUpdateNum = fullVersionNum & 0x0F;
      } else {
        releaseNum = (fullVersionNum >> 20) & 0x0F;
        updateNum = (fullVersionNum >> 12) & 0xFF;
        portReleaseNum = (fullVersionNum >> 8) & 0x0F;
        portUpdateNum = fullVersionNum & 0xFF;
      }
      this.conn.serverVersionString = versionNum + '.' + releaseNum + '.' + updateNum + '.' + portReleaseNum + '.' + portUpdateNum;
      this.conn.serverVersion = versionNum * 100000000 + releaseNum * 1000000 + updateNum * 10000 + portReleaseNum * 100 + portUpdateNum * 1;
    }
  }

}

module.exports = AuthMessage;
