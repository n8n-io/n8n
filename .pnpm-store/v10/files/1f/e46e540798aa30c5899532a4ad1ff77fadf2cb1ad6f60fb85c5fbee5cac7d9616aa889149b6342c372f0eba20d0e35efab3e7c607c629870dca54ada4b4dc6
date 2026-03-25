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
const oracledb = require('oracledb');
const msal = require('@azure/msal-node');


async function getToken(params) {
  switch (params.authType.toLowerCase()) {
    case 'azureserviceprincipal':
      return await servicePrincipalCredentials(params);
    default:
      throwErr(`Invalid authentication type ${params.authType} in extensionAzure plugins.`);
  }
}

//---------------------------------------------------------------------------
// throwErr()
//---------------------------------------------------------------------------
function throwErr(message) {
  throw new Error(message);
}

//---------------------------------------------------------------------------
// Returns the access token for authentication as a service principal. This
// authentication method requires a client ID along with either a secret or
// certificate. These values may be provided as config parameters read by
// the Azure SDK.
// ---------------------------------------------------------------------------
async function servicePrincipalCredentials(params) {
  const clientId = params.clientId ??
    throwErr("Token based authentication config parameter clientId is missing for azureServicePrincipal in extensionAzure plugins.");
  const authority = params.authority ??
    throwErr("Token based authentication config parameter authority is missing for azureServicePrincipal in extensionAzure plugins.");
  const clientSecret = params.clientSecret ??
    throwErr("Token based authentication config parameter clientSecret is missing for azureServicePrincipal in extensionAzure plugins.");
  const msalConfig = {
    auth: {
      clientId: clientId,
      authority: authority,
      clientSecret: clientSecret,
    },
    system: {
      // Use it while generating azure tokens behind proxy
      // Otherwise can remove this option
      networkClient: params.proxy,
    },
  };

  if (!msalConfig.system.networkClient) {
    delete msalConfig.system.networkClient;
  }

  const scopes = params.scopes ??
    throwErr("Token based authentication config parameter scopes is missing for azureServicePrincipal in extensionAzure plugins.");
  const tokenRequest = {
    scopes: [scopes],
  };
  const cca = new msal.ConfidentialClientApplication(msalConfig);
  const authResponse = await cca.acquireTokenByClientCredential(tokenRequest);
  return authResponse.accessToken;
}

// ---------------------------------------------------------------------------
// hookFn()
// hookFn is registered to driver while loading plugins.
// ---------------------------------------------------------------------------

function hookFn(options) {
  if (options.tokenAuthConfigAzure) {
    // eslint-disable-next-line no-unused-vars
    options.accessToken = async function callbackFn(refresh, config) {
      return await getToken(config);
    };
    options.accessTokenConfig = options.tokenAuthConfigAzure;
  }
}
oracledb.registerProcessConfigurationHook(hookFn);
