"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/loadSso.ts
var loadSso_exports = {};
__export(loadSso_exports, {
  GetRoleCredentialsCommand: () => import_client_sso.GetRoleCredentialsCommand,
  SSOClient: () => import_client_sso.SSOClient
});
var import_client_sso;
var init_loadSso = __esm({
  "src/loadSso.ts"() {
    "use strict";
    import_client_sso = require("@aws-sdk/client-sso");
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  fromSSO: () => fromSSO,
  isSsoProfile: () => isSsoProfile,
  validateSsoProfile: () => validateSsoProfile
});
module.exports = __toCommonJS(index_exports);

// src/fromSSO.ts



// src/isSsoProfile.ts
var isSsoProfile = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");

// src/resolveSSOCredentials.ts
var import_client = require("@aws-sdk/core/client");
var import_token_providers = require("@aws-sdk/token-providers");
var import_property_provider = require("@smithy/property-provider");
var import_shared_ini_file_loader = require("@smithy/shared-ini-file-loader");
var SHOULD_FAIL_CREDENTIAL_CHAIN = false;
var resolveSSOCredentials = /* @__PURE__ */ __name(async ({
  ssoStartUrl,
  ssoSession,
  ssoAccountId,
  ssoRegion,
  ssoRoleName,
  ssoClient,
  clientConfig,
  parentClientConfig,
  profile,
  logger
}) => {
  let token;
  const refreshMessage = `To refresh this SSO session run aws sso login with the corresponding profile.`;
  if (ssoSession) {
    try {
      const _token = await (0, import_token_providers.fromSso)({ profile })();
      token = {
        accessToken: _token.token,
        expiresAt: new Date(_token.expiration).toISOString()
      };
    } catch (e) {
      throw new import_property_provider.CredentialsProviderError(e.message, {
        tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
        logger
      });
    }
  } else {
    try {
      token = await (0, import_shared_ini_file_loader.getSSOTokenFromFile)(ssoStartUrl);
    } catch (e) {
      throw new import_property_provider.CredentialsProviderError(`The SSO session associated with this profile is invalid. ${refreshMessage}`, {
        tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
        logger
      });
    }
  }
  if (new Date(token.expiresAt).getTime() - Date.now() <= 0) {
    throw new import_property_provider.CredentialsProviderError(`The SSO session associated with this profile has expired. ${refreshMessage}`, {
      tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
      logger
    });
  }
  const { accessToken } = token;
  const { SSOClient: SSOClient2, GetRoleCredentialsCommand: GetRoleCredentialsCommand2 } = await Promise.resolve().then(() => (init_loadSso(), loadSso_exports));
  const sso = ssoClient || new SSOClient2(
    Object.assign({}, clientConfig ?? {}, {
      logger: clientConfig?.logger ?? parentClientConfig?.logger,
      region: clientConfig?.region ?? ssoRegion
    })
  );
  let ssoResp;
  try {
    ssoResp = await sso.send(
      new GetRoleCredentialsCommand2({
        accountId: ssoAccountId,
        roleName: ssoRoleName,
        accessToken
      })
    );
  } catch (e) {
    throw new import_property_provider.CredentialsProviderError(e, {
      tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
      logger
    });
  }
  const {
    roleCredentials: { accessKeyId, secretAccessKey, sessionToken, expiration, credentialScope, accountId } = {}
  } = ssoResp;
  if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration) {
    throw new import_property_provider.CredentialsProviderError("SSO returns an invalid temporary credential.", {
      tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
      logger
    });
  }
  const credentials = {
    accessKeyId,
    secretAccessKey,
    sessionToken,
    expiration: new Date(expiration),
    ...credentialScope && { credentialScope },
    ...accountId && { accountId }
  };
  if (ssoSession) {
    (0, import_client.setCredentialFeature)(credentials, "CREDENTIALS_SSO", "s");
  } else {
    (0, import_client.setCredentialFeature)(credentials, "CREDENTIALS_SSO_LEGACY", "u");
  }
  return credentials;
}, "resolveSSOCredentials");

// src/validateSsoProfile.ts

var validateSsoProfile = /* @__PURE__ */ __name((profile, logger) => {
  const { sso_start_url, sso_account_id, sso_region, sso_role_name } = profile;
  if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name) {
    throw new import_property_provider.CredentialsProviderError(
      `Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(profile).join(
        ", "
      )}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`,
      { tryNextLink: false, logger }
    );
  }
  return profile;
}, "validateSsoProfile");

// src/fromSSO.ts
var fromSSO = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
  init.logger?.debug("@aws-sdk/credential-provider-sso - fromSSO");
  const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
  const { ssoClient } = init;
  const profileName = (0, import_shared_ini_file_loader.getProfileName)({
    profile: init.profile ?? callerClientConfig?.profile
  });
  if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
    const profiles = await (0, import_shared_ini_file_loader.parseKnownFiles)(init);
    const profile = profiles[profileName];
    if (!profile) {
      throw new import_property_provider.CredentialsProviderError(`Profile ${profileName} was not found.`, { logger: init.logger });
    }
    if (!isSsoProfile(profile)) {
      throw new import_property_provider.CredentialsProviderError(`Profile ${profileName} is not configured with SSO credentials.`, {
        logger: init.logger
      });
    }
    if (profile?.sso_session) {
      const ssoSessions = await (0, import_shared_ini_file_loader.loadSsoSessionData)(init);
      const session = ssoSessions[profile.sso_session];
      const conflictMsg = ` configurations in profile ${profileName} and sso-session ${profile.sso_session}`;
      if (ssoRegion && ssoRegion !== session.sso_region) {
        throw new import_property_provider.CredentialsProviderError(`Conflicting SSO region` + conflictMsg, {
          tryNextLink: false,
          logger: init.logger
        });
      }
      if (ssoStartUrl && ssoStartUrl !== session.sso_start_url) {
        throw new import_property_provider.CredentialsProviderError(`Conflicting SSO start_url` + conflictMsg, {
          tryNextLink: false,
          logger: init.logger
        });
      }
      profile.sso_region = session.sso_region;
      profile.sso_start_url = session.sso_start_url;
    }
    const { sso_start_url, sso_account_id, sso_region, sso_role_name, sso_session } = validateSsoProfile(
      profile,
      init.logger
    );
    return resolveSSOCredentials({
      ssoStartUrl: sso_start_url,
      ssoSession: sso_session,
      ssoAccountId: sso_account_id,
      ssoRegion: sso_region,
      ssoRoleName: sso_role_name,
      ssoClient,
      clientConfig: init.clientConfig,
      parentClientConfig: init.parentClientConfig,
      profile: profileName
    });
  } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName) {
    throw new import_property_provider.CredentialsProviderError(
      'Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"',
      { tryNextLink: false, logger: init.logger }
    );
  } else {
    return resolveSSOCredentials({
      ssoStartUrl,
      ssoSession,
      ssoAccountId,
      ssoRegion,
      ssoRoleName,
      ssoClient,
      clientConfig: init.clientConfig,
      parentClientConfig: init.parentClientConfig,
      profile: profileName
    });
  }
}, "fromSSO");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  fromSSO,
  isSsoProfile,
  validateSsoProfile
});

