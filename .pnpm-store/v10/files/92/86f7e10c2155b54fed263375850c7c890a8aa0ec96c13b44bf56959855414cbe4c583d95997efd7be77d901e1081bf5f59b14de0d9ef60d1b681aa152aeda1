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

const {createNVPair} = require("./nvStrToNvPair.js");
const fs = require('fs');
const process = require('process');
const readline = require('readline');
const errors = require("../../errors.js");

const MAX_IFILE_DEPTH = 4;
/**
 * Returns File path of the tnsnames.ora if it exists.
 */
function tnsnamesFilePath(configDir) {
  let filePathVal = null;
  const tnsAdminVal = process.env.TNS_ADMIN;
  if (configDir) {
    filePathVal = configDir + '/tnsnames.ora';
    if (fs.existsSync(filePathVal)) {
      return filePathVal;
    } else {
      errors.throwErr(errors.ERR_TNS_NAMES_FILE_MISSING, configDir);
    }
  } else {
    if (!tnsAdminVal) {
      errors.throwErr(errors.ERR_NO_CONFIG_DIR);
    } else {
      filePathVal = tnsAdminVal;
      filePathVal += '/tnsnames.ora';
      if (!fs.existsSync(filePathVal)) {
        errors.throwErr(errors.ERR_TNS_NAMES_FILE_MISSING, tnsAdminVal);
      }
    }
    return filePathVal;
  }
}
//Structure for each tnsnames.ora file
class tnsnamesElement {

  constructor() {
    this.readInProgress = false;
    this.waiters = [];
    this.aliasht = new Map(); // It will have key as alias and value as its aliases value
    this.modTime = new Map(); // It will have tnsnames filename and also all its ifile and its modified time
  }
}
class NLParamParser {

  constructor() {
  // key as tnsnames.ora(file_name) and value will be tnsnamesStruct<ht(alias key and value), modTime>
    this.tnsnamesHT = new Map();
  }
  /**
 * Reads the given file line by line and stores the
 * network service names mapped to connect descriptors in the hashtable.
 * @param {string} file_path
 * @returns {Promise}
 */
  async initializeNlpa(file_path) {
    let tnsFileStruct;
    if (this.tnsnamesHT.has(file_path))
      tnsFileStruct = this.tnsnamesHT.get(file_path);
    else
      tnsFileStruct = new tnsnamesElement();
    if (tnsFileStruct.readInProgress) {
      await new Promise((resolve) => {
        tnsFileStruct.waiters.push(resolve);
      });
    }
    /* check modification time of all files in the cache
       including the file_path */
    if (!this.checkModfTime(tnsFileStruct)) {
      /* No File has been modified */
      return tnsFileStruct.aliasht;
    }
    tnsFileStruct.readInProgress = true;
    await this.start(file_path, 0, tnsFileStruct); //start with 0 depth (tnsnames.ora)
    this.tnsnamesHT.set(file_path, tnsFileStruct);
    return tnsFileStruct.aliasht;
  }

  async start(file_path, depth, tnsFileStruct) {

    if (depth > MAX_IFILE_DEPTH)
      return; //ignore after max depth
    const stat = fs.statSync(file_path);
    // store file path and its modified time.
    tnsFileStruct.modTime.set(file_path, stat.mtime);
    // Creating a readable stream from file
    // readline module reads line by line
    // but from a readable stream only.
    const file = readline.createInterface({
      input: fs.createReadStream(file_path),
      output: process.stdout,
      terminal: false
    });
    let nvElem = "";
    for await (let line of file) {
      if (line.length == 0) {   // ignore empty lines
        continue;
      } else if (line[0] == '#') {  // comment line
        continue;
      } else if ((line[0] == ' ') ||    // continued input on new line
                  (line[0] == '\t') ||
                  (line[0] == ')') ||
                  (line[0] == '(')) {
        line = line.replace(/\s+/g, '');
        line = this.checkNLPforComments(line);
        if (line.length == 0)
          continue;
        else {
          nvElem = nvElem + line;
        }

      } else {  // new NV Element starting here
        if (nvElem.length == 0) {

          line = this.checkNLPforComments(line);
          nvElem = nvElem + line;

        } else if (nvElem.length != 0) {
          await this.addNLPListElement(nvElem, depth, tnsFileStruct); // Add Parameter to Hashtable
          nvElem = ""; // Clear first, before storing current line

          line = this.checkNLPforComments(line);
          nvElem = nvElem + line;
        }
      }
    }
    if (nvElem.length != 0) { // at eof, still one more parameter to read
      await this.addNLPListElement(nvElem, depth, tnsFileStruct);
      nvElem = "";      // clear nvElem buffer after added
    }
    tnsFileStruct.readInProgress = false;
    let waiter;
    while ((waiter = tnsFileStruct.waiters.pop())) {
      waiter();
    }
  }
  /**
   * Given a string, this method looks if the '#' character is present.
   * If true, the line is truncated from that point onwards until the end
   * of the line; else, the original line is returned unchanged.
   *
   * @param  str     The String that is going to be tested for inline comments
   * @return String  The modified String returned
   */
  checkNLPforComments(str) {
    const str1 = new Array(str.length);

    for (let i = 0; i < str.length; i++) {
      const current_char = str[i];
      if (current_char == '#') {
        if (i != 0) {
          break; // No need to continue. Return the line
        } else {
          // Entire line is a comment
          return "";
        }
      } else
        str1.push(current_char);
    }
    return str1.join('');
  }
  // check if any of the IFiles has been changed
  checkModfTime(tnsFileStruct) {
    // There may be multiple tnsnames.ora files. So check if the tnsnames.ora
    // in question is already cached
    if (tnsFileStruct.modTime.size != 0) {
      for (const [key, value] of tnsFileStruct.modTime) {
        if (fs.existsSync(key)) {
          const stat = fs.statSync(key);
          if ((stat.mtime - value > 0)) {
            return true;
          }
        } else
          return true;
      }
    } else {
      return true;
    }
    return false;
  }
  /**
    * adds name value pairs from the input buffer into the hash table.
    * @param {string} ibuf
    */
  async addNLPListElement(ibuf, depth, tnsFileStruct) {
    const res = ibuf.split(/\r?\n/).filter(element => element);
    for (let i = 0; i < res.length; i++) {
      if (res[i].charAt(0) != '(') {
        res[i] = '(' + res[i] + ')';
      }
      const nvp = createNVPair(res[i]);
      const name = nvp.name;
      const uname = name.toUpperCase();
      nvp.name = uname;
      // support for ifile
      if (uname == 'IFILE') {
        await this.start(nvp.atom, depth + 1, tnsFileStruct);
      } else {
        const unames = uname.split(","); //multiple aliases (alias1, alias2, alias3)
        for (let i = 0; i < unames.length; i++) {
          tnsFileStruct.aliasht.set(unames[i], nvp);
        }
      }
    }
  }
}

module.exports = {
  NLParamParser,
  tnsnamesFilePath
};
