"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  fromIni: () => fromIni
});
module.exports = __toCommonJS(index_exports);

// src/fromIni.ts


// src/resolveProfileData.ts


// src/resolveAssumeRoleCredentials.ts


var import_shared_ini_file_loader = require("@smithy/shared-ini-file-loader");

// src/resolveCredentialSource.ts
var import_client = require("@aws-sdk/core/client");
var import_property_provider = require("@smithy/property-provider");
var resolveCredentialSource = /* @__PURE__ */ __name((credentialSource, profileName, logger) => {
  const sourceProvidersMap = {
    EcsContainer: /* @__PURE__ */ __name(async (options) => {
      const { fromHttp } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-http")));
      const { fromContainerMetadata } = await Promise.resolve().then(() => __toESM(require("@smithy/credential-provider-imds")));
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
      return async () => (0, import_property_provider.chain)(fromHttp(options ?? {}), fromContainerMetadata(options))().then(setNamedProvider);
    }, "EcsContainer"),
    Ec2InstanceMetadata: /* @__PURE__ */ __name(async (options) => {
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
      const { fromInstanceMetadata } = await Promise.resolve().then(() => __toESM(require("@smithy/credential-provider-imds")));
      return async () => fromInstanceMetadata(options)().then(setNamedProvider);
    }, "Ec2InstanceMetadata"),
    Environment: /* @__PURE__ */ __name(async (options) => {
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
      const { fromEnv } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-env")));
      return async () => fromEnv(options)().then(setNamedProvider);
    }, "Environment")
  };
  if (credentialSource in sourceProvidersMap) {
    return sourceProvidersMap[credentialSource];
  } else {
    throw new import_property_provider.CredentialsProviderError(
      `Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`,
      { logger }
    );
  }
}, "resolveCredentialSource");
var setNamedProvider = /* @__PURE__ */ __name((creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p"), "setNamedProvider");

// src/resolveAssumeRoleCredentials.ts
var isAssumeRoleProfile = /* @__PURE__ */ __name((arg, { profile = "default", logger } = {}) => {
  return Boolean(arg) && typeof arg === "object" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 && ["undefined", "string"].indexOf(typeof arg.external_id) > -1 && ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 && (isAssumeRoleWithSourceProfile(arg, { profile, logger }) || isCredentialSourceProfile(arg, { profile, logger }));
}, "isAssumeRoleProfile");
var isAssumeRoleWithSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger }) => {
  const withSourceProfile = typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
  if (withSourceProfile) {
    logger?.debug?.(`    ${profile} isAssumeRoleWithSourceProfile source_profile=${arg.source_profile}`);
  }
  return withSourceProfile;
}, "isAssumeRoleWithSourceProfile");
var isCredentialSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger }) => {
  const withProviderProfile = typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
  if (withProviderProfile) {
    logger?.debug?.(`    ${profile} isCredentialSourceProfile credential_source=${arg.credential_source}`);
  }
  return withProviderProfile;
}, "isCredentialSourceProfile");
var resolveAssumeRoleCredentials = /* @__PURE__ */ __name(async (profileName, profiles, options, visitedProfiles = {}) => {
  options.logger?.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
  const profileData = profiles[profileName];
  const { source_profile, region } = profileData;
  if (!options.roleAssumer) {
    const { getDefaultRoleAssumer } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/nested-clients/sts")));
    options.roleAssumer = getDefaultRoleAssumer(
      {
        ...options.clientConfig,
        credentialProviderLogger: options.logger,
        parentClientConfig: {
          ...options?.parentClientConfig,
          region: region ?? options?.parentClientConfig?.region
        }
      },
      options.clientPlugins
    );
  }
  if (source_profile && source_profile in visitedProfiles) {
    throw new import_property_provider.CredentialsProviderError(
      `Detected a cycle attempting to resolve credentials for profile ${(0, import_shared_ini_file_loader.getProfileName)(options)}. Profiles visited: ` + Object.keys(visitedProfiles).join(", "),
      { logger: options.logger }
    );
  }
  options.logger?.debug(
    `@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${profileName}]`}`
  );
  const sourceCredsProvider = source_profile ? resolveProfileData(
    source_profile,
    profiles,
    options,
    {
      ...visitedProfiles,
      [source_profile]: true
    },
    isCredentialSourceWithoutRoleArn(profiles[source_profile] ?? {})
  ) : (await resolveCredentialSource(profileData.credential_source, profileName, options.logger)(options))();
  if (isCredentialSourceWithoutRoleArn(profileData)) {
    return sourceCredsProvider.then((creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
  } else {
    const params = {
      RoleArn: profileData.role_arn,
      RoleSessionName: profileData.role_session_name || `aws-sdk-js-${Date.now()}`,
      ExternalId: profileData.external_id,
      DurationSeconds: parseInt(profileData.duration_seconds || "3600", 10)
    };
    const { mfa_serial } = profileData;
    if (mfa_serial) {
      if (!options.mfaCodeProvider) {
        throw new import_property_provider.CredentialsProviderError(
          `Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`,
          { logger: options.logger, tryNextLink: false }
        );
      }
      params.SerialNumber = mfa_serial;
      params.TokenCode = await options.mfaCodeProvider(mfa_serial);
    }
    const sourceCreds = await sourceCredsProvider;
    return options.roleAssumer(sourceCreds, params).then(
      (creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o")
    );
  }
}, "resolveAssumeRoleCredentials");
var isCredentialSourceWithoutRoleArn = /* @__PURE__ */ __name((section) => {
  return !section.role_arn && !!section.credential_source;
}, "isCredentialSourceWithoutRoleArn");

// src/resolveProcessCredentials.ts

var isProcessProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string", "isProcessProfile");
var resolveProcessCredentials = /* @__PURE__ */ __name(async (options, profile) => Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-process"))).then(
  ({ fromProcess }) => fromProcess({
    ...options,
    profile
  })().then((creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_PROCESS", "v"))
), "resolveProcessCredentials");

// src/resolveSsoCredentials.ts

var resolveSsoCredentials = /* @__PURE__ */ __name(async (profile, profileData, options = {}) => {
  const { fromSSO } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-sso")));
  return fromSSO({
    profile,
    logger: options.logger,
    parentClientConfig: options.parentClientConfig,
    clientConfig: options.clientConfig
  })().then((creds) => {
    if (profileData.sso_session) {
      return (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_SSO", "r");
    } else {
      return (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
    }
  });
}, "resolveSsoCredentials");
var isSsoProfile = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");

// src/resolveStaticCredentials.ts

var isStaticCredsProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.aws_access_key_id === "string" && typeof arg.aws_secret_access_key === "string" && ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1 && ["undefined", "string"].indexOf(typeof arg.aws_account_id) > -1, "isStaticCredsProfile");
var resolveStaticCredentials = /* @__PURE__ */ __name(async (profile, options) => {
  options?.logger?.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
  const credentials = {
    accessKeyId: profile.aws_access_key_id,
    secretAccessKey: profile.aws_secret_access_key,
    sessionToken: profile.aws_session_token,
    ...profile.aws_credential_scope && { credentialScope: profile.aws_credential_scope },
    ...profile.aws_account_id && { accountId: profile.aws_account_id }
  };
  return (0, import_client.setCredentialFeature)(credentials, "CREDENTIALS_PROFILE", "n");
}, "resolveStaticCredentials");

// src/resolveWebIdentityCredentials.ts

var isWebIdentityProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.web_identity_token_file === "string" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1, "isWebIdentityProfile");
var resolveWebIdentityCredentials = /* @__PURE__ */ __name(async (profile, options) => Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-web-identity"))).then(
  ({ fromTokenFile }) => fromTokenFile({
    webIdentityTokenFile: profile.web_identity_token_file,
    roleArn: profile.role_arn,
    roleSessionName: profile.role_session_name,
    roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity,
    logger: options.logger,
    parentClientConfig: options.parentClientConfig
  })().then((creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q"))
), "resolveWebIdentityCredentials");

// src/resolveProfileData.ts
var resolveProfileData = /* @__PURE__ */ __name(async (profileName, profiles, options, visitedProfiles = {}, isAssumeRoleRecursiveCall = false) => {
  const data = profiles[profileName];
  if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data, options);
  }
  if (isAssumeRoleRecursiveCall || isAssumeRoleProfile(data, { profile: profileName, logger: options.logger })) {
    return resolveAssumeRoleCredentials(profileName, profiles, options, visitedProfiles);
  }
  if (isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data, options);
  }
  if (isWebIdentityProfile(data)) {
    return resolveWebIdentityCredentials(data, options);
  }
  if (isProcessProfile(data)) {
    return resolveProcessCredentials(options, profileName);
  }
  if (isSsoProfile(data)) {
    return await resolveSsoCredentials(profileName, data, options);
  }
  throw new import_property_provider.CredentialsProviderError(
    `Could not resolve credentials using profile: [${profileName}] in configuration/credentials file(s).`,
    { logger: options.logger }
  );
}, "resolveProfileData");

// src/fromIni.ts
var fromIni = /* @__PURE__ */ __name((_init = {}) => async ({ callerClientConfig } = {}) => {
  const init = {
    ..._init,
    parentClientConfig: {
      ...callerClientConfig,
      ..._init.parentClientConfig
    }
  };
  init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
  const profiles = await (0, import_shared_ini_file_loader.parseKnownFiles)(init);
  return resolveProfileData(
    (0, import_shared_ini_file_loader.getProfileName)({
      profile: _init.profile ?? callerClientConfig?.profile
    }),
    profiles,
    init
  );
}, "fromIni");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  fromIni
});

