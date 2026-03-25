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
const errors = require('../../errors');

/**
 * Negotiates Compiletime and Runtime capabilities
 *
 */
class Capabilities {

  constructor(nscon) {
    this.protocolVersion = nscon.sAtts.version;
    this.ttcFieldVersion = constants.TNS_CCAP_FIELD_VERSION_MAX;
    this.supports12cLogon = true;
    this.supportsOob = false;
    this.nCharsetId = constants.TNS_CHARSET_UTF16;
    this.compileCaps = Buffer.alloc(constants.TNS_CCAP_MAX);
    this.runtimeCaps = Buffer.alloc(constants.TNS_RCAP_MAX);
    this.initCompileCaps(nscon);
    this.initRuntimeCaps();
    this.maxStringSize = 0;
  }

  adjustForServerCompileCaps(serverCaps, nscon) {
    if (serverCaps[constants.TNS_CCAP_FIELD_VERSION] < this.ttcFieldVersion) {
      this.ttcFieldVersion = serverCaps[constants.TNS_CCAP_FIELD_VERSION];
      this.compileCaps[constants.TNS_CCAP_FIELD_VERSION] =
        this.ttcFieldVersion;
    }
    if ((this.ttcFieldVersion < constants.TNS_CCAP_FIELD_VERSION_23_4
      && nscon.endOfRequestSupport)) {
      // endOfRequestSupport used only from 23.4 onwards and not for 23.3
      this.compileCaps[constants.TNS_CCAP_TTC4]
        ^= constants.TNS_CCAP_END_OF_REQUEST;
      nscon.endOfRequestSupport = false;
    }
  }

  adjustForServerRuntimeCaps(serverCaps) {
    if (serverCaps[constants.TNS_RCAP_TTC] & constants.TNS_RCAP_TTC_32K) {
      this.maxStringSize = 32767;
    } else {
      this.maxStringSize = 4000;
    }
  }

  initCompileCaps(nscon) {
    this.compileCaps[constants.TNS_CCAP_SQL_VERSION] =
      constants.TNS_CCAP_SQL_VERSION_MAX;
    this.compileCaps[constants.TNS_CCAP_LOGON_TYPES] =
      constants.TNS_CCAP_O5LOGON | constants.TNS_CCAP_O5LOGON_NP |
      constants.TNS_CCAP_O7LOGON | constants.TNS_CCAP_O8LOGON_LONG_IDENTIFIER |
      constants.TNS_CCAP_O9LOGON_LONG_PASSWORD;
    this.compileCaps[constants.TNS_CCAP_FIELD_VERSION] = this.ttcFieldVersion;
    this.compileCaps[constants.TNS_CCAP_SERVER_DEFINE_CONV] = 1;
    this.compileCaps[constants.TNS_CCAP_TTC1] =
      constants.TNS_CCAP_FAST_BVEC | constants.TNS_CCAP_END_OF_CALL_STATUS |
      constants.TNS_CCAP_IND_RCD;
    this.compileCaps[constants.TNS_CCAP_OCI1] =
      constants.TNS_CCAP_FAST_SESSION_PROPAGATE |
      constants.TNS_CCAP_APP_CTX_PIGGYBACK;
    this.compileCaps[constants.TNS_CCAP_TDS_VERSION] =
      constants.TNS_CCAP_TDS_VERSION_MAX;
    this.compileCaps[constants.TNS_CCAP_RPC_VERSION] =
      constants.TNS_CCAP_RPC_VERSION_MAX;
    this.compileCaps[constants.TNS_CCAP_RPC_SIG] =
      constants.TNS_CCAP_RPC_SIG_VALUE;
    this.compileCaps[constants.TNS_CCAP_DBF_VERSION] =
      constants.TNS_CCAP_DBF_VERSION_MAX;
    this.compileCaps[constants.TNS_CCAP_LOB] =
      constants.TNS_CCAP_LOB_UB8_SIZE | constants.TNS_CCAP_LOB_ENCS
      | constants.TNS_CCAP_LOB_PREFETCH | constants.TNS_CCAP_LOB_TEMP_SIZE
      | constants.TNS_CCAP_LOB_12C | constants.TNS_CCAP_LOB_PREFETCH_DATA;
    this.compileCaps[constants.TNS_CCAP_UB2_DTY] = 1;
    this.compileCaps[constants.TNS_CCAP_LOB2] =
      constants.TNS_CCAP_LOB2_QUASI | constants.TNS_CCAP_LOB2_2GB_PREFETCH;
    this.compileCaps[constants.TNS_CCAP_TTC3] =
      constants.TNS_CCAP_IMPLICIT_RESULTS | constants.TNS_CCAP_BIG_CHUNK_CLR |
      constants.TNS_CCAP_KEEP_OUT_ORDER | constants.TNS_CCAP_LTXID;
    this.compileCaps[constants.TNS_CCAP_OCI3] = constants.TNS_CCAP_OCI3_OCSSYNC;
    this.compileCaps[constants.TNS_CCAP_TTC2] = constants.TNS_CCAP_ZLNP;
    this.compileCaps[constants.TNS_CCAP_OCI2] = constants.TNS_CCAP_DRCP;
    this.compileCaps[constants.TNS_CCAP_CLIENT_FN] =
      constants.TNS_CCAP_CLIENT_FN_MAX;
    this.compileCaps[constants.TNS_CCAP_SESS_SIGNATURE_VERSION] =
      constants.TNS_CCAP_FIELD_VERSION_12_2;
    this.compileCaps[constants.TNS_CCAP_TTC4] =
      constants.TNS_CCAP_INBAND_NOTIFICATION;
    if (nscon.endOfRequestSupport) {
      this.compileCaps[constants.TNS_CCAP_TTC4] |= constants.TNS_CCAP_END_OF_REQUEST;
    }
    this.compileCaps[constants.TNS_CCAP_CTB_FEATURE_BACKPORT] =
      constants.TNS_CCAP_CTB_IMPLICIT_POOL;
    this.compileCaps[constants.TNS_CCAP_TTC5] =
      constants.TNS_CCAP_VECTOR_SUPPORT |
      constants.TNS_CCAP_TTC5_SESSIONLESS_TXNS;
    this.compileCaps[constants.TNS_CCAP_VECTOR_FEATURES] =
      constants.TNS_CCAP_VECTOR_FEATURE_BINARY | constants.TNS_CCAP_VECTOR_FEATURE_SPARSE;
  }

  initRuntimeCaps() {
    this.runtimeCaps[constants.TNS_RCAP_COMPAT] = constants.TNS_RCAP_COMPAT_81;
    this.runtimeCaps[constants.TNS_RCAP_TTC] =
      constants.TNS_RCAP_TTC_ZERO_COPY | constants.TNS_RCAP_TTC_32K;
  }

  checkNCharsetId() {
    if (this.nCharsetId !== constants.TNS_CHARSET_UTF16) {
      errors.throwErr(errors.ERR_NCHAR_CS_NOT_SUPPORTED, this.nCharsetId);
    }
  }

}

module.exports = Capabilities;
