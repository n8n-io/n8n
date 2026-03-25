// // Copyright (c) 2024, 2025, Oracle and/or its affiliates.

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
const pemHeaders = [
  '-----BEGIN CERTIFICATE-----',
  '-----BEGIN PUBLIC KEY-----',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN DSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN ENCRYPTED PRIVATE KEY-----'
];
const pemFooters = [
  '-----END CERTIFICATE-----',
  '-----END PUBLIC KEY-----',
  '-----END PRIVATE KEY-----',
  '-----END RSA PRIVATE KEY-----',
  '-----END DSA PRIVATE KEY-----',
  '-----END EC PRIVATE KEY-----',
  '-----END ENCRYPTED PRIVATE KEY-----'
];
class base {
  constructor(url) {
    const params = new URLSearchParams(url);
    this.paramMap = new URLSearchParams([...params].map(([key, value]) => [key.toLowerCase(), value])); //parse the extended part and store parameters in Map
  }

  isPemFile(content) {
    //remove any line breaks at the end of the content
    content = content.trim();
    return pemHeaders.some(header => content.includes(header)) &&
         pemFooters.some(footer => content.endsWith(footer));
  }

  //---------------------------------------------------------------------------
  // _addParam()
  // Adds key,value pairs to the Map
  //---------------------------------------------------------------------------
  _addParam(key, value) {
    const aliasKeyName = key.toLowerCase();
    this.paramMap.set(aliasKeyName, value);
  }

  //---------------------------------------------------------------------------
  // _parsePwd()
  // Parse password which is in url format
  // “uri”:“https://mykeyvault.vault.azure.net/secrets/secretkey”}
  //---------------------------------------------------------------------------
  _parsePwd(str) {
    const vault_uri = new RegExp("(?<vault_url>(^(https://))?[A-Za-z0-9._-]+)/secrets/(?<secretKey>[A-Za-z0-9][A-Za-z0-9-/]*)$", 'g');
    const vault_detail = [];
    for (const match of str.matchAll(vault_uri)) {
      vault_detail[0] = match.groups.vault_url;
      vault_detail[1] = match.groups.secretKey;
    }
    if (!vault_detail[0].startsWith('https'))
      vault_detail[0] = 'https://' + vault_detail[0];
    return vault_detail;
  }

  //---------------------------------------------------------------------------
  // retrieveRegion(objservername)
  //
  // returns region from the given objservername.
  //---------------------------------------------------------------------------
  retrieveRegion(objservername) {
    const arr = objservername.split(".");
    return arr[1].toUpperCase().replaceAll('-', '_');
  }
}
module.exports = {base};
