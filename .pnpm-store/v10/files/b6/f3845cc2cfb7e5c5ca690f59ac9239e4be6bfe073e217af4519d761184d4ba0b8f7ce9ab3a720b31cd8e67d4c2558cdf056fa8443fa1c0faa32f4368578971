import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  __commonJS,
  __require,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/app-root-dir/lib/index.js
var require_lib = __commonJS({
  "../node_modules/app-root-dir/lib/index.js"(exports) {
    var GLOBAL_KEY = "app-root-dir", _rootDir;
    exports.get = function() {
      var dir = global[GLOBAL_KEY];
      if (dir)
        return dir;
      if (_rootDir === void 0) {
        var fs2 = __require("fs"), path2 = __require("path"), NODE_MODULES = path2.sep + "node_modules" + path2.sep, cwd = process.cwd(), pos = cwd.indexOf(NODE_MODULES);
        pos !== -1 ? _rootDir = cwd.substring(0, pos) : fs2.existsSync(path2.join(cwd, "package.json")) ? _rootDir = cwd : (pos = __dirname.indexOf(NODE_MODULES), pos === -1 ? _rootDir = path2.normalize(path2.join(__dirname, "..")) : _rootDir = __dirname.substring(0, pos));
      }
      return _rootDir;
    };
    exports.set = function(dir) {
      global[GLOBAL_KEY] = _rootDir = dir;
    };
  }
});

// ../node_modules/dotenv/package.json
var require_package = __commonJS({
  "../node_modules/dotenv/package.json"(exports, module) {
    module.exports = {
      name: "dotenv",
      version: "16.6.1",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: !1
      }
    };
  }
});

// ../node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "../node_modules/dotenv/lib/main.js"(exports, module) {
    var fs2 = __require("fs"), path2 = __require("path"), os = __require("os"), crypto = __require("crypto"), packageJson = require_package(), version = packageJson.version, LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      let obj = {}, lines = src.toString();
      lines = lines.replace(/\r\n?/mg, `
`);
      let match;
      for (; (match = LINE.exec(lines)) != null; ) {
        let key = match[1], value = match[2] || "";
        value = value.trim();
        let maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), maybeQuote === '"' && (value = value.replace(/\\n/g, `
`), value = value.replace(/\\r/g, "\r")), obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      let vaultPath = _vaultPath(options);
      options.path = vaultPath;
      let result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        let err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        throw err.code = "MISSING_DATA", err;
      }
      let keys = _dotenvKey(options).split(","), length = keys.length, decrypted;
      for (let i = 0; i < length; i++)
        try {
          let key = keys[i].trim(), attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length)
            throw error;
        }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _log(message) {
      console.log(`[dotenv@${version}] ${message}`);
    }
    function _dotenvKey(options) {
      return options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0 ? options.DOTENV_KEY : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0 ? process.env.DOTENV_KEY : "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          let err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          throw err.code = "INVALID_DOTENV_KEY", err;
        }
        throw error;
      }
      let key = uri.password;
      if (!key) {
        let err = new Error("INVALID_DOTENV_KEY: Missing key part");
        throw err.code = "INVALID_DOTENV_KEY", err;
      }
      let environment = uri.searchParams.get("environment");
      if (!environment) {
        let err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        throw err.code = "INVALID_DOTENV_KEY", err;
      }
      let environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`, ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        let err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        throw err.code = "NOT_FOUND_DOTENV_ENVIRONMENT", err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0)
        if (Array.isArray(options.path))
          for (let filepath of options.path)
            fs2.existsSync(filepath) && (possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`);
        else
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
      else
        possibleVaultPath = path2.resolve(process.cwd(), ".env.vault");
      return fs2.existsSync(possibleVaultPath) ? possibleVaultPath : null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path2.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      let debug = !!(options && options.debug), quiet = options && "quiet" in options ? options.quiet : !0;
      (debug || !quiet) && _log("Loading env from encrypted .env.vault");
      let parsed = DotenvModule._parseVault(options), processEnv = process.env;
      return options && options.processEnv != null && (processEnv = options.processEnv), DotenvModule.populate(processEnv, parsed, options), { parsed };
    }
    function configDotenv(options) {
      let dotenvPath = path2.resolve(process.cwd(), ".env"), encoding = "utf8", debug = !!(options && options.debug), quiet = options && "quiet" in options ? options.quiet : !0;
      options && options.encoding ? encoding = options.encoding : debug && _debug("No encoding is specified. UTF-8 is used by default");
      let optionPaths = [dotenvPath];
      if (options && options.path)
        if (!Array.isArray(options.path))
          optionPaths = [_resolveHome(options.path)];
        else {
          optionPaths = [];
          for (let filepath of options.path)
            optionPaths.push(_resolveHome(filepath));
        }
      let lastError, parsedAll = {};
      for (let path3 of optionPaths)
        try {
          let parsed = DotenvModule.parse(fs2.readFileSync(path3, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          debug && _debug(`Failed to load ${path3} ${e.message}`), lastError = e;
        }
      let processEnv = process.env;
      if (options && options.processEnv != null && (processEnv = options.processEnv), DotenvModule.populate(processEnv, parsedAll, options), debug || !quiet) {
        let keysCount = Object.keys(parsedAll).length, shortPaths = [];
        for (let filePath of optionPaths)
          try {
            let relative = path2.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            debug && _debug(`Failed to load ${filePath} ${e.message}`), lastError = e;
          }
        _log(`injecting env (${keysCount}) from ${shortPaths.join(",")}`);
      }
      return lastError ? { parsed: parsedAll, error: lastError } : { parsed: parsedAll };
    }
    function config(options) {
      if (_dotenvKey(options).length === 0)
        return DotenvModule.configDotenv(options);
      let vaultPath = _vaultPath(options);
      return vaultPath ? DotenvModule._configVault(options) : (_warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`), DotenvModule.configDotenv(options));
    }
    function decrypt(encrypted, keyStr) {
      let key = Buffer.from(keyStr.slice(-64), "hex"), ciphertext = Buffer.from(encrypted, "base64"), nonce = ciphertext.subarray(0, 12), authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        let aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        return aesgcm.setAuthTag(authTag), `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        let isRange = error instanceof RangeError, invalidKeyLength = error.message === "Invalid key length", decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          let err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          throw err.code = "INVALID_DOTENV_KEY", err;
        } else if (decryptionFailed) {
          let err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          throw err.code = "DECRYPTION_FAILED", err;
        } else
          throw error;
      }
    }
    function populate(processEnv, parsed, options = {}) {
      let debug = !!(options && options.debug), override = !!(options && options.override);
      if (typeof parsed != "object") {
        let err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        throw err.code = "OBJECT_REQUIRED", err;
      }
      for (let key of Object.keys(parsed))
        Object.prototype.hasOwnProperty.call(processEnv, key) ? (override === !0 && (processEnv[key] = parsed[key]), debug && _debug(override === !0 ? `"${key}" is already defined and WAS overwritten` : `"${key}" is already defined and was NOT overwritten`)) : processEnv[key] = parsed[key];
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// ../node_modules/lazy-universal-dotenv/node_modules/dotenv-expand/lib/main.js
var require_main2 = __commonJS({
  "../node_modules/lazy-universal-dotenv/node_modules/dotenv-expand/lib/main.js"(exports, module) {
    "use strict";
    function _searchLast(str, rgx) {
      let matches = Array.from(str.matchAll(rgx));
      return matches.length > 0 ? matches.slice(-1)[0].index : -1;
    }
    function _interpolate(envValue, environment, config) {
      let lastUnescapedDollarSignIndex = _searchLast(envValue, /(?!(?<=\\))\$/g);
      if (lastUnescapedDollarSignIndex === -1) return envValue;
      let rightMostGroup = envValue.slice(lastUnescapedDollarSignIndex), matchGroup = /((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/, match = rightMostGroup.match(matchGroup);
      if (match != null) {
        let [, group, variableName, defaultValue] = match;
        return _interpolate(
          envValue.replace(
            group,
            environment[variableName] || defaultValue || config.parsed[variableName] || ""
          ),
          environment,
          config
        );
      }
      return envValue;
    }
    function _resolveEscapeSequences(value) {
      return value.replace(/\\\$/g, "$");
    }
    function expand(config) {
      let environment = config.ignoreProcessEnv ? {} : process.env;
      for (let configKey in config.parsed) {
        let value = Object.prototype.hasOwnProperty.call(environment, configKey) ? environment[configKey] : config.parsed[configKey];
        config.parsed[configKey] = _resolveEscapeSequences(
          _interpolate(value, environment, config)
        );
      }
      for (let processKey in config.parsed)
        environment[processKey] = config.parsed[processKey];
      return config;
    }
    module.exports.expand = expand;
  }
});

// ../node_modules/lazy-universal-dotenv/lib/index.mjs
var import_app_root_dir = __toESM(require_lib(), 1), import_dotenv = __toESM(require_main(), 1), import_dotenv_expand = __toESM(require_main2(), 1);
import fs from "fs";
import path from "path";
var dotEnvBase = path.join(import_app_root_dir.default.get(), ".env");
function getEnvironment({ nodeEnv, buildTarget } = {}) {
  let raw = {}, stringified = {}, webpack = { "process.env": stringified }, NODE_ENV = typeof nodeEnv > "u" ? process.env.NODE_ENV : nodeEnv, BUILD_TARGET = typeof nodeEnv > "u" ? process.env.BUILD_TARGET : buildTarget;
  return [
    BUILD_TARGET && NODE_ENV && `${dotEnvBase}.${BUILD_TARGET}.${NODE_ENV}.local`,
    BUILD_TARGET && NODE_ENV && `${dotEnvBase}.${BUILD_TARGET}.${NODE_ENV}`,
    BUILD_TARGET && NODE_ENV !== "test" && `${dotEnvBase}.${BUILD_TARGET}.local`,
    BUILD_TARGET && `${dotEnvBase}.${BUILD_TARGET}`,
    NODE_ENV && `${dotEnvBase}.${NODE_ENV}.local`,
    NODE_ENV && `${dotEnvBase}.${NODE_ENV}`,
    NODE_ENV !== "test" && `${dotEnvBase}.local`,
    dotEnvBase
  ].filter(Boolean).forEach((dotenvFile) => {
    if (fs.existsSync(dotenvFile)) {
      let config = import_dotenv.default.config({
        path: dotenvFile
      });
      raw = Object.assign({}, raw, import_dotenv_expand.default.expand(config).parsed);
    }
  }), Object.keys(raw).forEach((key) => {
    stringified[key] = JSON.stringify(raw[key]);
  }), { raw, stringified, webpack };
}
export {
  getEnvironment
};
