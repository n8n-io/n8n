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

const constants = require('../constants');
const errors = require('../errors.js');
const os = require('os');
const nodbUtil = require('../util.js');

//---------------------------------------------------------------------------
// populateClientInfo()
//
// Populates client process information
//---------------------------------------------------------------------------
function populateClientInfo() {
  this.program = nodbUtil.sanitize(process.argv0);
  this.terminal = "unknown";
  this.pid = process.pid.toString();
  try {
    this.userName = nodbUtil.sanitize(os.userInfo().username);
  } catch {
    this.userName = "unknown";
  }
  this.hostName = nodbUtil.sanitize(os.hostname());
}
// Initialize client data on startup.
const CLIENT_INFO = new populateClientInfo();

//---------------------------------------------------------------------------
// getMetadataMany(sql)
//
// Get metadata info for all the columns in the table
//---------------------------------------------------------------------------
function getMetadataMany(vars) {
  const metadata = [];
  for (const queryVar of vars) {
    metadata.push(queryVar.fetchInfo);
  }
  return metadata;
}

//---------------------------------------------------------------------------
// getOutBindValues(sql)
//
// Return the values for the out binds at the given position (row).
//---------------------------------------------------------------------------
function getOutBindValues(bindVars, pos) {
  const bindByPos = (bindVars[0].name === undefined);
  const outBindValues = (bindByPos) ? [] : {};
  for (let i = 0; i < bindVars.length; i++) {
    if (bindByPos) {
      outBindValues.push(bindVars[i].values[pos]);
    } else {
      outBindValues[bindVars[i].name] = bindVars[i].values[pos];
    }
  }
  return outBindValues;
}

//---------------------------------------------------------------------------
// getOutBinds()
//
// Return the out binds for the given statement.
//---------------------------------------------------------------------------
function getOutBinds(statement, numIters, executeManyFlag) {
  const bindVars = statement.bindInfoList.map(i => i.bindVar);
  const outBinds = bindVars.filter(v => v.dir !== constants.BIND_IN);
  if (outBinds.length > 0) {
    if (executeManyFlag) {
      const outBindValues = new Array(numIters);
      for (let i = 0; i < numIters; i++) {
        outBindValues[i] = getOutBindValues(outBinds, i);
      }
      return outBindValues;
    }
    return getOutBindValues(outBinds, 0);
  }
}

//---------------------------------------------------------------------------
// checkProxyUserValidity()
//
// Check validity status for proxy authentication
//---------------------------------------------------------------------------
function checkProxyUserValidity(userName) {
  let schemaUser = '', proxyUser = '';
  let quoteFound = false, openSquareBracketFound = false;
  let lastQuoteFoundIndex = 0;
  const result = {
    status: -1,
    proxyUser: '',
    schemaUser: ''
  };
  const userNameLength = userName.length;
  let index = 0, i, j;
  while (index < userNameLength) {
    // check for double quotes
    if (userName.charAt(index) === '"') {
      quoteFound = !quoteFound;
      lastQuoteFoundIndex = index;
    }

    // check for open square bracket
    if (userName.charAt(index) === '[' && !quoteFound) {
      openSquareBracketFound = true;
      // skip leading space and extract proxy user name
      if (lastQuoteFoundIndex != 0) {
        for (i = lastQuoteFoundIndex + 1; i < index; i++) {
          if (userName.charAt(i) !== ' ') {
            return result;
          }
        }

        for (i = 0; i <= lastQuoteFoundIndex; i++) {
          proxyUser += userName.charAt(i);
        }
      } else {
        for (i = 0; i < index; i++) {
          if (userName.charAt(i) !== ' ') {
            proxyUser += userName.charAt(i);
          } else {
            break;
          }
        }
      }
      break;
    }
    index++;
  }

  if (proxyUser.length != 0) {
    result.proxyUser = proxyUser;
  }

  // extract schema user
  index = index + 1;
  quoteFound = false;
  const schemaUserStartIndex = index;
  lastQuoteFoundIndex = 0;
  while (index < userNameLength) {
    // check for double quotes
    if (userName.charAt(index) === '"') {
      quoteFound = !quoteFound;
      lastQuoteFoundIndex = index;
    }

    if (userName.charAt(index) === '[' && !quoteFound &&
        openSquareBracketFound) {
      return result;
    }

    if (userName.charAt(index) === ']' && !quoteFound) {
      if (lastQuoteFoundIndex != schemaUserStartIndex &&
          lastQuoteFoundIndex != 0) {
        for (i = schemaUserStartIndex; i <= lastQuoteFoundIndex; i++) {
          schemaUser += userName.charAt(i);
        }
        // check for character between double quotes and close brackets
        for (i = lastQuoteFoundIndex + 1; i < index; i++) {
          if (userName.charAt(i) != ' ') {
            return result;
          }
        }
      } else {
        // skip trailing spaces
        for (i = schemaUserStartIndex; i < index; i++) {
          if (userName.charAt(i) != ' ') {
            break;
          }
        }
        if (i == index) {
          return result;
        }

        for (j = i; j < index; j++) {
          schemaUser += userName[j];
        }
      }

      // check for character from [ till end of string
      for (i = index + 1; i < userNameLength; i++) {
        if (userName[i] != ' ') {
          return result;
        }
      }
    }
    index++;
  }

  if (schemaUser.length === 0) {
    return result;
  } else {
    result.schemaUser = schemaUser;
  }

  result.status = 0;
  return result;
}

//---------------------------------------------------------------------------
// checkCredentials()
//
// Check Credentials for Password Authentication
//---------------------------------------------------------------------------
function checkCredentials(params) {
  if (params.externalAuth === false) {
    if (params.password === undefined) {
      errors.throwErr(errors.ERR_MISSING_CREDENTIALS);
    }
  }
}

//---------------------------------------------------------------------------
// normalizePrivateKey()
//
// Add header and footer to private key
//---------------------------------------------------------------------------
function normalizePrivateKey(privateKey) {
  return '-----BEGIN PRIVATE KEY-----\n' + privateKey +
  '\n' + '-----END PRIVATE KEY-----';
}

module.exports = {
  getMetadataMany,
  CLIENT_INFO,
  getOutBinds,
  checkProxyUserValidity,
  checkCredentials,
  normalizePrivateKey,
};
