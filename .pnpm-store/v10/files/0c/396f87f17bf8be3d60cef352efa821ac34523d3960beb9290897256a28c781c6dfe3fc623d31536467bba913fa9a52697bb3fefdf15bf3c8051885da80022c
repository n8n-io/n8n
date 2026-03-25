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
'use strict';

const { base } = require("../base.js");
const oracledb = require('oracledb');
const util = require('node:util');
const oci = {};
class ociVault extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    if (provider_arg)
      this._addParam("ocidvault", provider_arg);
  }
  init() {
    oci.secrets = require('oci-secrets');
    oci.common = require('oci-common');
  }

  //---------------------------------------------------------------------------
  // returnConfig()
  //
  // Returns config stored in the OCI Vault
  // parses it and gets password field stored in OCI/Azure Vault
  //---------------------------------------------------------------------------
  async returnConfig(credential) {
    if (!credential) {
      const ociObjectClass = require('../ociobject');
      const ociObject = new ociObjectClass();
      ociObject.paramMap = this.paramMap;
      ociObject.paramMap.set('authentication', '');
      ociObject.init();
      this.credential = await ociObject.returnOCICredential();
    } else
      this.credential = credential;

    const secretClientOci =  new oci.secrets.SecretsClient({
      authenticationDetailsProvider: this.credential
    });
    const getSecretBundleRequest = {
      secretId: this.paramMap.get("ocidvault")
    };
    const getSecretBundleResponse = await secretClientOci.getSecretBundle(getSecretBundleRequest);
    const base64content = getSecretBundleResponse.secretBundle.secretBundleContent.content;
    // decode base64 content
    const resp = Buffer.from(base64content, "base64").toString("ascii");
    // Entire object we get from OCI Vault
    try {
      this.obj = JSON.parse(resp);
    } catch {
      return resp;  // when password is of type ocivault
    }
    const userAlias = this.paramMap.get('key'); // alias
    if (userAlias) {
      this.obj = this.obj[userAlias];
    }
    return this.obj;
  }
}
//---------------------------------------------------------------------------
//  hookFn()
//  hookFn will get registered to the driver while loading the plugins
//---------------------------------------------------------------------------
async function hookFn(args) {
  const configProvider = new ociVault(args.provider_arg, args.urlExtendedPart);
  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format('Centralized Config Provider failed to load required libraries. Please install the required libraries.\n %s', err.message);
    throw new Error(errmsg);
  }
  if (args.paramMap) {
    configProvider.paramMap = args.paramMap;
  }
  return  [await configProvider.returnConfig(args.credential), configProvider.credential];
}
oracledb.registerConfigurationProviderHook('ocivault', hookFn);
