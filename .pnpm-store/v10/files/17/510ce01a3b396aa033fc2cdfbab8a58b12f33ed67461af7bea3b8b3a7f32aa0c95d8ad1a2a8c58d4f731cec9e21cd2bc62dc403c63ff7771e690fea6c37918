// Copyright (c) 2025, Oracle and/or its affiliates.

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
const fs = require('fs').promises;
const util = require('node:util');
const oracledb = require('oracledb');
class locaJson {

  constructor(provider_arg, urlExtendedPart) {
    const params = new URLSearchParams(urlExtendedPart);
    this.paramMap = new URLSearchParams([...params].map(([key, value]) => [key.toLowerCase(), value])); //parse the extended part and store parameters in Map
    this.paramMap.set('filepath', provider_arg);
  }
  //---------------------------------------------------------------------------
  // init()
  //
  // Require/import modules from ociobject
  //---------------------------------------------------------------------------
  init() {
  // nothing to require
  }
  async returnConfig() {
    const alias = this.paramMap.get('alias');
    // Read input file
    const data = Buffer.from(await fs.readFile(this.paramMap.get("filepath"), { encoding: 'utf8', flag: 'r' }));
    // Converting to JSON
    const listofAliases = JSON.parse(data);
    if (alias) {
      this.obj = listofAliases[alias];
    } else {
      this.obj = listofAliases;
    }
    return this.obj;
  }
}
//---------------------------------------------------------------------------
//  hookFn()
//  hookFn will get registered to the driver while loading the plugins
//---------------------------------------------------------------------------
async function hookFn(args) {
  const configProvider = new locaJson(args.provider_arg, args.urlExtendedPart);
  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format('Centralized Config Provider failed to load required libraries. Please install the required libraries.\n %s', err.message);
    throw new Error(errmsg);
  }
  return [await configProvider.returnConfig(), configProvider.credential];
}
oracledb.registerConfigurationProviderHook('file', hookFn);
