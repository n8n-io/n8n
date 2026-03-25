var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  loadConfig: () => loadConfig
});
module.exports = __toCommonJS(src_exports);

// src/configLoader.ts


// src/fromEnv.ts
var import_property_provider = require("@smithy/property-provider");

// src/getSelectorName.ts
function getSelectorName(functionString) {
  try {
    const constants = new Set(Array.from(functionString.match(/([A-Z_]){3,}/g) ?? []));
    constants.delete("CONFIG");
    constants.delete("CONFIG_PREFIX_SEPARATOR");
    constants.delete("ENV");
    return [...constants].join(", ");
  } catch (e) {
    return functionString;
  }
}
__name(getSelectorName, "getSelectorName");

// src/fromEnv.ts
var fromEnv = /* @__PURE__ */ __name((envVarSelector, options) => async () => {
  try {
    const config = envVarSelector(process.env, options);
    if (config === void 0) {
      throw new Error();
    }
    return config;
  } catch (e) {
    throw new import_property_provider.CredentialsProviderError(
      e.message || `Not found in ENV: ${getSelectorName(envVarSelector.toString())}`,
      { logger: options?.logger }
    );
  }
}, "fromEnv");

// src/fromSharedConfigFiles.ts

var import_shared_ini_file_loader = require("@smithy/shared-ini-file-loader");
var fromSharedConfigFiles = /* @__PURE__ */ __name((configSelector, { preferredFile = "config", ...init } = {}) => async () => {
  const profile = (0, import_shared_ini_file_loader.getProfileName)(init);
  const { configFile, credentialsFile } = await (0, import_shared_ini_file_loader.loadSharedConfigFiles)(init);
  const profileFromCredentials = credentialsFile[profile] || {};
  const profileFromConfig = configFile[profile] || {};
  const mergedProfile = preferredFile === "config" ? { ...profileFromCredentials, ...profileFromConfig } : { ...profileFromConfig, ...profileFromCredentials };
  try {
    const cfgFile = preferredFile === "config" ? configFile : credentialsFile;
    const configValue = configSelector(mergedProfile, cfgFile);
    if (configValue === void 0) {
      throw new Error();
    }
    return configValue;
  } catch (e) {
    throw new import_property_provider.CredentialsProviderError(
      e.message || `Not found in config files w/ profile [${profile}]: ${getSelectorName(configSelector.toString())}`,
      { logger: init.logger }
    );
  }
}, "fromSharedConfigFiles");

// src/fromStatic.ts

var isFunction = /* @__PURE__ */ __name((func) => typeof func === "function", "isFunction");
var fromStatic = /* @__PURE__ */ __name((defaultValue) => isFunction(defaultValue) ? async () => await defaultValue() : (0, import_property_provider.fromStatic)(defaultValue), "fromStatic");

// src/configLoader.ts
var loadConfig = /* @__PURE__ */ __name(({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => {
  const { signingName, logger } = configuration;
  const envOptions = { signingName, logger };
  return (0, import_property_provider.memoize)(
    (0, import_property_provider.chain)(
      fromEnv(environmentVariableSelector, envOptions),
      fromSharedConfigFiles(configFileSelector, configuration),
      fromStatic(defaultValue)
    )
  );
}, "loadConfig");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  loadConfig
});

