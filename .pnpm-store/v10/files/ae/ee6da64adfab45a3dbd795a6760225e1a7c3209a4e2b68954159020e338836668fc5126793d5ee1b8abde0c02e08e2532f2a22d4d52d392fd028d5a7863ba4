// Copyright (c) 2024, 2025, Oracle and/or its affiliates.

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
const fs = require('fs');
const cloud_net_naming_pattern_oci = new RegExp("(?<objservername>[A-Za-z0-9._-]+)/n/" + "(?<namespace>[A-Za-z0-9._-]+)/b/" + "(?<bucketname>[A-Za-z0-9._-]+)/o/" + "(?<filename>[A-Za-z0-9._-]+)$");
// object to store module references that will be populated by init()
const oci = {};
class OCIProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    let match;
    if (provider_arg)
      match = provider_arg.match(cloud_net_naming_pattern_oci);
    if (match) {
      this._addParam("objservername", match.groups.objservername);
      this._addParam("namespace", match.groups.namespace);
      this._addParam("bucketname", match.groups.bucketname);
      this._addParam("filename", match.groups.filename);
    }
  }

  //---------------------------------------------------------------------------
  // init()
  //
  // Require/import modules from ociobject
  //---------------------------------------------------------------------------
  init() {
    oci.common = require('oci-common');
    oci.objectstorage = require('oci-objectstorage');
  }

  //---------------------------------------------------------------------------
  // _streamToString()
  //
  // Converts data stored in a Readable stream to string
  //---------------------------------------------------------------------------
  async _streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
  //---------------------------------------------------------------------------
  // returnOCICredential()
  //
  // Returns credential to access OCI Object Store/OCI Vault on the basis of
  // authentication parameters given by the user.
  // Used in OCI/LOCALJSONFILE/OCIVAULT Config Providers
  //---------------------------------------------------------------------------
  async returnOCICredential() {
    let provider = null;
    let auth = null;
    if (this.paramMap.get('authentication')) {
      auth = this.paramMap.get('authentication').toUpperCase();
    }
    // authentication parameter given and its not OCI_DEFAULT
    if (auth && !(auth == 'OCI_DEFAULT')) {
      if (auth == 'OCI_INSTANCE_PRINCIPAL') {
        provider = await oci.common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
      } else if (auth == 'OCI_RESOURCE_PRINCIPAL') {
        provider = await new oci.common.ResourcePrincipalAuthenticationDetailsProvider.builder();
      } else {
        const errmsg = util.format('OCI authentication failed: The authentication parameter value %s may be incorrect', auth);
        throw new Error(errmsg);
      }
    } else {
      // default authentication
      try {
        //authentication parameters exist in the configurationFile
        provider = new oci.common.ConfigFileAuthenticationDetailsProvider(
          this.paramMap.get("oci_profile_path"), //default path ~/.oci/config
          this.paramMap.get("oci_profile")
        );
      } catch (err) {
        //throw error for wrong profile or wrong path
        if (!this.paramMap.get("oci_tenancy") || !this.paramMap.get("oci_user")) {
          throw (err);
        }
        // authentication parameters are directly given in the connectString
        const publicKey = fs.readFileSync(this.paramMap.get('oci_key_file'), { encoding: "utf8" });
        let region;
        if (this.paramMap.get('objectservername'))
          region = this.retrieveRegion(this.paramMap.get('objservername'));
        else
          region = oci.common.Region[(this.paramMap.get("region").replace(/-/g, '_')).toUpperCase()];
        provider = new oci.common.SimpleAuthenticationDetailsProvider(
          this.paramMap.get("oci_tenancy"),
          this.paramMap.get("oci_user"),
          this.paramMap.get("oci_fingerprint"),
          publicKey,
          undefined,
          region
        );
      }
    }
    return provider;
  }

  //---------------------------------------------------------------------------
  // returnConfig()
  //
  // Returns config stored in the OCI Object Store and
  // parses and gets password field stored in OCI/Azure Vault
  //---------------------------------------------------------------------------
  async returnConfig() {
    this.credential = await this.returnOCICredential();
    // oci object store
    const client_oci = new (oci.objectstorage).ObjectStorageClient({
      authenticationDetailsProvider: this.credential
    });
    const getObjectRequest = {
      objectName: this.paramMap.get('filename'),
      bucketName: this.paramMap.get('bucketname'),
      namespaceName: this.paramMap.get('namespace')
    };
    const getObjectResponse = await client_oci.getObject(getObjectRequest);
    const resp = await this._streamToString(getObjectResponse.value);
    // Entire object we get from OCI Object Storage
    this.obj = JSON.parse(resp);
    const userAlias = this.paramMap.get('key'); // alias
    if (userAlias) {
      this.obj = this.obj[userAlias];
    }
    return this.obj;
  }
}module.exports = OCIProvider;

//---------------------------------------------------------------------------
//  hookFn()
//  hookFn will get registered to the driver while loading the plugins
//---------------------------------------------------------------------------
async function hookFn(args) {
  const configProvider = new OCIProvider(args.provider_arg, args.urlExtendedPart);
  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format('Centralized Config Provider failed to load required libraries. Please install the required libraries.\n %s', err.message);
    throw new Error(errmsg);
  }
  try {
    return [await configProvider.returnConfig(), configProvider.credential];
  } catch (err) {
    const errmsg = util.format('Failed to retrieve configuration from Centralized Configuration Provider:\n %s', err.message);
    throw new Error(errmsg);
  }
}
oracledb.registerConfigurationProviderHook('ociobject', hookFn);
