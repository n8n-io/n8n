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
let AppConfigurationClient;
let ClientSecretCredential, ClientCertificateCredential, ChainedTokenCredential, ManagedIdentityCredential, EnvironmentCredential;
const util = require('node:util');
const { base } = require("../base.js");
const oracledb = require('oracledb');
class AzureProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    this._addParam("appconfigname", provider_arg);
  }

  //---------------------------------------------------------------------------
  // init()
  //
  // Require/import modules from Azure SDK
  //---------------------------------------------------------------------------
  init() {
    ({ AppConfigurationClient } = require("@azure/app-configuration"));
  }

  //---------------------------------------------------------------------------
  // returnCredential()
  //
  // Returns credential to access Azure Config Store on the basis of
  // authentication parameters given by the user.
  //---------------------------------------------------------------------------
  returnAzureCredential() {
    ({ ClientSecretCredential, ClientCertificateCredential, ChainedTokenCredential, ManagedIdentityCredential, EnvironmentCredential } = require("@azure/identity"));
    let auth = null;
    if (this.paramMap.get('authentication')) {
      auth = this.paramMap.get('authentication').toUpperCase();
    }
    if (auth && !(auth == 'AZURE_DEFAULT')) {
      // do the given authentication
      if (auth == 'AZURE_SERVICE_PRINCIPAL') {
        if (this.paramMap.get("azure_client_certificate_path"))
          return new ClientCertificateCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_certificate_path"));
        else if (this.paramMap.get("azure_client_secret"))
          return new ClientSecretCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_secret"));
        else
          throw new Error('Azure service principal authentication requires either a client certificate path or a client secret string');
      } else if (auth == 'AZURE_MANAGED_IDENTITY') {
        return new ManagedIdentityCredential(this.paramMap.get('azure_managed_identity_client_id'));
      } else {
        const errmsg = util.format('Azure Authentication Failed: The authentication parameter value %s may be incorrect', auth);
        throw new Error(errmsg);
      }
    } else {
      //return default token credential
      return this._withChainedTokenCredential();
    }
  }
  //---------------------------------------------------------------------------
  // _withChainedTokenCredential()
  //
  // Use of ChainedTokenCredential class which provides the ability to link
  // together multiple credential instances to be tried sequentially when authenticating.
  // Default authentication to try when no authentication parameter is given by the user
  //---------------------------------------------------------------------------
  _withChainedTokenCredential() {
    const tokens = [];
    if ((this.paramMap.get("azure_client_secret")))
      tokens.push(new ClientSecretCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_secret")));
    if ((this.paramMap.get("azure_client_certificate_path")))
      tokens.push(new ClientCertificateCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_certificate_path")));
    if ((this.paramMap.get('azure_managed_identity_client_id')))
      tokens.push(this.paramMap.get('azure_managed_identity_client_id'));
    tokens.push(new EnvironmentCredential());
    const credential = new ChainedTokenCredential(...tokens);
    return credential;
  }
  async returnConfig() {
    const configObject = {};
    const label = this.paramMap.get("label");
    try {
      this.credential =  await this.returnAzureCredential();
    } catch (err) {
      const errmsg = util.format('Azure Authentication Failed: The authentication parameter value %s may be incorrect', err.message);
      throw new Error(errmsg);
    }
    // azure config store
    const client = new AppConfigurationClient(
      "https://" + this.paramMap.get("appconfigname"), // ex: <https://<your appconfig resource>.azconfig.io>
      this.credential
    );
    // retrieve connect_description
    configObject.connectString = (await this.retrieveParamValueFromAzureConfigurationProvider(client, label, 'connect_descriptor'));
    // retrieve node-oracledb parameters
    const params = (await this.retrieveParamValueFromAzureConfigurationProvider(client, label, 'njs'));
    if (params) {
      const obj = JSON.parse(params);
      for (const key in obj) {
        var val = obj[key];
        configObject[key] = val;
      }
    } else {
      configObject['njs'] = null;
    }
    // retrieve user
    configObject.user = (await this.retrieveParamValueFromAzureConfigurationProvider(client, label, 'user'));

    //retrieve password
    configObject.password = await this.retrieveParamValueFromAzureConfigurationProvider(client, label, 'password');

    // retrieve wallet_location
    configObject.walletContent = await this.retrieveParamValueFromAzureConfigurationProvider(client, label, 'wallet_location');

    if (configObject.walletContent) {
      //only Pem file supported
      if (!this.isPemFile(configObject.walletContent))
        throw new Error('Invalid wallet content format. Supported format is PEM');
    }
    return configObject;
  }
  async retrieveParamValueFromAzureConfigurationProvider(client, label, param) {
    let paramJson = null;
    try {
      paramJson = (await client.getConfigurationSetting({ key: this.paramMap.get("key") + param, label: label })).value;
    } catch (err) {
      // connect_descriptor must not be null
      if (param == 'connect_descriptor') {
        const errmsg = util.format('Failed to retrieve configuration from Centralized Configuration Provider:\n%s', err.message);
        throw new Error(errmsg);
      }
      return null;
    }
    if (paramJson) {
      let obj;
      try {
        obj = JSON.parse(paramJson);
      } catch {
        obj = paramJson;
      }
      if (obj.uri) {
        const { SecretClient } = require("@azure/keyvault-secrets");
        const vault_detail = await this._parsePwd(obj.uri);
        const client1 = new SecretClient(vault_detail[0], this.credential);
        return  (await client1.getSecret(vault_detail[1])).value;
      } else {
        return paramJson;
      }
    }
  }
} module.exports = AzureProvider;
//---------------------------------------------------------------------------
//  hookFn()
//  hookFn will get registered to the driver while loading the plugins
//---------------------------------------------------------------------------
async function hookFn(args) {
  const configProvider = new AzureProvider(args.provider_arg, args.urlExtendedPart);
  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format('Centralized Config Provider failed to load required libraries. Please install the required libraries.\n %s', err.message);
    throw new Error(errmsg);
  }
  return [await configProvider.returnConfig(), configProvider.credential];
}
oracledb.registerConfigurationProviderHook('azure', hookFn);
