/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   install.js
 *
 * DESCRIPTION
 *   This script is included in the npm bundle of node-oracledb.  It
 *   is invoked by package.json during npm install to check the viability
 *   of the installation.
 *
 * MAINTENANCE NOTES
 *   This file should only ever 'require' packages included in core Node.js
 *   or that are part of node-oracledb.
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const nodbUtil = require('../lib/util.js');
const errors = require('../lib/errors.js');
const constants = require('../lib/constants.js');

let installUrl = constants.DEFAULT_ERROR_URL;
let arch;
let thickModeErrMsg;

// Log standard output with an 'oracledb' prefix
function log(message) { // eslint-disable-line
  const args = Array.from(arguments);
  args.unshift('oracledb');
  console.log.apply(console, args);
}

// Log errors. It combines 'oracledb' with a stylized 'ERR' prefix
function error(message) { // eslint-disable-line
  const args = Array.from(arguments);
  args.unshift('oracledb \x1b[31mERR!\x1b[0m');
  console.error.apply(console, args);
}

// Log warnings. It combines 'oracledb' with a stylized 'WARN' prefix
function warn(message) { // eslint-disable-line
  const args = Array.from(arguments);
  args.unshift('oracledb \x1b[31mWARN!\x1b[0m');
  console.error.apply(console, args);
}

// This version of node-oracledb works with Node.js 14.17 or later.
// Note: the checked version is the minimum required for Node-API
// compatibility.  When new Node.js versions are released, older Node.js
// versions are dropped from the node-oracledb test plan.
//
// Keep this code in sync with lib/oracledb.js
function checkVersion() {
  const vs = process.version.substring(1).split(".").map(Number);
  errors.assert(vs[0] > 14 || (vs[0] === 14 && vs[1] >= 17),
    errors.ERR_NODE_TOO_OLD, nodbUtil.PACKAGE_JSON_VERSION, "14.17");
}

// Check for the binary node-oracledb module needed for "Thick mode".
// If one isn't available, only Thin mode can be used.
function checkThickMode() {
  try {
    fs.statSync(nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE);
  } catch (err) {
    errors.throwErr(errors.ERR_NO_BINARY_AVAILABLE, process.platform + ' ' + process.arch);
  }
}

try {
  checkVersion();
} catch (err) {
  // This version of Node.js is too old
  error(err.message);
  error('An older node-oracledb version may work with Node.js ' + process.version);
  process.exit(87);
}

try {
  checkThickMode();
} catch (err) {
  // No Thick mode binary was found for this platform
  thickModeErrMsg = err.message;
}

// Successfully installed

if (process.arch === 'x64' || process.arch === 'arm64') {
  arch = '64-bit';
} else {
  arch = '32-bit';
}

if (process.platform === 'linux') {
  installUrl += '#node-oracledb-installation-on-linux';
} else if (process.platform === 'darwin') {
  installUrl += '#node-oracledb-installation-on-apple-macos-intel-x86';
} else if (process.platform === 'win32') {
  installUrl += '#node-oracledb-installation-on-microsoft-windowsstallation';
}

log('********************************************************************************');
log('** Node-oracledb ' + nodbUtil.PACKAGE_JSON_VERSION + ' installed in Node.js ' + process.versions.node + ' (' + process.platform + ', ' + process.arch + ')');
log('** To use node-oracledb in Thin mode, no additional steps are needed.');
if (thickModeErrMsg) {
  warn(thickModeErrMsg);
  warn('If you want to use the optional Thick mode, compile node-oracledb code using');
  warn(installUrl + '#github');
} else {
  log('** To use the optional Thick mode, the Oracle Client libraries (' + arch + ')');
  log('** must be available, see the installation instructions:');
  log('**   ' + installUrl);
}
log('********************************************************************************\n');
