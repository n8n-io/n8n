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
  StatusTypeIdMismatchError
} from "../_node-chunks/chunk-WBTDMYZM.js";
import {
  debounce,
  getErrorLevel,
  isTelemetryEnabled,
  mapStaticDir,
  parseStaticDir,
  sendTelemetryError,
  useStatics,
  withTelemetry
} from "../_node-chunks/chunk-2372JZ52.js";
import "../_node-chunks/chunk-ONZANTK7.js";
import {
  detectPnp
} from "../_node-chunks/chunk-5GQBCZKW.js";
import {
  StorybookError
} from "../_node-chunks/chunk-WANDQWBR.js";
import {
  telemetry
} from "../_node-chunks/chunk-R2IXPA5M.js";
import "../_node-chunks/chunk-YJM63TNA.js";
import {
  optionalEnvToBoolean,
  require_cross_spawn,
  resolveImport,
  supportedExtensions,
  userOrAutoTitleFromSpecifier
} from "../_node-chunks/chunk-Q4DOC7HF.js";
import "../_node-chunks/chunk-WAL24RZR.js";
import "../_node-chunks/chunk-HH2SN3H2.js";
import {
  require_pretty_hrtime
} from "../_node-chunks/chunk-GRQFL3SI.js";
import "../_node-chunks/chunk-EQLFU5BD.js";
import {
  invariant,
  up2 as up
} from "../_node-chunks/chunk-PFJRSBIJ.js";
import {
  importModule,
  resolvePackageDir
} from "../_node-chunks/chunk-O7UZQAUS.js";
import "../_node-chunks/chunk-NKSLKQ5F.js";
import {
  dirname,
  join,
  relative,
  resolve
} from "../_node-chunks/chunk-XS5OAKHK.js";
import "../_node-chunks/chunk-GSQVC33F.js";
import {
  slash
} from "../_node-chunks/chunk-PF7HEE6F.js";
import {
  require_dist
} from "../_node-chunks/chunk-SLZHVDN6.js";
import {
  require_lib,
  require_src
} from "../_node-chunks/chunk-HF7KKBBR.js";
import {
  require_picocolors
} from "../_node-chunks/chunk-LE232J7F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "../_node-chunks/chunk-DRM3MJ7Y.js";

// ../node_modules/tsconfig-paths/lib/filesystem.js
var require_filesystem = __commonJS({
  "../node_modules/tsconfig-paths/lib/filesystem.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.removeExtension = exports.fileExistsAsync = exports.readJsonFromDiskAsync = exports.readJsonFromDiskSync = exports.fileExistsSync = void 0;
    var fs = __require("fs");
    function fileExistsSync(path2) {
      if (!fs.existsSync(path2))
        return !1;
      try {
        var stats = fs.statSync(path2);
        return stats.isFile();
      } catch {
        return !1;
      }
    }
    exports.fileExistsSync = fileExistsSync;
    function readJsonFromDiskSync(packageJsonPath) {
      if (fs.existsSync(packageJsonPath))
        return __require(packageJsonPath);
    }
    exports.readJsonFromDiskSync = readJsonFromDiskSync;
    function readJsonFromDiskAsync(path2, callback) {
      fs.readFile(path2, "utf8", function(err, result) {
        if (err || !result)
          return callback();
        var json = JSON.parse(result);
        return callback(void 0, json);
      });
    }
    exports.readJsonFromDiskAsync = readJsonFromDiskAsync;
    function fileExistsAsync(path2, callback2) {
      fs.stat(path2, function(err, stats) {
        if (err)
          return callback2(void 0, !1);
        callback2(void 0, stats ? stats.isFile() : !1);
      });
    }
    exports.fileExistsAsync = fileExistsAsync;
    function removeExtension(path2) {
      return path2.substring(0, path2.lastIndexOf(".")) || path2;
    }
    exports.removeExtension = removeExtension;
  }
});

// ../node_modules/tsconfig-paths/lib/mapping-entry.js
var require_mapping_entry = __commonJS({
  "../node_modules/tsconfig-paths/lib/mapping-entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.getAbsoluteMappingEntries = void 0;
    var path2 = __require("path");
    function getAbsoluteMappingEntries(absoluteBaseUrl, paths, addMatchAll) {
      for (var sortedKeys = sortByLongestPrefix(Object.keys(paths)), absolutePaths = [], _i = 0, sortedKeys_1 = sortedKeys; _i < sortedKeys_1.length; _i++) {
        var key = sortedKeys_1[_i];
        absolutePaths.push({
          pattern: key,
          paths: paths[key].map(function(pathToResolve) {
            return path2.resolve(absoluteBaseUrl, pathToResolve);
          })
        });
      }
      return !paths["*"] && addMatchAll && absolutePaths.push({
        pattern: "*",
        paths: ["".concat(absoluteBaseUrl.replace(/\/$/, ""), "/*")]
      }), absolutePaths;
    }
    exports.getAbsoluteMappingEntries = getAbsoluteMappingEntries;
    function sortByLongestPrefix(arr) {
      return arr.concat().sort(function(a, b) {
        return getPrefixLength(b) - getPrefixLength(a);
      });
    }
    function getPrefixLength(pattern) {
      var prefixLength = pattern.indexOf("*");
      return pattern.substr(0, prefixLength).length;
    }
  }
});

// ../node_modules/tsconfig-paths/lib/try-path.js
var require_try_path = __commonJS({
  "../node_modules/tsconfig-paths/lib/try-path.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.exhaustiveTypeException = exports.getStrippedPath = exports.getPathsToTry = void 0;
    var path2 = __require("path"), path_1 = __require("path"), filesystem_1 = require_filesystem();
    function getPathsToTry(extensions, absolutePathMappings, requestedModule) {
      if (!(!absolutePathMappings || !requestedModule || requestedModule[0] === ".")) {
        for (var pathsToTry = [], _i = 0, absolutePathMappings_1 = absolutePathMappings; _i < absolutePathMappings_1.length; _i++) {
          var entry = absolutePathMappings_1[_i], starMatch = entry.pattern === requestedModule ? "" : matchStar(entry.pattern, requestedModule);
          if (starMatch !== void 0)
            for (var _loop_1 = function(physicalPathPattern2) {
              var physicalPath = physicalPathPattern2.replace("*", starMatch);
              pathsToTry.push({ type: "file", path: physicalPath }), pathsToTry.push.apply(pathsToTry, extensions.map(function(e) {
                return { type: "extension", path: physicalPath + e };
              })), pathsToTry.push({
                type: "package",
                path: path2.join(physicalPath, "/package.json")
              });
              var indexPath = path2.join(physicalPath, "/index");
              pathsToTry.push.apply(pathsToTry, extensions.map(function(e) {
                return { type: "index", path: indexPath + e };
              }));
            }, _a = 0, _b = entry.paths; _a < _b.length; _a++) {
              var physicalPathPattern = _b[_a];
              _loop_1(physicalPathPattern);
            }
        }
        return pathsToTry.length === 0 ? void 0 : pathsToTry;
      }
    }
    exports.getPathsToTry = getPathsToTry;
    function getStrippedPath(tryPath) {
      return tryPath.type === "index" ? (0, path_1.dirname)(tryPath.path) : tryPath.type === "file" ? tryPath.path : tryPath.type === "extension" ? (0, filesystem_1.removeExtension)(tryPath.path) : tryPath.type === "package" ? tryPath.path : exhaustiveTypeException(tryPath.type);
    }
    exports.getStrippedPath = getStrippedPath;
    function exhaustiveTypeException(check) {
      throw new Error("Unknown type ".concat(check));
    }
    exports.exhaustiveTypeException = exhaustiveTypeException;
    function matchStar(pattern, search) {
      if (!(search.length < pattern.length)) {
        if (pattern === "*")
          return search;
        var star = pattern.indexOf("*");
        if (star !== -1) {
          var part1 = pattern.substring(0, star), part2 = pattern.substring(star + 1);
          if (search.substr(0, star) === part1 && search.substr(search.length - part2.length) === part2)
            return search.substr(star, search.length - part2.length);
        }
      }
    }
  }
});

// ../node_modules/tsconfig-paths/lib/match-path-sync.js
var require_match_path_sync = __commonJS({
  "../node_modules/tsconfig-paths/lib/match-path-sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.matchFromAbsolutePaths = exports.createMatchPath = void 0;
    var path2 = __require("path"), Filesystem = require_filesystem(), MappingEntry = require_mapping_entry(), TryPath = require_try_path();
    function createMatchPath2(absoluteBaseUrl, paths, mainFields, addMatchAll) {
      mainFields === void 0 && (mainFields = ["main"]), addMatchAll === void 0 && (addMatchAll = !0);
      var absolutePaths = MappingEntry.getAbsoluteMappingEntries(absoluteBaseUrl, paths, addMatchAll);
      return function(requestedModule, readJson, fileExists2, extensions) {
        return matchFromAbsolutePaths(absolutePaths, requestedModule, readJson, fileExists2, extensions, mainFields);
      };
    }
    exports.createMatchPath = createMatchPath2;
    function matchFromAbsolutePaths(absolutePathMappings, requestedModule, readJson, fileExists2, extensions, mainFields) {
      readJson === void 0 && (readJson = Filesystem.readJsonFromDiskSync), fileExists2 === void 0 && (fileExists2 = Filesystem.fileExistsSync), extensions === void 0 && (extensions = Object.keys(__require.extensions)), mainFields === void 0 && (mainFields = ["main"]);
      var tryPaths = TryPath.getPathsToTry(extensions, absolutePathMappings, requestedModule);
      if (tryPaths)
        return findFirstExistingPath(tryPaths, readJson, fileExists2, mainFields);
    }
    exports.matchFromAbsolutePaths = matchFromAbsolutePaths;
    function findFirstExistingMainFieldMappedFile(packageJson, mainFields, packageJsonPath, fileExists2) {
      for (var index = 0; index < mainFields.length; index++) {
        var mainFieldSelector = mainFields[index], candidateMapping = typeof mainFieldSelector == "string" ? packageJson[mainFieldSelector] : mainFieldSelector.reduce(function(obj, key) {
          return obj[key];
        }, packageJson);
        if (candidateMapping && typeof candidateMapping == "string") {
          var candidateFilePath = path2.join(path2.dirname(packageJsonPath), candidateMapping);
          if (fileExists2(candidateFilePath))
            return candidateFilePath;
        }
      }
    }
    function findFirstExistingPath(tryPaths, readJson, fileExists2, mainFields) {
      readJson === void 0 && (readJson = Filesystem.readJsonFromDiskSync), mainFields === void 0 && (mainFields = ["main"]);
      for (var _i = 0, tryPaths_1 = tryPaths; _i < tryPaths_1.length; _i++) {
        var tryPath = tryPaths_1[_i];
        if (tryPath.type === "file" || tryPath.type === "extension" || tryPath.type === "index") {
          if (fileExists2(tryPath.path))
            return TryPath.getStrippedPath(tryPath);
        } else if (tryPath.type === "package") {
          var packageJson = readJson(tryPath.path);
          if (packageJson) {
            var mainFieldMappedFile = findFirstExistingMainFieldMappedFile(packageJson, mainFields, tryPath.path, fileExists2);
            if (mainFieldMappedFile)
              return mainFieldMappedFile;
          }
        } else
          TryPath.exhaustiveTypeException(tryPath.type);
      }
    }
  }
});

// ../node_modules/tsconfig-paths/lib/match-path-async.js
var require_match_path_async = __commonJS({
  "../node_modules/tsconfig-paths/lib/match-path-async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.matchFromAbsolutePathsAsync = exports.createMatchPathAsync = void 0;
    var path2 = __require("path"), TryPath = require_try_path(), MappingEntry = require_mapping_entry(), Filesystem = require_filesystem();
    function createMatchPathAsync(absoluteBaseUrl, paths, mainFields, addMatchAll) {
      mainFields === void 0 && (mainFields = ["main"]), addMatchAll === void 0 && (addMatchAll = !0);
      var absolutePaths = MappingEntry.getAbsoluteMappingEntries(absoluteBaseUrl, paths, addMatchAll);
      return function(requestedModule, readJson, fileExists2, extensions, callback) {
        return matchFromAbsolutePathsAsync(absolutePaths, requestedModule, readJson, fileExists2, extensions, callback, mainFields);
      };
    }
    exports.createMatchPathAsync = createMatchPathAsync;
    function matchFromAbsolutePathsAsync(absolutePathMappings, requestedModule, readJson, fileExists2, extensions, callback, mainFields) {
      readJson === void 0 && (readJson = Filesystem.readJsonFromDiskAsync), fileExists2 === void 0 && (fileExists2 = Filesystem.fileExistsAsync), extensions === void 0 && (extensions = Object.keys(__require.extensions)), mainFields === void 0 && (mainFields = ["main"]);
      var tryPaths = TryPath.getPathsToTry(extensions, absolutePathMappings, requestedModule);
      if (!tryPaths)
        return callback();
      findFirstExistingPath(tryPaths, readJson, fileExists2, callback, 0, mainFields);
    }
    exports.matchFromAbsolutePathsAsync = matchFromAbsolutePathsAsync;
    function findFirstExistingMainFieldMappedFile(packageJson, mainFields, packageJsonPath, fileExistsAsync, doneCallback, index) {
      if (index === void 0 && (index = 0), index >= mainFields.length)
        return doneCallback(void 0, void 0);
      var tryNext = function() {
        return findFirstExistingMainFieldMappedFile(packageJson, mainFields, packageJsonPath, fileExistsAsync, doneCallback, index + 1);
      }, mainFieldSelector = mainFields[index], mainFieldMapping = typeof mainFieldSelector == "string" ? packageJson[mainFieldSelector] : mainFieldSelector.reduce(function(obj, key) {
        return obj[key];
      }, packageJson);
      if (typeof mainFieldMapping != "string")
        return tryNext();
      var mappedFilePath = path2.join(path2.dirname(packageJsonPath), mainFieldMapping);
      fileExistsAsync(mappedFilePath, function(err, exists) {
        return err ? doneCallback(err) : exists ? doneCallback(void 0, mappedFilePath) : tryNext();
      });
    }
    function findFirstExistingPath(tryPaths, readJson, fileExists2, doneCallback, index, mainFields) {
      index === void 0 && (index = 0), mainFields === void 0 && (mainFields = ["main"]);
      var tryPath = tryPaths[index];
      tryPath.type === "file" || tryPath.type === "extension" || tryPath.type === "index" ? fileExists2(tryPath.path, function(err, exists) {
        return err ? doneCallback(err) : exists ? doneCallback(void 0, TryPath.getStrippedPath(tryPath)) : index === tryPaths.length - 1 ? doneCallback() : findFirstExistingPath(tryPaths, readJson, fileExists2, doneCallback, index + 1, mainFields);
      }) : tryPath.type === "package" ? readJson(tryPath.path, function(err, packageJson) {
        return err ? doneCallback(err) : packageJson ? findFirstExistingMainFieldMappedFile(packageJson, mainFields, tryPath.path, fileExists2, function(mainFieldErr, mainFieldMappedFile) {
          return mainFieldErr ? doneCallback(mainFieldErr) : mainFieldMappedFile ? doneCallback(void 0, mainFieldMappedFile) : findFirstExistingPath(tryPaths, readJson, fileExists2, doneCallback, index + 1, mainFields);
        }) : findFirstExistingPath(tryPaths, readJson, fileExists2, doneCallback, index + 1, mainFields);
      }) : TryPath.exhaustiveTypeException(tryPath.type);
    }
  }
});

// ../node_modules/strip-bom/index.js
var require_strip_bom = __commonJS({
  "../node_modules/strip-bom/index.js"(exports, module) {
    "use strict";
    module.exports = (x) => {
      if (typeof x != "string")
        throw new TypeError("Expected a string, got " + typeof x);
      return x.charCodeAt(0) === 65279 ? x.slice(1) : x;
    };
  }
});

// ../node_modules/tsconfig-paths/lib/tsconfig-loader.js
var require_tsconfig_loader = __commonJS({
  "../node_modules/tsconfig-paths/lib/tsconfig-loader.js"(exports) {
    "use strict";
    var __assign = exports && exports.__assign || function() {
      return __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (t[p] = s[p]);
        }
        return t;
      }, __assign.apply(this, arguments);
    };
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.loadTsconfig = exports.walkForTsConfig = exports.tsConfigLoader = void 0;
    var path2 = __require("path"), fs = __require("fs"), JSON5 = require_lib(), StripBom = require_strip_bom();
    function tsConfigLoader(_a) {
      var getEnv = _a.getEnv, cwd = _a.cwd, _b = _a.loadSync, loadSync = _b === void 0 ? loadSyncDefault : _b, TS_NODE_PROJECT = getEnv("TS_NODE_PROJECT"), TS_NODE_BASEURL = getEnv("TS_NODE_BASEURL"), loadResult = loadSync(cwd, TS_NODE_PROJECT, TS_NODE_BASEURL);
      return loadResult;
    }
    exports.tsConfigLoader = tsConfigLoader;
    function loadSyncDefault(cwd, filename, baseUrl) {
      var configPath = resolveConfigPath(cwd, filename);
      if (!configPath)
        return {
          tsConfigPath: void 0,
          baseUrl: void 0,
          paths: void 0
        };
      var config = loadTsconfig(configPath);
      return {
        tsConfigPath: configPath,
        baseUrl: baseUrl || config && config.compilerOptions && config.compilerOptions.baseUrl,
        paths: config && config.compilerOptions && config.compilerOptions.paths
      };
    }
    function resolveConfigPath(cwd, filename) {
      if (filename) {
        var absolutePath = fs.lstatSync(filename).isDirectory() ? path2.resolve(filename, "./tsconfig.json") : path2.resolve(cwd, filename);
        return absolutePath;
      }
      if (fs.statSync(cwd).isFile())
        return path2.resolve(cwd);
      var configAbsolutePath = walkForTsConfig(cwd);
      return configAbsolutePath ? path2.resolve(configAbsolutePath) : void 0;
    }
    function walkForTsConfig(directory, readdirSync2) {
      readdirSync2 === void 0 && (readdirSync2 = fs.readdirSync);
      for (var files = readdirSync2(directory), filesToCheck = ["tsconfig.json", "jsconfig.json"], _i = 0, filesToCheck_1 = filesToCheck; _i < filesToCheck_1.length; _i++) {
        var fileToCheck = filesToCheck_1[_i];
        if (files.indexOf(fileToCheck) !== -1)
          return path2.join(directory, fileToCheck);
      }
      var parentDirectory = path2.dirname(directory);
      if (directory !== parentDirectory)
        return walkForTsConfig(parentDirectory, readdirSync2);
    }
    exports.walkForTsConfig = walkForTsConfig;
    function loadTsconfig(configFilePath, existsSync3, readFileSync) {
      if (existsSync3 === void 0 && (existsSync3 = fs.existsSync), readFileSync === void 0 && (readFileSync = function(filename) {
        return fs.readFileSync(filename, "utf8");
      }), !!existsSync3(configFilePath)) {
        var configString = readFileSync(configFilePath), cleanedJson = StripBom(configString), config;
        try {
          config = JSON5.parse(cleanedJson);
        } catch (e) {
          throw new Error("".concat(configFilePath, " is malformed ").concat(e.message));
        }
        var extendedConfig = config.extends;
        if (extendedConfig) {
          var base = void 0;
          return Array.isArray(extendedConfig) ? base = extendedConfig.reduce(function(currBase, extendedConfigElement) {
            return mergeTsconfigs(currBase, loadTsconfigFromExtends(configFilePath, extendedConfigElement, existsSync3, readFileSync));
          }, {}) : base = loadTsconfigFromExtends(configFilePath, extendedConfig, existsSync3, readFileSync), mergeTsconfigs(base, config);
        }
        return config;
      }
    }
    exports.loadTsconfig = loadTsconfig;
    function loadTsconfigFromExtends(configFilePath, extendedConfigValue, existsSync3, readFileSync) {
      var _a;
      typeof extendedConfigValue == "string" && extendedConfigValue.indexOf(".json") === -1 && (extendedConfigValue += ".json");
      var currentDir = path2.dirname(configFilePath), extendedConfigPath = path2.join(currentDir, extendedConfigValue);
      extendedConfigValue.indexOf("/") !== -1 && extendedConfigValue.indexOf(".") !== -1 && !existsSync3(extendedConfigPath) && (extendedConfigPath = path2.join(currentDir, "node_modules", extendedConfigValue));
      var config = loadTsconfig(extendedConfigPath, existsSync3, readFileSync) || {};
      if (!((_a = config.compilerOptions) === null || _a === void 0) && _a.baseUrl) {
        var extendsDir = path2.dirname(extendedConfigValue);
        config.compilerOptions.baseUrl = path2.join(extendsDir, config.compilerOptions.baseUrl);
      }
      return config;
    }
    function mergeTsconfigs(base, config) {
      return base = base || {}, config = config || {}, __assign(__assign(__assign({}, base), config), { compilerOptions: __assign(__assign({}, base.compilerOptions), config.compilerOptions) });
    }
  }
});

// ../node_modules/tsconfig-paths/lib/config-loader.js
var require_config_loader = __commonJS({
  "../node_modules/tsconfig-paths/lib/config-loader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.configLoader = exports.loadConfig = void 0;
    var TsConfigLoader2 = require_tsconfig_loader(), path2 = __require("path");
    function loadConfig3(cwd) {
      return cwd === void 0 && (cwd = process.cwd()), configLoader({ cwd });
    }
    exports.loadConfig = loadConfig3;
    function configLoader(_a) {
      var cwd = _a.cwd, explicitParams = _a.explicitParams, _b = _a.tsConfigLoader, tsConfigLoader = _b === void 0 ? TsConfigLoader2.tsConfigLoader : _b;
      if (explicitParams) {
        var absoluteBaseUrl = path2.isAbsolute(explicitParams.baseUrl) ? explicitParams.baseUrl : path2.join(cwd, explicitParams.baseUrl);
        return {
          resultType: "success",
          configFileAbsolutePath: "",
          baseUrl: explicitParams.baseUrl,
          absoluteBaseUrl,
          paths: explicitParams.paths,
          mainFields: explicitParams.mainFields,
          addMatchAll: explicitParams.addMatchAll
        };
      }
      var loadResult = tsConfigLoader({
        cwd,
        getEnv: function(key) {
          return process.env[key];
        }
      });
      return loadResult.tsConfigPath ? {
        resultType: "success",
        configFileAbsolutePath: loadResult.tsConfigPath,
        baseUrl: loadResult.baseUrl,
        absoluteBaseUrl: path2.resolve(path2.dirname(loadResult.tsConfigPath), loadResult.baseUrl || ""),
        paths: loadResult.paths || {},
        addMatchAll: loadResult.baseUrl !== void 0
      } : {
        resultType: "failed",
        message: "Couldn't find tsconfig.json"
      };
    }
    exports.configLoader = configLoader;
  }
});

// ../node_modules/minimist/index.js
var require_minimist = __commonJS({
  "../node_modules/minimist/index.js"(exports, module) {
    "use strict";
    function hasKey(obj, keys) {
      var o = obj;
      keys.slice(0, -1).forEach(function(key2) {
        o = o[key2] || {};
      });
      var key = keys[keys.length - 1];
      return key in o;
    }
    function isNumber(x) {
      return typeof x == "number" || /^0x[0-9a-f]+$/i.test(x) ? !0 : /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
    }
    function isConstructorOrProto(obj, key) {
      return key === "constructor" && typeof obj[key] == "function" || key === "__proto__";
    }
    module.exports = function(args, opts) {
      opts || (opts = {});
      var flags = {
        bools: {},
        strings: {},
        unknownFn: null
      };
      typeof opts.unknown == "function" && (flags.unknownFn = opts.unknown), typeof opts.boolean == "boolean" && opts.boolean ? flags.allBools = !0 : [].concat(opts.boolean).filter(Boolean).forEach(function(key2) {
        flags.bools[key2] = !0;
      });
      var aliases = {};
      function aliasIsBoolean(key2) {
        return aliases[key2].some(function(x) {
          return flags.bools[x];
        });
      }
      Object.keys(opts.alias || {}).forEach(function(key2) {
        aliases[key2] = [].concat(opts.alias[key2]), aliases[key2].forEach(function(x) {
          aliases[x] = [key2].concat(aliases[key2].filter(function(y) {
            return x !== y;
          }));
        });
      }), [].concat(opts.string).filter(Boolean).forEach(function(key2) {
        flags.strings[key2] = !0, aliases[key2] && [].concat(aliases[key2]).forEach(function(k) {
          flags.strings[k] = !0;
        });
      });
      var defaults = opts.default || {}, argv = { _: [] };
      function argDefined(key2, arg2) {
        return flags.allBools && /^--[^=]+$/.test(arg2) || flags.strings[key2] || flags.bools[key2] || aliases[key2];
      }
      function setKey(obj, keys, value2) {
        for (var o = obj, i2 = 0; i2 < keys.length - 1; i2++) {
          var key2 = keys[i2];
          if (isConstructorOrProto(o, key2))
            return;
          o[key2] === void 0 && (o[key2] = {}), (o[key2] === Object.prototype || o[key2] === Number.prototype || o[key2] === String.prototype) && (o[key2] = {}), o[key2] === Array.prototype && (o[key2] = []), o = o[key2];
        }
        var lastKey = keys[keys.length - 1];
        isConstructorOrProto(o, lastKey) || ((o === Object.prototype || o === Number.prototype || o === String.prototype) && (o = {}), o === Array.prototype && (o = []), o[lastKey] === void 0 || flags.bools[lastKey] || typeof o[lastKey] == "boolean" ? o[lastKey] = value2 : Array.isArray(o[lastKey]) ? o[lastKey].push(value2) : o[lastKey] = [o[lastKey], value2]);
      }
      function setArg(key2, val, arg2) {
        if (!(arg2 && flags.unknownFn && !argDefined(key2, arg2) && flags.unknownFn(arg2) === !1)) {
          var value2 = !flags.strings[key2] && isNumber(val) ? Number(val) : val;
          setKey(argv, key2.split("."), value2), (aliases[key2] || []).forEach(function(x) {
            setKey(argv, x.split("."), value2);
          });
        }
      }
      Object.keys(flags.bools).forEach(function(key2) {
        setArg(key2, defaults[key2] === void 0 ? !1 : defaults[key2]);
      });
      var notFlags = [];
      args.indexOf("--") !== -1 && (notFlags = args.slice(args.indexOf("--") + 1), args = args.slice(0, args.indexOf("--")));
      for (var i = 0; i < args.length; i++) {
        var arg = args[i], key, next;
        if (/^--.+=/.test(arg)) {
          var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
          key = m[1];
          var value = m[2];
          flags.bools[key] && (value = value !== "false"), setArg(key, value, arg);
        } else if (/^--no-.+/.test(arg))
          key = arg.match(/^--no-(.+)/)[1], setArg(key, !1, arg);
        else if (/^--.+/.test(arg))
          key = arg.match(/^--(.+)/)[1], next = args[i + 1], next !== void 0 && !/^(-|--)[^-]/.test(next) && !flags.bools[key] && !flags.allBools && (!aliases[key] || !aliasIsBoolean(key)) ? (setArg(key, next, arg), i += 1) : /^(true|false)$/.test(next) ? (setArg(key, next === "true", arg), i += 1) : setArg(key, flags.strings[key] ? "" : !0, arg);
        else if (/^-[^-]+/.test(arg)) {
          for (var letters = arg.slice(1, -1).split(""), broken = !1, j = 0; j < letters.length; j++) {
            if (next = arg.slice(j + 2), next === "-") {
              setArg(letters[j], next, arg);
              continue;
            }
            if (/[A-Za-z]/.test(letters[j]) && next[0] === "=") {
              setArg(letters[j], next.slice(1), arg), broken = !0;
              break;
            }
            if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
              setArg(letters[j], next, arg), broken = !0;
              break;
            }
            if (letters[j + 1] && letters[j + 1].match(/\W/)) {
              setArg(letters[j], arg.slice(j + 2), arg), broken = !0;
              break;
            } else
              setArg(letters[j], flags.strings[letters[j]] ? "" : !0, arg);
          }
          key = arg.slice(-1)[0], !broken && key !== "-" && (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !flags.bools[key] && (!aliases[key] || !aliasIsBoolean(key)) ? (setArg(key, args[i + 1], arg), i += 1) : args[i + 1] && /^(true|false)$/.test(args[i + 1]) ? (setArg(key, args[i + 1] === "true", arg), i += 1) : setArg(key, flags.strings[key] ? "" : !0, arg));
        } else if ((!flags.unknownFn || flags.unknownFn(arg) !== !1) && argv._.push(flags.strings._ || !isNumber(arg) ? arg : Number(arg)), opts.stopEarly) {
          argv._.push.apply(argv._, args.slice(i + 1));
          break;
        }
      }
      return Object.keys(defaults).forEach(function(k) {
        hasKey(argv, k.split(".")) || (setKey(argv, k.split("."), defaults[k]), (aliases[k] || []).forEach(function(x) {
          setKey(argv, x.split("."), defaults[k]);
        }));
      }), opts["--"] ? argv["--"] = notFlags.slice() : notFlags.forEach(function(k) {
        argv._.push(k);
      }), argv;
    };
  }
});

// ../node_modules/tsconfig-paths/lib/register.js
var require_register = __commonJS({
  "../node_modules/tsconfig-paths/lib/register.js"(exports) {
    "use strict";
    var __spreadArray = exports && exports.__spreadArray || function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++)
        (ar || !(i in from)) && (ar || (ar = Array.prototype.slice.call(from, 0, i)), ar[i] = from[i]);
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.register = void 0;
    var match_path_sync_1 = require_match_path_sync(), config_loader_1 = require_config_loader(), noOp = function() {
    };
    function getCoreModules(builtinModules) {
      builtinModules = builtinModules || [
        "assert",
        "buffer",
        "child_process",
        "cluster",
        "crypto",
        "dgram",
        "dns",
        "domain",
        "events",
        "fs",
        "http",
        "https",
        "net",
        "os",
        "path",
        "punycode",
        "querystring",
        "readline",
        "stream",
        "string_decoder",
        "tls",
        "tty",
        "url",
        "util",
        "v8",
        "vm",
        "zlib"
      ];
      for (var coreModules = {}, _i = 0, builtinModules_1 = builtinModules; _i < builtinModules_1.length; _i++) {
        var module_1 = builtinModules_1[_i];
        coreModules[module_1] = !0;
      }
      return coreModules;
    }
    function register(params) {
      var cwd, explicitParams;
      if (params)
        cwd = params.cwd, (params.baseUrl || params.paths) && (explicitParams = params);
      else {
        var minimist = require_minimist(), argv = minimist(process.argv.slice(2), {
          // eslint-disable-next-line id-denylist
          string: ["project"],
          alias: {
            project: ["P"]
          }
        });
        cwd = argv.project;
      }
      var configLoaderResult = (0, config_loader_1.configLoader)({
        cwd: cwd ?? process.cwd(),
        explicitParams
      });
      if (configLoaderResult.resultType === "failed")
        return console.warn("".concat(configLoaderResult.message, ". tsconfig-paths will be skipped")), noOp;
      var matchPath = (0, match_path_sync_1.createMatchPath)(configLoaderResult.absoluteBaseUrl, configLoaderResult.paths, configLoaderResult.mainFields, configLoaderResult.addMatchAll), Module = __require("module"), originalResolveFilename = Module._resolveFilename, coreModules = getCoreModules(Module.builtinModules);
      return Module._resolveFilename = function(request, _parent) {
        var isCoreModule = coreModules.hasOwnProperty(request);
        if (!isCoreModule) {
          var found = matchPath(request);
          if (found) {
            var modifiedArguments = __spreadArray([found], [].slice.call(arguments, 1), !0);
            return originalResolveFilename.apply(this, modifiedArguments);
          }
        }
        return originalResolveFilename.apply(this, arguments);
      }, function() {
        Module._resolveFilename = originalResolveFilename;
      };
    }
    exports.register = register;
  }
});

// ../node_modules/tsconfig-paths/lib/index.js
var require_lib2 = __commonJS({
  "../node_modules/tsconfig-paths/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.loadConfig = exports.register = exports.matchFromAbsolutePathsAsync = exports.createMatchPathAsync = exports.matchFromAbsolutePaths = exports.createMatchPath = void 0;
    var match_path_sync_1 = require_match_path_sync();
    Object.defineProperty(exports, "createMatchPath", { enumerable: !0, get: function() {
      return match_path_sync_1.createMatchPath;
    } });
    Object.defineProperty(exports, "matchFromAbsolutePaths", { enumerable: !0, get: function() {
      return match_path_sync_1.matchFromAbsolutePaths;
    } });
    var match_path_async_1 = require_match_path_async();
    Object.defineProperty(exports, "createMatchPathAsync", { enumerable: !0, get: function() {
      return match_path_async_1.createMatchPathAsync;
    } });
    Object.defineProperty(exports, "matchFromAbsolutePathsAsync", { enumerable: !0, get: function() {
      return match_path_async_1.matchFromAbsolutePathsAsync;
    } });
    var register_1 = require_register();
    Object.defineProperty(exports, "register", { enumerable: !0, get: function() {
      return register_1.register;
    } });
    var config_loader_1 = require_config_loader();
    Object.defineProperty(exports, "loadConfig", { enumerable: !0, get: function() {
      return config_loader_1.loadConfig;
    } });
  }
});

// ../node_modules/@discoveryjs/json-ext/package.json
var require_package = __commonJS({
  "../node_modules/@discoveryjs/json-ext/package.json"(exports, module) {
    module.exports = {
      name: "@discoveryjs/json-ext",
      version: "0.5.7",
      description: "A set of utilities that extend the use of JSON",
      keywords: [
        "json",
        "utils",
        "stream",
        "async",
        "promise",
        "stringify",
        "info"
      ],
      author: "Roman Dvornov <rdvornov@gmail.com> (https://github.com/lahmatiy)",
      license: "MIT",
      repository: "discoveryjs/json-ext",
      main: "./src/index",
      browser: {
        "./src/stringify-stream.js": "./src/stringify-stream-browser.js",
        "./src/text-decoder.js": "./src/text-decoder-browser.js",
        "./src/version.js": "./dist/version.js"
      },
      types: "./index.d.ts",
      scripts: {
        test: "mocha --reporter progress",
        lint: "eslint src test",
        "lint-and-test": "npm run lint && npm test",
        build: "rollup --config",
        "test:all": "npm run test:src && npm run test:dist",
        "test:src": "npm test",
        "test:dist": "cross-env MODE=dist npm test && cross-env MODE=dist-min npm test",
        "build-and-test": "npm run build && npm run test:dist",
        coverage: "c8 --reporter=lcovonly npm test",
        prepublishOnly: "npm run lint && npm test && npm run build-and-test"
      },
      devDependencies: {
        "@rollup/plugin-commonjs": "^15.1.0",
        "@rollup/plugin-json": "^4.1.0",
        "@rollup/plugin-node-resolve": "^9.0.0",
        c8: "^7.10.0",
        chalk: "^4.1.0",
        "cross-env": "^7.0.3",
        eslint: "^8.10.0",
        mocha: "^8.4.0",
        rollup: "^2.28.2",
        "rollup-plugin-terser": "^7.0.2"
      },
      engines: {
        node: ">=10.0.0"
      },
      files: [
        "dist",
        "src",
        "index.d.ts"
      ]
    };
  }
});

// ../node_modules/@discoveryjs/json-ext/src/version.js
var require_version = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/version.js"(exports, module) {
    module.exports = require_package().version;
  }
});

// ../node_modules/@discoveryjs/json-ext/src/utils.js
var require_utils = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/utils.js"(exports, module) {
    var escapableCharCodeSubstitution = {
      // JSON Single Character Escape Sequences
      8: "\\b",
      9: "\\t",
      10: "\\n",
      12: "\\f",
      13: "\\r",
      34: '\\"',
      92: "\\\\"
    };
    function isLeadingSurrogate(code) {
      return code >= 55296 && code <= 56319;
    }
    function isTrailingSurrogate(code) {
      return code >= 56320 && code <= 57343;
    }
    function isReadableStream(value) {
      return typeof value.pipe == "function" && typeof value._read == "function" && typeof value._readableState == "object" && value._readableState !== null;
    }
    function replaceValue(holder, key, value, replacer) {
      switch (value && typeof value.toJSON == "function" && (value = value.toJSON()), replacer !== null && (value = replacer.call(holder, String(key), value)), typeof value) {
        case "function":
        case "symbol":
          value = void 0;
          break;
        case "object":
          if (value !== null) {
            let cls = value.constructor;
            (cls === String || cls === Number || cls === Boolean) && (value = value.valueOf());
          }
          break;
      }
      return value;
    }
    function getTypeNative(value) {
      return value === null || typeof value != "object" ? 1 : Array.isArray(value) ? 3 : 2;
    }
    function getTypeAsync(value) {
      return value === null || typeof value != "object" ? 1 : typeof value.then == "function" ? 4 : isReadableStream(value) ? value._readableState.objectMode ? 6 : 5 : Array.isArray(value) ? 3 : 2;
    }
    function normalizeReplacer(replacer) {
      return typeof replacer == "function" ? replacer : Array.isArray(replacer) ? [...new Set(
        replacer.map((item) => {
          let cls = item && item.constructor;
          return cls === String || cls === Number ? String(item) : null;
        }).filter((item) => typeof item == "string")
      )] : null;
    }
    function normalizeSpace(space) {
      return typeof space == "number" ? !Number.isFinite(space) || space < 1 ? !1 : " ".repeat(Math.min(space, 10)) : typeof space == "string" && space.slice(0, 10) || !1;
    }
    module.exports = {
      escapableCharCodeSubstitution,
      isLeadingSurrogate,
      isTrailingSurrogate,
      type: {
        PRIMITIVE: 1,
        PROMISE: 4,
        ARRAY: 3,
        OBJECT: 2,
        STRING_STREAM: 5,
        OBJECT_STREAM: 6
      },
      isReadableStream,
      replaceValue,
      getTypeNative,
      getTypeAsync,
      normalizeReplacer,
      normalizeSpace
    };
  }
});

// ../node_modules/@discoveryjs/json-ext/src/stringify-info.js
var require_stringify_info = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/stringify-info.js"(exports, module) {
    var {
      normalizeReplacer,
      normalizeSpace,
      replaceValue,
      getTypeNative,
      getTypeAsync,
      isLeadingSurrogate,
      isTrailingSurrogate,
      escapableCharCodeSubstitution,
      type: {
        PRIMITIVE,
        OBJECT,
        ARRAY,
        PROMISE,
        STRING_STREAM,
        OBJECT_STREAM
      }
    } = require_utils(), charLength2048 = Array.from({ length: 2048 }).map((_, code) => escapableCharCodeSubstitution.hasOwnProperty(code) ? 2 : code < 32 ? 6 : code < 128 ? 1 : 2);
    function stringLength(str) {
      let len = 0, prevLeadingSurrogate = !1;
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 2048)
          len += charLength2048[code];
        else if (isLeadingSurrogate(code)) {
          len += 6, prevLeadingSurrogate = !0;
          continue;
        } else isTrailingSurrogate(code) ? len = prevLeadingSurrogate ? len - 2 : len + 6 : len += 3;
        prevLeadingSurrogate = !1;
      }
      return len + 2;
    }
    function primitiveLength(value) {
      switch (typeof value) {
        case "string":
          return stringLength(value);
        case "number":
          return Number.isFinite(value) ? String(value).length : 4;
        case "boolean":
          return value ? 4 : 5;
        case "undefined":
        case "object":
          return 4;
        /* null */
        default:
          return 0;
      }
    }
    function spaceLength(space) {
      return space = normalizeSpace(space), typeof space == "string" ? space.length : 0;
    }
    module.exports = function(value, replacer, space, options) {
      function walk(holder, key, value2) {
        if (stop)
          return;
        value2 = replaceValue(holder, key, value2, replacer);
        let type = getType(value2);
        if (type !== PRIMITIVE && stack.has(value2)) {
          circular.add(value2), length += 4, options.continueOnCircular || (stop = !0);
          return;
        }
        switch (type) {
          case PRIMITIVE:
            value2 !== void 0 || Array.isArray(holder) ? length += primitiveLength(value2) : holder === root && (length += 9);
            break;
          case OBJECT: {
            if (visited.has(value2)) {
              duplicate.add(value2), length += visited.get(value2);
              break;
            }
            let valueLength = length, entries = 0;
            length += 2, stack.add(value2);
            for (let key2 in value2)
              if (hasOwnProperty.call(value2, key2) && (allowlist === null || allowlist.has(key2))) {
                let prevLength = length;
                walk(value2, key2, value2[key2]), prevLength !== length && (length += stringLength(key2) + 1, entries++);
              }
            entries > 1 && (length += entries - 1), stack.delete(value2), space > 0 && entries > 0 && (length += (1 + (stack.size + 1) * space + 1) * entries, length += 1 + stack.size * space), visited.set(value2, length - valueLength);
            break;
          }
          case ARRAY: {
            if (visited.has(value2)) {
              duplicate.add(value2), length += visited.get(value2);
              break;
            }
            let valueLength = length;
            length += 2, stack.add(value2);
            for (let i = 0; i < value2.length; i++)
              walk(value2, i, value2[i]);
            value2.length > 1 && (length += value2.length - 1), stack.delete(value2), space > 0 && value2.length > 0 && (length += (1 + (stack.size + 1) * space) * value2.length, length += 1 + stack.size * space), visited.set(value2, length - valueLength);
            break;
          }
          case PROMISE:
          case STRING_STREAM:
            async.add(value2);
            break;
          case OBJECT_STREAM:
            length += 2, async.add(value2);
            break;
        }
      }
      let allowlist = null;
      replacer = normalizeReplacer(replacer), Array.isArray(replacer) && (allowlist = new Set(replacer), replacer = null), space = spaceLength(space), options = options || {};
      let visited = /* @__PURE__ */ new Map(), stack = /* @__PURE__ */ new Set(), duplicate = /* @__PURE__ */ new Set(), circular = /* @__PURE__ */ new Set(), async = /* @__PURE__ */ new Set(), getType = options.async ? getTypeAsync : getTypeNative, root = { "": value }, stop = !1, length = 0;
      return walk(root, "", value), {
        minLength: isNaN(length) ? 1 / 0 : length,
        circular: [...circular],
        duplicate: [...duplicate],
        async: [...async]
      };
    };
  }
});

// ../node_modules/@discoveryjs/json-ext/src/stringify-stream.js
var require_stringify_stream = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/stringify-stream.js"(exports, module) {
    var { Readable } = __require("stream"), {
      normalizeReplacer,
      normalizeSpace,
      replaceValue,
      getTypeAsync,
      type: {
        PRIMITIVE,
        OBJECT,
        ARRAY,
        PROMISE,
        STRING_STREAM,
        OBJECT_STREAM
      }
    } = require_utils(), noop = () => {
    }, hasOwnProperty2 = Object.prototype.hasOwnProperty, wellformedStringStringify = JSON.stringify("\uD800") === '"\\ud800"' ? JSON.stringify : (s) => JSON.stringify(s).replace(
      new RegExp("\\p{Surrogate}", "gu"),
      (m) => `\\u${m.charCodeAt(0).toString(16)}`
    );
    function push() {
      this.push(this._stack.value), this.popStack();
    }
    function pushPrimitive(value) {
      switch (typeof value) {
        case "string":
          this.push(this.encodeString(value));
          break;
        case "number":
          this.push(Number.isFinite(value) ? this.encodeNumber(value) : "null");
          break;
        case "boolean":
          this.push(value ? "true" : "false");
          break;
        case "undefined":
        case "object":
          this.push("null");
          break;
        default:
          this.destroy(new TypeError(`Do not know how to serialize a ${value.constructor && value.constructor.name || typeof value}`));
      }
    }
    function processObjectEntry(key) {
      let current = this._stack;
      current.first ? this.push(",") : current.first = !0, this.space ? this.push(`
${this.space.repeat(this._depth)}${this.encodeString(key)}: `) : this.push(this.encodeString(key) + ":");
    }
    function processObject() {
      let current = this._stack;
      if (current.index === current.keys.length) {
        this.space && current.first ? this.push(`
${this.space.repeat(this._depth - 1)}}`) : this.push("}"), this.popStack();
        return;
      }
      let key = current.keys[current.index];
      this.processValue(current.value, key, current.value[key], processObjectEntry), current.index++;
    }
    function processArrayItem(index) {
      index !== 0 && this.push(","), this.space && this.push(`
${this.space.repeat(this._depth)}`);
    }
    function processArray() {
      let current = this._stack;
      if (current.index === current.value.length) {
        this.space && current.index > 0 ? this.push(`
${this.space.repeat(this._depth - 1)}]`) : this.push("]"), this.popStack();
        return;
      }
      this.processValue(current.value, current.index, current.value[current.index], processArrayItem), current.index++;
    }
    function createStreamReader(fn) {
      return function() {
        let current = this._stack, data = current.value.read(this._readSize);
        data !== null ? (current.first = !1, fn.call(this, data, current)) : current.first && !current.value._readableState.reading || current.ended ? this.popStack() : (current.first = !0, current.awaiting = !0);
      };
    }
    var processReadableObject = createStreamReader(function(data, current) {
      this.processValue(current.value, current.index, data, processArrayItem), current.index++;
    }), processReadableString = createStreamReader(function(data) {
      this.push(data);
    }), JsonStringifyStream = class extends Readable {
      constructor(value, replacer, space) {
        if (super({
          autoDestroy: !0
        }), this.getKeys = Object.keys, this.replacer = normalizeReplacer(replacer), Array.isArray(this.replacer)) {
          let allowlist = this.replacer;
          this.getKeys = (value2) => allowlist.filter((key) => hasOwnProperty2.call(value2, key)), this.replacer = null;
        }
        this.space = normalizeSpace(space), this._depth = 0, this.error = null, this._processing = !1, this._ended = !1, this._readSize = 0, this._buffer = "", this._stack = null, this._visited = /* @__PURE__ */ new WeakSet(), this.pushStack({
          handler: () => {
            this.popStack(), this.processValue({ "": value }, "", value, noop);
          }
        });
      }
      encodeString(value) {
        return /[^\x20-\uD799]|[\x22\x5c]/.test(value) ? wellformedStringStringify(value) : '"' + value + '"';
      }
      encodeNumber(value) {
        return value;
      }
      processValue(holder, key, value, callback) {
        value = replaceValue(holder, key, value, this.replacer);
        let type = getTypeAsync(value);
        switch (type) {
          case PRIMITIVE:
            (callback !== processObjectEntry || value !== void 0) && (callback.call(this, key), pushPrimitive.call(this, value));
            break;
          case OBJECT:
            if (callback.call(this, key), this._visited.has(value))
              return this.destroy(new TypeError("Converting circular structure to JSON"));
            this._visited.add(value), this._depth++, this.push("{"), this.pushStack({
              handler: processObject,
              value,
              index: 0,
              first: !1,
              keys: this.getKeys(value)
            });
            break;
          case ARRAY:
            if (callback.call(this, key), this._visited.has(value))
              return this.destroy(new TypeError("Converting circular structure to JSON"));
            this._visited.add(value), this.push("["), this.pushStack({
              handler: processArray,
              value,
              index: 0
            }), this._depth++;
            break;
          case PROMISE:
            this.pushStack({
              handler: noop,
              awaiting: !0
            }), Promise.resolve(value).then((resolved) => {
              this.popStack(), this.processValue(holder, key, resolved, callback), this.processStack();
            }).catch((error) => {
              this.destroy(error);
            });
            break;
          case STRING_STREAM:
          case OBJECT_STREAM:
            if (callback.call(this, key), value.readableEnded || value._readableState.endEmitted)
              return this.destroy(new Error("Readable Stream has ended before it was serialized. All stream data have been lost"));
            if (value.readableFlowing)
              return this.destroy(new Error("Readable Stream is in flowing mode, data may have been lost. Trying to pause stream."));
            type === OBJECT_STREAM && (this.push("["), this.pushStack({
              handler: push,
              value: this.space ? `
` + this.space.repeat(this._depth) + "]" : "]"
            }), this._depth++);
            let self2 = this.pushStack({
              handler: type === OBJECT_STREAM ? processReadableObject : processReadableString,
              value,
              index: 0,
              first: !1,
              ended: !1,
              awaiting: !value.readable || value.readableLength === 0
            }), continueProcessing = () => {
              self2.awaiting && (self2.awaiting = !1, this.processStack());
            };
            value.once("error", (error) => this.destroy(error)), value.once("end", () => {
              self2.ended = !0, continueProcessing();
            }), value.on("readable", continueProcessing);
            break;
        }
      }
      pushStack(node) {
        return node.prev = this._stack, this._stack = node;
      }
      popStack() {
        let { handler, value } = this._stack;
        (handler === processObject || handler === processArray || handler === processReadableObject) && (this._visited.delete(value), this._depth--), this._stack = this._stack.prev;
      }
      processStack() {
        if (!(this._processing || this._ended)) {
          try {
            for (this._processing = !0; this._stack !== null && !this._stack.awaiting; )
              if (this._stack.handler.call(this), !this._processing)
                return;
            this._processing = !1;
          } catch (error) {
            this.destroy(error);
            return;
          }
          this._stack === null && !this._ended && (this._finish(), this.push(null));
        }
      }
      push(data) {
        if (data !== null) {
          if (this._buffer += data, this._buffer.length < this._readSize)
            return;
          data = this._buffer, this._buffer = "", this._processing = !1;
        }
        super.push(data);
      }
      _read(size) {
        this._readSize = size || this.readableHighWaterMark, this.processStack();
      }
      _finish() {
        this._ended = !0, this._processing = !1, this._stack = null, this._visited = null, this._buffer && this._buffer.length && super.push(this._buffer), this._buffer = "";
      }
      _destroy(error, cb) {
        this.error = this.error || error, this._finish(), cb(error);
      }
    };
    module.exports = function(value, replacer, space) {
      return new JsonStringifyStream(value, replacer, space);
    };
  }
});

// ../node_modules/@discoveryjs/json-ext/src/text-decoder.js
var require_text_decoder = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/text-decoder.js"(exports, module) {
    module.exports = __require("util").TextDecoder;
  }
});

// ../node_modules/@discoveryjs/json-ext/src/parse-chunked.js
var require_parse_chunked = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/parse-chunked.js"(exports, module) {
    var { isReadableStream } = require_utils(), TextDecoder = require_text_decoder(), STACK_OBJECT = 1, STACK_ARRAY = 2, decoder = new TextDecoder();
    function isObject(value) {
      return value !== null && typeof value == "object";
    }
    function adjustPosition(error, parser) {
      return error.name === "SyntaxError" && parser.jsonParseOffset && (error.message = error.message.replace(
        /at position (\d+)/,
        (_, pos) => "at position " + (Number(pos) + parser.jsonParseOffset)
      )), error;
    }
    function append(array, elements) {
      let initialLength = array.length;
      array.length += elements.length;
      for (let i = 0; i < elements.length; i++)
        array[initialLength + i] = elements[i];
    }
    module.exports = function(chunkEmitter) {
      let parser = new ChunkParser();
      if (isObject(chunkEmitter) && isReadableStream(chunkEmitter))
        return new Promise((resolve4, reject) => {
          chunkEmitter.on("data", (chunk) => {
            try {
              parser.push(chunk);
            } catch (e) {
              reject(adjustPosition(e, parser)), parser = null;
            }
          }).on("error", (e) => {
            parser = null, reject(e);
          }).on("end", () => {
            try {
              resolve4(parser.finish());
            } catch (e) {
              reject(adjustPosition(e, parser));
            } finally {
              parser = null;
            }
          });
        });
      if (typeof chunkEmitter == "function") {
        let iterator = chunkEmitter();
        if (isObject(iterator) && (Symbol.iterator in iterator || Symbol.asyncIterator in iterator))
          return new Promise(async (resolve4, reject) => {
            try {
              for await (let chunk of iterator)
                parser.push(chunk);
              resolve4(parser.finish());
            } catch (e) {
              reject(adjustPosition(e, parser));
            } finally {
              parser = null;
            }
          });
      }
      throw new Error(
        "Chunk emitter should be readable stream, generator, async generator or function returning an iterable object"
      );
    };
    var ChunkParser = class {
      constructor() {
        this.value = void 0, this.valueStack = null, this.stack = new Array(100), this.lastFlushDepth = 0, this.flushDepth = 0, this.stateString = !1, this.stateStringEscape = !1, this.pendingByteSeq = null, this.pendingChunk = null, this.chunkOffset = 0, this.jsonParseOffset = 0;
      }
      parseAndAppend(fragment, wrap) {
        this.stack[this.lastFlushDepth - 1] === STACK_OBJECT ? (wrap && (this.jsonParseOffset--, fragment = "{" + fragment + "}"), Object.assign(this.valueStack.value, JSON.parse(fragment))) : (wrap && (this.jsonParseOffset--, fragment = "[" + fragment + "]"), append(this.valueStack.value, JSON.parse(fragment)));
      }
      prepareAddition(fragment) {
        let { value } = this.valueStack;
        if (Array.isArray(value) ? value.length !== 0 : Object.keys(value).length !== 0) {
          if (fragment[0] === ",")
            return this.jsonParseOffset++, fragment.slice(1);
          if (fragment[0] !== "}" && fragment[0] !== "]")
            return this.jsonParseOffset -= 3, "[[]" + fragment;
        }
        return fragment;
      }
      flush(chunk, start, end) {
        let fragment = chunk.slice(start, end);
        if (this.jsonParseOffset = this.chunkOffset + start, this.pendingChunk !== null && (fragment = this.pendingChunk + fragment, this.jsonParseOffset -= this.pendingChunk.length, this.pendingChunk = null), this.flushDepth === this.lastFlushDepth)
          this.flushDepth > 0 ? this.parseAndAppend(this.prepareAddition(fragment), !0) : (this.value = JSON.parse(fragment), this.valueStack = {
            value: this.value,
            prev: null
          });
        else if (this.flushDepth > this.lastFlushDepth) {
          for (let i = this.flushDepth - 1; i >= this.lastFlushDepth; i--)
            fragment += this.stack[i] === STACK_OBJECT ? "}" : "]";
          this.lastFlushDepth === 0 ? (this.value = JSON.parse(fragment), this.valueStack = {
            value: this.value,
            prev: null
          }) : this.parseAndAppend(this.prepareAddition(fragment), !0);
          for (let i = this.lastFlushDepth || 1; i < this.flushDepth; i++) {
            let value = this.valueStack.value;
            if (this.stack[i - 1] === STACK_OBJECT) {
              let key;
              for (key in value) ;
              value = value[key];
            } else
              value = value[value.length - 1];
            this.valueStack = {
              value,
              prev: this.valueStack
            };
          }
        } else {
          fragment = this.prepareAddition(fragment);
          for (let i = this.lastFlushDepth - 1; i >= this.flushDepth; i--)
            this.jsonParseOffset--, fragment = (this.stack[i] === STACK_OBJECT ? "{" : "[") + fragment;
          this.parseAndAppend(fragment, !1);
          for (let i = this.lastFlushDepth - 1; i >= this.flushDepth; i--)
            this.valueStack = this.valueStack.prev;
        }
        this.lastFlushDepth = this.flushDepth;
      }
      push(chunk) {
        if (typeof chunk != "string") {
          if (this.pendingByteSeq !== null) {
            let origRawChunk = chunk;
            chunk = new Uint8Array(this.pendingByteSeq.length + origRawChunk.length), chunk.set(this.pendingByteSeq), chunk.set(origRawChunk, this.pendingByteSeq.length), this.pendingByteSeq = null;
          }
          if (chunk[chunk.length - 1] > 127)
            for (let seqLength = 0; seqLength < chunk.length; seqLength++) {
              let byte = chunk[chunk.length - 1 - seqLength];
              if (byte >> 6 === 3) {
                seqLength++, (seqLength !== 4 && byte >> 3 === 30 || seqLength !== 3 && byte >> 4 === 14 || seqLength !== 2 && byte >> 5 === 6) && (this.pendingByteSeq = chunk.slice(chunk.length - seqLength), chunk = chunk.slice(0, -seqLength));
                break;
              }
            }
          chunk = decoder.decode(chunk);
        }
        let chunkLength = chunk.length, lastFlushPoint = 0, flushPoint = 0;
        scan: for (let i = 0; i < chunkLength; i++) {
          if (this.stateString) {
            for (; i < chunkLength; i++)
              if (this.stateStringEscape)
                this.stateStringEscape = !1;
              else
                switch (chunk.charCodeAt(i)) {
                  case 34:
                    this.stateString = !1;
                    continue scan;
                  case 92:
                    this.stateStringEscape = !0;
                }
            break;
          }
          switch (chunk.charCodeAt(i)) {
            case 34:
              this.stateString = !0, this.stateStringEscape = !1;
              break;
            case 44:
              flushPoint = i;
              break;
            case 123:
              flushPoint = i + 1, this.stack[this.flushDepth++] = STACK_OBJECT;
              break;
            case 91:
              flushPoint = i + 1, this.stack[this.flushDepth++] = STACK_ARRAY;
              break;
            case 93:
            /* ] */
            case 125:
              flushPoint = i + 1, this.flushDepth--, this.flushDepth < this.lastFlushDepth && (this.flush(chunk, lastFlushPoint, flushPoint), lastFlushPoint = flushPoint);
              break;
            case 9:
            /* \t */
            case 10:
            /* \n */
            case 13:
            /* \r */
            case 32:
              lastFlushPoint === i && lastFlushPoint++, flushPoint === i && flushPoint++;
              break;
          }
        }
        flushPoint > lastFlushPoint && this.flush(chunk, lastFlushPoint, flushPoint), flushPoint < chunkLength && (this.pendingChunk !== null ? this.pendingChunk += chunk : this.pendingChunk = chunk.slice(flushPoint, chunkLength)), this.chunkOffset += chunkLength;
      }
      finish() {
        return this.pendingChunk !== null && (this.flush("", 0, 0), this.pendingChunk = null), this.value;
      }
    };
  }
});

// ../node_modules/@discoveryjs/json-ext/src/index.js
var require_src2 = __commonJS({
  "../node_modules/@discoveryjs/json-ext/src/index.js"(exports, module) {
    module.exports = {
      version: require_version(),
      stringifyInfo: require_stringify_info(),
      stringifyStream: require_stringify_stream(),
      parseChunked: require_parse_chunked()
    };
  }
});

// ../node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "../node_modules/graceful-fs/polyfills.js"(exports, module) {
    var constants = __require("constants"), origCwd = process.cwd, cwd = null, platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      return cwd || (cwd = origCwd.call(process)), cwd;
    };
    try {
      process.cwd();
    } catch {
    }
    typeof process.chdir == "function" && (chdir = process.chdir, process.chdir = function(d) {
      cwd = null, chdir.call(process, d);
    }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, chdir));
    var chdir;
    module.exports = patch;
    function patch(fs) {
      constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && patchLchmod(fs), fs.lutimes || patchLutimes(fs), fs.chown = chownFix(fs.chown), fs.fchown = chownFix(fs.fchown), fs.lchown = chownFix(fs.lchown), fs.chmod = chmodFix(fs.chmod), fs.fchmod = chmodFix(fs.fchmod), fs.lchmod = chmodFix(fs.lchmod), fs.chownSync = chownFixSync(fs.chownSync), fs.fchownSync = chownFixSync(fs.fchownSync), fs.lchownSync = chownFixSync(fs.lchownSync), fs.chmodSync = chmodFixSync(fs.chmodSync), fs.fchmodSync = chmodFixSync(fs.fchmodSync), fs.lchmodSync = chmodFixSync(fs.lchmodSync), fs.stat = statFix(fs.stat), fs.fstat = statFix(fs.fstat), fs.lstat = statFix(fs.lstat), fs.statSync = statFixSync(fs.statSync), fs.fstatSync = statFixSync(fs.fstatSync), fs.lstatSync = statFixSync(fs.lstatSync), fs.chmod && !fs.lchmod && (fs.lchmod = function(path2, mode, cb) {
        cb && process.nextTick(cb);
      }, fs.lchmodSync = function() {
      }), fs.chown && !fs.lchown && (fs.lchown = function(path2, uid, gid, cb) {
        cb && process.nextTick(cb);
      }, fs.lchownSync = function() {
      }), platform === "win32" && (fs.rename = typeof fs.rename != "function" ? fs.rename : (function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now(), backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
              setTimeout(function() {
                fs.stat(to, function(stater, st) {
                  stater && stater.code === "ENOENT" ? fs$rename(from, to, CB) : cb(er);
                });
              }, backoff), backoff < 100 && (backoff += 10);
              return;
            }
            cb && cb(er);
          });
        }
        return Object.setPrototypeOf && Object.setPrototypeOf(rename, fs$rename), rename;
      })(fs.rename)), fs.read = typeof fs.read != "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ == "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10)
                return eagCounter++, fs$read.call(fs, fd, buffer, offset, length, position, callback);
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        return Object.setPrototypeOf && Object.setPrototypeOf(read, fs$read), read;
      })(fs.read), fs.readSync = typeof fs.readSync != "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          for (var eagCounter = 0; ; )
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path2, mode, callback) {
          fs2.open(
            path2,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                callback && callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  callback && callback(err2 || err22);
                });
              });
            }
          );
        }, fs2.lchmodSync = function(path2, mode) {
          var fd = fs2.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode), threw = !0, ret;
          try {
            ret = fs2.fchmodSync(fd, mode), threw = !1;
          } finally {
            if (threw)
              try {
                fs2.closeSync(fd);
              } catch {
              }
            else
              fs2.closeSync(fd);
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        constants.hasOwnProperty("O_SYMLINK") && fs2.futimes ? (fs2.lutimes = function(path2, at, mt, cb) {
          fs2.open(path2, constants.O_SYMLINK, function(er, fd) {
            if (er) {
              cb && cb(er);
              return;
            }
            fs2.futimes(fd, at, mt, function(er2) {
              fs2.close(fd, function(er22) {
                cb && cb(er2 || er22);
              });
            });
          });
        }, fs2.lutimesSync = function(path2, at, mt) {
          var fd = fs2.openSync(path2, constants.O_SYMLINK), ret, threw = !0;
          try {
            ret = fs2.futimesSync(fd, at, mt), threw = !1;
          } finally {
            if (threw)
              try {
                fs2.closeSync(fd);
              } catch {
              }
            else
              fs2.closeSync(fd);
          }
          return ret;
        }) : fs2.futimes && (fs2.lutimes = function(_a, _b, _c, cb) {
          cb && process.nextTick(cb);
        }, fs2.lutimesSync = function() {
        });
      }
      function chmodFix(orig) {
        return orig && function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            chownErOk(er) && (er = null), cb && cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        return orig && function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        return orig && function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            chownErOk(er) && (er = null), cb && cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        return orig && function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        return orig && function(target, options, cb) {
          typeof options == "function" && (cb = options, options = null);
          function callback(er, stats) {
            stats && (stats.uid < 0 && (stats.uid += 4294967296), stats.gid < 0 && (stats.gid += 4294967296)), cb && cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        return orig && function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          return stats && (stats.uid < 0 && (stats.uid += 4294967296), stats.gid < 0 && (stats.gid += 4294967296)), stats;
        };
      }
      function chownErOk(er) {
        if (!er || er.code === "ENOSYS")
          return !0;
        var nonroot = !process.getuid || process.getuid() !== 0;
        return !!(nonroot && (er.code === "EINVAL" || er.code === "EPERM"));
      }
    }
  }
});

// ../node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "../node_modules/graceful-fs/legacy-streams.js"(exports, module) {
    var Stream = __require("stream").Stream;
    module.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path2, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
        Stream.call(this);
        var self2 = this;
        this.path = path2, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, options = options || {};
        for (var keys = Object.keys(options), index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding && this.setEncoding(this.encoding), this.start !== void 0) {
          if (typeof this.start != "number")
            throw TypeError("start must be a Number");
          if (this.end === void 0)
            this.end = 1 / 0;
          else if (typeof this.end != "number")
            throw TypeError("end must be a Number");
          if (this.start > this.end)
            throw new Error("start must be <= end");
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self2._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self2.emit("error", err), self2.readable = !1;
            return;
          }
          self2.fd = fd, self2.emit("open", fd), self2._read();
        });
      }
      function WriteStream(path2, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
        Stream.call(this), this.path = path2, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, options = options || {};
        for (var keys = Object.keys(options), index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if (typeof this.start != "number")
            throw TypeError("start must be a Number");
          if (this.start < 0)
            throw new Error("start must be >= zero");
          this.pos = this.start;
        }
        this.busy = !1, this._queue = [], this.fd === null && (this._open = fs.open, this._queue.push([this._open, this.path, this.flags, this.mode, void 0]), this.flush());
      }
    }
  }
});

// ../node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "../node_modules/graceful-fs/clone.js"(exports, module) {
    "use strict";
    module.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj != "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      return Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      }), copy;
    }
  }
});

// ../node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "../node_modules/graceful-fs/graceful-fs.js"(exports, module) {
    var fs = __require("fs"), polyfills = require_polyfills(), legacy = require_legacy_streams(), clone = require_clone(), util = __require("util"), gracefulQueue, previousSymbol;
    typeof Symbol == "function" && typeof Symbol.for == "function" ? (gracefulQueue = Symbol.for("graceful-fs.queue"), previousSymbol = Symbol.for("graceful-fs.previous")) : (gracefulQueue = "___graceful-fs.queue", previousSymbol = "___graceful-fs.previous");
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    util.debuglog ? debug = util.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (debug = function() {
      var m = util.format.apply(util, arguments);
      m = "GFS4: " + m.split(/\n/).join(`
GFS4: `), console.error(m);
    });
    fs[gracefulQueue] || (queue = global[gracefulQueue] || [], publishQueue(fs, queue), fs.close = (function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs, fd, function(err) {
          err || resetQueue(), typeof cb == "function" && cb.apply(this, arguments);
        });
      }
      return Object.defineProperty(close, previousSymbol, {
        value: fs$close
      }), close;
    })(fs.close), fs.closeSync = (function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs, arguments), resetQueue();
      }
      return Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      }), closeSync;
    })(fs.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
      debug(fs[gracefulQueue]), __require("assert").equal(fs[gracefulQueue].length, 0);
    }));
    var queue;
    global[gracefulQueue] || publishQueue(global, fs[gracefulQueue]);
    module.exports = patch(clone(fs));
    process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched && (module.exports = patch(fs), fs.__patched = !0);
    function patch(fs2) {
      polyfills(fs2), fs2.gracefulify = patch, fs2.createReadStream = createReadStream, fs2.createWriteStream = createWriteStream2;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile5;
      function readFile5(path2, options, cb) {
        return typeof options == "function" && (cb = options, options = null), go$readFile(path2, options, cb);
        function go$readFile(path3, options2, cb2, startTime) {
          return fs$readFile(path3, options2, function(err) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([go$readFile, [path3, options2, cb2], err, startTime || Date.now(), Date.now()]) : typeof cb2 == "function" && cb2.apply(this, arguments);
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile5;
      function writeFile5(path2, data, options, cb) {
        return typeof options == "function" && (cb = options, options = null), go$writeFile(path2, data, options, cb);
        function go$writeFile(path3, data2, options2, cb2, startTime) {
          return fs$writeFile(path3, data2, options2, function(err) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([go$writeFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]) : typeof cb2 == "function" && cb2.apply(this, arguments);
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      fs$appendFile && (fs2.appendFile = appendFile);
      function appendFile(path2, data, options, cb) {
        return typeof options == "function" && (cb = options, options = null), go$appendFile(path2, data, options, cb);
        function go$appendFile(path3, data2, options2, cb2, startTime) {
          return fs$appendFile(path3, data2, options2, function(err) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([go$appendFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]) : typeof cb2 == "function" && cb2.apply(this, arguments);
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      fs$copyFile && (fs2.copyFile = copyFile);
      function copyFile(src, dest, flags, cb) {
        return typeof flags == "function" && (cb = flags, flags = 0), go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]) : typeof cb2 == "function" && cb2.apply(this, arguments);
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path2, options, cb) {
        typeof options == "function" && (cb = options, options = null);
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function(path3, options2, cb2, startTime) {
          return fs$readdir(path3, fs$readdirCallback(
            path3,
            options2,
            cb2,
            startTime
          ));
        } : function(path3, options2, cb2, startTime) {
          return fs$readdir(path3, options2, fs$readdirCallback(
            path3,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path2, options, cb);
        function fs$readdirCallback(path3, options2, cb2, startTime) {
          return function(err, files) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([
              go$readdir,
              [path3, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]) : (files && files.sort && files.sort(), typeof cb2 == "function" && cb2.call(this, err, files));
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream, WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      fs$ReadStream && (ReadStream.prototype = Object.create(fs$ReadStream.prototype), ReadStream.prototype.open = ReadStream$open);
      var fs$WriteStream = fs2.WriteStream;
      fs$WriteStream && (WriteStream.prototype = Object.create(fs$WriteStream.prototype), WriteStream.prototype.open = WriteStream$open), Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: !0,
        configurable: !0
      }), Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: !0,
        configurable: !0
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: !0,
        configurable: !0
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: !0,
        configurable: !0
      });
      function ReadStream(path2, options) {
        return this instanceof ReadStream ? (fs$ReadStream.apply(this, arguments), this) : ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open3(that.path, that.flags, that.mode, function(err, fd) {
          err ? (that.autoClose && that.destroy(), that.emit("error", err)) : (that.fd = fd, that.emit("open", fd), that.read());
        });
      }
      function WriteStream(path2, options) {
        return this instanceof WriteStream ? (fs$WriteStream.apply(this, arguments), this) : WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open3(that.path, that.flags, that.mode, function(err, fd) {
          err ? (that.destroy(), that.emit("error", err)) : (that.fd = fd, that.emit("open", fd));
        });
      }
      function createReadStream(path2, options) {
        return new fs2.ReadStream(path2, options);
      }
      function createWriteStream2(path2, options) {
        return new fs2.WriteStream(path2, options);
      }
      var fs$open = fs2.open;
      fs2.open = open3;
      function open3(path2, flags, mode, cb) {
        return typeof mode == "function" && (cb = mode, mode = null), go$open(path2, flags, mode, cb);
        function go$open(path3, flags2, mode2, cb2, startTime) {
          return fs$open(path3, flags2, mode2, function(err, fd) {
            err && (err.code === "EMFILE" || err.code === "ENFILE") ? enqueue([go$open, [path3, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]) : typeof cb2 == "function" && cb2.apply(this, arguments);
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]), fs[gracefulQueue].push(elem), retry();
    }
    var retryTimer;
    function resetQueue() {
      for (var now = Date.now(), i = 0; i < fs[gracefulQueue].length; ++i)
        fs[gracefulQueue][i].length > 2 && (fs[gracefulQueue][i][3] = now, fs[gracefulQueue][i][4] = now);
      retry();
    }
    function retry() {
      if (clearTimeout(retryTimer), retryTimer = void 0, fs[gracefulQueue].length !== 0) {
        var elem = fs[gracefulQueue].shift(), fn = elem[0], args = elem[1], err = elem[2], startTime = elem[3], lastTime = elem[4];
        if (startTime === void 0)
          debug("RETRY", fn.name, args), fn.apply(null, args);
        else if (Date.now() - startTime >= 6e4) {
          debug("TIMEOUT", fn.name, args);
          var cb = args.pop();
          typeof cb == "function" && cb.call(null, err);
        } else {
          var sinceAttempt = Date.now() - lastTime, sinceStart = Math.max(lastTime - startTime, 1), desiredDelay = Math.min(sinceStart * 1.2, 100);
          sinceAttempt >= desiredDelay ? (debug("RETRY", fn.name, args), fn.apply(null, args.concat([startTime]))) : fs[gracefulQueue].push(elem);
        }
        retryTimer === void 0 && (retryTimer = setTimeout(retry, 0));
      }
    }
  }
});

// ../node_modules/watchpack/lib/reducePlan.js
var require_reducePlan = __commonJS({
  "../node_modules/watchpack/lib/reducePlan.js"(exports, module) {
    "use strict";
    var path2 = __require("path");
    module.exports = (plan, limit) => {
      let treeMap = /* @__PURE__ */ new Map();
      for (let [filePath, value] of plan)
        treeMap.set(filePath, {
          filePath,
          parent: void 0,
          children: void 0,
          entries: 1,
          active: !0,
          value
        });
      let currentCount = treeMap.size;
      for (let node of treeMap.values()) {
        let parentPath = path2.dirname(node.filePath);
        if (parentPath !== node.filePath) {
          let parent = treeMap.get(parentPath);
          if (parent === void 0)
            parent = {
              filePath: parentPath,
              parent: void 0,
              children: [node],
              entries: node.entries,
              active: !1,
              value: void 0
            }, treeMap.set(parentPath, parent), node.parent = parent;
          else {
            node.parent = parent, parent.children === void 0 ? parent.children = [node] : parent.children.push(node);
            do
              parent.entries += node.entries, parent = parent.parent;
            while (parent);
          }
        }
      }
      for (; currentCount > limit; ) {
        let overLimit = currentCount - limit, bestNode, bestCost = 1 / 0;
        for (let node of treeMap.values()) {
          if (node.entries <= 1 || !node.children || !node.parent || node.children.length === 0 || node.children.length === 1 && !node.value) continue;
          let cost = node.entries - 1 >= overLimit ? node.entries - 1 - overLimit : overLimit - node.entries + 1 + limit * 0.3;
          cost < bestCost && (bestNode = node, bestCost = cost);
        }
        if (!bestNode) break;
        let reduction = bestNode.entries - 1;
        bestNode.active = !0, bestNode.entries = 1, currentCount -= reduction;
        let parent = bestNode.parent;
        for (; parent; )
          parent.entries -= reduction, parent = parent.parent;
        let queue = new Set(bestNode.children);
        for (let node of queue)
          if (node.active = !1, node.entries = 0, node.children)
            for (let child of node.children) queue.add(child);
      }
      let newPlan = /* @__PURE__ */ new Map();
      for (let rootNode of treeMap.values()) {
        if (!rootNode.active) continue;
        let map = /* @__PURE__ */ new Map(), queue = /* @__PURE__ */ new Set([rootNode]);
        for (let node of queue)
          if (!(node.active && node !== rootNode)) {
            if (node.value)
              if (Array.isArray(node.value))
                for (let item of node.value)
                  map.set(item, node.filePath);
              else
                map.set(node.value, node.filePath);
            if (node.children)
              for (let child of node.children)
                queue.add(child);
          }
        newPlan.set(rootNode.filePath, map);
      }
      return newPlan;
    };
  }
});

// ../node_modules/watchpack/lib/watchEventSource.js
var require_watchEventSource = __commonJS({
  "../node_modules/watchpack/lib/watchEventSource.js"(exports) {
    "use strict";
    var fs = __require("fs"), path2 = __require("path"), { EventEmitter } = __require("events"), reducePlan = require_reducePlan(), IS_OSX = __require("os").platform() === "darwin", IS_WIN = __require("os").platform() === "win32", SUPPORTS_RECURSIVE_WATCHING = IS_OSX || IS_WIN, watcherLimit = +process.env.WATCHPACK_WATCHER_LIMIT || (IS_OSX ? 20 : 1e4), recursiveWatcherLogging = !!process.env.WATCHPACK_RECURSIVE_WATCHER_LOGGING, isBatch = !1, watcherCount = 0, pendingWatchers = /* @__PURE__ */ new Map(), recursiveWatchers = /* @__PURE__ */ new Map(), directWatchers = /* @__PURE__ */ new Map(), underlyingWatcher = /* @__PURE__ */ new Map();
    function createEPERMError(filePath) {
      let error = new Error(`Operation not permitted: ${filePath}`);
      return error.code = "EPERM", error;
    }
    function createHandleChangeEvent(watcher, filePath, handleChangeEvent) {
      return (type, filename) => {
        if (type === "rename" && path2.isAbsolute(filename) && path2.basename(filename) === path2.basename(filePath)) {
          IS_OSX || watcher.emit("error", createEPERMError(filename));
          return;
        }
        handleChangeEvent(type, filename);
      };
    }
    var DirectWatcher = class {
      constructor(filePath) {
        this.filePath = filePath, this.watchers = /* @__PURE__ */ new Set(), this.watcher = void 0;
        try {
          let watcher = fs.watch(filePath);
          this.watcher = watcher;
          let handleChangeEvent = createHandleChangeEvent(
            watcher,
            filePath,
            (type, filename) => {
              for (let w of this.watchers)
                w.emit("change", type, filename);
            }
          );
          watcher.on("change", handleChangeEvent), watcher.on("error", (error) => {
            for (let w of this.watchers)
              w.emit("error", error);
          });
        } catch (err) {
          process.nextTick(() => {
            for (let w of this.watchers)
              w.emit("error", err);
          });
        }
        watcherCount++;
      }
      add(watcher) {
        underlyingWatcher.set(watcher, this), this.watchers.add(watcher);
      }
      remove(watcher) {
        this.watchers.delete(watcher), this.watchers.size === 0 && (directWatchers.delete(this.filePath), watcherCount--, this.watcher && this.watcher.close());
      }
      getWatchers() {
        return this.watchers;
      }
    }, RecursiveWatcher = class {
      constructor(rootPath) {
        this.rootPath = rootPath, this.mapWatcherToPath = /* @__PURE__ */ new Map(), this.mapPathToWatchers = /* @__PURE__ */ new Map(), this.watcher = void 0;
        try {
          let watcher = fs.watch(rootPath, {
            recursive: !0
          });
          this.watcher = watcher, watcher.on("change", (type, filename) => {
            if (filename) {
              let dir = path2.dirname(filename), watchers = this.mapPathToWatchers.get(dir);
              if (recursiveWatcherLogging && process.stderr.write(
                `[watchpack] dispatch ${type} event in recursive watcher (${this.rootPath}) for '${filename}' to ${watchers ? watchers.size : 0} watchers
`
              ), watchers === void 0) return;
              for (let w of watchers)
                w.emit("change", type, path2.basename(filename));
            } else {
              recursiveWatcherLogging && process.stderr.write(
                `[watchpack] dispatch ${type} event in recursive watcher (${this.rootPath}) to all watchers
`
              );
              for (let w of this.mapWatcherToPath.keys())
                w.emit("change", type);
            }
          }), watcher.on("error", (error) => {
            for (let w of this.mapWatcherToPath.keys())
              w.emit("error", error);
          });
        } catch (err) {
          process.nextTick(() => {
            for (let w of this.mapWatcherToPath.keys())
              w.emit("error", err);
          });
        }
        watcherCount++, recursiveWatcherLogging && process.stderr.write(
          `[watchpack] created recursive watcher at ${rootPath}
`
        );
      }
      add(filePath, watcher) {
        underlyingWatcher.set(watcher, this);
        let subpath = filePath.slice(this.rootPath.length + 1) || ".";
        this.mapWatcherToPath.set(watcher, subpath);
        let set = this.mapPathToWatchers.get(subpath);
        if (set === void 0) {
          let newSet = /* @__PURE__ */ new Set();
          newSet.add(watcher), this.mapPathToWatchers.set(subpath, newSet);
        } else
          set.add(watcher);
      }
      remove(watcher) {
        let subpath = this.mapWatcherToPath.get(watcher);
        if (!subpath) return;
        this.mapWatcherToPath.delete(watcher);
        let set = this.mapPathToWatchers.get(subpath);
        set.delete(watcher), set.size === 0 && this.mapPathToWatchers.delete(subpath), this.mapWatcherToPath.size === 0 && (recursiveWatchers.delete(this.rootPath), watcherCount--, this.watcher && this.watcher.close(), recursiveWatcherLogging && process.stderr.write(
          `[watchpack] closed recursive watcher at ${this.rootPath}
`
        ));
      }
      getWatchers() {
        return this.mapWatcherToPath;
      }
    }, Watcher = class extends EventEmitter {
      close() {
        if (pendingWatchers.has(this)) {
          pendingWatchers.delete(this);
          return;
        }
        underlyingWatcher.get(this).remove(this), underlyingWatcher.delete(this);
      }
    }, createDirectWatcher = (filePath) => {
      let existing = directWatchers.get(filePath);
      if (existing !== void 0) return existing;
      let w = new DirectWatcher(filePath);
      return directWatchers.set(filePath, w), w;
    }, createRecursiveWatcher = (rootPath) => {
      let existing = recursiveWatchers.get(rootPath);
      if (existing !== void 0) return existing;
      let w = new RecursiveWatcher(rootPath);
      return recursiveWatchers.set(rootPath, w), w;
    }, execute = () => {
      let map = /* @__PURE__ */ new Map(), addWatcher = (watcher, filePath) => {
        let entry = map.get(filePath);
        entry === void 0 ? map.set(filePath, watcher) : Array.isArray(entry) ? entry.push(watcher) : map.set(filePath, [entry, watcher]);
      };
      for (let [watcher, filePath] of pendingWatchers)
        addWatcher(watcher, filePath);
      if (pendingWatchers.clear(), !SUPPORTS_RECURSIVE_WATCHING || watcherLimit - watcherCount >= map.size) {
        for (let [filePath, entry] of map) {
          let w = createDirectWatcher(filePath);
          if (Array.isArray(entry))
            for (let item of entry) w.add(item);
          else
            w.add(entry);
        }
        return;
      }
      for (let watcher of recursiveWatchers.values())
        for (let [w, subpath] of watcher.getWatchers())
          addWatcher(w, path2.join(watcher.rootPath, subpath));
      for (let watcher of directWatchers.values())
        for (let w of watcher.getWatchers())
          addWatcher(w, watcher.filePath);
      let plan = reducePlan(map, watcherLimit * 0.9);
      for (let [filePath, entry] of plan)
        if (entry.size === 1)
          for (let [watcher, filePath2] of entry) {
            let w = createDirectWatcher(filePath2), old = underlyingWatcher.get(watcher);
            old !== w && (w.add(watcher), old !== void 0 && old.remove(watcher));
          }
        else {
          let filePaths = new Set(entry.values());
          if (filePaths.size > 1) {
            let w = createRecursiveWatcher(filePath);
            for (let [watcher, watcherPath] of entry) {
              let old = underlyingWatcher.get(watcher);
              old !== w && (w.add(watcherPath, watcher), old !== void 0 && old.remove(watcher));
            }
          } else
            for (let filePath2 of filePaths) {
              let w = createDirectWatcher(filePath2);
              for (let watcher of entry.keys()) {
                let old = underlyingWatcher.get(watcher);
                old !== w && (w.add(watcher), old !== void 0 && old.remove(watcher));
              }
            }
        }
    };
    exports.watch = (filePath) => {
      let watcher = new Watcher(), directWatcher = directWatchers.get(filePath);
      if (directWatcher !== void 0)
        return directWatcher.add(watcher), watcher;
      let current = filePath;
      for (; ; ) {
        let recursiveWatcher = recursiveWatchers.get(current);
        if (recursiveWatcher !== void 0)
          return recursiveWatcher.add(filePath, watcher), watcher;
        let parent = path2.dirname(current);
        if (parent === current) break;
        current = parent;
      }
      return pendingWatchers.set(watcher, filePath), isBatch || execute(), watcher;
    };
    exports.batch = (fn) => {
      isBatch = !0;
      try {
        fn();
      } finally {
        isBatch = !1, execute();
      }
    };
    exports.getNumberOfWatchers = () => watcherCount;
    exports.createHandleChangeEvent = createHandleChangeEvent;
    exports.watcherLimit = watcherLimit;
  }
});

// ../node_modules/watchpack/lib/DirectoryWatcher.js
var require_DirectoryWatcher = __commonJS({
  "../node_modules/watchpack/lib/DirectoryWatcher.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter, fs = require_graceful_fs(), path2 = __require("path"), watchEventSource = require_watchEventSource(), EXISTANCE_ONLY_TIME_ENTRY = Object.freeze({}), FS_ACCURACY = 2e3, IS_OSX = __require("os").platform() === "darwin", IS_WIN = __require("os").platform() === "win32", WATCHPACK_POLLING = process.env.WATCHPACK_POLLING, FORCE_POLLING = `${+WATCHPACK_POLLING}` === WATCHPACK_POLLING ? +WATCHPACK_POLLING : !!WATCHPACK_POLLING && WATCHPACK_POLLING !== "false";
    function withoutCase(str) {
      return str.toLowerCase();
    }
    function needCalls(times, callback) {
      return function() {
        if (--times === 0)
          return callback();
      };
    }
    var Watcher = class extends EventEmitter {
      constructor(directoryWatcher, filePath, startTime) {
        super(), this.directoryWatcher = directoryWatcher, this.path = filePath, this.startTime = startTime && +startTime;
      }
      checkStartTime(mtime, initial) {
        let startTime = this.startTime;
        return typeof startTime != "number" ? !initial : startTime <= mtime;
      }
      close() {
        this.emit("closed");
      }
    }, DirectoryWatcher = class extends EventEmitter {
      constructor(watcherManager, directoryPath, options) {
        super(), FORCE_POLLING && (options.poll = FORCE_POLLING), this.watcherManager = watcherManager, this.options = options, this.path = directoryPath, this.files = /* @__PURE__ */ new Map(), this.filesWithoutCase = /* @__PURE__ */ new Map(), this.directories = /* @__PURE__ */ new Map(), this.lastWatchEvent = 0, this.initialScan = !0, this.ignored = options.ignored || (() => !1), this.nestedWatching = !1, this.polledWatching = typeof options.poll == "number" ? options.poll : options.poll ? 5007 : !1, this.timeout = void 0, this.initialScanRemoved = /* @__PURE__ */ new Set(), this.initialScanFinished = void 0, this.watchers = /* @__PURE__ */ new Map(), this.parentWatcher = null, this.refs = 0, this._activeEvents = /* @__PURE__ */ new Map(), this.closed = !1, this.scanning = !1, this.scanAgain = !1, this.scanAgainInitial = !1, this.createWatcher(), this.doScan(!0);
      }
      createWatcher() {
        try {
          this.polledWatching ? this.watcher = {
            close: () => {
              this.timeout && (clearTimeout(this.timeout), this.timeout = void 0);
            }
          } : (IS_OSX && this.watchInParentDirectory(), this.watcher = watchEventSource.watch(this.path), this.watcher.on("change", this.onWatchEvent.bind(this)), this.watcher.on("error", this.onWatcherError.bind(this)));
        } catch (err) {
          this.onWatcherError(err);
        }
      }
      forEachWatcher(path3, fn) {
        let watchers = this.watchers.get(withoutCase(path3));
        if (watchers !== void 0)
          for (let w of watchers)
            fn(w);
      }
      setMissing(itemPath, initial, type) {
        this.initialScan && this.initialScanRemoved.add(itemPath);
        let oldDirectory = this.directories.get(itemPath);
        if (oldDirectory && (this.nestedWatching && oldDirectory.close(), this.directories.delete(itemPath), this.forEachWatcher(itemPath, (w) => w.emit("remove", type)), initial || this.forEachWatcher(
          this.path,
          (w) => w.emit("change", itemPath, null, type, initial)
        )), this.files.get(itemPath)) {
          this.files.delete(itemPath);
          let key = withoutCase(itemPath), count = this.filesWithoutCase.get(key) - 1;
          count <= 0 ? (this.filesWithoutCase.delete(key), this.forEachWatcher(itemPath, (w) => w.emit("remove", type))) : this.filesWithoutCase.set(key, count), initial || this.forEachWatcher(
            this.path,
            (w) => w.emit("change", itemPath, null, type, initial)
          );
        }
      }
      setFileTime(filePath, mtime, initial, ignoreWhenEqual, type) {
        let now = Date.now();
        if (this.ignored(filePath)) return;
        let old = this.files.get(filePath), safeTime, accuracy;
        if (initial)
          safeTime = Math.min(now, mtime) + FS_ACCURACY, accuracy = FS_ACCURACY;
        else if (safeTime = now, accuracy = 0, old && old.timestamp === mtime && mtime + FS_ACCURACY < now)
          return;
        if (!(ignoreWhenEqual && old && old.timestamp === mtime)) {
          if (this.files.set(filePath, {
            safeTime,
            accuracy,
            timestamp: mtime
          }), old)
            initial || this.forEachWatcher(filePath, (w) => w.emit("change", mtime, type));
          else {
            let key = withoutCase(filePath), count = this.filesWithoutCase.get(key);
            this.filesWithoutCase.set(key, (count || 0) + 1), count !== void 0 && this.doScan(!1), this.forEachWatcher(filePath, (w) => {
              (!initial || w.checkStartTime(safeTime, initial)) && w.emit("change", mtime, type);
            });
          }
          this.forEachWatcher(this.path, (w) => {
            (!initial || w.checkStartTime(safeTime, initial)) && w.emit("change", filePath, safeTime, type, initial);
          });
        }
      }
      setDirectory(directoryPath, birthtime, initial, type) {
        if (!this.ignored(directoryPath)) {
          if (directoryPath === this.path)
            initial || this.forEachWatcher(
              this.path,
              (w) => w.emit("change", directoryPath, birthtime, type, initial)
            );
          else if (!this.directories.get(directoryPath)) {
            let now = Date.now();
            this.nestedWatching ? this.createNestedWatcher(directoryPath) : this.directories.set(directoryPath, !0);
            let safeTime;
            initial ? safeTime = Math.min(now, birthtime) + FS_ACCURACY : safeTime = now, this.forEachWatcher(directoryPath, (w) => {
              (!initial || w.checkStartTime(safeTime, !1)) && w.emit("change", birthtime, type);
            }), this.forEachWatcher(this.path, (w) => {
              (!initial || w.checkStartTime(safeTime, initial)) && w.emit("change", directoryPath, safeTime, type, initial);
            });
          }
        }
      }
      createNestedWatcher(directoryPath) {
        let watcher = this.watcherManager.watchDirectory(directoryPath, 1);
        watcher.on("change", (filePath, mtime, type, initial) => {
          this.forEachWatcher(this.path, (w) => {
            (!initial || w.checkStartTime(mtime, initial)) && w.emit("change", filePath, mtime, type, initial);
          });
        }), this.directories.set(directoryPath, watcher);
      }
      setNestedWatching(flag) {
        if (this.nestedWatching !== !!flag)
          if (this.nestedWatching = !!flag, this.nestedWatching)
            for (let directory of this.directories.keys())
              this.createNestedWatcher(directory);
          else
            for (let [directory, watcher] of this.directories)
              watcher.close(), this.directories.set(directory, !0);
      }
      watch(filePath, startTime) {
        let key = withoutCase(filePath), watchers = this.watchers.get(key);
        watchers === void 0 && (watchers = /* @__PURE__ */ new Set(), this.watchers.set(key, watchers)), this.refs++;
        let watcher = new Watcher(this, filePath, startTime);
        watcher.on("closed", () => {
          if (--this.refs <= 0) {
            this.close();
            return;
          }
          watchers.delete(watcher), watchers.size === 0 && (this.watchers.delete(key), this.path === filePath && this.setNestedWatching(!1));
        }), watchers.add(watcher);
        let safeTime;
        if (filePath === this.path) {
          this.setNestedWatching(!0), safeTime = this.lastWatchEvent;
          for (let entry of this.files.values())
            fixupEntryAccuracy(entry), safeTime = Math.max(safeTime, entry.safeTime);
        } else {
          let entry = this.files.get(filePath);
          entry ? (fixupEntryAccuracy(entry), safeTime = entry.safeTime) : safeTime = 0;
        }
        return safeTime ? safeTime >= startTime && process.nextTick(() => {
          this.closed || (filePath === this.path ? watcher.emit(
            "change",
            filePath,
            safeTime,
            "watch (outdated on attach)",
            !0
          ) : watcher.emit(
            "change",
            safeTime,
            "watch (outdated on attach)",
            !0
          ));
        }) : this.initialScan ? this.initialScanRemoved.has(filePath) && process.nextTick(() => {
          this.closed || watcher.emit("remove");
        }) : filePath !== this.path && !this.directories.has(filePath) && watcher.checkStartTime(this.initialScanFinished, !1) && process.nextTick(() => {
          this.closed || watcher.emit("initial-missing", "watch (missing on attach)");
        }), watcher;
      }
      onWatchEvent(eventType, filename) {
        if (this.closed) return;
        if (!filename) {
          this.doScan(!1);
          return;
        }
        let filePath = path2.join(this.path, filename);
        if (!this.ignored(filePath))
          if (this._activeEvents.get(filename) === void 0) {
            this._activeEvents.set(filename, !1);
            let checkStats = () => {
              this.closed || (this._activeEvents.set(filename, !1), fs.lstat(filePath, (err, stats) => {
                if (!this.closed) {
                  if (this._activeEvents.get(filename) === !0) {
                    process.nextTick(checkStats);
                    return;
                  }
                  this._activeEvents.delete(filename), err && (err.code !== "ENOENT" && err.code !== "EPERM" && err.code !== "EBUSY" ? this.onStatsError(err) : filename === path2.basename(this.path) && (fs.existsSync(this.path) || this.onDirectoryRemoved("stat failed"))), this.lastWatchEvent = Date.now(), stats ? stats.isDirectory() ? this.setDirectory(
                    filePath,
                    +stats.birthtime || 1,
                    !1,
                    eventType
                  ) : (stats.isFile() || stats.isSymbolicLink()) && (stats.mtime && ensureFsAccuracy(stats.mtime), this.setFileTime(
                    filePath,
                    +stats.mtime || +stats.ctime || 1,
                    !1,
                    !1,
                    eventType
                  )) : this.setMissing(filePath, !1, eventType);
                }
              }));
            };
            process.nextTick(checkStats);
          } else
            this._activeEvents.set(filename, !0);
      }
      onWatcherError(err) {
        this.closed || err && (err.code !== "EPERM" && err.code !== "ENOENT" && console.error("Watchpack Error (watcher): " + err), this.onDirectoryRemoved("watch error"));
      }
      onStatsError(err) {
        err && console.error("Watchpack Error (stats): " + err);
      }
      onScanError(err) {
        err && console.error("Watchpack Error (initial scan): " + err), this.onScanFinished();
      }
      onScanFinished() {
        this.polledWatching && (this.timeout = setTimeout(() => {
          this.closed || this.doScan(!1);
        }, this.polledWatching));
      }
      onDirectoryRemoved(reason) {
        this.watcher && (this.watcher.close(), this.watcher = null), this.watchInParentDirectory();
        let type = `directory-removed (${reason})`;
        for (let directory of this.directories.keys())
          this.setMissing(directory, null, type);
        for (let file of this.files.keys())
          this.setMissing(file, null, type);
      }
      watchInParentDirectory() {
        if (!this.parentWatcher) {
          let parentDir = path2.dirname(this.path);
          if (path2.dirname(parentDir) === parentDir) return;
          this.parentWatcher = this.watcherManager.watchFile(this.path, 1), this.parentWatcher.on("change", (mtime, type) => {
            this.closed || ((!IS_OSX || this.polledWatching) && this.parentWatcher && (this.parentWatcher.close(), this.parentWatcher = null), this.watcher || (this.createWatcher(), this.doScan(!1), this.forEachWatcher(
              this.path,
              (w) => w.emit("change", this.path, mtime, type, !1)
            )));
          }), this.parentWatcher.on("remove", () => {
            this.onDirectoryRemoved("parent directory removed");
          });
        }
      }
      doScan(initial) {
        if (this.scanning) {
          this.scanAgain ? initial || (this.scanAgainInitial = !1) : (this.scanAgain = !0, this.scanAgainInitial = initial);
          return;
        }
        this.scanning = !0, this.timeout && (clearTimeout(this.timeout), this.timeout = void 0), process.nextTick(() => {
          this.closed || fs.readdir(this.path, (err, items) => {
            if (this.closed) return;
            if (err) {
              if (err.code === "ENOENT" || err.code === "EPERM" ? this.onDirectoryRemoved("scan readdir failed") : this.onScanError(err), this.initialScan = !1, this.initialScanFinished = Date.now(), initial)
                for (let watchers of this.watchers.values())
                  for (let watcher of watchers)
                    watcher.checkStartTime(this.initialScanFinished, !1) && watcher.emit(
                      "initial-missing",
                      "scan (parent directory missing in initial scan)"
                    );
              this.scanAgain ? (this.scanAgain = !1, this.doScan(this.scanAgainInitial)) : this.scanning = !1;
              return;
            }
            let itemPaths = new Set(
              items.map((item) => path2.join(this.path, item.normalize("NFC")))
            );
            for (let file of this.files.keys())
              itemPaths.has(file) || this.setMissing(file, initial, "scan (missing)");
            for (let directory of this.directories.keys())
              itemPaths.has(directory) || this.setMissing(directory, initial, "scan (missing)");
            if (this.scanAgain) {
              this.scanAgain = !1, this.doScan(initial);
              return;
            }
            let itemFinished = needCalls(itemPaths.size + 1, () => {
              if (!this.closed) {
                if (this.initialScan = !1, this.initialScanRemoved = null, this.initialScanFinished = Date.now(), initial) {
                  let missingWatchers = new Map(this.watchers);
                  missingWatchers.delete(withoutCase(this.path));
                  for (let item of itemPaths)
                    missingWatchers.delete(withoutCase(item));
                  for (let watchers of missingWatchers.values())
                    for (let watcher of watchers)
                      watcher.checkStartTime(this.initialScanFinished, !1) && watcher.emit(
                        "initial-missing",
                        "scan (missing in initial scan)"
                      );
                }
                this.scanAgain ? (this.scanAgain = !1, this.doScan(this.scanAgainInitial)) : (this.scanning = !1, this.onScanFinished());
              }
            });
            for (let itemPath of itemPaths)
              fs.lstat(itemPath, (err2, stats) => {
                if (!this.closed) {
                  if (err2) {
                    err2.code === "ENOENT" || err2.code === "EPERM" || err2.code === "EACCES" || err2.code === "EBUSY" || // TODO https://github.com/libuv/libuv/pull/4566
                    err2.code === "EINVAL" && IS_WIN ? this.setMissing(itemPath, initial, "scan (" + err2.code + ")") : this.onScanError(err2), itemFinished();
                    return;
                  }
                  stats.isFile() || stats.isSymbolicLink() ? (stats.mtime && ensureFsAccuracy(stats.mtime), this.setFileTime(
                    itemPath,
                    +stats.mtime || +stats.ctime || 1,
                    initial,
                    !0,
                    "scan (file)"
                  )) : stats.isDirectory() && (!initial || !this.directories.has(itemPath)) && this.setDirectory(
                    itemPath,
                    +stats.birthtime || 1,
                    initial,
                    "scan (dir)"
                  ), itemFinished();
                }
              });
            itemFinished();
          });
        });
      }
      getTimes() {
        let obj = /* @__PURE__ */ Object.create(null), safeTime = this.lastWatchEvent;
        for (let [file, entry] of this.files)
          fixupEntryAccuracy(entry), safeTime = Math.max(safeTime, entry.safeTime), obj[file] = Math.max(entry.safeTime, entry.timestamp);
        if (this.nestedWatching) {
          for (let w of this.directories.values()) {
            let times = w.directoryWatcher.getTimes();
            for (let file of Object.keys(times)) {
              let time = times[file];
              safeTime = Math.max(safeTime, time), obj[file] = time;
            }
          }
          obj[this.path] = safeTime;
        }
        if (!this.initialScan)
          for (let watchers of this.watchers.values())
            for (let watcher of watchers) {
              let path3 = watcher.path;
              Object.prototype.hasOwnProperty.call(obj, path3) || (obj[path3] = null);
            }
        return obj;
      }
      collectTimeInfoEntries(fileTimestamps, directoryTimestamps) {
        let safeTime = this.lastWatchEvent;
        for (let [file, entry] of this.files)
          fixupEntryAccuracy(entry), safeTime = Math.max(safeTime, entry.safeTime), fileTimestamps.set(file, entry);
        if (this.nestedWatching) {
          for (let w of this.directories.values())
            safeTime = Math.max(
              safeTime,
              w.directoryWatcher.collectTimeInfoEntries(
                fileTimestamps,
                directoryTimestamps
              )
            );
          fileTimestamps.set(this.path, EXISTANCE_ONLY_TIME_ENTRY), directoryTimestamps.set(this.path, {
            safeTime
          });
        } else {
          for (let dir of this.directories.keys())
            fileTimestamps.set(dir, EXISTANCE_ONLY_TIME_ENTRY), directoryTimestamps.has(dir) || directoryTimestamps.set(dir, EXISTANCE_ONLY_TIME_ENTRY);
          fileTimestamps.set(this.path, EXISTANCE_ONLY_TIME_ENTRY), directoryTimestamps.set(this.path, EXISTANCE_ONLY_TIME_ENTRY);
        }
        if (!this.initialScan)
          for (let watchers of this.watchers.values())
            for (let watcher of watchers) {
              let path3 = watcher.path;
              fileTimestamps.has(path3) || fileTimestamps.set(path3, null);
            }
        return safeTime;
      }
      close() {
        if (this.closed = !0, this.initialScan = !1, this.watcher && (this.watcher.close(), this.watcher = null), this.nestedWatching) {
          for (let w of this.directories.values())
            w.close();
          this.directories.clear();
        }
        this.parentWatcher && (this.parentWatcher.close(), this.parentWatcher = null), this.emit("closed");
      }
    };
    module.exports = DirectoryWatcher;
    module.exports.EXISTANCE_ONLY_TIME_ENTRY = EXISTANCE_ONLY_TIME_ENTRY;
    function fixupEntryAccuracy(entry) {
      entry.accuracy > FS_ACCURACY && (entry.safeTime = entry.safeTime - entry.accuracy + FS_ACCURACY, entry.accuracy = FS_ACCURACY);
    }
    function ensureFsAccuracy(mtime) {
      mtime && (FS_ACCURACY > 1 && mtime % 1 !== 0 ? FS_ACCURACY = 1 : FS_ACCURACY > 10 && mtime % 10 !== 0 ? FS_ACCURACY = 10 : FS_ACCURACY > 100 && mtime % 100 !== 0 ? FS_ACCURACY = 100 : FS_ACCURACY > 1e3 && mtime % 1e3 !== 0 && (FS_ACCURACY = 1e3));
    }
  }
});

// ../node_modules/watchpack/lib/getWatcherManager.js
var require_getWatcherManager = __commonJS({
  "../node_modules/watchpack/lib/getWatcherManager.js"(exports, module) {
    "use strict";
    var path2 = __require("path"), DirectoryWatcher = require_DirectoryWatcher(), WatcherManager = class {
      constructor(options) {
        this.options = options, this.directoryWatchers = /* @__PURE__ */ new Map();
      }
      getDirectoryWatcher(directory) {
        let watcher = this.directoryWatchers.get(directory);
        if (watcher === void 0) {
          let newWatcher = new DirectoryWatcher(this, directory, this.options);
          return this.directoryWatchers.set(directory, newWatcher), newWatcher.on("closed", () => {
            this.directoryWatchers.delete(directory);
          }), newWatcher;
        }
        return watcher;
      }
      watchFile(p, startTime) {
        let directory = path2.dirname(p);
        return directory === p ? null : this.getDirectoryWatcher(directory).watch(p, startTime);
      }
      watchDirectory(directory, startTime) {
        return this.getDirectoryWatcher(directory).watch(directory, startTime);
      }
    }, watcherManagers = /* @__PURE__ */ new WeakMap();
    module.exports = (options) => {
      let watcherManager = watcherManagers.get(options);
      if (watcherManager !== void 0) return watcherManager;
      let newWatcherManager = new WatcherManager(options);
      return watcherManagers.set(options, newWatcherManager), newWatcherManager;
    };
    module.exports.WatcherManager = WatcherManager;
  }
});

// ../node_modules/watchpack/lib/LinkResolver.js
var require_LinkResolver = __commonJS({
  "../node_modules/watchpack/lib/LinkResolver.js"(exports, module) {
    "use strict";
    var fs = __require("fs"), path2 = __require("path"), EXPECTED_ERRORS = /* @__PURE__ */ new Set(["EINVAL", "ENOENT"]);
    process.platform === "win32" && EXPECTED_ERRORS.add("UNKNOWN");
    var LinkResolver = class {
      constructor() {
        this.cache = /* @__PURE__ */ new Map();
      }
      /**
       * @param {string} file path to file or directory
       * @returns {string[]} array of file and all symlinks contributed in the resolving process (first item is the resolved file)
       */
      resolve(file) {
        let cacheEntry = this.cache.get(file);
        if (cacheEntry !== void 0)
          return cacheEntry;
        let parent = path2.dirname(file);
        if (parent === file) {
          let result = Object.freeze([file]);
          return this.cache.set(file, result), result;
        }
        let parentResolved = this.resolve(parent), realFile = file;
        if (parentResolved[0] !== parent) {
          let basename4 = path2.basename(file);
          realFile = path2.resolve(parentResolved[0], basename4);
        }
        try {
          let linkContent = fs.readlinkSync(realFile), resolvedLink = path2.resolve(parentResolved[0], linkContent), linkResolved = this.resolve(resolvedLink), result;
          if (linkResolved.length > 1 && parentResolved.length > 1) {
            let resultSet = new Set(linkResolved);
            resultSet.add(realFile);
            for (let i = 1; i < parentResolved.length; i++)
              resultSet.add(parentResolved[i]);
            result = Object.freeze(Array.from(resultSet));
          } else parentResolved.length > 1 ? (result = parentResolved.slice(), result[0] = linkResolved[0], result.push(realFile), Object.freeze(result)) : linkResolved.length > 1 ? (result = linkResolved.slice(), result.push(realFile), Object.freeze(result)) : result = Object.freeze([
            // the resolve real location
            linkResolved[0],
            // add the link
            realFile
          ]);
          return this.cache.set(file, result), result;
        } catch (e) {
          if (!EXPECTED_ERRORS.has(e.code))
            throw e;
          let result = parentResolved.slice();
          return result[0] = realFile, Object.freeze(result), this.cache.set(file, result), result;
        }
      }
    };
    module.exports = LinkResolver;
  }
});

// ../node_modules/glob-to-regexp/index.js
var require_glob_to_regexp = __commonJS({
  "../node_modules/glob-to-regexp/index.js"(exports, module) {
    module.exports = function(glob, opts) {
      if (typeof glob != "string")
        throw new TypeError("Expected a string");
      for (var str = String(glob), reStr = "", extended = opts ? !!opts.extended : !1, globstar = opts ? !!opts.globstar : !1, inGroup = !1, flags = opts && typeof opts.flags == "string" ? opts.flags : "", c, i = 0, len = str.length; i < len; i++)
        switch (c = str[i], c) {
          case "/":
          case "$":
          case "^":
          case "+":
          case ".":
          case "(":
          case ")":
          case "=":
          case "!":
          case "|":
            reStr += "\\" + c;
            break;
          case "?":
            if (extended) {
              reStr += ".";
              break;
            }
          case "[":
          case "]":
            if (extended) {
              reStr += c;
              break;
            }
          case "{":
            if (extended) {
              inGroup = !0, reStr += "(";
              break;
            }
          case "}":
            if (extended) {
              inGroup = !1, reStr += ")";
              break;
            }
          case ",":
            if (inGroup) {
              reStr += "|";
              break;
            }
            reStr += "\\" + c;
            break;
          case "*":
            for (var prevChar = str[i - 1], starCount = 1; str[i + 1] === "*"; )
              starCount++, i++;
            var nextChar = str[i + 1];
            if (!globstar)
              reStr += ".*";
            else {
              var isGlobstar = starCount > 1 && (prevChar === "/" || prevChar === void 0) && (nextChar === "/" || nextChar === void 0);
              isGlobstar ? (reStr += "((?:[^/]*(?:/|$))*)", i++) : reStr += "([^/]*)";
            }
            break;
          default:
            reStr += c;
        }
      return (!flags || !~flags.indexOf("g")) && (reStr = "^" + reStr + "$"), new RegExp(reStr, flags);
    };
  }
});

// ../node_modules/watchpack/lib/watchpack.js
var require_watchpack = __commonJS({
  "../node_modules/watchpack/lib/watchpack.js"(exports, module) {
    "use strict";
    var getWatcherManager = require_getWatcherManager(), LinkResolver = require_LinkResolver(), EventEmitter = __require("events").EventEmitter, globToRegExp = require_glob_to_regexp(), watchEventSource = require_watchEventSource(), EMPTY_ARRAY = [], EMPTY_OPTIONS = {};
    function addWatchersToSet(watchers, set) {
      for (let ww of watchers) {
        let w = ww.watcher;
        set.has(w.directoryWatcher) || set.add(w.directoryWatcher);
      }
    }
    var stringToRegexp = (ignored) => {
      if (ignored.length === 0)
        return;
      let source = globToRegExp(ignored, { globstar: !0, extended: !0 }).source;
      return source.slice(0, source.length - 1) + "(?:$|\\/)";
    }, ignoredToFunction = (ignored) => {
      if (Array.isArray(ignored)) {
        let stringRegexps = ignored.map((i) => stringToRegexp(i)).filter(Boolean);
        if (stringRegexps.length === 0)
          return () => !1;
        let regexp = new RegExp(stringRegexps.join("|"));
        return (x) => regexp.test(x.replace(/\\/g, "/"));
      } else if (typeof ignored == "string") {
        let stringRegexp = stringToRegexp(ignored);
        if (!stringRegexp)
          return () => !1;
        let regexp = new RegExp(stringRegexp);
        return (x) => regexp.test(x.replace(/\\/g, "/"));
      } else {
        if (ignored instanceof RegExp)
          return (x) => ignored.test(x.replace(/\\/g, "/"));
        if (ignored instanceof Function)
          return ignored;
        if (ignored)
          throw new Error(`Invalid option for 'ignored': ${ignored}`);
        return () => !1;
      }
    }, normalizeOptions = (options) => ({
      followSymlinks: !!options.followSymlinks,
      ignored: ignoredToFunction(options.ignored),
      poll: options.poll
    }), normalizeCache = /* @__PURE__ */ new WeakMap(), cachedNormalizeOptions = (options) => {
      let cacheEntry = normalizeCache.get(options);
      if (cacheEntry !== void 0) return cacheEntry;
      let normalized = normalizeOptions(options);
      return normalizeCache.set(options, normalized), normalized;
    }, WatchpackFileWatcher = class {
      constructor(watchpack, watcher, files) {
        this.files = Array.isArray(files) ? files : [files], this.watcher = watcher, watcher.on("initial-missing", (type) => {
          for (let file of this.files)
            watchpack._missing.has(file) || watchpack._onRemove(file, file, type);
        }), watcher.on("change", (mtime, type) => {
          for (let file of this.files)
            watchpack._onChange(file, mtime, file, type);
        }), watcher.on("remove", (type) => {
          for (let file of this.files)
            watchpack._onRemove(file, file, type);
        });
      }
      update(files) {
        Array.isArray(files) ? this.files = files : this.files.length !== 1 ? this.files = [files] : this.files[0] !== files && (this.files[0] = files);
      }
      close() {
        this.watcher.close();
      }
    }, WatchpackDirectoryWatcher = class {
      constructor(watchpack, watcher, directories) {
        this.directories = Array.isArray(directories) ? directories : [directories], this.watcher = watcher, watcher.on("initial-missing", (type) => {
          for (let item of this.directories)
            watchpack._onRemove(item, item, type);
        }), watcher.on("change", (file, mtime, type) => {
          for (let item of this.directories)
            watchpack._onChange(item, mtime, file, type);
        }), watcher.on("remove", (type) => {
          for (let item of this.directories)
            watchpack._onRemove(item, item, type);
        });
      }
      update(directories) {
        Array.isArray(directories) ? this.directories = directories : this.directories.length !== 1 ? this.directories = [directories] : this.directories[0] !== directories && (this.directories[0] = directories);
      }
      close() {
        this.watcher.close();
      }
    }, Watchpack3 = class extends EventEmitter {
      constructor(options) {
        super(), options || (options = EMPTY_OPTIONS), this.options = options, this.aggregateTimeout = typeof options.aggregateTimeout == "number" ? options.aggregateTimeout : 200, this.watcherOptions = cachedNormalizeOptions(options), this.watcherManager = getWatcherManager(this.watcherOptions), this.fileWatchers = /* @__PURE__ */ new Map(), this.directoryWatchers = /* @__PURE__ */ new Map(), this._missing = /* @__PURE__ */ new Set(), this.startTime = void 0, this.paused = !1, this.aggregatedChanges = /* @__PURE__ */ new Set(), this.aggregatedRemovals = /* @__PURE__ */ new Set(), this.aggregateTimer = void 0, this._onTimeout = this._onTimeout.bind(this);
      }
      watch(arg1, arg2, arg3) {
        let files, directories, missing, startTime;
        arg2 ? (files = arg1, directories = arg2, missing = EMPTY_ARRAY, startTime = arg3) : {
          files = EMPTY_ARRAY,
          directories = EMPTY_ARRAY,
          missing = EMPTY_ARRAY,
          startTime
        } = arg1, this.paused = !1;
        let fileWatchers = this.fileWatchers, directoryWatchers = this.directoryWatchers, ignored = this.watcherOptions.ignored, filter = (path2) => !ignored(path2), addToMap = (map, key, item) => {
          let list = map.get(key);
          list === void 0 ? map.set(key, item) : Array.isArray(list) ? list.push(item) : map.set(key, [list, item]);
        }, fileWatchersNeeded = /* @__PURE__ */ new Map(), directoryWatchersNeeded = /* @__PURE__ */ new Map(), missingFiles = /* @__PURE__ */ new Set();
        if (this.watcherOptions.followSymlinks) {
          let resolver = new LinkResolver();
          for (let file of files)
            if (filter(file))
              for (let innerFile of resolver.resolve(file))
                (file === innerFile || filter(innerFile)) && addToMap(fileWatchersNeeded, innerFile, file);
          for (let file of missing)
            if (filter(file))
              for (let innerFile of resolver.resolve(file))
                (file === innerFile || filter(innerFile)) && (missingFiles.add(file), addToMap(fileWatchersNeeded, innerFile, file));
          for (let dir of directories)
            if (filter(dir)) {
              let first = !0;
              for (let innerItem of resolver.resolve(dir))
                filter(innerItem) && addToMap(
                  first ? directoryWatchersNeeded : fileWatchersNeeded,
                  innerItem,
                  dir
                ), first = !1;
            }
        } else {
          for (let file of files)
            filter(file) && addToMap(fileWatchersNeeded, file, file);
          for (let file of missing)
            filter(file) && (missingFiles.add(file), addToMap(fileWatchersNeeded, file, file));
          for (let dir of directories)
            filter(dir) && addToMap(directoryWatchersNeeded, dir, dir);
        }
        for (let [key, w] of fileWatchers) {
          let needed = fileWatchersNeeded.get(key);
          needed === void 0 ? (w.close(), fileWatchers.delete(key)) : (w.update(needed), fileWatchersNeeded.delete(key));
        }
        for (let [key, w] of directoryWatchers) {
          let needed = directoryWatchersNeeded.get(key);
          needed === void 0 ? (w.close(), directoryWatchers.delete(key)) : (w.update(needed), directoryWatchersNeeded.delete(key));
        }
        watchEventSource.batch(() => {
          for (let [key, files2] of fileWatchersNeeded) {
            let watcher = this.watcherManager.watchFile(key, startTime);
            watcher && fileWatchers.set(key, new WatchpackFileWatcher(this, watcher, files2));
          }
          for (let [key, directories2] of directoryWatchersNeeded) {
            let watcher = this.watcherManager.watchDirectory(key, startTime);
            watcher && directoryWatchers.set(
              key,
              new WatchpackDirectoryWatcher(this, watcher, directories2)
            );
          }
        }), this._missing = missingFiles, this.startTime = startTime;
      }
      close() {
        this.paused = !0, this.aggregateTimer && clearTimeout(this.aggregateTimer);
        for (let w of this.fileWatchers.values()) w.close();
        for (let w of this.directoryWatchers.values()) w.close();
        this.fileWatchers.clear(), this.directoryWatchers.clear();
      }
      pause() {
        this.paused = !0, this.aggregateTimer && clearTimeout(this.aggregateTimer);
      }
      getTimes() {
        let directoryWatchers = /* @__PURE__ */ new Set();
        addWatchersToSet(this.fileWatchers.values(), directoryWatchers), addWatchersToSet(this.directoryWatchers.values(), directoryWatchers);
        let obj = /* @__PURE__ */ Object.create(null);
        for (let w of directoryWatchers) {
          let times = w.getTimes();
          for (let file of Object.keys(times)) obj[file] = times[file];
        }
        return obj;
      }
      getTimeInfoEntries() {
        let map = /* @__PURE__ */ new Map();
        return this.collectTimeInfoEntries(map, map), map;
      }
      collectTimeInfoEntries(fileTimestamps, directoryTimestamps) {
        let allWatchers = /* @__PURE__ */ new Set();
        addWatchersToSet(this.fileWatchers.values(), allWatchers), addWatchersToSet(this.directoryWatchers.values(), allWatchers);
        let safeTime = { value: 0 };
        for (let w of allWatchers)
          w.collectTimeInfoEntries(fileTimestamps, directoryTimestamps, safeTime);
      }
      getAggregated() {
        this.aggregateTimer && (clearTimeout(this.aggregateTimer), this.aggregateTimer = void 0);
        let changes = this.aggregatedChanges, removals = this.aggregatedRemovals;
        return this.aggregatedChanges = /* @__PURE__ */ new Set(), this.aggregatedRemovals = /* @__PURE__ */ new Set(), { changes, removals };
      }
      _onChange(item, mtime, file, type) {
        file = file || item, this.paused || (this.emit("change", file, mtime, type), this.aggregateTimer && clearTimeout(this.aggregateTimer), this.aggregateTimer = setTimeout(this._onTimeout, this.aggregateTimeout)), this.aggregatedRemovals.delete(item), this.aggregatedChanges.add(item);
      }
      _onRemove(item, file, type) {
        file = file || item, this.paused || (this.emit("remove", file, type), this.aggregateTimer && clearTimeout(this.aggregateTimer), this.aggregateTimer = setTimeout(this._onTimeout, this.aggregateTimeout)), this.aggregatedChanges.delete(item), this.aggregatedRemovals.add(item);
      }
      _onTimeout() {
        this.aggregateTimer = void 0;
        let changes = this.aggregatedChanges, removals = this.aggregatedRemovals;
        this.aggregatedChanges = /* @__PURE__ */ new Set(), this.aggregatedRemovals = /* @__PURE__ */ new Set(), this.emit("aggregated", changes, removals);
      }
    };
    module.exports = Watchpack3;
  }
});

// ../node_modules/telejson/dist/index.js
var require_dist2 = __commonJS({
  "../node_modules/telejson/dist/index.js"(exports, module) {
    "use strict";
    var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS2 = (cb, mod) => function() {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    }, __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: !0 });
    }, __copyProps = (to, from, except, desc) => {
      if (from && typeof from == "object" || typeof from == "function")
        for (let key of __getOwnPropNames(from))
          !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      return to;
    }, __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
      mod
    )), __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: !0 }), mod), require_es_object_atoms = __commonJS2({
      "node_modules/.pnpm/es-object-atoms@1.1.1/node_modules/es-object-atoms/index.js"(exports2, module2) {
        "use strict";
        module2.exports = Object;
      }
    }), require_es_errors = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/index.js"(exports2, module2) {
        "use strict";
        module2.exports = Error;
      }
    }), require_eval = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/eval.js"(exports2, module2) {
        "use strict";
        module2.exports = EvalError;
      }
    }), require_range = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/range.js"(exports2, module2) {
        "use strict";
        module2.exports = RangeError;
      }
    }), require_ref = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/ref.js"(exports2, module2) {
        "use strict";
        module2.exports = ReferenceError;
      }
    }), require_syntax = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/syntax.js"(exports2, module2) {
        "use strict";
        module2.exports = SyntaxError;
      }
    }), require_type = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/type.js"(exports2, module2) {
        "use strict";
        module2.exports = TypeError;
      }
    }), require_uri = __commonJS2({
      "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/uri.js"(exports2, module2) {
        "use strict";
        module2.exports = URIError;
      }
    }), require_abs = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/abs.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.abs;
      }
    }), require_floor = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/floor.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.floor;
      }
    }), require_max = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/max.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.max;
      }
    }), require_min = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/min.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.min;
      }
    }), require_pow = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/pow.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.pow;
      }
    }), require_round = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/round.js"(exports2, module2) {
        "use strict";
        module2.exports = Math.round;
      }
    }), require_isNaN = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/isNaN.js"(exports2, module2) {
        "use strict";
        module2.exports = Number.isNaN || function(a) {
          return a !== a;
        };
      }
    }), require_sign = __commonJS2({
      "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/sign.js"(exports2, module2) {
        "use strict";
        var $isNaN = require_isNaN();
        module2.exports = function(number) {
          return $isNaN(number) || number === 0 ? number : number < 0 ? -1 : 1;
        };
      }
    }), require_gOPD = __commonJS2({
      "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/gOPD.js"(exports2, module2) {
        "use strict";
        module2.exports = Object.getOwnPropertyDescriptor;
      }
    }), require_gopd = __commonJS2({
      "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/index.js"(exports2, module2) {
        "use strict";
        var $gOPD = require_gOPD();
        if ($gOPD)
          try {
            $gOPD([], "length");
          } catch {
            $gOPD = null;
          }
        module2.exports = $gOPD;
      }
    }), require_es_define_property = __commonJS2({
      "node_modules/.pnpm/es-define-property@1.0.1/node_modules/es-define-property/index.js"(exports2, module2) {
        "use strict";
        var $defineProperty = Object.defineProperty || !1;
        if ($defineProperty)
          try {
            $defineProperty({}, "a", { value: 1 });
          } catch {
            $defineProperty = !1;
          }
        module2.exports = $defineProperty;
      }
    }), require_shams = __commonJS2({
      "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/shams.js"(exports2, module2) {
        "use strict";
        module2.exports = function() {
          if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
            return !1;
          if (typeof Symbol.iterator == "symbol")
            return !0;
          var obj = {}, sym = Symbol("test"), symObj = Object(sym);
          if (typeof sym == "string" || Object.prototype.toString.call(sym) !== "[object Symbol]" || Object.prototype.toString.call(symObj) !== "[object Symbol]")
            return !1;
          var symVal = 42;
          obj[sym] = symVal;
          for (var _ in obj)
            return !1;
          if (typeof Object.keys == "function" && Object.keys(obj).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(obj).length !== 0)
            return !1;
          var syms = Object.getOwnPropertySymbols(obj);
          if (syms.length !== 1 || syms[0] !== sym || !Object.prototype.propertyIsEnumerable.call(obj, sym))
            return !1;
          if (typeof Object.getOwnPropertyDescriptor == "function") {
            var descriptor = (
              /** @type {PropertyDescriptor} */
              Object.getOwnPropertyDescriptor(obj, sym)
            );
            if (descriptor.value !== symVal || descriptor.enumerable !== !0)
              return !1;
          }
          return !0;
        };
      }
    }), require_has_symbols = __commonJS2({
      "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/index.js"(exports2, module2) {
        "use strict";
        var origSymbol = typeof Symbol < "u" && Symbol, hasSymbolSham = require_shams();
        module2.exports = function() {
          return typeof origSymbol != "function" || typeof Symbol != "function" || typeof origSymbol("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : hasSymbolSham();
        };
      }
    }), require_Reflect_getPrototypeOf = __commonJS2({
      "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Reflect.getPrototypeOf.js"(exports2, module2) {
        "use strict";
        module2.exports = typeof Reflect < "u" && Reflect.getPrototypeOf || null;
      }
    }), require_Object_getPrototypeOf = __commonJS2({
      "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Object.getPrototypeOf.js"(exports2, module2) {
        "use strict";
        var $Object = require_es_object_atoms();
        module2.exports = $Object.getPrototypeOf || null;
      }
    }), require_implementation = __commonJS2({
      "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/implementation.js"(exports2, module2) {
        "use strict";
        var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ", toStr = Object.prototype.toString, max = Math.max, funcType = "[object Function]", concatty = function(a, b) {
          for (var arr = [], i = 0; i < a.length; i += 1)
            arr[i] = a[i];
          for (var j = 0; j < b.length; j += 1)
            arr[j + a.length] = b[j];
          return arr;
        }, slicy = function(arrLike, offset) {
          for (var arr = [], i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1)
            arr[j] = arrLike[i];
          return arr;
        }, joiny = function(arr, joiner) {
          for (var str = "", i = 0; i < arr.length; i += 1)
            str += arr[i], i + 1 < arr.length && (str += joiner);
          return str;
        };
        module2.exports = function(that) {
          var target = this;
          if (typeof target != "function" || toStr.apply(target) !== funcType)
            throw new TypeError(ERROR_MESSAGE + target);
          for (var args = slicy(arguments, 1), bound, binder = function() {
            if (this instanceof bound) {
              var result = target.apply(
                this,
                concatty(args, arguments)
              );
              return Object(result) === result ? result : this;
            }
            return target.apply(
              that,
              concatty(args, arguments)
            );
          }, boundLength = max(0, target.length - args.length), boundArgs = [], i = 0; i < boundLength; i++)
            boundArgs[i] = "$" + i;
          if (bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder), target.prototype) {
            var Empty = function() {
            };
            Empty.prototype = target.prototype, bound.prototype = new Empty(), Empty.prototype = null;
          }
          return bound;
        };
      }
    }), require_function_bind = __commonJS2({
      "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/index.js"(exports2, module2) {
        "use strict";
        var implementation = require_implementation();
        module2.exports = Function.prototype.bind || implementation;
      }
    }), require_functionCall = __commonJS2({
      "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionCall.js"(exports2, module2) {
        "use strict";
        module2.exports = Function.prototype.call;
      }
    }), require_functionApply = __commonJS2({
      "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionApply.js"(exports2, module2) {
        "use strict";
        module2.exports = Function.prototype.apply;
      }
    }), require_reflectApply = __commonJS2({
      "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/reflectApply.js"(exports2, module2) {
        "use strict";
        module2.exports = typeof Reflect < "u" && Reflect && Reflect.apply;
      }
    }), require_actualApply = __commonJS2({
      "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/actualApply.js"(exports2, module2) {
        "use strict";
        var bind = require_function_bind(), $apply = require_functionApply(), $call = require_functionCall(), $reflectApply = require_reflectApply();
        module2.exports = $reflectApply || bind.call($call, $apply);
      }
    }), require_call_bind_apply_helpers = __commonJS2({
      "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/index.js"(exports2, module2) {
        "use strict";
        var bind = require_function_bind(), $TypeError = require_type(), $call = require_functionCall(), $actualApply = require_actualApply();
        module2.exports = function(args) {
          if (args.length < 1 || typeof args[0] != "function")
            throw new $TypeError("a function is required");
          return $actualApply(bind, $call, args);
        };
      }
    }), require_get = __commonJS2({
      "node_modules/.pnpm/dunder-proto@1.0.1/node_modules/dunder-proto/get.js"(exports2, module2) {
        "use strict";
        var callBind = require_call_bind_apply_helpers(), gOPD = require_gopd(), hasProtoAccessor;
        try {
          hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
          [].__proto__ === Array.prototype;
        } catch (e) {
          if (!e || typeof e != "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS")
            throw e;
        }
        var desc = !!hasProtoAccessor && gOPD && gOPD(
          Object.prototype,
          /** @type {keyof typeof Object.prototype} */
          "__proto__"
        ), $Object = Object, $getPrototypeOf = $Object.getPrototypeOf;
        module2.exports = desc && typeof desc.get == "function" ? callBind([desc.get]) : typeof $getPrototypeOf == "function" ? (
          /** @type {import('./get')} */
          (function(value) {
            return $getPrototypeOf(value == null ? value : $Object(value));
          })
        ) : !1;
      }
    }), require_get_proto = __commonJS2({
      "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/index.js"(exports2, module2) {
        "use strict";
        var reflectGetProto = require_Reflect_getPrototypeOf(), originalGetProto = require_Object_getPrototypeOf(), getDunderProto = require_get();
        module2.exports = reflectGetProto ? function(O) {
          return reflectGetProto(O);
        } : originalGetProto ? function(O) {
          if (!O || typeof O != "object" && typeof O != "function")
            throw new TypeError("getProto: not an object");
          return originalGetProto(O);
        } : getDunderProto ? function(O) {
          return getDunderProto(O);
        } : null;
      }
    }), require_hasown = __commonJS2({
      "node_modules/.pnpm/hasown@2.0.2/node_modules/hasown/index.js"(exports2, module2) {
        "use strict";
        var call = Function.prototype.call, $hasOwn = Object.prototype.hasOwnProperty, bind = require_function_bind();
        module2.exports = bind.call(call, $hasOwn);
      }
    }), require_get_intrinsic = __commonJS2({
      "node_modules/.pnpm/get-intrinsic@1.3.0/node_modules/get-intrinsic/index.js"(exports2, module2) {
        "use strict";
        var undefined2, $Object = require_es_object_atoms(), $Error = require_es_errors(), $EvalError = require_eval(), $RangeError = require_range(), $ReferenceError = require_ref(), $SyntaxError = require_syntax(), $TypeError = require_type(), $URIError = require_uri(), abs = require_abs(), floor = require_floor(), max = require_max(), min = require_min(), pow = require_pow(), round = require_round(), sign = require_sign(), $Function = Function, getEvalledConstructor = function(expressionSyntax) {
          try {
            return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
          } catch {
          }
        }, $gOPD = require_gopd(), $defineProperty = require_es_define_property(), throwTypeError = function() {
          throw new $TypeError();
        }, ThrowTypeError = $gOPD ? (function() {
          try {
            return arguments.callee, throwTypeError;
          } catch {
            try {
              return $gOPD(arguments, "callee").get;
            } catch {
              return throwTypeError;
            }
          }
        })() : throwTypeError, hasSymbols = require_has_symbols()(), getProto = require_get_proto(), $ObjectGPO = require_Object_getPrototypeOf(), $ReflectGPO = require_Reflect_getPrototypeOf(), $apply = require_functionApply(), $call = require_functionCall(), needsEval = {}, TypedArray = typeof Uint8Array > "u" || !getProto ? undefined2 : getProto(Uint8Array), INTRINSICS = {
          __proto__: null,
          "%AggregateError%": typeof AggregateError > "u" ? undefined2 : AggregateError,
          "%Array%": Array,
          "%ArrayBuffer%": typeof ArrayBuffer > "u" ? undefined2 : ArrayBuffer,
          "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
          "%AsyncFromSyncIteratorPrototype%": undefined2,
          "%AsyncFunction%": needsEval,
          "%AsyncGenerator%": needsEval,
          "%AsyncGeneratorFunction%": needsEval,
          "%AsyncIteratorPrototype%": needsEval,
          "%Atomics%": typeof Atomics > "u" ? undefined2 : Atomics,
          "%BigInt%": typeof BigInt > "u" ? undefined2 : BigInt,
          "%BigInt64Array%": typeof BigInt64Array > "u" ? undefined2 : BigInt64Array,
          "%BigUint64Array%": typeof BigUint64Array > "u" ? undefined2 : BigUint64Array,
          "%Boolean%": Boolean,
          "%DataView%": typeof DataView > "u" ? undefined2 : DataView,
          "%Date%": Date,
          "%decodeURI%": decodeURI,
          "%decodeURIComponent%": decodeURIComponent,
          "%encodeURI%": encodeURI,
          "%encodeURIComponent%": encodeURIComponent,
          "%Error%": $Error,
          "%eval%": eval,
          // eslint-disable-line no-eval
          "%EvalError%": $EvalError,
          "%Float16Array%": typeof Float16Array > "u" ? undefined2 : Float16Array,
          "%Float32Array%": typeof Float32Array > "u" ? undefined2 : Float32Array,
          "%Float64Array%": typeof Float64Array > "u" ? undefined2 : Float64Array,
          "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? undefined2 : FinalizationRegistry,
          "%Function%": $Function,
          "%GeneratorFunction%": needsEval,
          "%Int8Array%": typeof Int8Array > "u" ? undefined2 : Int8Array,
          "%Int16Array%": typeof Int16Array > "u" ? undefined2 : Int16Array,
          "%Int32Array%": typeof Int32Array > "u" ? undefined2 : Int32Array,
          "%isFinite%": isFinite,
          "%isNaN%": isNaN,
          "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
          "%JSON%": typeof JSON == "object" ? JSON : undefined2,
          "%Map%": typeof Map > "u" ? undefined2 : Map,
          "%MapIteratorPrototype%": typeof Map > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
          "%Math%": Math,
          "%Number%": Number,
          "%Object%": $Object,
          "%Object.getOwnPropertyDescriptor%": $gOPD,
          "%parseFloat%": parseFloat,
          "%parseInt%": parseInt,
          "%Promise%": typeof Promise > "u" ? undefined2 : Promise,
          "%Proxy%": typeof Proxy > "u" ? undefined2 : Proxy,
          "%RangeError%": $RangeError,
          "%ReferenceError%": $ReferenceError,
          "%Reflect%": typeof Reflect > "u" ? undefined2 : Reflect,
          "%RegExp%": RegExp,
          "%Set%": typeof Set > "u" ? undefined2 : Set,
          "%SetIteratorPrototype%": typeof Set > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
          "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? undefined2 : SharedArrayBuffer,
          "%String%": String,
          "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
          "%Symbol%": hasSymbols ? Symbol : undefined2,
          "%SyntaxError%": $SyntaxError,
          "%ThrowTypeError%": ThrowTypeError,
          "%TypedArray%": TypedArray,
          "%TypeError%": $TypeError,
          "%Uint8Array%": typeof Uint8Array > "u" ? undefined2 : Uint8Array,
          "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? undefined2 : Uint8ClampedArray,
          "%Uint16Array%": typeof Uint16Array > "u" ? undefined2 : Uint16Array,
          "%Uint32Array%": typeof Uint32Array > "u" ? undefined2 : Uint32Array,
          "%URIError%": $URIError,
          "%WeakMap%": typeof WeakMap > "u" ? undefined2 : WeakMap,
          "%WeakRef%": typeof WeakRef > "u" ? undefined2 : WeakRef,
          "%WeakSet%": typeof WeakSet > "u" ? undefined2 : WeakSet,
          "%Function.prototype.call%": $call,
          "%Function.prototype.apply%": $apply,
          "%Object.defineProperty%": $defineProperty,
          "%Object.getPrototypeOf%": $ObjectGPO,
          "%Math.abs%": abs,
          "%Math.floor%": floor,
          "%Math.max%": max,
          "%Math.min%": min,
          "%Math.pow%": pow,
          "%Math.round%": round,
          "%Math.sign%": sign,
          "%Reflect.getPrototypeOf%": $ReflectGPO
        };
        if (getProto)
          try {
            null.error;
          } catch (e) {
            errorProto = getProto(getProto(e)), INTRINSICS["%Error.prototype%"] = errorProto;
          }
        var errorProto, doEval = function doEval2(name) {
          var value;
          if (name === "%AsyncFunction%")
            value = getEvalledConstructor("async function () {}");
          else if (name === "%GeneratorFunction%")
            value = getEvalledConstructor("function* () {}");
          else if (name === "%AsyncGeneratorFunction%")
            value = getEvalledConstructor("async function* () {}");
          else if (name === "%AsyncGenerator%") {
            var fn = doEval2("%AsyncGeneratorFunction%");
            fn && (value = fn.prototype);
          } else if (name === "%AsyncIteratorPrototype%") {
            var gen = doEval2("%AsyncGenerator%");
            gen && getProto && (value = getProto(gen.prototype));
          }
          return INTRINSICS[name] = value, value;
        }, LEGACY_ALIASES = {
          __proto__: null,
          "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
          "%ArrayPrototype%": ["Array", "prototype"],
          "%ArrayProto_entries%": ["Array", "prototype", "entries"],
          "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
          "%ArrayProto_keys%": ["Array", "prototype", "keys"],
          "%ArrayProto_values%": ["Array", "prototype", "values"],
          "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
          "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
          "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
          "%BooleanPrototype%": ["Boolean", "prototype"],
          "%DataViewPrototype%": ["DataView", "prototype"],
          "%DatePrototype%": ["Date", "prototype"],
          "%ErrorPrototype%": ["Error", "prototype"],
          "%EvalErrorPrototype%": ["EvalError", "prototype"],
          "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
          "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
          "%FunctionPrototype%": ["Function", "prototype"],
          "%Generator%": ["GeneratorFunction", "prototype"],
          "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
          "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
          "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
          "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
          "%JSONParse%": ["JSON", "parse"],
          "%JSONStringify%": ["JSON", "stringify"],
          "%MapPrototype%": ["Map", "prototype"],
          "%NumberPrototype%": ["Number", "prototype"],
          "%ObjectPrototype%": ["Object", "prototype"],
          "%ObjProto_toString%": ["Object", "prototype", "toString"],
          "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
          "%PromisePrototype%": ["Promise", "prototype"],
          "%PromiseProto_then%": ["Promise", "prototype", "then"],
          "%Promise_all%": ["Promise", "all"],
          "%Promise_reject%": ["Promise", "reject"],
          "%Promise_resolve%": ["Promise", "resolve"],
          "%RangeErrorPrototype%": ["RangeError", "prototype"],
          "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
          "%RegExpPrototype%": ["RegExp", "prototype"],
          "%SetPrototype%": ["Set", "prototype"],
          "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
          "%StringPrototype%": ["String", "prototype"],
          "%SymbolPrototype%": ["Symbol", "prototype"],
          "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
          "%TypedArrayPrototype%": ["TypedArray", "prototype"],
          "%TypeErrorPrototype%": ["TypeError", "prototype"],
          "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
          "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
          "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
          "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
          "%URIErrorPrototype%": ["URIError", "prototype"],
          "%WeakMapPrototype%": ["WeakMap", "prototype"],
          "%WeakSetPrototype%": ["WeakSet", "prototype"]
        }, bind = require_function_bind(), hasOwn = require_hasown(), $concat = bind.call($call, Array.prototype.concat), $spliceApply = bind.call($apply, Array.prototype.splice), $replace = bind.call($call, String.prototype.replace), $strSlice = bind.call($call, String.prototype.slice), $exec = bind.call($call, RegExp.prototype.exec), rePropName2 = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, reEscapeChar2 = /\\(\\)?/g, stringToPath2 = function(string) {
          var first = $strSlice(string, 0, 1), last = $strSlice(string, -1);
          if (first === "%" && last !== "%")
            throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
          if (last === "%" && first !== "%")
            throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
          var result = [];
          return $replace(string, rePropName2, function(match, number, quote, subString) {
            result[result.length] = quote ? $replace(subString, reEscapeChar2, "$1") : number || match;
          }), result;
        }, getBaseIntrinsic = function(name, allowMissing) {
          var intrinsicName = name, alias;
          if (hasOwn(LEGACY_ALIASES, intrinsicName) && (alias = LEGACY_ALIASES[intrinsicName], intrinsicName = "%" + alias[0] + "%"), hasOwn(INTRINSICS, intrinsicName)) {
            var value = INTRINSICS[intrinsicName];
            if (value === needsEval && (value = doEval(intrinsicName)), typeof value > "u" && !allowMissing)
              throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
            return {
              alias,
              name: intrinsicName,
              value
            };
          }
          throw new $SyntaxError("intrinsic " + name + " does not exist!");
        };
        module2.exports = function(name, allowMissing) {
          if (typeof name != "string" || name.length === 0)
            throw new $TypeError("intrinsic name must be a non-empty string");
          if (arguments.length > 1 && typeof allowMissing != "boolean")
            throw new $TypeError('"allowMissing" argument must be a boolean');
          if ($exec(/^%?[^%]*%?$/, name) === null)
            throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
          var parts = stringToPath2(name), intrinsicBaseName = parts.length > 0 ? parts[0] : "", intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing), intrinsicRealName = intrinsic.name, value = intrinsic.value, skipFurtherCaching = !1, alias = intrinsic.alias;
          alias && (intrinsicBaseName = alias[0], $spliceApply(parts, $concat([0, 1], alias)));
          for (var i = 1, isOwn = !0; i < parts.length; i += 1) {
            var part = parts[i], first = $strSlice(part, 0, 1), last = $strSlice(part, -1);
            if ((first === '"' || first === "'" || first === "`" || last === '"' || last === "'" || last === "`") && first !== last)
              throw new $SyntaxError("property names with quotes must have matching quotes");
            if ((part === "constructor" || !isOwn) && (skipFurtherCaching = !0), intrinsicBaseName += "." + part, intrinsicRealName = "%" + intrinsicBaseName + "%", hasOwn(INTRINSICS, intrinsicRealName))
              value = INTRINSICS[intrinsicRealName];
            else if (value != null) {
              if (!(part in value)) {
                if (!allowMissing)
                  throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
                return;
              }
              if ($gOPD && i + 1 >= parts.length) {
                var desc = $gOPD(value, part);
                isOwn = !!desc, isOwn && "get" in desc && !("originalValue" in desc.get) ? value = desc.get : value = value[part];
              } else
                isOwn = hasOwn(value, part), value = value[part];
              isOwn && !skipFurtherCaching && (INTRINSICS[intrinsicRealName] = value);
            }
          }
          return value;
        };
      }
    }), require_call_bound = __commonJS2({
      "node_modules/.pnpm/call-bound@1.0.4/node_modules/call-bound/index.js"(exports2, module2) {
        "use strict";
        var GetIntrinsic = require_get_intrinsic(), callBindBasic = require_call_bind_apply_helpers(), $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
        module2.exports = function(name, allowMissing) {
          var intrinsic = (
            /** @type {(this: unknown, ...args: unknown[]) => unknown} */
            GetIntrinsic(name, !!allowMissing)
          );
          return typeof intrinsic == "function" && $indexOf(name, ".prototype.") > -1 ? callBindBasic(
            /** @type {const} */
            [intrinsic]
          ) : intrinsic;
        };
      }
    }), require_shams2 = __commonJS2({
      "node_modules/.pnpm/has-tostringtag@1.0.2/node_modules/has-tostringtag/shams.js"(exports2, module2) {
        "use strict";
        var hasSymbols = require_shams();
        module2.exports = function() {
          return hasSymbols() && !!Symbol.toStringTag;
        };
      }
    }), require_is_regex = __commonJS2({
      "node_modules/.pnpm/is-regex@1.2.1/node_modules/is-regex/index.js"(exports2, module2) {
        "use strict";
        var callBound = require_call_bound(), hasToStringTag = require_shams2()(), hasOwn = require_hasown(), gOPD = require_gopd(), fn;
        hasToStringTag ? ($exec = callBound("RegExp.prototype.exec"), isRegexMarker = {}, throwRegexMarker = function() {
          throw isRegexMarker;
        }, badStringifier = {
          toString: throwRegexMarker,
          valueOf: throwRegexMarker
        }, typeof Symbol.toPrimitive == "symbol" && (badStringifier[Symbol.toPrimitive] = throwRegexMarker), fn = function(value) {
          if (!value || typeof value != "object")
            return !1;
          var descriptor = (
            /** @type {NonNullable<typeof gOPD>} */
            gOPD(
              /** @type {{ lastIndex?: unknown }} */
              value,
              "lastIndex"
            )
          ), hasLastIndexDataProperty = descriptor && hasOwn(descriptor, "value");
          if (!hasLastIndexDataProperty)
            return !1;
          try {
            $exec(
              value,
              /** @type {string} */
              /** @type {unknown} */
              badStringifier
            );
          } catch (e) {
            return e === isRegexMarker;
          }
        }) : ($toString = callBound("Object.prototype.toString"), regexClass = "[object RegExp]", fn = function(value) {
          return !value || typeof value != "object" && typeof value != "function" ? !1 : $toString(value) === regexClass;
        });
        var $exec, isRegexMarker, throwRegexMarker, badStringifier, $toString, regexClass;
        module2.exports = fn;
      }
    }), require_is_function = __commonJS2({
      "node_modules/.pnpm/is-function@1.0.2/node_modules/is-function/index.js"(exports2, module2) {
        module2.exports = isFunction3;
        var toString2 = Object.prototype.toString;
        function isFunction3(fn) {
          if (!fn)
            return !1;
          var string = toString2.call(fn);
          return string === "[object Function]" || typeof fn == "function" && string !== "[object RegExp]" || typeof window < "u" && // IE8 and below
          (fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt);
        }
      }
    }), require_safe_regex_test = __commonJS2({
      "node_modules/.pnpm/safe-regex-test@1.1.0/node_modules/safe-regex-test/index.js"(exports2, module2) {
        "use strict";
        var callBound = require_call_bound(), isRegex = require_is_regex(), $exec = callBound("RegExp.prototype.exec"), $TypeError = require_type();
        module2.exports = function(regex) {
          if (!isRegex(regex))
            throw new $TypeError("`regex` must be a RegExp");
          return function(s) {
            return $exec(regex, s) !== null;
          };
        };
      }
    }), require_is_symbol = __commonJS2({
      "node_modules/.pnpm/is-symbol@1.1.1/node_modules/is-symbol/index.js"(exports2, module2) {
        "use strict";
        var callBound = require_call_bound(), $toString = callBound("Object.prototype.toString"), hasSymbols = require_has_symbols()(), safeRegexTest = require_safe_regex_test();
        hasSymbols ? ($symToStr = callBound("Symbol.prototype.toString"), isSymString = safeRegexTest(/^Symbol\(.*\)$/), isSymbolObject = function(value) {
          return typeof value.valueOf() != "symbol" ? !1 : isSymString($symToStr(value));
        }, module2.exports = function(value) {
          if (typeof value == "symbol")
            return !0;
          if (!value || typeof value != "object" || $toString(value) !== "[object Symbol]")
            return !1;
          try {
            return isSymbolObject(value);
          } catch {
            return !1;
          }
        }) : module2.exports = function(value) {
          return !1;
        };
        var $symToStr, isSymString, isSymbolObject;
      }
    }), src_exports = {};
    __export(src_exports, {
      isJSON: () => isJSON2,
      parse: () => parse5,
      replacer: () => replacer,
      reviver: () => reviver,
      stringify: () => stringify2
    });
    module.exports = __toCommonJS(src_exports);
    var import_is_regex = __toESM2(require_is_regex()), import_is_function = __toESM2(require_is_function()), import_is_symbol = __toESM2(require_is_symbol());
    function isObject(val) {
      return val != null && typeof val == "object" && Array.isArray(val) === !1;
    }
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global, freeGlobal_default = freeGlobal, freeSelf = typeof self == "object" && self && self.Object === Object && self, root = freeGlobal_default || freeSelf || Function("return this")(), root_default = root, Symbol2 = root_default.Symbol, Symbol_default = Symbol2, objectProto = Object.prototype, hasOwnProperty2 = objectProto.hasOwnProperty, nativeObjectToString = objectProto.toString, symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
    function getRawTag(value) {
      var isOwn = hasOwnProperty2.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = !0;
      } catch {
      }
      var result = nativeObjectToString.call(value);
      return unmasked && (isOwn ? value[symToStringTag] = tag : delete value[symToStringTag]), result;
    }
    var getRawTag_default = getRawTag, objectProto2 = Object.prototype, nativeObjectToString2 = objectProto2.toString;
    function objectToString(value) {
      return nativeObjectToString2.call(value);
    }
    var objectToString_default = objectToString, nullTag = "[object Null]", undefinedTag = "[object Undefined]", symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
    function baseGetTag(value) {
      return value == null ? value === void 0 ? undefinedTag : nullTag : symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
    }
    var baseGetTag_default = baseGetTag;
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    var isObjectLike_default = isObjectLike, symbolTag = "[object Symbol]";
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
    }
    var isSymbol_default = isSymbol;
    function arrayMap(array, iteratee) {
      for (var index = -1, length = array == null ? 0 : array.length, result = Array(length); ++index < length; )
        result[index] = iteratee(array[index], index, array);
      return result;
    }
    var arrayMap_default = arrayMap, isArray = Array.isArray, isArray_default = isArray, INFINITY = 1 / 0, symbolProto = Symbol_default ? Symbol_default.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
    function baseToString(value) {
      if (typeof value == "string")
        return value;
      if (isArray_default(value))
        return arrayMap_default(value, baseToString) + "";
      if (isSymbol_default(value))
        return symbolToString ? symbolToString.call(value) : "";
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    var baseToString_default = baseToString;
    function isObject2(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    var isObject_default = isObject2, asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
    function isFunction(value) {
      if (!isObject_default(value))
        return !1;
      var tag = baseGetTag_default(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    var isFunction_default = isFunction, coreJsData = root_default["__core-js_shared__"], coreJsData_default = coreJsData, maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    var isMasked_default = isMasked, funcProto = Function.prototype, funcToString = funcProto.toString;
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch {
        }
        try {
          return func + "";
        } catch {
        }
      }
      return "";
    }
    var toSource_default = toSource, reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reIsHostCtor = /^\[object .+?Constructor\]$/, funcProto2 = Function.prototype, objectProto3 = Object.prototype, funcToString2 = funcProto2.toString, hasOwnProperty22 = objectProto3.hasOwnProperty, reIsNative = RegExp(
      "^" + funcToString2.call(hasOwnProperty22).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    function baseIsNative(value) {
      if (!isObject_default(value) || isMasked_default(value))
        return !1;
      var pattern = isFunction_default(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource_default(value));
    }
    var baseIsNative_default = baseIsNative;
    function getValue(object, key) {
      return object?.[key];
    }
    var getValue_default = getValue;
    function getNative(object, key) {
      var value = getValue_default(object, key);
      return baseIsNative_default(value) ? value : void 0;
    }
    var getNative_default = getNative;
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var eq_default = eq, reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
    function isKey(value, object) {
      if (isArray_default(value))
        return !1;
      var type = typeof value;
      return type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol_default(value) ? !0 : reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    var isKey_default = isKey, nativeCreate = getNative_default(Object, "create"), nativeCreate_default = nativeCreate;
    function hashClear() {
      this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {}, this.size = 0;
    }
    var hashClear_default = hashClear;
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      return this.size -= result ? 1 : 0, result;
    }
    var hashDelete_default = hashDelete, HASH_UNDEFINED = "__lodash_hash_undefined__", objectProto4 = Object.prototype, hasOwnProperty3 = objectProto4.hasOwnProperty;
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate_default) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty3.call(data, key) ? data[key] : void 0;
    }
    var hashGet_default = hashGet, objectProto5 = Object.prototype, hasOwnProperty4 = objectProto5.hasOwnProperty;
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate_default ? data[key] !== void 0 : hasOwnProperty4.call(data, key);
    }
    var hashHas_default = hashHas, HASH_UNDEFINED2 = "__lodash_hash_undefined__";
    function hashSet(key, value) {
      var data = this.__data__;
      return this.size += this.has(key) ? 0 : 1, data[key] = nativeCreate_default && value === void 0 ? HASH_UNDEFINED2 : value, this;
    }
    var hashSet_default = hashSet;
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      for (this.clear(); ++index < length; ) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    Hash.prototype.clear = hashClear_default;
    Hash.prototype.delete = hashDelete_default;
    Hash.prototype.get = hashGet_default;
    Hash.prototype.has = hashHas_default;
    Hash.prototype.set = hashSet_default;
    var Hash_default = Hash;
    function listCacheClear() {
      this.__data__ = [], this.size = 0;
    }
    var listCacheClear_default = listCacheClear;
    function assocIndexOf(array, key) {
      for (var length = array.length; length--; )
        if (eq_default(array[length][0], key))
          return length;
      return -1;
    }
    var assocIndexOf_default = assocIndexOf, arrayProto = Array.prototype, splice = arrayProto.splice;
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf_default(data, key);
      if (index < 0)
        return !1;
      var lastIndex = data.length - 1;
      return index == lastIndex ? data.pop() : splice.call(data, index, 1), --this.size, !0;
    }
    var listCacheDelete_default = listCacheDelete;
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf_default(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    var listCacheGet_default = listCacheGet;
    function listCacheHas(key) {
      return assocIndexOf_default(this.__data__, key) > -1;
    }
    var listCacheHas_default = listCacheHas;
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf_default(data, key);
      return index < 0 ? (++this.size, data.push([key, value])) : data[index][1] = value, this;
    }
    var listCacheSet_default = listCacheSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      for (this.clear(); ++index < length; ) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    ListCache.prototype.clear = listCacheClear_default;
    ListCache.prototype.delete = listCacheDelete_default;
    ListCache.prototype.get = listCacheGet_default;
    ListCache.prototype.has = listCacheHas_default;
    ListCache.prototype.set = listCacheSet_default;
    var ListCache_default = ListCache, Map2 = getNative_default(root_default, "Map"), Map_default = Map2;
    function mapCacheClear() {
      this.size = 0, this.__data__ = {
        hash: new Hash_default(),
        map: new (Map_default || ListCache_default)(),
        string: new Hash_default()
      };
    }
    var mapCacheClear_default = mapCacheClear;
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    var isKeyable_default = isKeyable;
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable_default(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    var getMapData_default = getMapData;
    function mapCacheDelete(key) {
      var result = getMapData_default(this, key).delete(key);
      return this.size -= result ? 1 : 0, result;
    }
    var mapCacheDelete_default = mapCacheDelete;
    function mapCacheGet(key) {
      return getMapData_default(this, key).get(key);
    }
    var mapCacheGet_default = mapCacheGet;
    function mapCacheHas(key) {
      return getMapData_default(this, key).has(key);
    }
    var mapCacheHas_default = mapCacheHas;
    function mapCacheSet(key, value) {
      var data = getMapData_default(this, key), size = data.size;
      return data.set(key, value), this.size += data.size == size ? 0 : 1, this;
    }
    var mapCacheSet_default = mapCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      for (this.clear(); ++index < length; ) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    MapCache.prototype.clear = mapCacheClear_default;
    MapCache.prototype.delete = mapCacheDelete_default;
    MapCache.prototype.get = mapCacheGet_default;
    MapCache.prototype.has = mapCacheHas_default;
    MapCache.prototype.set = mapCacheSet_default;
    var MapCache_default = MapCache, FUNC_ERROR_TEXT = "Expected a function";
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver != null && typeof resolver != "function")
        throw new TypeError(FUNC_ERROR_TEXT);
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache2 = memoized.cache;
        if (cache2.has(key))
          return cache2.get(key);
        var result = func.apply(this, args);
        return memoized.cache = cache2.set(key, result) || cache2, result;
      };
      return memoized.cache = new (memoize.Cache || MapCache_default)(), memoized;
    }
    memoize.Cache = MapCache_default;
    var memoize_default = memoize, MAX_MEMOIZE_SIZE = 500;
    function memoizeCapped(func) {
      var result = memoize_default(func, function(key) {
        return cache2.size === MAX_MEMOIZE_SIZE && cache2.clear(), key;
      }), cache2 = result.cache;
      return result;
    }
    var memoizeCapped_default = memoizeCapped, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, reEscapeChar = /\\(\\)?/g, stringToPath = memoizeCapped_default(function(string) {
      var result = [];
      return string.charCodeAt(0) === 46 && result.push(""), string.replace(rePropName, function(match, number, quote, subString) {
        result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
      }), result;
    }), stringToPath_default = stringToPath;
    function toString(value) {
      return value == null ? "" : baseToString_default(value);
    }
    var toString_default = toString;
    function castPath(value, object) {
      return isArray_default(value) ? value : isKey_default(value, object) ? [value] : stringToPath_default(toString_default(value));
    }
    var castPath_default = castPath, INFINITY2 = 1 / 0;
    function toKey(value) {
      if (typeof value == "string" || isSymbol_default(value))
        return value;
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY2 ? "-0" : result;
    }
    var toKey_default = toKey;
    function baseGet(object, path2) {
      path2 = castPath_default(path2, object);
      for (var index = 0, length = path2.length; object != null && index < length; )
        object = object[toKey_default(path2[index++])];
      return index && index == length ? object : void 0;
    }
    var baseGet_default = baseGet;
    function get(object, path2, defaultValue) {
      var result = object == null ? void 0 : baseGet_default(object, path2);
      return result === void 0 ? defaultValue : result;
    }
    var get_default = get, eventProperties = [
      "bubbles",
      "cancelBubble",
      "cancelable",
      "composed",
      "currentTarget",
      "defaultPrevented",
      "eventPhase",
      "isTrusted",
      "returnValue",
      "srcElement",
      "target",
      "timeStamp",
      "type"
    ], customEventSpecificProperties = ["detail"];
    function extractEventHiddenProperties(event) {
      let rebuildEvent = eventProperties.filter((value) => event[value] !== void 0).reduce((acc, value) => (acc[value] = event[value], acc), {});
      if (event instanceof CustomEvent)
        for (let value of customEventSpecificProperties.filter(
          (value2) => event[value2] !== void 0
        ))
          rebuildEvent[value] = event[value];
      return rebuildEvent;
    }
    var isObject3 = isObject, dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, isJSON2 = (input) => input.match(/^[\[\{\"\}].*[\]\}\"]$/);
    function convertUnconventionalData(data) {
      if (!isObject3(data))
        return data;
      let result = data, wasMutated = !1;
      return typeof Event < "u" && data instanceof Event && (result = extractEventHiddenProperties(result), wasMutated = !0), result = Object.keys(result).reduce((acc, key) => {
        try {
          result[key] && result[key].toJSON, acc[key] = result[key];
        } catch {
          wasMutated = !0;
        }
        return acc;
      }, {}), wasMutated ? result : data;
    }
    var replacer = function(options) {
      let objects, map, stack, keys;
      return function(key, value) {
        try {
          if (key === "")
            return keys = [], objects = /* @__PURE__ */ new Map([[value, "[]"]]), map = /* @__PURE__ */ new Map(), stack = [], value;
          let origin = map.get(this) || this;
          for (; stack.length && origin !== stack[0]; )
            stack.shift(), keys.pop();
          if (typeof value == "boolean")
            return value;
          if (value === void 0)
            return options.allowUndefined ? "_undefined_" : void 0;
          if (value === null)
            return null;
          if (typeof value == "number")
            return value === Number.NEGATIVE_INFINITY ? "_-Infinity_" : value === Number.POSITIVE_INFINITY ? "_Infinity_" : Number.isNaN(value) ? "_NaN_" : value;
          if (typeof value == "bigint")
            return `_bigint_${value.toString()}`;
          if (typeof value == "string")
            return dateFormat.test(value) ? options.allowDate ? `_date_${value}` : void 0 : value;
          if ((0, import_is_regex.default)(value))
            return options.allowRegExp ? `_regexp_${value.flags}|${value.source}` : void 0;
          if ((0, import_is_function.default)(value))
            return;
          if ((0, import_is_symbol.default)(value)) {
            if (!options.allowSymbol)
              return;
            let globalRegistryKey = Symbol.keyFor(value);
            return globalRegistryKey !== void 0 ? `_gsymbol_${globalRegistryKey}` : `_symbol_${value.toString().slice(7, -1)}`;
          }
          if (stack.length >= options.maxDepth)
            return Array.isArray(value) ? `[Array(${value.length})]` : "[Object]";
          if (value === this)
            return `_duplicate_${JSON.stringify(keys)}`;
          if (value instanceof Error && options.allowError)
            return {
              __isConvertedError__: !0,
              errorProperties: {
                // @ts-expect-error cause is not defined in the current tsconfig target(es2020)
                ...value.cause ? { cause: value.cause } : {},
                ...value,
                name: value.name,
                message: value.message,
                stack: value.stack,
                "_constructor-name_": value.constructor.name
              }
            };
          if (value?.constructor?.name && value.constructor.name !== "Object" && !Array.isArray(value)) {
            let found2 = objects.get(value);
            if (!found2) {
              let plainObject = {
                __isClassInstance__: !0,
                __className__: value.constructor.name,
                ...Object.getOwnPropertyNames(value).reduce(
                  (acc, prop) => {
                    try {
                      acc[prop] = value[prop];
                    } catch {
                    }
                    return acc;
                  },
                  {}
                )
              };
              return keys.push(key), stack.unshift(plainObject), objects.set(value, JSON.stringify(keys)), value !== plainObject && map.set(value, plainObject), plainObject;
            }
            return `_duplicate_${found2}`;
          }
          let found = objects.get(value);
          if (!found) {
            let converted = Array.isArray(value) ? value : convertUnconventionalData(value);
            return keys.push(key), stack.unshift(converted), objects.set(value, JSON.stringify(keys)), value !== converted && map.set(value, converted), converted;
          }
          return `_duplicate_${found}`;
        } catch {
          return;
        }
      };
    }, reviver = function(options) {
      let refs = [], root2;
      return function(key, value) {
        if (key === "" && (root2 = value, refs.forEach(({ target, container, replacement }) => {
          let replacementArr = isJSON2(replacement) ? JSON.parse(replacement) : replacement.split(".");
          replacementArr.length === 0 ? container[target] = root2 : container[target] = get_default(root2, replacementArr);
        })), key === "_constructor-name_")
          return value;
        if (isObject3(value) && value.__isConvertedError__) {
          let { message, ...properties } = value.errorProperties, error = new Error(message);
          return Object.assign(error, properties), error;
        }
        if (typeof value == "string" && value.startsWith("_regexp_") && options.allowRegExp) {
          let [, flags, source] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
          return new RegExp(source, flags);
        }
        return typeof value == "string" && value.startsWith("_date_") && options.allowDate ? new Date(value.replace("_date_", "")) : typeof value == "string" && value.startsWith("_duplicate_") ? (refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, "") }), null) : typeof value == "string" && value.startsWith("_symbol_") && options.allowSymbol ? Symbol(value.replace("_symbol_", "")) : typeof value == "string" && value.startsWith("_gsymbol_") && options.allowSymbol ? Symbol.for(value.replace("_gsymbol_", "")) : typeof value == "string" && value === "_-Infinity_" ? Number.NEGATIVE_INFINITY : typeof value == "string" && value === "_Infinity_" ? Number.POSITIVE_INFINITY : typeof value == "string" && value === "_NaN_" ? Number.NaN : typeof value == "string" && value.startsWith("_bigint_") && typeof BigInt == "function" ? BigInt(value.replace("_bigint_", "")) : value;
      };
    }, defaultOptions = {
      maxDepth: 10,
      space: void 0,
      allowRegExp: !0,
      allowDate: !0,
      allowError: !0,
      allowUndefined: !0,
      allowSymbol: !0
    }, stringify2 = (data, options = {}) => {
      let mergedOptions = { ...defaultOptions, ...options };
      return JSON.stringify(convertUnconventionalData(data), replacer(mergedOptions), options.space);
    }, mutator = () => {
      let mutated = /* @__PURE__ */ new Map();
      return function mutateUndefined(value) {
        isObject3(value) && Object.entries(value).forEach(([k, v]) => {
          v === "_undefined_" ? value[k] = void 0 : mutated.get(v) || (mutated.set(v, !0), mutateUndefined(v));
        }), Array.isArray(value) && value.forEach((v, index) => {
          v === "_undefined_" ? (mutated.set(v, !0), value[index] = void 0) : mutated.get(v) || (mutated.set(v, !0), mutateUndefined(v));
        });
      };
    }, parse5 = (data, options = {}) => {
      let mergedOptions = { ...defaultOptions, ...options }, result = JSON.parse(data, reviver(mergedOptions));
      return mutator()(result), result;
    };
  }
});

// ../node_modules/address/lib/address.js
var require_address = __commonJS({
  "../node_modules/address/lib/address.js"(exports, module) {
    "use strict";
    var os2 = __require("os"), fs = __require("fs"), child = __require("child_process"), DEFAULT_RESOLV_FILE = "/etc/resolv.conf";
    function getInterfaceName() {
      var val = "eth", platform = os2.platform();
      return platform === "darwin" ? val = "en" : platform === "win32" && (val = null), val;
    }
    function getIfconfigCMD() {
      return os2.platform() === "win32" ? "ipconfig/all" : "/sbin/ifconfig";
    }
    function matchName(actualFamily, expectedFamily) {
      return expectedFamily === "IPv4" ? actualFamily === "IPv4" || actualFamily === 4 : expectedFamily === "IPv6" ? actualFamily === "IPv6" || actualFamily === 6 : actualFamily === expectedFamily;
    }
    function address(interfaceName, callback) {
      typeof interfaceName == "function" && (callback = interfaceName, interfaceName = null);
      var addr = {
        ip: address.ip(interfaceName),
        ipv6: address.ipv6(interfaceName),
        mac: null
      };
      address.mac(interfaceName, function(err, mac) {
        mac && (addr.mac = mac), callback(err, addr);
      });
    }
    address.interface = function(family, name) {
      var interfaces = os2.networkInterfaces(), noName = !name;
      name = name || getInterfaceName(), family = family || "IPv4";
      for (var i = -1; i < 8; i++) {
        var interfaceName = name + (i >= 0 ? i : ""), items = interfaces[interfaceName];
        if (items)
          for (var j = 0; j < items.length; j++) {
            var item = items[j];
            if (matchName(item.family, family))
              return item;
          }
      }
      if (noName)
        for (var k in interfaces)
          for (var items = interfaces[k], i = 0; i < items.length; i++) {
            var item = items[i];
            if (matchName(item.family, family) && !item.address.startsWith("127."))
              return item;
          }
    };
    address.ip = function(interfaceName) {
      var item = address.interface("IPv4", interfaceName);
      return item && item.address;
    };
    address.ipv6 = function(interfaceName) {
      var item = address.interface("IPv6", interfaceName);
      return item && item.address;
    };
    var MAC_OSX_START_LINE = /^(\w+)\:\s+flags=/, MAC_LINUX_START_LINE = /^(\w+)\s{2,}link encap:\w+/i, MAC_RE = address.MAC_RE = /(?:ether|HWaddr)\s+((?:[a-z0-9]{2}\:){5}[a-z0-9]{2})/i, MAC_IP_RE = address.MAC_IP_RE = /inet\s(?:addr\:)?(\d+\.\d+\.\d+\.\d+)/;
    function getMAC(content, interfaceName, matchIP) {
      for (var lines = content.split(`
`), i = 0; i < lines.length; i++) {
        var line = lines[i].trimRight(), m = MAC_OSX_START_LINE.exec(line) || MAC_LINUX_START_LINE.exec(line);
        if (m) {
          var name = m[1];
          if (name.indexOf(interfaceName) === 0) {
            var ip = null, mac = null, match = MAC_RE.exec(line);
            for (match && (mac = match[1]), i++; ; ) {
              if (line = lines[i], !line || MAC_OSX_START_LINE.exec(line) || MAC_LINUX_START_LINE.exec(line)) {
                i--;
                break;
              }
              mac || (match = MAC_RE.exec(line), match && (mac = match[1])), ip || (match = MAC_IP_RE.exec(line), match && (ip = match[1])), i++;
            }
            if (ip === matchIP)
              return mac;
          }
        }
      }
    }
    address.mac = function(interfaceName, callback) {
      typeof interfaceName == "function" && (callback = interfaceName, interfaceName = null), interfaceName = interfaceName || getInterfaceName();
      var item = address.interface("IPv4", interfaceName);
      if (!item)
        return callback();
      if (!process.env.CI && (item.mac === "ff:00:00:00:00:00" || item.mac === "00:00:00:00:00:00") && (item.mac = ""), item.mac)
        return callback(null, item.mac);
      child.exec(getIfconfigCMD(), { timeout: 5e3 }, function(err, stdout, stderr) {
        if (err || !stdout)
          return callback(err);
        var mac = getMAC(stdout || "", interfaceName, item.address);
        callback(null, mac);
      });
    };
    var DNS_SERVER_RE = /^nameserver\s+(\d+\.\d+\.\d+\.\d+)$/i;
    address.dns = function(filepath, callback) {
      typeof filepath == "function" && (callback = filepath, filepath = null), filepath = filepath || DEFAULT_RESOLV_FILE, fs.readFile(filepath, "utf8", function(err, content) {
        if (err)
          return callback(err);
        var servers = [];
        content = content || "";
        for (var lines = content.split(`
`), i = 0; i < lines.length; i++) {
          var line = lines[i].trim(), m = DNS_SERVER_RE.exec(line);
          m && servers.push(m[1]);
        }
        callback(null, servers);
      });
    };
    module.exports = address;
  }
});

// ../node_modules/detect-port/lib/detect-port.js
var require_detect_port = __commonJS({
  "../node_modules/detect-port/lib/detect-port.js"(exports, module) {
    "use strict";
    var net = __require("net"), address = require_address(), debug = require_src()("detect-port");
    module.exports = (port, callback) => {
      let hostname = "";
      typeof port == "object" && port ? (hostname = port.hostname, callback = port.callback, port = port.port) : typeof port == "function" && (callback = port, port = null), port = parseInt(port) || 0;
      let maxPort = port + 10;
      return maxPort > 65535 && (maxPort = 65535), debug("detect free port between [%s, %s)", port, maxPort), typeof callback == "function" ? tryListen(port, maxPort, hostname, callback) : new Promise((resolve4) => {
        tryListen(port, maxPort, hostname, (_, realPort) => {
          resolve4(realPort);
        });
      });
    };
    function tryListen(port, maxPort, hostname, callback) {
      function handleError() {
        port++, port >= maxPort && (debug("port: %s >= maxPort: %s, give up and use random port", port, maxPort), port = 0, maxPort = 0), tryListen(port, maxPort, hostname, callback);
      }
      hostname ? listen(port, hostname, (err, realPort) => {
        if (err)
          return err.code === "EADDRNOTAVAIL" ? callback(new Error("the ip that is not unknown on the machine")) : handleError();
        callback(null, realPort);
      }) : listen(port, null, (err, realPort) => {
        if (port === 0)
          return callback(err, realPort);
        if (err)
          return handleError(err);
        listen(port, "0.0.0.0", (err2) => {
          if (err2)
            return handleError(err2);
          listen(port, "localhost", (err3) => {
            if (err3 && err3.code !== "EADDRNOTAVAIL")
              return handleError(err3);
            listen(port, address.ip(), (err4, realPort2) => {
              if (err4)
                return handleError(err4);
              callback(null, realPort2);
            });
          });
        });
      });
    }
    function listen(port, hostname, callback) {
      let server = new net.Server();
      server.on("error", (err) => (debug("listen %s:%s error: %s", hostname, port, err), server.close(), err.code === "ENOTFOUND" ? (debug("ignore dns ENOTFOUND error, get free %s:%s", hostname, port), callback(null, port)) : callback(err))), server.listen(port, hostname, () => (port = server.address().port, server.close(), debug("get free %s:%s", hostname, port), callback(null, port)));
    }
  }
});

// ../node_modules/detect-port/lib/wait-port.js
var require_wait_port = __commonJS({
  "../node_modules/detect-port/lib/wait-port.js"(exports, module) {
    "use strict";
    var debug = require_src()("wait-port"), detect = require_detect_port(), sleep = (ms) => new Promise((resolve4) => setTimeout(resolve4, ms));
    async function waitPort(port, options = {}) {
      let { retryInterval = 1e3, retries = 1 / 0 } = options, count = 1;
      async function loop() {
        if (debug("retries", retries, "count", count), count > retries) {
          let err = new Error("retries exceeded");
          throw err.retries = retries, err.count = count, err;
        }
        return count++, await detect(port) === port ? (await sleep(retryInterval), loop()) : !0;
      }
      return await loop();
    }
    module.exports = waitPort;
  }
});

// ../node_modules/detect-port/index.js
var require_detect_port2 = __commonJS({
  "../node_modules/detect-port/index.js"(exports, module) {
    "use strict";
    module.exports = require_detect_port();
    module.exports.waitPort = require_wait_port();
  }
});

// src/core-server/index.ts
import { getPreviewHeadTemplate, getPreviewBodyTemplate } from "storybook/internal/common";

// src/core-server/build-static.ts
import { cp as cp2, mkdir, writeFile as writeFile3 } from "node:fs/promises";
import { rm } from "node:fs/promises";
import {
  loadAllPresets,
  loadMainConfig,
  logConfig,
  normalizeStories,
  resolveAddonName
} from "storybook/internal/common";
import { logger as logger4 } from "storybook/internal/node-logger";
import { getPrecedingUpgrade, telemetry as telemetry2 } from "storybook/internal/telemetry";
import { global as global2 } from "@storybook/global";
var import_picocolors4 = __toESM(require_picocolors(), 1);

// src/core-server/manifest.ts
import path from "node:path";
import { groupBy } from "storybook/internal/common";
function renderManifestComponentsPage(manifest) {
  let entries = Object.entries(manifest?.components ?? {}).sort(
    (a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0])
  ), analyses = entries.map(([, c]) => analyzeComponent(c)), totals = {
    components: entries.length,
    componentsWithPropTypeError: analyses.filter((a) => a.hasPropTypeError).length,
    infos: analyses.filter((a) => a.hasWarns).length,
    stories: analyses.reduce((sum, a) => sum + a.totalStories, 0),
    storyErrors: analyses.reduce((sum, a) => sum + a.storyErrors, 0)
  }, allPill = '<a class="filter-pill all" data-k="all" href="#filter-all">All</a>', compErrorsPill = totals.componentsWithPropTypeError > 0 ? `<a class="filter-pill err" data-k="errors" href="#filter-errors">${totals.componentsWithPropTypeError}/${totals.components} prop type ${plural(totals.componentsWithPropTypeError, "error")}</a>` : `<span class="filter-pill ok" aria-disabled="true">${totals.components} components ok</span>`, compInfosPill = totals.infos > 0 ? `<a class="filter-pill info" data-k="infos" href="#filter-infos">${totals.infos}/${totals.components} ${plural(totals.infos, "info", "infos")}</a>` : "", storiesPill = totals.storyErrors > 0 ? `<a class="filter-pill err" data-k="story-errors" href="#filter-story-errors">${totals.storyErrors}/${totals.stories} story errors</a>` : `<span class="filter-pill ok" aria-disabled="true">${totals.stories} ${plural(totals.stories, "story", "stories")} ok</span>`, grid = entries.map(([key, c], idx) => renderComponentCard(key, c, `${idx}`)).join(""), errorGroups = Object.entries(
    groupBy(
      entries.map(([, it]) => it).filter((it) => it.error),
      (manifest2) => manifest2.error?.name ?? "Error"
    )
  ).sort(([, a], [, b]) => b.length - a.length), errorGroupsHTML = errorGroups.map(([error, grouped]) => {
    let id = error.toLowerCase().replace(/[^a-z0-9]+/g, "-"), headerText = `${esc(error)}`, cards = grouped.map((manifest2, id2) => renderComponentCard(manifest2.id, manifest2, `error-${id2}`)).join("");
    return `
        <section class="group">
          <input id="${id}-toggle" class="group-tg" type="checkbox" hidden />
          <label for="${id}-toggle" class="group-header">
            <span class="caret">\u25B8</span>
            <span class="group-title">${headerText}</span>
            <span class="group-count">${grouped.length}</span>
          </label>
          <div class="group-cards">${cards}</div>
        </section>
      `;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Components Manifest</title>
  <style>
      :root {
          --bg: #0b0c10;
          --panel: #121318;
          --muted: #9aa0a6;
          --fg: #e8eaed;
          --ok: #22c55e;
          --info: #1e88e5;
          --err: #c62828;
          --ok-bg: #0c1a13;
          --info-bg: #0c1624;
          --err-bg: #1a0e0e;
          --chip: #1f2330;
          --border: #2b2f3a;
          --link: #8ab4f8;
          --active-ring: 1px; /* 1px active ring for pills and toggles */
      }

      * {
          box-sizing: border-box;
      }

      html,
      body {
          margin: 0;
          background: var(--bg);
          color: var(--fg);
          font: 14px/1.5 system-ui,
          -apple-system,
          Segoe UI,
          Roboto,
          Ubuntu,
          Cantarell,
          'Helvetica Neue',
          Arial,
          'Noto Sans';
      }

      .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 20px;
      }

      header {
          position: sticky;
          top: 0;
          backdrop-filter: blur(6px);
          background: color-mix(in srgb, var(--bg) 84%, transparent);
          border-bottom: 1px solid var(--border);
          z-index: 10;
      }

      h1 {
          font-size: 20px;
          margin: 0 0 6px;
      }

      .summary {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
      }

      /* Top filter pills */
      .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--panel);
          text-decoration: none;
          cursor: pointer;
          user-select: none;
          color: var(--fg);
      }

      .filter-pill.ok {
          color: #b9f6ca;
          border-color: color-mix(in srgb, var(--ok) 55%, var(--border));
          background: color-mix(in srgb, var(--ok) 18%, #000);
      }

      .filter-pill.info {
          color: #b3d9ff;
          border-color: color-mix(in srgb, var(--info) 55%, var(--border));
          background: var(--info-bg);
      }

      .filter-pill.err {
          color: #ff9aa0;
          border-color: color-mix(in srgb, var(--err) 55%, var(--border));
          background: var(--err-bg);
      }

      .filter-pill.all {
          color: #d7dbe0;
          border-color: var(--border);
          background: var(--panel);
      }

      .filter-pill[aria-disabled='true'] {
          cursor: default;
          text-decoration: none;
      }

      .filter-pill:focus,
      .filter-pill:active {
          outline: none;
          box-shadow: none;
      }

      /* Selected top pill ring via :target */
      #filter-all:target ~ header .filter-pill[data-k='all'],
      #filter-errors:target ~ header .filter-pill[data-k='errors'],
      #filter-infos:target ~ header .filter-pill[data-k='infos'],
      #filter-story-errors:target ~ header .filter-pill[data-k='story-errors'] {
          box-shadow: 0 0 0 var(--active-ring) currentColor;
          border-color: currentColor;
      }

      /* Hidden targets for filtering */
      #filter-all,
      #filter-errors,
      #filter-infos,
      #filter-story-errors {
          display: none;
      }

      main {
          padding: 36px 0 40px;
      }

      .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
      }

      /* one card per row */

      .card {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
      }

      .head {
          display: flex;
          flex-direction: column;
          gap: 8px;
      }

      .title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
      }

      .title h2 {
          font-size: 16px;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      .meta {
          font-size: 12px;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      .kv {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
      }

      .chip {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--chip);
          border: 1px solid var(--border);
      }

      .hint {
          color: var(--muted);
          font-size: 12px;
      }

      .badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
      }

      /* Per-card badges: labels become toggles when clickable */
      .badge {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--chip);
          color: #d7dbe0;
      }

      .badge.ok {
          color: #b9f6ca;
          border-color: color-mix(in srgb, var(--ok) 55%, var(--border));
      }

      .badge.info {
          color: #b3d9ff;
          border-color: color-mix(in srgb, var(--info) 55%, var(--border));
      }

      .badge.err {
          color: #ff9aa0;
          border-color: color-mix(in srgb, var(--err) 55%, var(--border));
      }

      .as-toggle {
          cursor: pointer;
      }

      /* 1px ring on active toggle */
      .tg-err:checked + label.as-toggle,
      .tg-info:checked + label.as-toggle,
      .tg-stories:checked + label.as-toggle,
      .tg-props:checked + label.as-toggle {
          box-shadow: 0 0 0 var(--active-ring) currentColor;
          border-color: currentColor;
      }

      /* Panels: hidden by default, shown when respective toggle checked */
      .panels {
          display: grid;
          gap: 10px;
      }

      .panel {
          display: none;
      }

      .tg-err:checked ~ .panels .panel-err {
          display: grid;
      }

      .tg-info:checked ~ .panels .panel-info {
          display: grid;
          gap: 8px;
      }

      .tg-stories:checked ~ .panels .panel-stories {
          display: grid;
          gap: 8px;
      }

      .tg-props:checked ~ .panels .panel-props {
          display: grid;
      }

      /* Colored notes for prop type error + info */
      .note {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
      }

      .note.err {
          border-color: color-mix(in srgb, var(--err) 55%, var(--border));
          background: var(--err-bg);
          color: #ffd1d4;
      }

      .note.info {
          border-color: color-mix(in srgb, var(--info) 55%, var(--border));
          background: var(--info-bg);
          color: #d6e8ff;
      }

      .note.ok {
          border-color: color-mix(in srgb, var(--ok) 55%, var(--border));
          background: var(--ok-bg);
          color: var(--fg);
      }

      .note-title {
          font-weight: 600;
          margin-bottom: 6px;
      }

      .note-body {
          white-space: normal;
      }

      /* Story error cards */
      .ex {
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #0f131b;
      }

      .ex.err {
          border-color: color-mix(in srgb, var(--err) 55%, var(--border));
      }

      .row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
      }

      .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
      }

      .dot-ok {
          background: var(--ok);
      }

      .dot-err {
          background: var(--err);
      }

      .ex-name {
          font-weight: 600;
      }

      /* Error groups (visible in errors filter) */
      .error-groups {
          display: none;
          margin-bottom: 16px;
      }

      .group {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 14px;
          overflow: hidden;
      }

      .group + .group {
          margin-top: 12px;
      }

      .group-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
      }

      .group-header:hover {
          background: #141722;
      }

      .group-title {
          font-weight: 600;
          flex: 1;
      }

      .group-count {
          font-size: 12px;
          color: var(--muted);
      }

      .group-cards {
          display: none;
          padding: 12px;
      }

      .group .card {
          margin: 12px 0;
      }

      .group .card:first-child {
          margin-top: 0;
      }

      .group .card:last-child {
          margin-bottom: 0;
      }

      /* caret rotation */
      .group-tg:checked + label .caret {
          transform: rotate(90deg);
      }

      .caret {
          transition: transform 0.15s ease;
      }

      /* toggle body */
      .group-tg:checked ~ .group-cards {
          display: block;
      }

      /* CSS-only filtering of cards via top pills */
      #filter-errors:target ~ main .card:not(.has-error):not(.has-story-error) {
          display: none;
      }

      #filter-infos:target ~ main .card:not(.has-info) {
          display: none;
      }

      #filter-story-errors:target ~ main .card:not(.has-story-error) {
          display: none;
      }

      #filter-all:target ~ main .card {
          display: block;
      }

      /* In errors view, hide standalone component-error cards in the regular grid (they will appear in groups) */
      #filter-errors:target ~ main .grid .card.has-error {
          display: none;
      }

      /* Show grouped section only in errors view */
      #filter-errors:target ~ main .error-groups {
          display: block;
      }

      /* When a toggle is checked, show the corresponding panel */
      .card > .tg-err:checked ~ .panels .panel-err {
          display: grid;
      }
      
      .card > .tg-info:checked ~ .panels .panel-info {
          display: grid;
      }
      
      .card > .tg-stories:checked ~ .panels .panel-stories {
          display: grid;
      }

      /* Add vertical spacing around panels only when any panel is visible */
      .card > .tg-err:checked ~ .panels,
      .card > .tg-info:checked ~ .panels,
      .card > .tg-stories:checked ~ .panels,
      .card > .tg-props:checked ~ .panels {
          margin: 10px 0;
      }

      /* Optional: a subtle 1px ring on the active badge, using :has() if available */
      @supports selector(.card:has(.tg-err:checked)) {
          .card:has(.tg-err:checked) label[for$='-err'],
          .card:has(.tg-info:checked) label[for$='-info'],
          .card:has(.tg-stories:checked) label[for$='-stories'],
          .card:has(.tg-props:checked) label[for$='-props'] {
              box-shadow: 0 0 0 1px currentColor;
              border-color: currentColor;
          }
      }

      /* Wrap long lines in code blocks at ~120 characters */
      pre, code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          overflow-x: auto; /* fallback for extremely long tokens */
          margin: 8px 0 0;
      }
      pre > code {
          display: block;
          white-space: inherit;
          overflow-wrap: inherit;
          word-break: inherit;
          inline-size: min(100%, 120ch);
      }
  </style>
</head>
<body>
<!-- Hidden targets for the top-level filters -->
<span id="filter-all"></span>
<span id="filter-errors"></span>
<span id="filter-infos"></span>
<span id="filter-story-errors"></span>
<header>
  <div class="wrap">
    <h1>Components Manifest</h1>
    <div class="summary">${allPill}${compErrorsPill}${compInfosPill}${storiesPill}</div>
  </div>
</header>
<main>
  <div class="wrap">
    <div class="grid" role="list">
      ${grid || '<div class="card"><div class="head"><div class="hint">No components.</div></div></div>'}
    </div>
    ${errorGroups.length ? `<div class="error-groups" role="region" aria-label="Prop type error groups">${errorGroupsHTML}</div>` : ""}
  </div>
</main>
</body>
</html>  `;
}
var esc = (s) => String(s ?? "").replace(
  /[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
), plural = (n, one, many = `${one}s`) => n === 1 ? one : many;
function analyzeComponent(c) {
  let hasPropTypeError = !!c.error, warns = [];
  c.description?.trim() || warns.push("No description found. Write a jsdoc comment such as /** Component description */."), c.import?.trim() || warns.push(
    `Specify an @import jsdoc tag on your component or your stories meta such as @import import { ${c.name} } from 'my-design-system';`
  );
  let totalStories = c.stories?.length ?? 0, storyErrors = (c.stories ?? []).filter((e) => !!e?.error).length, storyOk = totalStories - storyErrors, hasAnyError = hasPropTypeError || storyErrors > 0;
  return {
    hasPropTypeError,
    hasAnyError,
    hasWarns: warns.length > 0,
    warns,
    totalStories,
    storyErrors,
    storyOk
  };
}
function note(title, bodyHTML, kind) {
  return `
    <div class="note ${kind}">
      <div class="note-title">${esc(title)}</div>
      <div class="note-body">${bodyHTML}</div>
    </div>`;
}
function renderComponentCard(key, c, id) {
  let a = analyzeComponent(c), statusDot = a.hasAnyError ? "dot-err" : "dot-ok", allStories = c.stories ?? [], errorStories = allStories.filter((ex) => !!ex?.error), okStories = allStories.filter((ex) => !ex?.error), slug = `c-${id}-${(c.id || key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`, componentErrorBadge = a.hasPropTypeError ? `<label for="${slug}-err" class="badge err as-toggle">prop type error</label>` : "", infosBadge = a.hasWarns ? `<label for="${slug}-info" class="badge info as-toggle">${a.warns.length} ${plural(a.warns.length, "info", "infos")}</label>` : "", storiesBadge = a.totalStories > 0 ? `<label for="${slug}-stories" class="badge ${a.storyErrors > 0 ? "err" : "ok"} as-toggle">${a.storyErrors > 0 ? `${a.storyErrors}/${a.totalStories} story errors` : `${a.totalStories} ${plural(a.totalStories, "story", "stories")}`}</label>` : "", reactDocgen = !a.hasPropTypeError && "reactDocgen" in c && c.reactDocgen, parsedDocgen = reactDocgen ? parseReactDocgen(reactDocgen) : void 0, propEntries = parsedDocgen ? Object.entries(parsedDocgen.props ?? {}) : [], propTypesBadge = !a.hasPropTypeError && propEntries.length > 0 ? `<label for="${slug}-props" class="badge ok as-toggle">${propEntries.length} ${plural(propEntries.length, "prop type")}</label>` : "", primaryBadge = componentErrorBadge || propTypesBadge, propsCode = propEntries.length > 0 ? propEntries.sort(([aName], [bName]) => aName.localeCompare(bName)).map(([propName, info]) => {
    let description = (info?.description ?? "").trim(), t = (info?.type ?? "any").trim(), optional = info?.required ? "" : "?", defaultVal = (info?.defaultValue ?? "").trim(), def = defaultVal ? ` = ${defaultVal}` : "", doc = ["/**", ...description.split(`
`).map((line) => ` * ${line}`), " */"].join(`
`) + `
`;
    return `${description ? doc : ""}${propName}${optional}: ${t}${def}`;
  }).join(`

`) : "", tags = c.jsDocTags && typeof c.jsDocTags == "object" ? Object.entries(c.jsDocTags).flatMap(
    ([k, v]) => (Array.isArray(v) ? v : [v]).map(
      (val) => `<span class="chip">${esc(k)}: ${esc(val)}</span>`
    )
  ).join("") : "";
  return esc(c.error?.message || "Unknown error"), `
<article
  class="card 
  ${a.hasPropTypeError ? "has-error" : "no-error"} 
  ${a.hasWarns ? "has-info" : "no-info"} 
  ${a.storyErrors ? "has-story-error" : "no-story-error"}"
  role="listitem"
  aria-label="${esc(c.name || key)}">
  <div class="head">
    <div class="title">
      <h2><span class="status-dot ${statusDot}"></span> ${esc(c.name || key)}</h2>
      <div class="badges">
        ${primaryBadge}
        ${infosBadge}
        ${storiesBadge}
      </div>
    </div>
    <div class="meta" title="${esc(c.path)}">${esc(c.id)} \xB7 ${esc(c.path)}</div>
    ${c.summary ? `<div>${esc(c.summary)}</div>` : ""}
    ${c.description ? `<div class="hint">${esc(c.description)}</div>` : ""}
    ${tags ? `<div class="kv">${tags}</div>` : ""}
  </div>

  <!-- \u2B07\uFE0F Hidden toggles must be siblings BEFORE .panels -->
  ${a.hasPropTypeError ? `<input id="${slug}-err" class="tg tg-err" type="checkbox" hidden />` : ""}
  ${a.hasWarns ? `<input id="${slug}-info" class="tg tg-info" type="checkbox" hidden />` : ""}
  ${a.totalStories > 0 ? `<input id="${slug}-stories" class="tg tg-stories" type="checkbox" hidden />` : ""}
  ${!a.hasPropTypeError && propEntries.length > 0 ? `<input id="${slug}-props" class="tg tg-props" type="checkbox" hidden />` : ""}

  <div class="panels">
    ${a.hasPropTypeError ? `
        <div class="panel panel-err">
          ${note("Prop type error", `<pre><code>${esc(c.error?.message || "Unknown error")}</code></pre>`, "err")}
        </div>` : ""}
    ${a.hasWarns ? `
        <div class="panel panel-info">
          ${a.warns.map((w) => note("Info", esc(w), "info")).join("")}
        </div>` : ""}
    ${!a.hasPropTypeError && propEntries.length > 0 ? `
        <div class="panel panel-props">
          <div class="note ok">
            <div class="row">
              <span class="ex-name">Prop types</span>
              <span class="badge ok">${propEntries.length} ${plural(propEntries.length, "prop type")}</span>
            </div>
            <pre><code>Component: ${reactDocgen?.definedInFile ? esc(path.relative(process.cwd(), reactDocgen.definedInFile)) : ""}${reactDocgen?.exportName ? "::" + esc(reactDocgen?.exportName) : ""}</code></pre>
            <pre><code>Props:</code></pre>
            <pre><code>${esc(propsCode)}</code></pre>
          </div>
        </div>` : ""}
    ${a.totalStories > 0 ? `
        <div class="panel panel-stories">
          ${errorStories.map(
    (ex, j) => `
            <div class="note err">
              <div class="row">
                <span class="ex-name">${esc(ex.name)}</span>
                <span class="badge err">story error</span>
              </div>
              ${ex?.summary ? `<div class="hint">Summary: ${esc(ex.summary)}</div>` : ""}
              ${ex?.description ? `<div class="hint">${esc(ex.description)}</div>` : ""}
              ${ex?.snippet ? `<pre><code>${esc(ex.snippet)}</code></pre>` : ""}
              ${ex?.error?.message ? `<pre><code>${esc(ex.error.message)}</code></pre>` : ""}
            </div>`
  ).join("")}
          
          
          ${c.import ? `<div class="note ok">
                <div class="row">
                  <span class="ex-name">Imports</span>
                </div>
                <pre><code>${c.import}</code></pre>
              </div>` : ""}
          
          ${okStories.map(
    (ex) => `
            <div class="note ok">
              <div class="row">
                <span class="ex-name">${esc(ex.name)}</span>
                <span class="badge ok">story ok</span>
              </div>
              ${ex?.summary ? `<div>${esc(ex.summary)}</div>` : ""}
              ${ex?.description ? `<div class="hint">${esc(ex.description)}</div>` : ""}
              ${ex?.snippet ? `<pre><code>${esc(ex.snippet)}</code></pre>` : ""}
            </div>`
  ).join("")}
        </div>` : ""}
  </div>
</article>`;
}
var parseReactDocgen = (reactDocgen) => {
  let props = reactDocgen?.props ?? {};
  return {
    props: Object.fromEntries(
      Object.entries(props).map(([propName, prop]) => [
        propName,
        {
          description: prop.description,
          type: serializeTsType(prop.tsType ?? prop.type),
          defaultValue: prop.defaultValue?.value,
          required: prop.required
        }
      ])
    )
  };
};
function serializeTsType(tsType) {
  if (tsType) {
    if ("raw" in tsType && typeof tsType.raw == "string" && tsType.raw.trim().length > 0)
      return tsType.raw;
    if (tsType.name) {
      if ("elements" in tsType) {
        if (tsType.name === "union")
          return (tsType.elements ?? []).map((el) => serializeTsType(el) ?? "unknown").join(" | ");
        if (tsType.name === "intersection")
          return (tsType.elements ?? []).map((el) => serializeTsType(el) ?? "unknown").join(" & ");
        if (tsType.name === "Array") {
          let el = (tsType.elements ?? [])[0];
          return `${serializeTsType(el) ?? "unknown"}[]`;
        }
        if (tsType.name === "tuple")
          return `[${(tsType.elements ?? []).map((el) => serializeTsType(el) ?? "unknown").join(", ")}]`;
      }
      if ("value" in tsType && tsType.name === "literal")
        return tsType.value;
      if ("signature" in tsType && tsType.name === "signature") {
        if (tsType.type === "function") {
          let args = (tsType.signature?.arguments ?? []).map((a) => {
            let argType = serializeTsType(a.type) ?? "any";
            return `${a.name}: ${argType}`;
          }), ret = serializeTsType(tsType.signature?.return) ?? "void";
          return `(${args.join(", ")}) => ${ret}`;
        }
        return tsType.type === "object" ? `{ ${(tsType.signature?.properties ?? []).map((p) => {
          let req = !!p.value?.required, propType = serializeTsType(p.value) ?? "any";
          return `${p.key}${req ? "" : "?"}: ${propType}`;
        }).join("; ")} }` : "unknown";
      }
      if ("elements" in tsType) {
        let inner = (tsType.elements ?? []).map((el) => serializeTsType(el) ?? "unknown");
        if (inner.length > 0)
          return `${tsType.name}<${inner.join(", ")}>`;
      }
      return tsType.name;
    }
  }
}

// src/core-server/utils/StoryIndexGenerator.ts
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname as dirname2, extname, join as join2, normalize, relative as relative2, resolve as resolve2, sep } from "node:path";
import { commonGlobOptions, getProjectRoot, normalizeStoryPath } from "storybook/internal/common";
import { combineTags, storyNameFromExport, toId } from "storybook/internal/csf";
import { getStorySortParameter, loadConfig } from "storybook/internal/csf-tools";
import { logger, once } from "storybook/internal/node-logger";
import { isExampleStoryId } from "storybook/internal/telemetry";
var import_picocolors = __toESM(require_picocolors(), 1);
var import_ts_dedent2 = __toESM(require_dist(), 1), TsconfigPaths = __toESM(require_lib2(), 1);

// src/preview-api/modules/store/sortStories.ts
var import_ts_dedent = __toESM(require_dist(), 1);

// src/preview-api/modules/store/storySort.ts
var STORY_KIND_PATH_SEPARATOR = /\s*\/\s*/, storySort = (options = {}) => (a, b) => {
  if (a.title === b.title && !options.includeNames)
    return 0;
  let method = options.method || "configure", order = options.order || [], storyTitleA = a.title.trim().split(STORY_KIND_PATH_SEPARATOR), storyTitleB = b.title.trim().split(STORY_KIND_PATH_SEPARATOR);
  options.includeNames && (storyTitleA.push(a.name), storyTitleB.push(b.name));
  let depth = 0;
  for (; storyTitleA[depth] || storyTitleB[depth]; ) {
    if (!storyTitleA[depth])
      return -1;
    if (!storyTitleB[depth])
      return 1;
    let nameA = storyTitleA[depth], nameB = storyTitleB[depth];
    if (nameA !== nameB) {
      let indexA = order.indexOf(nameA), indexB = order.indexOf(nameB), indexWildcard = order.indexOf("*");
      return indexA !== -1 || indexB !== -1 ? (indexA === -1 && (indexWildcard !== -1 ? indexA = indexWildcard : indexA = order.length), indexB === -1 && (indexWildcard !== -1 ? indexB = indexWildcard : indexB = order.length), indexA - indexB) : method === "configure" ? 0 : nameA.localeCompare(nameB, options.locales ? options.locales : void 0, {
        numeric: !0,
        sensitivity: "accent"
      });
    }
    let index = order.indexOf(nameA);
    index === -1 && (index = order.indexOf("*")), order = index !== -1 && Array.isArray(order[index + 1]) ? order[index + 1] : [], depth += 1;
  }
  return 0;
};

// src/preview-api/modules/store/sortStories.ts
var sortStoriesCommon = (stories, storySortParameter, fileNameOrder) => {
  if (storySortParameter) {
    let sortFn;
    typeof storySortParameter == "function" ? sortFn = storySortParameter : sortFn = storySort(storySortParameter), stories.sort(sortFn);
  } else
    stories.sort(
      (s1, s2) => fileNameOrder.indexOf(s1.importPath) - fileNameOrder.indexOf(s2.importPath)
    );
  return stories;
}, sortStoriesV7 = (stories, storySortParameter, fileNameOrder) => {
  try {
    return sortStoriesCommon(stories, storySortParameter, fileNameOrder);
  } catch (err) {
    throw new Error(import_ts_dedent.dedent`
    Error sorting stories with sort parameter ${storySortParameter}:

    > ${err.message}

    Are you using a V6-style sort function in V7 mode?

    More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#v7-style-story-sort
  `);
  }
};

// src/core-server/utils/IndexingError.ts
var IndexingError = class extends Error {
  constructor(message, importPaths, stack) {
    super(), this.message = message, this.importPaths = importPaths, stack && (this.stack = stack);
  }
  pathsString() {
    return this.importPaths.length === 1 ? `${slash(this.importPaths[0])}` : `${this.importPaths.map(slash).join(",")}`;
  }
  toString() {
    return `${this.pathsString()}: ${this.message}`;
  }
}, MultipleIndexingError = class extends Error {
  constructor(indexingErrors) {
    super();
    this.indexingErrors = indexingErrors;
    if (this.indexingErrors.length === 0)
      throw new Error("Unexpected empty error list");
    if (this.indexingErrors.length === 1) {
      let [err] = this.indexingErrors;
      this.message = `Unable to index ${err.pathsString()}`;
    } else
      this.message = `Unable to index files:
${this.indexingErrors.map((err) => `- ${err}`).join(`
`)}`;
  }
  toString() {
    return this.indexingErrors.length === 1 ? `${this.message}:
  ${this.indexingErrors[0].stack}` : this.message;
  }
};

// src/core-server/utils/autoName.ts
import { basename } from "node:path";
function autoName(mdxImportPath, csfImportPath, defaultName) {
  let mdxBasename = basename(mdxImportPath), csfBasename = basename(csfImportPath), [mdxFilename] = mdxBasename.split("."), [csfFilename] = csfBasename.split(".");
  return mdxFilename === csfFilename ? defaultName : mdxFilename;
}

// src/core-server/utils/summarizeStats.ts
var addStats = (stat, acc) => {
  Object.entries(stat).forEach(([key, value]) => {
    let statsKey = key;
    acc[statsKey] || (acc[statsKey] = 0), acc[statsKey] += value ? 1 : 0;
  });
};

// src/core-server/utils/StoryIndexGenerator.ts
var AUTODOCS_TAG = "autodocs", ATTACHED_MDX_TAG = "attached-mdx", UNATTACHED_MDX_TAG = "unattached-mdx", PLAY_FN_TAG = "play-fn", TEST_FN_TAG = "test-fn";
function isMdxEntry({ tags }) {
  return tags?.includes(UNATTACHED_MDX_TAG) || tags?.includes(ATTACHED_MDX_TAG);
}
var makeAbsolute = (otherImport, normalizedPath, workingDir) => otherImport.startsWith(".") ? slash(resolve2(workingDir, normalizeStoryPath(join2(dirname2(normalizedPath), otherImport)))) : otherImport, StoryIndexGenerator = class _StoryIndexGenerator {
  constructor(specifiers, options) {
    this.specifiers = specifiers;
    this.options = options;
    this.specifierToCache = /* @__PURE__ */ new Map();
  }
  static {
    /** Cache for findMatchingFiles results */
    this.findMatchingFilesCache = /* @__PURE__ */ new Map();
  }
  /** Generate a cache key for findMatchingFiles */
  static getFindMatchingFilesCacheKey(specifier, workingDir, ignoreWarnings) {
    return JSON.stringify({
      directory: specifier.directory,
      files: specifier.files,
      workingDir,
      ignoreWarnings
    });
  }
  /** Clear the findMatchingFiles cache */
  static clearFindMatchingFilesCache() {
    this.findMatchingFilesCache.clear();
  }
  static async findMatchingFiles(specifier, workingDir, ignoreWarnings = !1) {
    let cacheKey = this.getFindMatchingFilesCacheKey(specifier, workingDir, ignoreWarnings), cached = this.findMatchingFilesCache.get(cacheKey);
    if (cached)
      return cached;
    let pathToSubIndex = {}, fullGlob = slash(join2(specifier.directory, specifier.files)), { globby } = await import("../_node-chunks/globby-YAVH4LQB.js"), files = await globby(fullGlob, {
      absolute: !0,
      cwd: workingDir,
      ...commonGlobOptions(fullGlob)
    });
    return files.length === 0 && !ignoreWarnings && once.warn(
      `No story files found for the specified pattern: ${import_picocolors.default.blue(
        join2(specifier.directory, specifier.files)
      )}`
    ), files.sort().forEach((absolutePath) => {
      let ext = extname(absolutePath);
      if (ext === ".storyshot") {
        let relativePath = relative2(workingDir, absolutePath);
        logger.info(`Skipping ${ext} file ${relativePath}`);
        return;
      }
      pathToSubIndex[absolutePath] = !1;
    }), this.findMatchingFilesCache.set(cacheKey, pathToSubIndex), pathToSubIndex;
  }
  static async findMatchingFilesForSpecifiers(specifiers, workingDir, ignoreWarnings = !1) {
    return Promise.all(
      specifiers.map(async (specifier) => {
        let pathToSubIndex = await _StoryIndexGenerator.findMatchingFiles(
          specifier,
          workingDir,
          ignoreWarnings
        );
        return [specifier, pathToSubIndex];
      })
    );
  }
  async initialize() {
    (await _StoryIndexGenerator.findMatchingFilesForSpecifiers(
      this.specifiers,
      this.options.workingDir
    )).forEach(
      ([specifier, cache2]) => this.specifierToCache.set(specifier, cache2)
    );
    let previewCode = await this.getPreviewCode(), projectTags = this.getProjectTags(previewCode);
    await this.ensureExtracted({ projectTags });
  }
  /** Run the updater function over all the empty cache entries */
  async updateExtracted(updater, overwrite = !1) {
    await Promise.all(
      this.specifiers.map(async (specifier) => {
        let entry = this.specifierToCache.get(specifier);
        return invariant(
          entry,
          `specifier does not have a matching cache entry in specifierToCache: ${JSON.stringify(
            specifier
          )}`
        ), Promise.all(
          Object.keys(entry).map(async (absolutePath) => {
            if (!(entry[absolutePath] && !overwrite))
              try {
                entry[absolutePath] = await updater(specifier, absolutePath, entry[absolutePath]);
              } catch (err) {
                let relativePath = `.${sep}${relative2(this.options.workingDir, absolutePath)}`;
                entry[absolutePath] = {
                  type: "error",
                  err: new IndexingError(
                    err instanceof Error ? err.message : String(err),
                    [relativePath],
                    err instanceof Error ? err.stack : void 0
                  )
                };
              }
          })
        );
      })
    );
  }
  isDocsMdx(absolutePath) {
    return /(?<!\.stories)\.mdx$/i.test(absolutePath);
  }
  async ensureExtracted({
    projectTags
  }) {
    await this.updateExtracted(
      async (specifier, absolutePath) => this.isDocsMdx(absolutePath) ? !1 : this.extractStories(specifier, absolutePath, projectTags)
    ), await this.updateExtracted(
      async (specifier, absolutePath) => this.extractDocs(specifier, absolutePath, projectTags)
    );
    let statsSummary = {};
    return { entries: this.specifiers.flatMap((specifier) => {
      let cache2 = this.specifierToCache.get(specifier);
      return invariant(
        cache2,
        `specifier does not have a matching cache entry in specifierToCache: ${JSON.stringify(
          specifier
        )}`
      ), Object.values(cache2).flatMap((entry) => entry ? entry.type === "docs" ? [entry] : entry.type === "error" ? [entry] : entry.entries.map((item) => {
        if (item.type === "docs")
          return item;
        isExampleStoryId(item.id) || addStats(item.extra.stats, statsSummary);
        let { extra, ...existing } = item;
        return existing;
      }) : []);
    }), stats: statsSummary };
  }
  findDependencies(absoluteImports) {
    return [...this.specifierToCache.values()].flatMap(
      (cache2) => Object.entries(cache2).filter(([fileName, cacheEntry]) => !cacheEntry || cacheEntry.type !== "stories" ? !1 : !!absoluteImports.find(
        (storyImport) => fileName.match(
          new RegExp(`^${storyImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.[^.]+)?$`)
        )
      )).map(([_, cacheEntry]) => cacheEntry)
    );
  }
  /**
   * Try to find the component path from a raw import string and return it in the same format as
   * `importPath`. Respect tsconfig paths if available.
   *
   * If no such file exists, assume that the import is from a package and return the raw
   */
  resolveComponentPath(rawComponentPath, absolutePath, matchPath) {
    let matchedPath = matchPath?.(rawComponentPath, void 0, void 0, supportedExtensions) ?? rawComponentPath, resolved;
    try {
      resolved = resolveImport(matchedPath, { basedir: dirname2(absolutePath) });
    } catch {
      return matchedPath;
    }
    let relativePath = relative2(this.options.workingDir, resolved);
    return slash(normalizeStoryPath(relativePath));
  }
  async extractStories(specifier, absolutePath, projectTags = []) {
    let relativePath = relative2(this.options.workingDir, absolutePath), importPath = slash(normalizeStoryPath(relativePath)), defaultMakeTitle = (userTitle) => {
      let title = userOrAutoTitleFromSpecifier(importPath, specifier, userTitle);
      return invariant(
        title,
        "makeTitle created an undefined title. This happens when the fileName doesn't match any specifier from main.js"
      ), title;
    }, indexer = this.options.indexers.find((ind) => ind.test.exec(absolutePath));
    invariant(indexer, `No matching indexer found for ${absolutePath}`);
    let indexInputs = await indexer.createIndex(absolutePath, {
      makeTitle: defaultMakeTitle
    }), tsconfigPath = up("tsconfig.json", {
      cwd: this.options.workingDir,
      last: getProjectRoot()
    }), tsconfig = TsconfigPaths.loadConfig(tsconfigPath), matchPath;
    tsconfig.resultType === "success" && (matchPath = TsconfigPaths.createMatchPath(tsconfig.absoluteBaseUrl, tsconfig.paths, [
      "browser",
      "module",
      "main"
    ]));
    let storyEntries = indexInputs.map(
      (input) => {
        let name = input.name ?? storyNameFromExport(input.exportName), componentPath = input.rawComponentPath && this.resolveComponentPath(input.rawComponentPath, absolutePath, matchPath), title = input.title ?? defaultMakeTitle(), id = input.__id ?? toId(input.metaId ?? title, storyNameFromExport(input.exportName)), tags = combineTags(...projectTags, ...input.tags ?? []), subtype = input.subtype ?? "story", entry = {
          type: "story",
          subtype,
          id,
          extra: {
            metaId: input.metaId,
            stats: input.__stats ?? {}
          },
          name,
          title,
          importPath,
          componentPath,
          tags
        };
        return subtype === "test" && (entry.parent = input.parent, entry.parentName = input.parentName), input.exportName && (entry.exportName = input.exportName), entry;
      }
    );
    if (storyEntries.some((entry) => entry.tags.includes(AUTODOCS_TAG)) && !!this.options.docs && this.options.build?.test?.disableAutoDocs !== !0) {
      let name = this.options.docs?.defaultName ?? "Docs", { metaId } = indexInputs[0], { title } = storyEntries[0], id = toId(metaId ?? title, name), tags = combineTags(...projectTags, ...indexInputs[0].tags ?? []);
      return {
        entries: [{
          id,
          title,
          name,
          importPath,
          type: "docs",
          tags,
          storiesImports: []
        }, ...storyEntries],
        dependents: [],
        type: "stories"
      };
    }
    return {
      entries: storyEntries,
      dependents: [],
      type: "stories"
    };
  }
  async extractDocs(specifier, absolutePath, projectTags = []) {
    let relativePath = relative2(this.options.workingDir, absolutePath);
    try {
      let normalizedPath = normalizeStoryPath(relativePath), importPath = slash(normalizedPath), content = await readFile(absolutePath, { encoding: "utf8" }), { analyze } = await import("../_node-chunks/dist-PSWG5NPT.js"), result = await analyze(content);
      if (result.isTemplate)
        return !1;
      let absoluteImports = result.imports.map(
        (p) => makeAbsolute(p, normalizedPath, this.options.workingDir)
      ), dependencies = this.findDependencies(absoluteImports), sortedDependencies = dependencies, csfEntry;
      if (result.of) {
        let absoluteOf = makeAbsolute(result.of, normalizedPath, this.options.workingDir);
        dependencies.forEach((dep) => {
          if (dep.entries.length > 0) {
            let first = dep.entries.find((e) => e.type !== "docs");
            normalize(resolve2(this.options.workingDir, first.importPath)).startsWith(
              normalize(absoluteOf)
            ) && (csfEntry = first);
          }
          sortedDependencies = [dep, ...dependencies.filter((d) => d !== dep)];
        }), invariant(
          csfEntry,
          import_ts_dedent2.dedent`
            Could not find or load CSF file at path "${result.of}" referenced by \`of={}\` in docs file "${relativePath}".

            - Does that file exist?
            - If so, is it a CSF file (\`.stories.*\`)?
            - If so, is it matched by the \`stories\` glob in \`main.js\`?
            - If so, has the file successfully loaded in Storybook and are its stories visible?
          `
        );
      }
      dependencies.forEach((dep) => {
        dep.dependents.push(absolutePath);
      });
      let title = csfEntry?.title || userOrAutoTitleFromSpecifier(importPath, specifier, result.title);
      invariant(
        title,
        "makeTitle created an undefined title. This happens when a specifier's doesn't have any matches in its fileName"
      );
      let defaultName = this.options.docs?.defaultName ?? "Docs", name = result.name || (csfEntry ? autoName(importPath, csfEntry.importPath, defaultName) : defaultName), id = toId(csfEntry?.extra.metaId || title, name), tags = combineTags(
        ...projectTags,
        ...csfEntry?.tags ?? [],
        ...result.metaTags ?? [],
        csfEntry ? "attached-mdx" : "unattached-mdx"
      );
      return {
        id,
        title,
        name,
        importPath,
        storiesImports: sortedDependencies.map((dep) => dep.entries[0].importPath),
        type: "docs",
        tags
      };
    } catch (err) {
      throw err && err.source?.match(/mdast-util-mdx-jsx/g) && logger.warn(
        `\u{1F4A1} This seems to be an MDX2 syntax error. Please refer to the MDX section in the following resource for assistance on how to fix this: ${import_picocolors.default.yellow(
          "https://storybook.js.org/docs/7/migration-guide?ref=error"
        )}`
      ), err;
    }
  }
  chooseDuplicate(firstEntry, secondEntry, projectTags) {
    if (firstEntry.importPath === secondEntry.importPath)
      return firstEntry;
    let firstIsBetter = !0;
    (secondEntry.type === "story" || isMdxEntry(secondEntry) && firstEntry.type === "docs" && !isMdxEntry(firstEntry)) && (firstIsBetter = !1);
    let betterEntry = firstIsBetter ? firstEntry : secondEntry, worseEntry = firstIsBetter ? secondEntry : firstEntry, changeDocsName = 'Use `<Meta of={} name="Other Name">` to distinguish them.';
    if (worseEntry.type === "story")
      throw new IndexingError(`Duplicate stories with id: ${firstEntry.id}`, [
        firstEntry.importPath,
        secondEntry.importPath
      ]);
    if (betterEntry.type === "story") {
      let worseDescriptor = isMdxEntry(worseEntry) ? "component docs page" : "automatically generated docs page", docsName = this.options.docs?.defaultName ?? "Docs";
      throw betterEntry.name === docsName ? new IndexingError(
        `You have a story for ${betterEntry.title} with the same name as your default docs entry name (${betterEntry.name}), so the docs page is being dropped. Consider changing the story name.`,
        [firstEntry.importPath, secondEntry.importPath]
      ) : new IndexingError(
        `You have a story for ${betterEntry.title} with the same name as your ${worseDescriptor} (${worseEntry.name}), so the docs page is being dropped. ${changeDocsName}`,
        [firstEntry.importPath, secondEntry.importPath]
      );
    } else if (isMdxEntry(betterEntry)) {
      if (isMdxEntry(worseEntry))
        throw new IndexingError(
          `You have two component docs pages with the same name ${betterEntry.title}:${betterEntry.name}. ${changeDocsName}`,
          [firstEntry.importPath, secondEntry.importPath]
        );
      if (worseEntry.tags?.includes(AUTODOCS_TAG) && !projectTags?.includes(AUTODOCS_TAG))
        throw new IndexingError(
          `You created a component docs page for '${worseEntry.title}', but also tagged the CSF file with '${AUTODOCS_TAG}'. This is probably a mistake.`,
          [betterEntry.importPath, worseEntry.importPath]
        );
    } else
      return {
        ...betterEntry,
        storiesImports: [
          ...betterEntry.storiesImports,
          worseEntry.importPath,
          ...worseEntry.storiesImports
        ]
      };
    return betterEntry;
  }
  async sortStories(entries, storySortParameter) {
    let sortableStories = Object.values(entries), fileNameOrder = _StoryIndexGenerator.storyFileNames(this.specifierToCache);
    return sortStoriesV7(sortableStories, storySortParameter, fileNameOrder), sortableStories.reduce(
      (acc, item) => (acc[item.id] = item, acc),
      {}
    );
  }
  async getIndex() {
    return (await this.getIndexAndStats()).storyIndex;
  }
  async getIndexAndStats() {
    if (this.lastIndex && this.lastStats)
      return { storyIndex: this.lastIndex, stats: this.lastStats };
    if (this.lastError)
      throw this.lastError;
    let previewCode = await this.getPreviewCode(), projectTags = this.getProjectTags(previewCode), { entries: storiesList, stats } = await this.ensureExtracted({ projectTags });
    try {
      let errorEntries = storiesList.filter((entry) => entry.type === "error");
      if (errorEntries.length)
        throw new MultipleIndexingError(errorEntries.map((entry) => entry.err));
      let duplicateErrors = [], indexEntries = {};
      if (storiesList.forEach((entry) => {
        try {
          let existing = indexEntries[entry.id];
          existing ? indexEntries[entry.id] = this.chooseDuplicate(existing, entry, projectTags) : indexEntries[entry.id] = entry;
        } catch (err) {
          err instanceof IndexingError && duplicateErrors.push(err);
        }
      }), duplicateErrors.length)
        throw new MultipleIndexingError(duplicateErrors);
      let sorted = await this.sortStories(
        indexEntries,
        previewCode && getStorySortParameter(previewCode)
      );
      return this.lastStats = stats, this.lastIndex = {
        v: 5,
        entries: sorted
      }, { storyIndex: this.lastIndex, stats: this.lastStats };
    } catch (err) {
      throw this.lastError = err == null || err instanceof Error ? err : void 0, invariant(this.lastError), logger.warn(`\u{1F6A8} ${this.lastError.toString()}`), this.lastError;
    }
  }
  invalidateAll() {
    this.specifierToCache.forEach((cache2) => {
      Object.keys(cache2).forEach((key) => {
        cache2[key] = !1;
      });
    }), this.lastIndex = null, this.lastError = null;
  }
  invalidate(specifier, importPath, removed) {
    let absolutePath = slash(resolve2(this.options.workingDir, importPath)), cache2 = this.specifierToCache.get(specifier);
    invariant(
      cache2,
      `specifier does not have a matching cache entry in specifierToCache: ${JSON.stringify(
        specifier
      )}`
    );
    let cacheEntry = cache2[absolutePath];
    if (cacheEntry && cacheEntry.type === "stories") {
      let { dependents } = cacheEntry, invalidated = /* @__PURE__ */ new Set();
      this.specifierToCache.forEach((otherCache) => {
        dependents.forEach((dep) => {
          otherCache[dep] && (invalidated.add(dep), otherCache[dep] = !1);
        });
      });
    }
    if (removed) {
      if (cacheEntry && cacheEntry.type === "docs") {
        let absoluteImports = cacheEntry.storiesImports.map(
          (p) => resolve2(this.options.workingDir, p)
        );
        this.findDependencies(absoluteImports).forEach(
          (dep) => dep.dependents.splice(dep.dependents.indexOf(absolutePath), 1)
        );
      }
      delete cache2[absolutePath];
    } else
      cache2[absolutePath] = !1;
    this.lastIndex = null, this.lastError = null;
  }
  async getPreviewCode() {
    let previewFile = ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts"].map((ext) => join2(this.options.configDir, `preview.${ext}`)).find((fname) => existsSync(fname));
    return previewFile && (await readFile(previewFile, { encoding: "utf8" })).toString();
  }
  getProjectTags(previewCode) {
    let projectTags = [], defaultTags = ["dev", "test"];
    if (previewCode)
      try {
        projectTags = loadConfig(previewCode).parse().getFieldValue(["tags"]) ?? [];
      } catch {
        once.warn(import_ts_dedent2.dedent`
          Unable to parse tags from project configuration. If defined, tags should be specified inline, e.g.

          export default {
            tags: ['foo'],
          }

          ---

          Received:

          ${previewCode}
        `);
      }
    return [...defaultTags, ...projectTags];
  }
  // Get the story file names in "imported order"
  static storyFileNames(specifierToCache) {
    return Array.from(specifierToCache.values()).flatMap((r) => Object.keys(r));
  }
};

// src/core-server/utils/build-or-throw.ts
import { NoMatchingExportError } from "storybook/internal/server-errors";
async function buildOrThrow(callback) {
  try {
    return await callback();
  } catch (err) {
    let builderErrors = err.errors;
    throw builderErrors && builderErrors.find(
      (er) => er.text?.includes("No matching export")
    ) ? new NoMatchingExportError(err) : err;
  }
}

// src/core-server/utils/copy-all-static-files.ts
var import_picocolors2 = __toESM(require_picocolors(), 1);
import { cp } from "node:fs/promises";
import { join as join3, relative as relative3 } from "node:path";
import { getDirectoryFromWorkingDir } from "storybook/internal/common";
import { logger as logger2 } from "storybook/internal/node-logger";
async function copyAllStaticFilesRelativeToMain(staticDirs, outputDir, configDir) {
  let workingDir = process.cwd();
  return staticDirs?.reduce(async (acc, dir) => {
    await acc;
    let staticDirAndTarget = typeof dir == "string" ? dir : `${dir.from}:${dir.to}`, { staticPath: from, targetEndpoint: to } = parseStaticDir(
      getDirectoryFromWorkingDir({
        configDir,
        workingDir,
        directory: staticDirAndTarget
      })
    ), targetPath = join3(outputDir, to), skipPaths = ["index.html", "iframe.html"].map((f) => join3(outputDir, f));
    from.includes("node_modules") || logger2.info(
      `Copying static files: ${import_picocolors2.default.cyan(print(from))} at ${import_picocolors2.default.cyan(print(targetPath))}`
    ), await cp(from, targetPath, {
      dereference: !0,
      preserveTimestamps: !0,
      filter: (_, dest) => !skipPaths.includes(dest),
      recursive: !0
    });
  }, Promise.resolve());
}
function print(p) {
  return relative3(process.cwd(), p);
}

// src/core-server/utils/get-builders.ts
import { MissingBuilderError } from "storybook/internal/server-errors";
async function getManagerBuilder() {
  return await import("../_node-chunks/builder-manager-AYK7HUZR.js");
}
async function getPreviewBuilder(resolvedPreviewBuilder) {
  return await importModule(resolvedPreviewBuilder);
}
async function getBuilders({ presets }) {
  let { builder } = await presets.apply("core", {});
  if (!builder)
    throw new MissingBuilderError();
  let resolvedPreviewBuilder = typeof builder == "string" ? builder : builder.name;
  return Promise.all([getPreviewBuilder(resolvedPreviewBuilder), getManagerBuilder()]);
}

// src/core-server/utils/metadata.ts
import { writeFile } from "node:fs/promises";
import { getStorybookMetadata } from "storybook/internal/telemetry";
async function extractStorybookMetadata(outputFile, configDir) {
  let storybookMetadata = await getStorybookMetadata(configDir);
  await writeFile(outputFile, JSON.stringify(storybookMetadata));
}
function useStorybookMetadata(app, configDir) {
  app.use("/project.json", async (req, res) => {
    let storybookMetadata = await getStorybookMetadata(configDir);
    res.setHeader("Content-Type", "application/json"), res.write(JSON.stringify(storybookMetadata)), res.end();
  });
}

// src/core-server/utils/output-stats.ts
var import_json_ext = __toESM(require_src2(), 1), import_picocolors3 = __toESM(require_picocolors(), 1);
import { createWriteStream } from "node:fs";
import { join as join4 } from "node:path";
import { logger as logger3 } from "storybook/internal/node-logger";
async function outputStats(directory, previewStats, managerStats) {
  if (previewStats) {
    let filePath = await writeStats(directory, "preview", previewStats);
    logger3.info(`Preview stats written to ${import_picocolors3.default.cyan(filePath)}`);
  }
  if (managerStats) {
    let filePath = await writeStats(directory, "manager", managerStats);
    logger3.info(`Manager stats written to ${import_picocolors3.default.cyan(filePath)}`);
  }
}
var writeStats = async (directory, name, stats) => {
  let filePath = join4(directory, `${name}-stats.json`), { chunks, ...data } = stats.toJson();
  return await new Promise((resolve4, reject) => {
    (0, import_json_ext.stringifyStream)(data, null, 2).on("error", reject).pipe(createWriteStream(filePath)).on("error", reject).on("finish", resolve4);
  }), filePath;
};

// src/core-server/utils/stories-json.ts
import { writeFile as writeFile2 } from "node:fs/promises";
import { basename as basename3 } from "node:path";
import { STORY_INDEX_INVALIDATED } from "storybook/internal/core-events";

// src/core-server/utils/watch-story-specifiers.ts
import { lstatSync, readdirSync } from "node:fs";
import { basename as basename2, join as join5, relative as relative4, resolve as resolve3 } from "node:path";
import { commonGlobOptions as commonGlobOptions2 } from "storybook/internal/common";
var import_watchpack = __toESM(require_watchpack(), 1), isDirectory = (directory) => {
  try {
    return lstatSync(directory).isDirectory();
  } catch {
    return !1;
  }
};
function getNestedFilesAndDirectories(directories) {
  let traversedDirectories = /* @__PURE__ */ new Set(), files = /* @__PURE__ */ new Set(), traverse = (directory) => {
    traversedDirectories.has(directory) || (readdirSync(directory, { withFileTypes: !0 }).forEach((ent) => {
      ent.isDirectory() ? traverse(join5(directory, ent.name)) : ent.isFile() && files.add(join5(directory, ent.name));
    }), traversedDirectories.add(directory));
  };
  return directories.filter(isDirectory).forEach(traverse), { files: Array.from(files), directories: Array.from(traversedDirectories) };
}
function watchStorySpecifiers(specifiers, options, onInvalidate) {
  let { files, directories } = getNestedFilesAndDirectories(
    specifiers.map((ns) => resolve3(options.workingDir, ns.directory))
  ), wp = new import_watchpack.default({
    // poll: true, // Slow!!! Enable only in special cases
    followSymlinks: !1,
    ignored: ["**/.git", "**/node_modules"]
  });
  wp.watch({ files, directories });
  let toImportPath = (absolutePath) => {
    let relativePath = relative4(options.workingDir, absolutePath);
    return slash(relativePath.startsWith(".") ? relativePath : `./${relativePath}`);
  };
  async function onChangeOrRemove(absolutePath, removed) {
    let importPath = toImportPath(absolutePath), matchingSpecifier = specifiers.find((ns) => ns.importPathMatcher.exec(importPath));
    if (matchingSpecifier) {
      onInvalidate(matchingSpecifier, importPath, removed);
      return;
    }
    !removed && isDirectory(absolutePath) && await Promise.all(
      specifiers.filter((specifier) => importPath.startsWith(specifier.directory)).map(async (specifier) => {
        let dirGlob = join5(
          absolutePath,
          "**",
          // files can be e.g. '**/foo/*/*.js' so we just want the last bit,
          // because the directory could already be within the files part (e.g. './x/foo/bar')
          basename2(specifier.files)
        ), { globby } = await import("../_node-chunks/globby-YAVH4LQB.js");
        (await globby(slash(dirGlob), commonGlobOptions2(dirGlob))).forEach((filePath) => {
          let fileImportPath = toImportPath(filePath);
          specifier.importPathMatcher.exec(fileImportPath) && onInvalidate(specifier, fileImportPath, removed);
        });
      })
    );
  }
  return wp.on("change", async (filePath, mtime, explanation) => {
    await onChangeOrRemove(filePath, !mtime);
  }), wp.on("remove", async (filePath, explanation) => {
    await onChangeOrRemove(filePath, !0);
  }), () => wp.close();
}

// src/core-server/utils/watchConfig.ts
var import_watchpack2 = __toESM(require_watchpack(), 1);
function watchConfig(configDir, onInvalidate) {
  let wp = new import_watchpack2.default({
    followSymlinks: !1,
    ignored: ["**/.git", "**/node_modules"]
  });
  return wp.watch({
    directories: [configDir]
  }), wp.on("change", async (filePath, mtime, explanation) => {
    await onInvalidate(filePath, !mtime);
  }), wp.on("remove", async (filePath, explanation) => {
    await onInvalidate(filePath, !0);
  }), () => wp.close();
}

// src/core-server/utils/stories-json.ts
var DEBOUNCE = 100;
async function extractStoriesJson(outputFile, initializedStoryIndexGenerator, transform) {
  let storyIndex = await (await initializedStoryIndexGenerator).getIndex();
  await writeFile2(outputFile, JSON.stringify(transform ? transform(storyIndex) : storyIndex));
}
function useStoriesJson({
  app,
  initializedStoryIndexGenerator,
  workingDir = process.cwd(),
  configDir,
  serverChannel,
  normalizedStories
}) {
  let maybeInvalidate = debounce(() => serverChannel.emit(STORY_INDEX_INVALIDATED), DEBOUNCE, {
    edges: ["leading", "trailing"]
  });
  watchStorySpecifiers(normalizedStories, { workingDir }, async (specifier, path2, removed) => {
    (await initializedStoryIndexGenerator).invalidate(specifier, path2, removed), maybeInvalidate();
  }), configDir && watchConfig(configDir, async (filePath) => {
    basename3(filePath).startsWith("preview") && ((await initializedStoryIndexGenerator).invalidateAll(), maybeInvalidate());
  }), app.use("/index.json", async (req, res) => {
    try {
      let index = await (await initializedStoryIndexGenerator).getIndex();
      res.setHeader("Content-Type", "application/json"), res.end(JSON.stringify(index));
    } catch (err) {
      res.statusCode = 500, res.end(err instanceof Error ? err.toString() : String(err));
    }
  });
}

// src/core-server/utils/summarizeIndex.ts
import { isExampleStoryId as isExampleStoryId2 } from "storybook/internal/telemetry";
var PAGE_REGEX = /(page|screen)/i;
var isPageStory = (storyId) => PAGE_REGEX.test(storyId), isCLIExampleEntry = (entry) => [
  "example-introduction--docs",
  "configure-your-project--docs",
  "example-button--docs",
  "example-button--primary",
  "example-button--secondary",
  "example-button--large",
  "example-button--small",
  "example-header--docs",
  "example-header--logged-in",
  "example-header--logged-out",
  "example-page--logged-in",
  "example-page--logged-out"
].includes(entry.id);
function summarizeIndex(storyIndex) {
  let storyCount = 0, componentTitles = /* @__PURE__ */ new Set(), exampleStoryCount = 0, onboardingStoryCount = 0, onboardingDocsCount = 0, exampleDocsCount = 0, pageStoryCount = 0, playStoryCount = 0, testStoryCount = 0, autodocsCount = 0, mdxCount = 0, svelteCsfV4Count = 0, svelteCsfV5Count = 0, testsPerParentStory = /* @__PURE__ */ new Map();
  Object.values(storyIndex.entries).forEach((entry) => {
    isCLIExampleEntry(entry) ? (entry.type === "story" && (exampleStoryCount += 1), entry.type === "docs" && (exampleDocsCount += 1)) : isExampleStoryId2(entry.id) ? (entry.type === "story" && (onboardingStoryCount += 1), entry.type === "docs" && (onboardingDocsCount += 1)) : entry.type === "story" ? (storyCount += 1, componentTitles.add(entry.title), isPageStory(entry.title) && (pageStoryCount += 1), entry.tags?.includes(PLAY_FN_TAG) && (playStoryCount += 1), entry.tags?.includes(TEST_FN_TAG) && entry.parent && (testStoryCount += 1, testsPerParentStory.set(entry.parent, (testsPerParentStory.get(entry.parent) ?? 0) + 1)), entry.tags?.includes("svelte-csf-v4") ? svelteCsfV4Count += 1 : entry.tags?.includes("svelte-csf-v5") && (svelteCsfV5Count += 1)) : entry.type === "docs" && (isMdxEntry(entry) ? mdxCount += 1 : entry.tags?.includes(AUTODOCS_TAG) && (autodocsCount += 1));
  });
  let componentCount = componentTitles.size, maxTestsPerStory = 0, singleTestStoryCount = 0;
  return testsPerParentStory.forEach((count) => {
    count > maxTestsPerStory && (maxTestsPerStory = count), count === 1 && (singleTestStoryCount += 1);
  }), {
    storyCount,
    componentCount,
    pageStoryCount,
    playStoryCount,
    testStoryCount,
    maxTestsPerStory,
    singleTestStoryCount,
    autodocsCount,
    mdxCount,
    exampleStoryCount,
    exampleDocsCount,
    onboardingStoryCount,
    onboardingDocsCount,
    svelteCsfV4Count,
    svelteCsfV5Count,
    version: storyIndex.v
  };
}

// src/core-server/build-static.ts
async function buildStaticStandalone(options) {
  if (options.configType = "PRODUCTION", options.outputDir === "")
    throw new Error("Won't remove current directory. Check your outputDir!");
  if (options.outputDir = resolve(options.outputDir), options.configDir = resolve(options.configDir), logger4.step(`Cleaning outputDir: ${import_picocolors4.default.cyan(relative(process.cwd(), options.outputDir))}`), options.outputDir === "/")
    throw new Error("Won't remove directory '/'. Check your outputDir!");
  await rm(options.outputDir, { recursive: !0, force: !0 }).catch(() => {
  }), await mkdir(options.outputDir, { recursive: !0 });
  let config = await loadMainConfig(options), { framework } = config, corePresets = [], frameworkName = typeof framework == "string" ? framework : framework?.name;
  frameworkName ? corePresets.push(join(frameworkName, "preset")) : options.ignorePreview || logger4.warn(`you have not specified a framework in your ${options.configDir}/main.js`);
  let commonPreset = join(
    resolvePackageDir("storybook"),
    "dist/core-server/presets/common-preset.js"
  ), commonOverridePreset = import.meta.resolve(
    "storybook/internal/core-server/presets/common-override-preset"
  );
  logger4.step("Loading presets");
  let presets = await loadAllPresets({
    corePresets: [commonPreset, ...corePresets],
    overridePresets: [commonOverridePreset],
    isCritical: !0,
    ...options
  }), { renderer } = await presets.apply("core", {}), build2 = await presets.apply("build", {}), [previewBuilder, managerBuilder] = await getBuilders({ ...options, presets, build: build2 }), resolvedRenderer = renderer ? resolveAddonName(options.configDir, renderer, options) : void 0;
  presets = await loadAllPresets({
    corePresets: [
      commonPreset,
      ...managerBuilder.corePresets || [],
      ...previewBuilder.corePresets || [],
      ...resolvedRenderer ? [resolvedRenderer] : [],
      ...corePresets
    ],
    overridePresets: [...previewBuilder.overridePresets || [], commonOverridePreset],
    ...options,
    build: build2
  });
  let [features, core2, staticDirs, indexers, stories, docsOptions] = await Promise.all([
    presets.apply("features"),
    presets.apply("core"),
    presets.apply("staticDirs"),
    presets.apply("experimental_indexers", []),
    presets.apply("stories"),
    presets.apply("docs")
  ]), invokedBy = process.env.STORYBOOK_INVOKED_BY;
  !core2?.disableTelemetry && invokedBy && telemetry2("test-run", { runner: invokedBy, watch: !1 }, { configDir: options.configDir });
  let fullOptions = {
    ...options,
    presets,
    features,
    build: build2
  }, effects = [];
  global2.FEATURES = features, options.previewOnly || await buildOrThrow(
    async () => managerBuilder.build({ startTime: process.hrtime(), options: fullOptions })
  ), staticDirs && effects.push(
    copyAllStaticFilesRelativeToMain(staticDirs, options.outputDir, options.configDir)
  );
  let coreServerPublicDir = join(resolvePackageDir("storybook"), "assets/browser");
  effects.push(cp2(coreServerPublicDir, options.outputDir, { recursive: !0 }));
  let initializedStoryIndexGenerator = Promise.resolve(void 0);
  if (!options.ignorePreview) {
    let workingDir = process.cwd(), directories = {
      configDir: options.configDir,
      workingDir
    }, normalizedStories = normalizeStories(stories, directories), generator = new StoryIndexGenerator(normalizedStories, {
      ...directories,
      indexers,
      docs: docsOptions,
      build: build2
    });
    if (initializedStoryIndexGenerator = generator.initialize().then(() => generator), effects.push(
      extractStoriesJson(
        join(options.outputDir, "index.json"),
        initializedStoryIndexGenerator
      )
    ), features?.experimentalComponentsManifest) {
      let componentManifestGenerator = await presets.apply(
        "experimental_componentManifestGenerator"
      ), indexGenerator = await initializedStoryIndexGenerator;
      if (componentManifestGenerator && indexGenerator)
        try {
          let manifests = await componentManifestGenerator(
            indexGenerator
          );
          await mkdir(join(options.outputDir, "manifests"), { recursive: !0 }), await writeFile3(
            join(options.outputDir, "manifests", "components.json"),
            JSON.stringify(manifests)
          ), await writeFile3(
            join(options.outputDir, "manifests", "components.html"),
            renderManifestComponentsPage(manifests)
          );
        } catch (e) {
          logger4.error("Failed to generate manifests/components.json"), logger4.error(e instanceof Error ? e : String(e));
        }
    }
  }
  core2?.disableProjectJson || effects.push(
    extractStorybookMetadata(join(options.outputDir, "project.json"), options.configDir)
  ), options.debugWebpack && logConfig("Preview webpack config", await previewBuilder.getConfig(fullOptions)), options.ignorePreview ? logger4.info("Not building preview") : logger4.info("Building preview..");
  let startTime = process.hrtime();
  if (await Promise.all([
    ...options.ignorePreview ? [] : [
      previewBuilder.build({
        startTime,
        options: fullOptions
      }).then(async (previewStats) => {
        logger4.trace({ message: "Preview built", time: process.hrtime(startTime) });
        let statsOption = options.webpackStatsJson || options.statsJson;
        if (statsOption) {
          let target = statsOption === !0 ? options.outputDir : statsOption;
          await outputStats(target, previewStats);
        }
      }).catch((error) => {
        throw logger4.error("Failed to build the preview"), process.exitCode = 1, error;
      })
    ],
    ...effects
  ]), !core2?.disableTelemetry && !options.test)
    try {
      let storyIndex = await (await initializedStoryIndexGenerator)?.getIndex(), payload = {
        precedingUpgrade: await getPrecedingUpgrade()
      };
      storyIndex && Object.assign(payload, {
        storyIndex: summarizeIndex(storyIndex)
      }), await telemetry2("build", payload, { configDir: options.configDir });
    } catch (e) {
      logger4.debug?.(`Build telemetry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  logger4.step(`Output directory: ${options.outputDir}`);
}

// src/core-server/build-dev.ts
import { readFile as readFile4 } from "node:fs/promises";
import {
  JsPackageManagerFactory,
  getConfigInfo,
  getInterpretedFile,
  getProjectRoot as getProjectRoot2,
  loadAllPresets as loadAllPresets2,
  loadMainConfig as loadMainConfig2,
  resolveAddonName as resolveAddonName2,
  resolvePathInStorybookCache,
  validateFrameworkName,
  versions
} from "storybook/internal/common";
import { deprecate, logger as logger12, prompt } from "storybook/internal/node-logger";
import { MissingBuilderError as MissingBuilderError3, NoStatsForViteDevError } from "storybook/internal/server-errors";
import { oneWayHash, telemetry as telemetry4 } from "storybook/internal/telemetry";
import { global as global3 } from "@storybook/global";
var import_ts_dedent8 = __toESM(require_dist(), 1);

// src/core-server/dev-server.ts
import { logConfig as logConfig2 } from "storybook/internal/common";
import { logger as logger8 } from "storybook/internal/node-logger";
import { MissingBuilderError as MissingBuilderError2 } from "storybook/internal/server-errors";

// ../node_modules/@polka/compression/build.mjs
import zlib from "node:zlib";
var NOOP = () => {
}, MIMES = /text|javascript|\/json|xml/i;
function getChunkSize(chunk, enc) {
  return chunk ? Buffer.byteLength(chunk, enc) : 0;
}
function build_default({ threshold = 1024, level = -1, brotli = !1, gzip = !0, mimes = MIMES } = {}) {
  let brotliOpts = typeof brotli == "object" && brotli || {}, gzipOpts = typeof gzip == "object" && gzip || {};
  return zlib.createBrotliCompress || (brotli = !1), (req, res, next = NOOP) => {
    let accept = req.headers["accept-encoding"] + "", encoding = (brotli && /\bbr\b/.exec(accept) || gzip && /\bgzip\b/.exec(accept) || [])[0];
    if (req.method === "HEAD" || !encoding) return next();
    let compress, pendingListeners = [], pendingStatus = 0, started = !1, size = 0;
    function start() {
      started = !0, size = res.getHeader("Content-Length") | 0 || size;
      let compressible = mimes.test(
        String(res.getHeader("Content-Type") || "text/plain")
      ), cleartext = !res.getHeader("Content-Encoding"), listeners = pendingListeners || [];
      compressible && cleartext && size >= threshold ? (res.setHeader("Content-Encoding", encoding), res.removeHeader("Content-Length"), encoding === "br" ? compress = zlib.createBrotliCompress({
        params: Object.assign({
          [zlib.constants.BROTLI_PARAM_QUALITY]: level,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size
        }, brotliOpts)
      }) : compress = zlib.createGzip(
        Object.assign({ level }, gzipOpts)
      ), compress.on("data", (chunk) => write.call(res, chunk) || compress.pause()), on.call(res, "drain", () => compress.resume()), compress.on("end", () => end.call(res)), listeners.forEach((p) => compress.on.apply(compress, p))) : (pendingListeners = null, listeners.forEach((p) => on.apply(res, p))), writeHead.call(res, pendingStatus || res.statusCode);
    }
    let { end, write, on, writeHead } = res;
    res.writeHead = function(status, reason, headers) {
      if (typeof reason != "string" && ([headers, reason] = [reason, headers]), headers) for (let k in headers) res.setHeader(k, headers[k]);
      return pendingStatus = status, this;
    }, res.write = function(chunk, enc) {
      return size += getChunkSize(chunk, enc), started || start(), compress ? compress.write.apply(compress, arguments) : write.apply(this, arguments);
    }, res.end = function(chunk, enc) {
      return arguments.length > 0 && typeof chunk != "function" && (size += getChunkSize(chunk, enc)), started || start(), compress ? compress.end.apply(compress, arguments) : end.apply(this, arguments);
    }, res.on = function(type, listener) {
      return pendingListeners ? compress ? compress.on(type, listener) : pendingListeners.push([type, listener]) : on.call(this, type, listener), this;
    }, next();
  };
}

// ../node_modules/polka/build.mjs
import http from "node:http";
import { setImmediate } from "node:timers";

// ../node_modules/regexparam/dist/index.mjs
function parse(input, loose) {
  if (input instanceof RegExp) return { keys: !1, pattern: input };
  var c, o, tmp, ext, keys = [], pattern = "", arr = input.split("/");
  for (arr[0] || arr.shift(); tmp = arr.shift(); )
    c = tmp[0], c === "*" ? (keys.push(c), pattern += tmp[1] === "?" ? "(?:/(.*))?" : "/(.*)") : c === ":" ? (o = tmp.indexOf("?", 1), ext = tmp.indexOf(".", 1), keys.push(tmp.substring(1, ~o ? o : ~ext ? ext : tmp.length)), pattern += ~o && !~ext ? "(?:/([^/]+?))?" : "/([^/]+?)", ~ext && (pattern += (~o ? "?" : "") + "\\" + tmp.substring(ext))) : pattern += "/" + tmp;
  return {
    keys,
    pattern: new RegExp("^" + pattern + (loose ? "(?=$|/)" : "/?$"), "i")
  };
}

// ../node_modules/trouter/index.mjs
var MAP = {
  "": 0,
  GET: 1,
  HEAD: 2,
  PATCH: 3,
  OPTIONS: 4,
  CONNECT: 5,
  DELETE: 6,
  TRACE: 7,
  POST: 8,
  PUT: 9
}, Trouter = class {
  constructor() {
    this.routes = [], this.all = this.add.bind(this, ""), this.get = this.add.bind(this, "GET"), this.head = this.add.bind(this, "HEAD"), this.patch = this.add.bind(this, "PATCH"), this.options = this.add.bind(this, "OPTIONS"), this.connect = this.add.bind(this, "CONNECT"), this.delete = this.add.bind(this, "DELETE"), this.trace = this.add.bind(this, "TRACE"), this.post = this.add.bind(this, "POST"), this.put = this.add.bind(this, "PUT");
  }
  use(route, ...fns) {
    let handlers = [].concat.apply([], fns), { keys, pattern } = parse(route, !0);
    return this.routes.push({ keys, pattern, method: "", handlers, midx: MAP[""] }), this;
  }
  add(method, route, ...fns) {
    let { keys, pattern } = parse(route), handlers = [].concat.apply([], fns);
    return this.routes.push({ keys, pattern, method, handlers, midx: MAP[method] }), this;
  }
  find(method, url) {
    let midx = MAP[method], isHEAD = midx === 2, i = 0, j = 0, k, tmp, arr = this.routes, matches = [], params = {}, handlers = [];
    for (; i < arr.length; i++)
      if (tmp = arr[i], tmp.midx === midx || tmp.midx === 0 || isHEAD && tmp.midx === 1)
        if (tmp.keys === !1) {
          if (matches = tmp.pattern.exec(url), matches === null) continue;
          if (matches.groups !== void 0) for (k in matches.groups) params[k] = matches.groups[k];
          tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]);
        } else if (tmp.keys.length > 0) {
          if (matches = tmp.pattern.exec(url), matches === null) continue;
          for (j = 0; j < tmp.keys.length; ) params[tmp.keys[j]] = matches[++j];
          tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]);
        } else tmp.pattern.test(url) && (tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]));
    return { params, handlers };
  }
};

// ../node_modules/@polka/url/build.mjs
import * as qs from "node:querystring";
function parse3(req) {
  let raw = req.url;
  if (raw == null) return;
  let prev = req._parsedUrl;
  if (prev && prev.raw === raw) return prev;
  let pathname = raw, search = "", query, hash;
  if (raw.length > 1) {
    let idx = raw.indexOf("#", 1);
    idx !== -1 && (hash = raw.substring(idx), pathname = raw.substring(0, idx)), idx = pathname.indexOf("?", 1), idx !== -1 && (search = pathname.substring(idx), pathname = pathname.substring(0, idx), search.length > 1 && (query = qs.parse(search.substring(1))));
  }
  return req._parsedUrl = { pathname, search, query, hash, raw };
}

// ../node_modules/polka/build.mjs
function onError(err, req, res) {
  let code = typeof err.status == "number" && err.status;
  code = res.statusCode = code && code >= 100 ? code : 500, typeof err == "string" || Buffer.isBuffer(err) ? res.end(err) : res.end(err.message || http.STATUS_CODES[code]);
}
var mount = (fn) => fn instanceof Polka ? fn.attach : fn, Polka = class _Polka extends Trouter {
  constructor(opts = {}) {
    super(), this.parse = parse3, this.server = opts.server, this.handler = this.handler.bind(this), this.onError = opts.onError || onError, this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { status: 404 }), this.attach = (req, res) => setImmediate(this.handler, req, res);
  }
  use(base, ...fns) {
    return base === "/" ? super.use(base, fns.map(mount)) : typeof base == "function" || base instanceof _Polka ? super.use("/", [base, ...fns].map(mount)) : super.use(
      base,
      (req, _, next) => {
        if (typeof base == "string") {
          let len = base.length;
          base.startsWith("/") || len++, req.url = req.url.substring(len) || "/", req.path = req.path.substring(len) || "/";
        } else
          req.url = req.url.replace(base, "") || "/", req.path = req.path.replace(base, "") || "/";
        req.url.charAt(0) !== "/" && (req.url = "/" + req.url), next();
      },
      fns.map(mount),
      (req, _, next) => {
        req.path = req._parsedUrl.pathname, req.url = req.path + req._parsedUrl.search, next();
      }
    ), this;
  }
  listen() {
    return (this.server = this.server || http.createServer()).on("request", this.attach), this.server.listen.apply(this.server, arguments), this;
  }
  handler(req, res, next) {
    let info = this.parse(req), path2 = info.pathname, obj = this.find(req.method, req.path = path2);
    if (req.url = path2 + info.search, req.originalUrl = req.originalUrl || req.url, req.query = info.query || {}, req.search = info.search, req.params = obj.params, path2.length > 1 && path2.indexOf("%", 1) !== -1)
      for (let k in req.params)
        try {
          req.params[k] = decodeURIComponent(req.params[k]);
        } catch {
        }
    let i = 0, arr = obj.handlers.concat(this.onNoMatch), len = arr.length, loop = async () => res.finished || i < len && arr[i++](req, res, next);
    (next = next || ((err) => err ? this.onError(err, req, res, next) : loop().catch(next)))();
  }
};
function build_default2(opts) {
  return new Polka(opts);
}

// src/core-server/utils/doTelemetry.ts
import { getPrecedingUpgrade as getPrecedingUpgrade2, telemetry as telemetry3 } from "storybook/internal/telemetry";

// src/core-server/utils/versionStatus.ts
var versionStatus = (versionCheck) => versionCheck.error ? "error" : versionCheck.cached ? "cached" : "success";

// src/core-server/utils/doTelemetry.ts
async function doTelemetry(app, core2, initializedStoryIndexGenerator, options) {
  core2?.disableTelemetry || initializedStoryIndexGenerator.then(async (generator) => {
    let indexAndStats;
    try {
      indexAndStats = await generator?.getIndexAndStats();
    } catch (err) {
      if (!(err instanceof Error))
        throw new Error("encountered a non-recoverable error");
      sendTelemetryError(err, "dev", {
        cliOptions: options,
        presetOptions: { ...options, corePresets: [], overridePresets: [] }
      });
      return;
    }
    let { versionCheck, versionUpdates } = options;
    invariant(
      !versionUpdates || versionUpdates && versionCheck,
      "versionCheck should be defined when versionUpdates is true"
    );
    let payload = {
      precedingUpgrade: await getPrecedingUpgrade2()
    };
    indexAndStats && Object.assign(payload, {
      versionStatus: versionUpdates && versionCheck ? versionStatus(versionCheck) : "disabled",
      storyIndex: summarizeIndex(indexAndStats.storyIndex),
      storyStats: indexAndStats.stats
    }), telemetry3("dev", payload, { configDir: options.configDir });
  }), core2?.disableProjectJson || useStorybookMetadata(app, options.configDir);
}

// src/core-server/utils/get-caching-middleware.ts
function getCachingMiddleware() {
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store"), next();
  };
}

// src/core-server/utils/get-server-channel.ts
var import_telejson = __toESM(require_dist2(), 1);
import { Channel, HEARTBEAT_INTERVAL } from "storybook/internal/channels";
import WebSocket, { WebSocketServer } from "ws";

// src/shared/universal-store/index.ts
var import_ts_dedent3 = __toESM(require_dist(), 1);

// src/shared/universal-store/instances.ts
var instances = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var CHANNEL_EVENT_PREFIX = "UNIVERSAL_STORE:", ProgressState = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, UniversalStore = class _UniversalStore {
  constructor(options, environmentOverrides) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = () => (this.debug("getState", { state: this.state }), this.state);
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = (eventTypeOrListener, maybeListener) => {
      let subscribesToAllEvents = typeof eventTypeOrListener == "function", eventType = subscribesToAllEvents ? "*" : eventTypeOrListener, listener = subscribesToAllEvents ? eventTypeOrListener : maybeListener;
      if (this.debug("subscribe", { eventType, listener }), !listener)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(eventType) || this.listeners.set(eventType, /* @__PURE__ */ new Set()), this.listeners.get(eventType).add(listener), () => {
        this.debug("unsubscribe", { eventType, listener }), this.listeners.has(eventType) && (this.listeners.get(eventType).delete(listener), this.listeners.get(eventType)?.size === 0 && this.listeners.delete(eventType));
      };
    };
    /** Sends a custom event to the other stores */
    this.send = (event) => {
      if (this.debug("send", { event }), this.status !== _UniversalStore.Status.READY)
        throw new TypeError(
          import_ts_dedent3.dedent`Cannot send event before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
            {
              event,
              id: this.id,
              actor: this.actor,
              environment: this.environment
            },
            null,
            2
          )}`
        );
      this.emitToListeners(event, { actor: this.actor }), this.emitToChannel(event, { actor: this.actor });
    };
    if (this.debugging = options.debug ?? !1, !_UniversalStore.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (_UniversalStore.isInternalConstructing = !1, this.id = options.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.actorType = options.leader ? _UniversalStore.ActorType.LEADER : _UniversalStore.ActorType.FOLLOWER, this.state = options.initialState, this.channelEventName = `${CHANNEL_EVENT_PREFIX}${this.id}`, this.debug("constructor", {
      options,
      environmentOverrides,
      channelEventName: this.channelEventName
    }), this.actor.type === _UniversalStore.ActorType.LEADER)
      this.syncing = {
        state: ProgressState.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let syncingResolve, syncingReject, syncingPromise = new Promise((resolve4, reject) => {
        syncingResolve = () => {
          this.syncing.state === ProgressState.PENDING && (this.syncing.state = ProgressState.RESOLVED, resolve4());
        }, syncingReject = (reason) => {
          this.syncing.state === ProgressState.PENDING && (this.syncing.state = ProgressState.REJECTED, reject(reason));
        };
      });
      this.syncing = {
        state: ProgressState.PENDING,
        promise: syncingPromise,
        resolve: syncingResolve,
        reject: syncingReject
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange = this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(this), this.debug = this.debug.bind(this), this.channel = environmentOverrides?.channel ?? _UniversalStore.preparation.channel, this.environment = environmentOverrides?.environment ?? _UniversalStore.preparation.environment, this.channel && this.environment ? (_UniversalStore.preparation.resolve({ channel: this.channel, environment: this.environment }), this.prepareThis({ channel: this.channel, environment: this.environment })) : _UniversalStore.preparation.promise.then(this.prepareThis);
  }
  static {
    /**
     * Defines the possible actor types in the store system
     *
     * @readonly
     */
    this.ActorType = {
      LEADER: "LEADER",
      FOLLOWER: "FOLLOWER"
    };
  }
  static {
    /**
     * Defines the possible environments the store can run in
     *
     * @readonly
     */
    this.Environment = {
      SERVER: "SERVER",
      MANAGER: "MANAGER",
      PREVIEW: "PREVIEW",
      UNKNOWN: "UNKNOWN",
      MOCK: "MOCK"
    };
  }
  static {
    /**
     * Internal event types used for store synchronization
     *
     * @readonly
     */
    this.InternalEventType = {
      EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
      EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
      SET_STATE: "__SET_STATE",
      LEADER_CREATED: "__LEADER_CREATED",
      FOLLOWER_CREATED: "__FOLLOWER_CREATED"
    };
  }
  static {
    this.Status = {
      UNPREPARED: "UNPREPARED",
      SYNCING: "SYNCING",
      READY: "READY",
      ERROR: "ERROR"
    };
  }
  static {
    // This is used to check if constructor was called from the static factory create()
    this.isInternalConstructing = !1;
  }
  static {
    _UniversalStore.setupPreparationPromise();
  }
  static setupPreparationPromise() {
    let resolveRef, rejectRef, promise = new Promise(
      (resolve4, reject) => {
        resolveRef = (args) => {
          resolve4(args);
        }, rejectRef = (...args) => {
          reject(args);
        };
      }
    );
    _UniversalStore.preparation = {
      resolve: resolveRef,
      reject: rejectRef,
      promise
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? _UniversalStore.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return _UniversalStore.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case ProgressState.PENDING:
      case void 0:
        return _UniversalStore.Status.SYNCING;
      case ProgressState.REJECTED:
        return _UniversalStore.Status.ERROR;
      case ProgressState.RESOLVED:
      default:
        return _UniversalStore.Status.READY;
    }
  }
  /**
   * A promise that resolves when the store is fully ready. A leader will be ready when the store
   * has been prepared by Storybook, which is almost instantly.
   *
   * A follower will be ready when the state has been synced with the leader's state, within a few
   * hundred milliseconds.
   */
  untilReady() {
    return Promise.all([_UniversalStore.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(options) {
    if (!options || typeof options?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    options.debug && console.debug(
      import_ts_dedent3.dedent`[UniversalStore]
        create`,
      { options }
    );
    let existing = instances.get(options.id);
    if (existing)
      return console.warn(import_ts_dedent3.dedent`UniversalStore with id "${options.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), existing;
    _UniversalStore.isInternalConstructing = !0;
    let store = new _UniversalStore(options);
    return instances.set(options.id, store), store;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(channel, environment) {
    _UniversalStore.preparation.channel = channel, _UniversalStore.preparation.environment = environment, _UniversalStore.preparation.resolve({ channel, environment });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(updater) {
    let previousState = this.state, newState = typeof updater == "function" ? updater(previousState) : updater;
    if (this.debug("setState", { newState, previousState, updater }), this.status !== _UniversalStore.Status.READY)
      throw new TypeError(
        import_ts_dedent3.dedent`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = newState;
    let event = {
      type: _UniversalStore.InternalEventType.SET_STATE,
      payload: {
        state: newState,
        previousState
      }
    };
    this.emitToChannel(event, { actor: this.actor }), this.emitToListeners(event, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(listener) {
    return this.debug("onStateChange", { listener }), this.subscribe(
      _UniversalStore.InternalEventType.SET_STATE,
      ({ payload }, eventInfo) => {
        listener(payload.state, payload.previousState, eventInfo);
      }
    );
  }
  emitToChannel(event, eventInfo) {
    this.debug("emitToChannel", { event, eventInfo, channel: !!this.channel }), this.channel?.emit(this.channelEventName, {
      event,
      eventInfo
    });
  }
  prepareThis({
    channel,
    environment
  }) {
    this.channel = channel, this.environment = environment, this.debug("prepared", { channel: !!channel, environment }), this.channel.on(this.channelEventName, this.handleChannelEvents), this.actor.type === _UniversalStore.ActorType.LEADER ? this.emitToChannel(
      { type: _UniversalStore.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: _UniversalStore.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: _UniversalStore.InternalEventType.EXISTING_STATE_REQUEST },
      { actor: this.actor }
    ), setTimeout(() => {
      this.syncing.reject(
        new TypeError(
          `No existing state found for follower with id: '${this.id}'. Make sure a leader with the same id exists before creating a follower.`
        )
      );
    }, 1e3));
  }
  emitToListeners(event, eventInfo) {
    let eventTypeListeners = this.listeners.get(event.type), everythingListeners = this.listeners.get("*");
    this.debug("emitToListeners", {
      event,
      eventInfo,
      eventTypeListeners,
      everythingListeners
    }), [...eventTypeListeners ?? [], ...everythingListeners ?? []].forEach(
      (listener) => listener(event, eventInfo)
    );
  }
  handleChannelEvents(channelEvent) {
    let { event, eventInfo } = channelEvent;
    if ([eventInfo.actor.id, eventInfo.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent });
      return;
    } else if (this.syncing?.state === ProgressState.PENDING && event.type !== _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent }), this.actor.type === _UniversalStore.ActorType.LEADER) {
      let shouldForwardEvent = !0;
      switch (event.type) {
        case _UniversalStore.InternalEventType.EXISTING_STATE_REQUEST:
          shouldForwardEvent = !1;
          let responseEvent = {
            type: _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent
          }), this.emitToChannel(responseEvent, { actor: this.actor }), this.emitToListeners(responseEvent, { actor: this.actor });
          break;
        case _UniversalStore.InternalEventType.LEADER_CREATED:
          shouldForwardEvent = !1, this.syncing.state = ProgressState.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event
          }), console.error(
            import_ts_dedent3.dedent`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(eventInfo.actor, null, 2)}`
          );
          break;
      }
      shouldForwardEvent && (this.debug("handleChannelEvents: forwarding event", { channelEvent }), this.emitToChannel(event, { actor: eventInfo.actor, forwardingActor: this.actor }));
    }
    if (this.actor.type === _UniversalStore.ActorType.FOLLOWER)
      switch (event.type) {
        case _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event
          }), this.syncing?.state !== ProgressState.PENDING)
            break;
          this.syncing.resolve?.();
          let setStateEvent = {
            type: _UniversalStore.InternalEventType.SET_STATE,
            payload: {
              state: event.payload,
              previousState: this.state
            }
          };
          this.state = event.payload, this.emitToListeners(setStateEvent, eventInfo);
          break;
      }
    switch (event.type) {
      case _UniversalStore.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event }), this.state = event.payload.state;
        break;
    }
    this.emitToListeners(event, { actor: eventInfo.actor });
  }
  debug(message, data) {
    this.debugging && console.debug(
      import_ts_dedent3.dedent`[UniversalStore::${this.id}::${this.environment ?? _UniversalStore.Environment.UNKNOWN}]
        ${message}`,
      JSON.stringify(
        {
          data,
          actor: this.actor,
          state: this.state,
          status: this.status
        },
        null,
        2
      )
    );
  }
  /**
   * Used to reset the static fields of the UniversalStore class when cleaning up tests
   *
   * @internal
   */
  static __reset() {
    _UniversalStore.preparation.reject(new Error("reset")), _UniversalStore.setupPreparationPromise(), _UniversalStore.isInternalConstructing = !1;
  }
};

// src/core-server/utils/get-server-channel.ts
var ServerChannelTransport = class {
  constructor(server) {
    this.socket = new WebSocketServer({ noServer: !0 }), server.on("upgrade", (request, socket, head) => {
      request.url === "/storybook-server-channel" && this.socket.handleUpgrade(request, socket, head, (ws) => {
        this.socket.emit("connection", ws, request);
      });
    }), this.socket.on("connection", (wss) => {
      wss.on("message", (raw) => {
        let data = raw.toString(), event = typeof data == "string" && (0, import_telejson.isJSON)(data) ? (0, import_telejson.parse)(data, {}) : data;
        this.handler?.(event);
      });
    });
    let interval = setInterval(() => {
      this.send({ type: "ping" });
    }, HEARTBEAT_INTERVAL);
    this.socket.on("close", function() {
      clearInterval(interval);
    }), process.on("SIGTERM", () => {
      this.socket.clients.forEach((client) => {
        client.readyState === WebSocket.OPEN && client.close(1001, "Server is shutting down");
      }), this.socket.close(() => process.exit(0));
    });
  }
  setHandler(handler) {
    this.handler = handler;
  }
  send(event) {
    let data = (0, import_telejson.stringify)(event, { maxDepth: 15 });
    Array.from(this.socket.clients).filter((c) => c.readyState === WebSocket.OPEN).forEach((client) => client.send(data));
  }
};
function getServerChannel(server) {
  let transports = [new ServerChannelTransport(server)], channel = new Channel({ transports, async: !0 });
  return UniversalStore.__prepare(channel, UniversalStore.Environment.SERVER), channel;
}

// src/core-server/utils/getAccessControlMiddleware.ts
function getAccessControlMiddleware(crossOriginIsolated) {
  return (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"), res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"), crossOriginIsolated && (res.setHeader("Cross-Origin-Opener-Policy", "same-origin"), res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")), next();
  };
}

// src/core-server/utils/getStoryIndexGenerator.ts
import { normalizeStories as normalizeStories2 } from "storybook/internal/common";
async function getStoryIndexGenerator(app, options, serverChannel) {
  let workingDir = process.cwd(), configDir = options.configDir, directories = {
    configDir,
    workingDir
  }, stories = options.presets.apply("stories"), indexers = options.presets.apply("experimental_indexers", []), docsOptions = options.presets.apply("docs"), normalizedStories = normalizeStories2(await stories, directories), generator = new StoryIndexGenerator(normalizedStories, {
    ...directories,
    indexers: await indexers,
    docs: await docsOptions,
    workingDir
  }), initializedStoryIndexGenerator = generator.initialize().then(() => generator);
  return useStoriesJson({
    app,
    initializedStoryIndexGenerator,
    normalizedStories,
    serverChannel,
    workingDir,
    configDir
  }), initializedStoryIndexGenerator;
}

// src/core-server/utils/middleware.ts
import { existsSync as existsSync2 } from "node:fs";
var fileExists = (basename4) => [".js", ".mjs", ".cjs"].reduce((found, ext) => {
  let filename = `${basename4}${ext}`;
  return !found && existsSync2(filename) ? filename : found;
}, "");
async function getMiddleware(configDir) {
  let middlewarePath = fileExists(resolve(configDir, "middleware"));
  if (middlewarePath) {
    let middlewareModule = await import("file://" + middlewarePath);
    return middlewareModule.default ?? middlewareModule;
  }
  return () => {
  };
}

// src/core-server/utils/open-browser/open-in-browser.ts
var import_ts_dedent4 = __toESM(require_dist(), 1);
import { logger as logger5 } from "storybook/internal/node-logger";
import open2 from "open";

// src/core-server/utils/open-browser/opener.ts
var import_cross_spawn = __toESM(require_cross_spawn(), 1), import_picocolors5 = __toESM(require_picocolors(), 1);
import { execSync } from "node:child_process";
import { join as join6 } from "node:path";
import open from "open";
var OSX_CHROME = "google chrome", Actions = Object.freeze({
  NONE: 0,
  BROWSER: 1,
  SCRIPT: 2
});
function getBrowserEnv() {
  let value = process.env.BROWSER, args = process.env.BROWSER_ARGS ? process.env.BROWSER_ARGS.split(" ") : [], action;
  return value ? value.toLowerCase().endsWith(".js") ? action = Actions.SCRIPT : value.toLowerCase() === "none" ? action = Actions.NONE : action = Actions.BROWSER : action = Actions.BROWSER, { action, value, args };
}
function executeNodeScript(scriptPath, url) {
  let extraArgs = process.argv.slice(2);
  return (0, import_cross_spawn.default)(process.execPath, [scriptPath, ...extraArgs, url], {
    stdio: "inherit"
  }).on("close", (code) => {
    if (code !== 0) {
      console.log(), console.log(import_picocolors5.default.red("The script specified as BROWSER environment variable failed.")), console.log(`${import_picocolors5.default.cyan(scriptPath)} exited with code ${code}.`), console.log();
      return;
    }
  }), !0;
}
function startBrowserProcess(browser, url, args) {
  if (process.platform === "darwin" && (typeof browser != "string" || browser === OSX_CHROME)) {
    let supportedChromiumBrowsers = [
      "Google Chrome Canary",
      "Google Chrome Dev",
      "Google Chrome Beta",
      "Google Chrome",
      "Microsoft Edge",
      "Brave Browser",
      "Vivaldi",
      "Chromium"
    ];
    for (let chromiumBrowser of supportedChromiumBrowsers)
      try {
        execSync(`ps cax | grep "${chromiumBrowser}"`);
        let command = `osascript "${join6(
          resolvePackageDir("storybook"),
          "assets",
          "server",
          "openBrowser.applescript"
        )}" "`.concat(encodeURI(url), '" "').concat(
          process.env.OPEN_MATCH_HOST_ONLY === "true" ? encodeURI(new URL(url).origin) : encodeURI(url),
          '" "'
        ).concat(chromiumBrowser, '"');
        return execSync(command, {
          cwd: __dirname
        }), !0;
      } catch {
      }
  }
  process.platform === "darwin" && browser === "open" && (browser = void 0), typeof browser == "string" && args.length > 0 && (browser = [browser].concat(args));
  try {
    return open(url, { app: browser, wait: !1, url: !0 }).catch(() => {
    }), !0;
  } catch {
    return !1;
  }
}
function openBrowser(url) {
  let { action, value, args } = getBrowserEnv();
  switch (action) {
    case Actions.NONE:
      return !1;
    case Actions.SCRIPT: {
      if (!value)
        throw new Error("BROWSER environment variable is not set.");
      return executeNodeScript(value, url);
    }
    case Actions.BROWSER:
      return startBrowserProcess(value, url, args);
    default:
      throw new Error("Not implemented.");
  }
}

// src/core-server/utils/open-browser/open-in-browser.ts
async function openInBrowser(address) {
  let errorOccured = !1;
  try {
    await openBrowser(address);
  } catch {
    errorOccured = !0;
  }
  try {
    errorOccured && (await open2(address), errorOccured = !1);
  } catch {
    errorOccured = !0;
  }
  errorOccured && logger5.error(import_ts_dedent4.dedent`
        Could not open ${address} inside a browser. If you're running this command inside a
        docker container or on a CI, you need to pass the '--ci' flag to prevent opening a
        browser by default.
      `);
}

// src/core-server/utils/server-address.ts
var import_detect_port = __toESM(require_detect_port2(), 1);
import os from "node:os";
import { logger as logger6 } from "storybook/internal/node-logger";
function getServerAddresses(port, host, proto, initialPath) {
  let address = new URL(`${proto}://localhost:${port}/`), networkAddress = new URL(`${proto}://${host || getLocalIp()}:${port}/`);
  if (initialPath) {
    let searchParams = `?path=${decodeURIComponent(
      initialPath.startsWith("/") ? initialPath : `/${initialPath}`
    )}`;
    address.search = searchParams, networkAddress.search = searchParams;
  }
  return {
    address: address.href,
    networkAddress: networkAddress.href
  };
}
var getServerPort = (port, { exactPort } = {}) => (0, import_detect_port.default)(port).then((freePort) => (freePort !== port && exactPort && process.exit(-1), freePort)).catch((error) => {
  logger6.error(error), process.exit(-1);
}), getServerChannelUrl = (port, { https: https2 }) => `${https2 ? "wss" : "ws"}://localhost:${port}/storybook-server-channel`, getLocalIp = () => {
  let allFilteredIps = Object.values(os.networkInterfaces()).flat().filter((ip) => ip && ip.family === "IPv4" && !ip.internal);
  return allFilteredIps.length ? allFilteredIps[0]?.address : "0.0.0.0";
};

// src/core-server/utils/server-init.ts
import { readFile as readFile2 } from "node:fs/promises";
import { logger as logger7 } from "storybook/internal/node-logger";
import http2 from "http";
import https from "https";
async function getServer(options) {
  if (!options.https)
    return http2.createServer();
  options.sslCert || (logger7.error("Error: --ssl-cert is required with --https"), process.exit(-1)), options.sslKey || (logger7.error("Error: --ssl-key is required with --https"), process.exit(-1));
  let sslOptions = {
    ca: await Promise.all((options.sslCa || []).map((ca) => readFile2(ca, { encoding: "utf8" }))),
    cert: await readFile2(options.sslCert, { encoding: "utf8" }),
    key: await readFile2(options.sslKey, { encoding: "utf8" })
  };
  return https.createServer(sslOptions);
}

// src/core-server/dev-server.ts
async function storybookDevServer(options) {
  let [server, core2] = await Promise.all([getServer(options), options.presets.apply("core")]), app = build_default2({ server }), serverChannel = await options.presets.apply(
    "experimental_serverChannel",
    getServerChannel(server)
  ), indexError, initializedStoryIndexGenerator = getStoryIndexGenerator(app, options, serverChannel).catch((err) => {
    indexError = err;
  });
  app.use(build_default({ level: 1 })), typeof options.extendServer == "function" && options.extendServer(server), app.use(getAccessControlMiddleware(core2?.crossOriginIsolated ?? !1)), app.use(getCachingMiddleware()), (await getMiddleware(options.configDir))(app), await options.presets.apply("experimental_devServer", app);
  let { port, host, initialPath } = options;
  invariant(port, "expected options to have a port");
  let proto = options.https ? "https" : "http", { address, networkAddress } = getServerAddresses(port, host, proto, initialPath);
  if (options.networkAddress = networkAddress, !core2?.builder)
    throw new MissingBuilderError2();
  let resolvedPreviewBuilder = typeof core2?.builder == "string" ? core2.builder : core2?.builder?.name, [previewBuilder, managerBuilder] = await Promise.all([
    getPreviewBuilder(resolvedPreviewBuilder),
    getManagerBuilder(),
    useStatics(app, options)
  ]);
  options.debugWebpack && logConfig2("Preview webpack config", await previewBuilder.getConfig(options));
  let managerResult = options.previewOnly ? void 0 : await managerBuilder.start({
    startTime: process.hrtime(),
    options,
    router: app,
    server,
    channel: serverChannel
  }), previewResult = await Promise.resolve();
  options.ignorePreview || (logger8.debug("Starting preview.."), previewResult = await previewBuilder.start({
    startTime: process.hrtime(),
    options,
    router: app,
    server,
    channel: serverChannel
  }).catch(async (e) => {
    throw logger8.error("Failed to build the preview"), process.exitCode = 1, await managerBuilder?.bail().catch(), await previewBuilder?.bail().catch(), e;
  }));
  let listening = new Promise((resolve4, reject) => {
    server.once("error", reject), app.listen({ port, host }, resolve4);
  });
  if (await Promise.all([initializedStoryIndexGenerator, listening]).then(async ([indexGenerator]) => {
    if (indexGenerator && !options.ci && !options.smokeTest && options.open) {
      let url = host ? networkAddress : address;
      openInBrowser(options.previewOnly ? `${url}iframe.html?navigator=true` : url).catch(() => {
      });
    }
  }), indexError)
    throw await managerBuilder?.bail().catch(), await previewBuilder?.bail().catch(), indexError;
  (await options.presets.apply("features"))?.experimentalComponentsManifest && (app.use("/manifests/components.json", async (req, res) => {
    try {
      let componentManifestGenerator = await options.presets.apply(
        "experimental_componentManifestGenerator"
      ), indexGenerator = await initializedStoryIndexGenerator;
      if (componentManifestGenerator && indexGenerator) {
        let manifest = await componentManifestGenerator(
          indexGenerator
        );
        res.setHeader("Content-Type", "application/json"), res.end(JSON.stringify(manifest));
        return;
      }
      res.statusCode = 400, res.end("No component manifest generator configured.");
      return;
    } catch (e) {
      logger8.error(e instanceof Error ? e : String(e)), res.statusCode = 500, res.end(e instanceof Error ? e.toString() : String(e));
      return;
    }
  }), app.get("/manifests/components.html", async (req, res) => {
    try {
      let componentManifestGenerator = await options.presets.apply(
        "experimental_componentManifestGenerator"
      ), indexGenerator = await initializedStoryIndexGenerator;
      if (!componentManifestGenerator || !indexGenerator) {
        res.statusCode = 400, res.setHeader("Content-Type", "text/html; charset=utf-8"), res.end("<pre>No component manifest generator configured.</pre>");
        return;
      }
      let manifest = await componentManifestGenerator(
        indexGenerator
      );
      res.setHeader("Content-Type", "text/html; charset=utf-8"), res.end(renderManifestComponentsPage(manifest));
    } catch (e) {
      res.statusCode = 500, res.setHeader("Content-Type", "text/html; charset=utf-8"), invariant(e instanceof Error), res.end(`<pre>${e.stack}</pre>`);
    }
  })), doTelemetry(app, core2, initializedStoryIndexGenerator, options);
  async function cancelTelemetry() {
    let payload = { eventType: "dev" };
    try {
      let indexAndStats = await (await initializedStoryIndexGenerator)?.getIndexAndStats();
      indexAndStats && Object.assign(payload, {
        storyIndex: summarizeIndex(indexAndStats.storyIndex),
        storyStats: indexAndStats.stats
      });
    } catch {
    }
    await telemetry("canceled", payload, { immediate: !0 }), process.exit(0);
  }
  return core2?.disableTelemetry || (process.on("SIGINT", cancelTelemetry), process.on("SIGTERM", cancelTelemetry)), { previewResult, managerResult, address, networkAddress };
}

// src/core-server/utils/output-startup-information.ts
var import_picocolors7 = __toESM(require_picocolors(), 1), import_pretty_hrtime = __toESM(require_pretty_hrtime(), 1), import_ts_dedent6 = __toESM(require_dist(), 1);
import { CLI_COLORS, logger as logger9 } from "storybook/internal/node-logger";

// src/core-server/utils/update-check.ts
var import_picocolors6 = __toESM(require_picocolors(), 1), import_ts_dedent5 = __toESM(require_dist(), 1);
import { cache } from "storybook/internal/common";
import { colors } from "storybook/internal/node-logger";
import semver from "semver";
var { STORYBOOK_VERSION_BASE = "https://storybook.js.org", CI } = process.env, updateCheck = async (version) => {
  let result, time = Date.now();
  try {
    let fromCache = await cache.get("lastUpdateCheck", { success: !1, time: 0 });
    time - 864e5 > fromCache.time && !CI ? (result = { success: !0, cached: !1, data: await (await Promise.race([
      fetch(`${STORYBOOK_VERSION_BASE}/versions.json?current=${version}`),
      // if fetch is too slow, we won't wait for it
      new Promise((res, rej) => global.setTimeout(rej, 1500))
    ])).json(), time }, await cache.set("lastUpdateCheck", result)) : result = { ...fromCache, cached: !0 };
  } catch (error) {
    result = { success: !1, cached: !1, error, time };
  }
  return result;
};
function createUpdateMessage(updateInfo, version) {
  let updateMessage;
  try {
    let upgradeCommand = `npx storybook@${semver.prerelease(updateInfo.data.latest.version) ? "next" : "latest"} upgrade`;
    updateMessage = updateInfo.success && semver.lt(version, updateInfo.data.latest.version) ? import_ts_dedent5.dedent`
          ${colors.orange(
      `A new version (${import_picocolors6.default.bold(updateInfo.data.latest.version)}) is available!`
    )}

          ${import_picocolors6.default.gray("Upgrade now:")} ${colors.green(upgradeCommand)}

          ${import_picocolors6.default.gray("Read full changelog:")} ${import_picocolors6.default.gray(
      import_picocolors6.default.underline("https://github.com/storybookjs/storybook/blob/main/CHANGELOG.md")
    )}
        ` : "";
  } catch {
    updateMessage = "";
  }
  return updateMessage;
}

// src/core-server/utils/output-startup-information.ts
function outputStartupInformation(options) {
  let { updateInfo, version, name, address, networkAddress, managerTotalTime, previewTotalTime } = options, updateMessage = createUpdateMessage(updateInfo, version), serverMessages = [
    `- Local:             ${address}`,
    `- On your network:   ${networkAddress}`
  ];
  logger9.logBox(
    import_ts_dedent6.dedent`
      Storybook ready!
      
      ${serverMessages.join(`
`)}${updateMessage ? `

${updateMessage}` : ""}
    `,
    {
      formatBorder: CLI_COLORS.storybook,
      contentPadding: 3,
      rounded: !0
    }
  );
  let timeStatement = [
    managerTotalTime && `${import_picocolors7.default.underline((0, import_pretty_hrtime.default)(managerTotalTime))} for manager`,
    previewTotalTime && `${import_picocolors7.default.underline((0, import_pretty_hrtime.default)(previewTotalTime))} for preview`
  ].filter(Boolean).join(" and ");
  logger9.info(timeStatement);
}

// src/core-server/utils/warnOnIncompatibleAddons.ts
import { logger as logger11 } from "storybook/internal/node-logger";

// ../lib/cli-storybook/src/doctor/getIncompatibleStorybookPackages.ts
var import_picocolors8 = __toESM(require_picocolors(), 1);
import { versions as storybookCorePackages } from "storybook/internal/common";
import { logger as logger10 } from "storybook/internal/node-logger";
import semver2 from "semver";

// ../lib/cli-storybook/src/automigrate/helpers/consolidated-packages.ts
var consolidatedPackages = {
  "@storybook/channels": "storybook/internal/channels",
  "@storybook/client-logger": "storybook/internal/client-logger",
  "@storybook/core-common": "storybook/internal/common",
  "@storybook/core-events": "storybook/internal/core-events",
  "@storybook/csf": "storybook/internal/csf",
  "@storybook/csf-tools": "storybook/internal/csf-tools",
  "@storybook/docs-tools": "storybook/internal/docs-tools",
  "@storybook/node-logger": "storybook/internal/node-logger",
  "@storybook/preview-api": "storybook/preview-api",
  "@storybook/router": "storybook/internal/router",
  "@storybook/telemetry": "storybook/internal/telemetry",
  "@storybook/theming": "storybook/theming",
  "@storybook/types": "storybook/internal/types",
  "@storybook/manager-api": "storybook/manager-api",
  "@storybook/manager": "storybook/internal/manager",
  "@storybook/preview": "storybook/internal/preview",
  "@storybook/core-server": "storybook/internal/core-server",
  "@storybook/builder-manager": "storybook/internal/builder-manager",
  "@storybook/components": "storybook/internal/components",
  "@storybook/test": "storybook/test",
  "@storybook/experimental-nextjs-vite": "@storybook/nextjs-vite",
  "@storybook/instrumenter": "storybook/internal/instrumenter",
  "@storybook/blocks": "@storybook/addon-docs/blocks"
};

// ../lib/cli-storybook/src/doctor/getIncompatibleStorybookPackages.ts
var checkPackageCompatibility = async (dependency, context) => {
  let { currentStorybookVersion, skipErrors, packageManager } = context;
  try {
    let dependencyPackageJson = await packageManager.getModulePackageJSON(dependency);
    if (dependencyPackageJson === null)
      return { packageName: dependency };
    let {
      version: packageVersion,
      name = dependency,
      dependencies,
      peerDependencies,
      homepage
    } = dependencyPackageJson, packageStorybookVersion = Object.entries({
      ...dependencies,
      ...peerDependencies
    }).filter(
      ([dep]) => storybookCorePackages[dep] || consolidatedPackages[dep]
    ).map(([_, versionRange]) => versionRange).find((versionRange) => versionRange && // We can't check compatibility for 0.x packages, so we skip them
    !/^[~^]?0\./.test(versionRange) && semver2.validRange(versionRange) && !semver2.satisfies(currentStorybookVersion, versionRange)), isCorePackage = storybookCorePackages[name], availableUpdate, availableCoreUpdate;
    return isCorePackage && packageVersion && semver2.gt(currentStorybookVersion, packageVersion) && (availableUpdate = currentStorybookVersion), isCorePackage && packageVersion && semver2.gt(packageVersion, currentStorybookVersion) && (availableCoreUpdate = packageVersion), {
      packageName: name,
      packageVersion,
      homepage,
      hasIncompatibleDependencies: packageStorybookVersion != null,
      packageStorybookVersion,
      availableUpdate,
      availableCoreUpdate
    };
  } catch (err) {
    return skipErrors || logger10.log(
      `Error checking compatibility for ${dependency}, please report an issue:
` + String(err)
    ), { packageName: dependency };
  }
}, getIncompatibleStorybookPackages = async (context) => {
  if (context.currentStorybookVersion.includes("0.0.0"))
    return [];
  let allDeps = context.packageManager.getAllDependencies(), storybookLikeDeps = Object.keys(allDeps).filter((dep) => dep.includes("storybook"));
  if (storybookLikeDeps.length === 0 && !context.skipErrors)
    throw new Error("No Storybook dependencies found in the package.json");
  return Promise.all(
    storybookLikeDeps.filter((dep) => !storybookCorePackages[dep]).map((dep) => checkPackageCompatibility(dep, context))
  );
}, getIncompatiblePackagesSummary = (dependencyAnalysis, currentStorybookVersion) => {
  let summaryMessage = [], incompatiblePackages = dependencyAnalysis.filter(
    (dep) => dep.hasIncompatibleDependencies
  );
  return incompatiblePackages.length > 0 && (summaryMessage.push(
    `You are currently using Storybook ${import_picocolors8.default.bold(
      currentStorybookVersion
    )} but you have packages which are incompatible with it:
`
  ), incompatiblePackages.forEach(
    ({
      packageName: addonName,
      packageVersion: addonVersion,
      homepage,
      availableUpdate,
      packageStorybookVersion
    }) => {
      let packageDescription = `${addonName}@${addonVersion}`, updateMessage = availableUpdate ? ` (${availableUpdate} available!)` : "", dependsOnStorybook = packageStorybookVersion != null ? ` which depends on ${packageStorybookVersion}` : "", packageRepo = homepage ? `
 Repo: ${homepage}` : "";
      summaryMessage.push(
        `- ${packageDescription}${updateMessage}${dependsOnStorybook}${packageRepo}`
      );
    }
  ), summaryMessage.push(
    `
Please consider updating your packages or contacting the maintainers for compatibility details.`,
    `
For more details on compatibility guidance, see:`,
    "https://github.com/storybookjs/storybook/issues/32836"
  ), incompatiblePackages.some((dep) => dep.availableCoreUpdate) && summaryMessage.push(
    `
`,
    `The version of ${import_picocolors8.default.blue(`storybook@${currentStorybookVersion}`)} is behind the following core packages:`,
    `${incompatiblePackages.filter((dep) => dep.availableCoreUpdate).map(
      ({ packageName, packageVersion }) => `- ${import_picocolors8.default.blue(`${packageName}@${packageVersion}`)}`
    ).join(`
`)}`,
    `
`,
    "Upgrade Storybook with:",
    import_picocolors8.default.blue("npx storybook@latest upgrade")
  )), summaryMessage.join(`
`);
};

// src/core-server/utils/warnOnIncompatibleAddons.ts
var warnOnIncompatibleAddons = async (currentStorybookVersion, packageManager) => {
  let incompatiblePackagesList = await getIncompatibleStorybookPackages({
    skipUpgradeCheck: !0,
    skipErrors: !0,
    currentStorybookVersion,
    packageManager
  }), incompatiblePackagesMessage = getIncompatiblePackagesSummary(
    incompatiblePackagesList,
    currentStorybookVersion
  );
  incompatiblePackagesMessage && logger11.warn(incompatiblePackagesMessage);
};

// src/core-server/utils/warnWhenUsingArgTypesRegex.ts
var import_picocolors9 = __toESM(require_picocolors(), 1), import_ts_dedent7 = __toESM(require_dist(), 1);
import { readFile as readFile3 } from "node:fs/promises";
import { core } from "storybook/internal/babel";
import { babelParse } from "storybook/internal/csf-tools";
async function warnWhenUsingArgTypesRegex(previewConfigPath, config) {
  let previewContent = previewConfigPath ? await readFile3(previewConfigPath, { encoding: "utf8" }) : "";
  (config?.addons?.some(
    (it) => typeof it == "string" ? it === "@chromatic-com/storybook" : it.name === "@chromatic-com/storybook"
  ) ?? !1) && previewConfigPath && previewContent.includes("argTypesRegex") && new core.File(
    { filename: previewConfigPath },
    { code: previewContent, ast: babelParse(previewContent) }
  ).path.traverse({
    Identifier: (path2) => {
      if (path2.node.name === "argTypesRegex") {
        let message = import_ts_dedent7.dedent`
            ${import_picocolors9.default.bold("Attention")}: We've detected that you're using ${import_picocolors9.default.cyan(
          "actions.argTypesRegex"
        )} together with the visual test addon:
            
            ${path2.buildCodeFrameError(previewConfigPath).message}
            
            We recommend removing the ${import_picocolors9.default.cyan(
          "argTypesRegex"
        )} and assigning explicit action with the ${import_picocolors9.default.cyan(
          "fn"
        )} function from ${import_picocolors9.default.cyan("storybook/test")} instead:
            https://storybook.js.org/docs/essentials/actions#via-storybooktest-fn-spy-function
            
            The build used by the addon for snapshot testing doesn't take the regex into account, which can cause hard to debug problems when a snapshot depends on the presence of action props.
          `;
        console.warn(message);
      }
    }
  });
}

// src/core-server/build-dev.ts
async function buildDevStandalone(options) {
  let { packageJson, versionUpdates } = options, { storybookVersion, previewConfigPath } = options, configDir = resolve(options.configDir);
  packageJson ? (invariant(
    packageJson.version !== void 0,
    `Expected package.json#version to be defined in the "${packageJson.name}" package}`
  ), storybookVersion = packageJson.version, previewConfigPath = getConfigInfo(configDir).previewConfigPath ?? void 0) : storybookVersion || (storybookVersion = versions.storybook);
  let [port, versionCheck] = await Promise.all([
    getServerPort(options.port, { exactPort: options.exactPort }),
    versionUpdates ? updateCheck(storybookVersion) : Promise.resolve({ success: !1, cached: !1, data: {}, time: Date.now() })
  ]);
  !options.ci && !options.smokeTest && options.port != null && port !== options.port && (await prompt.confirm({
    message: import_ts_dedent8.dedent`
        Port ${options.port} is not available. 
        Would you like to run Storybook on port ${port} instead?
      `,
    initialValue: !0
  }) || process.exit(1));
  let cacheKey = oneWayHash(relative(getProjectRoot2(), configDir)), cacheOutputDir = resolvePathInStorybookCache("public", cacheKey), outputDir = resolve(options.outputDir || cacheOutputDir);
  options.smokeTest && (outputDir = cacheOutputDir), options.port = port, options.versionCheck = versionCheck, options.configType = "DEVELOPMENT", options.configDir = configDir, options.cacheKey = cacheKey, options.outputDir = outputDir, options.serverChannelUrl = getServerChannelUrl(port, options), options.pnp = await detectPnp(), options.pnp && deprecate(import_ts_dedent8.dedent`
      As of Storybook 10.0, PnP is deprecated.
      If you are using PnP, you can continue to use Storybook 10.0, but we recommend migrating to a different package manager or linker-mode.

      In future versions, PnP compatibility will be removed.
    `);
  let config = await loadMainConfig2(options), { framework } = config, corePresets = [], frameworkName = typeof framework == "string" ? framework : framework?.name;
  options.ignorePreview || validateFrameworkName(frameworkName), frameworkName && corePresets.push(join(frameworkName, "preset")), frameworkName = frameworkName || "custom";
  let packageManager = JsPackageManagerFactory.getPackageManager({
    configDir: options.configDir
  });
  try {
    await warnOnIncompatibleAddons(storybookVersion, packageManager);
  } catch (e) {
    logger12.warn("Storybook failed to check addon compatibility"), logger12.debug(`${e instanceof Error ? e.stack : String(e)}`);
  }
  try {
    await warnWhenUsingArgTypesRegex(previewConfigPath, config);
  } catch {
  }
  let presets = await loadAllPresets2({
    corePresets,
    overridePresets: [
      import.meta.resolve("storybook/internal/core-server/presets/common-override-preset")
    ],
    ...options,
    isCritical: !0
  }), { renderer, builder, disableTelemetry } = await presets.apply("core", {});
  if (!builder)
    throw new MissingBuilderError3();
  !options.disableTelemetry && !disableTelemetry && versionCheck.success && !versionCheck.cached && telemetry4("version-update");
  let resolvedPreviewBuilder = typeof builder == "string" ? builder : builder.name, [previewBuilder, managerBuilder] = await Promise.all([
    getPreviewBuilder(resolvedPreviewBuilder),
    getManagerBuilder()
  ]);
  if (resolvedPreviewBuilder.includes("builder-vite")) {
    let deprecationMessage = (0, import_ts_dedent8.dedent)(`Using CommonJS in your main configuration file is deprecated with Vite.
              - Refer to the migration guide at https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#commonjs-with-vite-is-deprecated`), mainJsPath = getInterpretedFile(
      resolve(options.configDir || ".storybook", "main")
    );
    /\.c[jt]s$/.test(mainJsPath) && deprecate(deprecationMessage);
    let mainJsContent = await readFile4(mainJsPath, { encoding: "utf8" });
    /\bmodule\.exports\b|\bexports[.[]|\brequire\s*\(|\bObject\.(?:defineProperty|defineProperties|assign)\s*\(\s*exports\b/.test(mainJsContent) && deprecate(deprecationMessage);
  }
  let resolvedRenderer = renderer && resolveAddonName2(options.configDir, renderer, options);
  presets = await loadAllPresets2({
    corePresets: [
      join(resolvePackageDir("storybook"), "dist/core-server/presets/common-preset.js"),
      ...managerBuilder.corePresets || [],
      ...previewBuilder.corePresets || [],
      ...resolvedRenderer ? [resolvedRenderer] : [],
      ...corePresets
    ],
    overridePresets: [
      ...previewBuilder.overridePresets || [],
      import.meta.resolve("storybook/internal/core-server/presets/common-override-preset")
    ],
    ...options
  });
  let features = await presets.apply("features");
  global3.FEATURES = features;
  let fullOptions = {
    ...options,
    presets,
    features
  }, { address, networkAddress, managerResult, previewResult } = await buildOrThrow(
    async () => storybookDevServer(fullOptions)
  ), previewTotalTime = previewResult?.totalTime, managerTotalTime = managerResult?.totalTime, previewStats = previewResult?.stats, managerStats = managerResult?.stats, statsOption = options.webpackStatsJson || options.statsJson;
  if (statsOption) {
    let target = statsOption === !0 ? options.outputDir : statsOption;
    await outputStats(target, previewStats);
  }
  if (options.smokeTest) {
    let warnings = [];
    warnings.push(...managerStats?.toJson()?.warnings || []);
    try {
      warnings.push(...previewStats?.toJson()?.warnings || []);
    } catch (err) {
      if (!(err instanceof NoStatsForViteDevError))
        throw err;
    }
    let problems = warnings.filter((warning) => !warning.message.includes("export 'useInsertionEffect'")).filter((warning) => !warning.message.includes("compilation but it's unused")).filter(
      (warning) => !warning.message.includes("Conflicting values for 'process.env.NODE_ENV'")
    );
    logger12.log(problems.map((p) => p.stack).join(`
`)), process.exit(problems.length > 0 ? 1 : 0);
  } else {
    let name = frameworkName.split("@storybook/").length > 1 ? frameworkName.split("@storybook/")[1] : frameworkName;
    options.quiet || outputStartupInformation({
      updateInfo: versionCheck,
      version: storybookVersion,
      name,
      address,
      networkAddress,
      managerTotalTime,
      previewTotalTime
    });
  }
  return { port, address, networkAddress };
}

// src/core-server/build-index.ts
import { writeFile as writeFile4 } from "node:fs/promises";
import { normalizeStories as normalizeStories3 } from "storybook/internal/common";
import { logger as logger13 } from "storybook/internal/node-logger";

// src/core-server/load.ts
import {
  getProjectRoot as getProjectRoot3,
  loadAllPresets as loadAllPresets3,
  loadMainConfig as loadMainConfig3,
  resolveAddonName as resolveAddonName3,
  validateFrameworkName as validateFrameworkName2
} from "storybook/internal/common";
import { oneWayHash as oneWayHash2 } from "storybook/internal/telemetry";
import { global as global4 } from "@storybook/global";
async function loadStorybook(options) {
  let configDir = resolve(options.configDir), cacheKey = oneWayHash2(relative(getProjectRoot3(), configDir));
  options.configType = "DEVELOPMENT", options.configDir = configDir, options.cacheKey = cacheKey;
  let config = await loadMainConfig3(options), { framework } = config, corePresets = [], frameworkName = typeof framework == "string" ? framework : framework?.name;
  options.ignorePreview || validateFrameworkName2(frameworkName), frameworkName && corePresets.push(join(frameworkName, "preset")), frameworkName = frameworkName || "custom";
  let presets = await loadAllPresets3({
    corePresets,
    overridePresets: [
      import.meta.resolve("storybook/internal/core-server/presets/common-override-preset")
    ],
    ...options,
    isCritical: !0
  }), { renderer, builder } = await presets.apply("core", {}), resolvedRenderer = renderer && resolveAddonName3(options.configDir, renderer, options), builderName = typeof builder == "string" ? builder : builder?.name;
  builderName && corePresets.push(join(dirname(builderName), "preset.js")), presets = await loadAllPresets3({
    corePresets: [
      join(resolvePackageDir("storybook"), "dist/core-server/presets/common-preset.js"),
      ...resolvedRenderer ? [resolvedRenderer] : [],
      ...corePresets
    ],
    overridePresets: [
      import.meta.resolve("storybook/internal/core-server/presets/common-override-preset")
    ],
    ...options
  });
  let features = await presets.apply("features");
  return global4.FEATURES = features, {
    ...options,
    presets,
    features
  };
}

// src/core-server/build-index.ts
var buildIndex = async (options) => {
  let { presets } = await loadStorybook(options), [indexers, stories, docsOptions] = await Promise.all([
    presets.apply("experimental_indexers", []),
    presets.apply("stories", []),
    presets.apply("docs")
  ]), { configDir } = options, workingDir = process.cwd(), directories = {
    configDir,
    workingDir
  }, normalizedStories = normalizeStories3(stories, directories), generator = new StoryIndexGenerator(normalizedStories, {
    ...directories,
    indexers,
    docs: docsOptions,
    build: {}
  });
  return await generator.initialize(), generator.getIndex();
}, buildIndexStandalone = async (options) => {
  let index = await buildIndex(options);
  logger13.info(`Writing index to ${options.outputFile}`), await writeFile4(options.outputFile, JSON.stringify(index));
};

// src/core-server/standalone.ts
async function build(options = {}, frameworkOptions = {}) {
  let { mode = "dev" } = options, { default: packageJson } = await import("storybook/package.json", { with: { type: "json" } }), commonOptions = {
    ...options,
    ...frameworkOptions,
    frameworkPresets: [
      ...options.frameworkPresets || [],
      ...frameworkOptions.frameworkPresets || []
    ],
    packageJson
  };
  if (mode === "dev")
    return buildDevStandalone(commonOptions);
  if (mode === "static")
    return buildStaticStandalone(commonOptions);
  if (mode === "index")
    return buildIndexStandalone(commonOptions);
  throw new Error("'mode' parameter should be either 'dev', 'static', or 'index'");
}
var standalone_default = build;

// src/shared/universal-store/mock.ts
var import_ts_dedent9 = __toESM(require_dist(), 1);
import { Channel as Channel2 } from "storybook/internal/channels";
var MockUniversalStore = class _MockUniversalStore extends UniversalStore {
  constructor(options, testUtils) {
    UniversalStore.isInternalConstructing = !0, super(
      { ...options, leader: !0 },
      { channel: new Channel2({}), environment: UniversalStore.Environment.MOCK }
    ), UniversalStore.isInternalConstructing = !1, typeof testUtils?.fn == "function" && (this.testUtils = testUtils, this.getState = testUtils.fn(this.getState), this.setState = testUtils.fn(this.setState), this.subscribe = testUtils.fn(this.subscribe), this.onStateChange = testUtils.fn(this.onStateChange), this.send = testUtils.fn(this.send));
  }
  /** Create a mock universal store. This is just an alias for the constructor */
  static create(options, testUtils) {
    return new _MockUniversalStore(options, testUtils);
  }
  unsubscribeAll() {
    if (!this.testUtils)
      throw new Error(
        import_ts_dedent9.dedent`Cannot call unsubscribeAll on a store that does not have testUtils.
        Please provide testUtils as the second argument when creating the store.`
      );
    let callReturnedUnsubscribeFn = (result) => {
      try {
        result.value();
      } catch {
      }
    };
    this.subscribe.mock?.results.forEach(callReturnedUnsubscribeFn), this.onStateChange.mock?.results.forEach(callReturnedUnsubscribeFn);
  }
};

// src/manager-errors.ts
var StatusTypeIdMismatchError2 = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "MANAGER_API" /* MANAGER_API */,
      code: 1,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
};

// src/preview-errors.ts
var import_ts_dedent10 = __toESM(require_dist(), 1);
var StatusTypeIdMismatchError3 = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 16,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
};

// src/shared/status-store/index.ts
var UNIVERSAL_STATUS_STORE_OPTIONS = {
  id: "storybook/status",
  leader: !0,
  initialState: {}
}, StatusStoreEventType = {
  SELECT: "select"
};
function createStatusStore({
  universalStatusStore: universalStatusStore2,
  useUniversalStore,
  environment
}) {
  let fullStatusStore2 = {
    getAll() {
      return universalStatusStore2.getState();
    },
    set(statuses) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let status of statuses) {
          let { storyId, typeId } = status;
          newState[storyId] = { ...newState[storyId] ?? {}, [typeId]: status };
        }
        return newState;
      });
    },
    onAllStatusChange(listener) {
      return universalStatusStore2.onStateChange((state, prevState) => {
        listener(state, prevState);
      });
    },
    onSelect(listener) {
      return universalStatusStore2.subscribe(StatusStoreEventType.SELECT, (event) => {
        listener(event.payload);
      });
    },
    selectStatuses: (statuses) => {
      universalStatusStore2.send({ type: StatusStoreEventType.SELECT, payload: statuses });
    },
    unset(storyIds) {
      if (!storyIds) {
        universalStatusStore2.setState({});
        return;
      }
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let storyId of storyIds)
          delete newState[storyId];
        return newState;
      });
    },
    typeId: void 0
  }, getStatusStoreByTypeId2 = (typeId) => ({
    getAll: fullStatusStore2.getAll,
    set(statuses) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let status of statuses) {
          let { storyId } = status;
          if (status.typeId !== typeId)
            switch (environment) {
              case "server":
                throw new StatusTypeIdMismatchError({
                  status,
                  typeId
                });
              case "manager":
                throw new StatusTypeIdMismatchError2({
                  status,
                  typeId
                });
              case "preview":
              default:
                throw new StatusTypeIdMismatchError3({
                  status,
                  typeId
                });
            }
          newState[storyId] = { ...newState[storyId] ?? {}, [typeId]: status };
        }
        return newState;
      });
    },
    onAllStatusChange: fullStatusStore2.onAllStatusChange,
    onSelect(listener) {
      return universalStatusStore2.subscribe(StatusStoreEventType.SELECT, (event) => {
        event.payload.some((status) => status.typeId === typeId) && listener(event.payload);
      });
    },
    unset(storyIds) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let storyId in newState)
          if (newState[storyId]?.[typeId] && (!storyIds || storyIds?.includes(storyId))) {
            let { [typeId]: omittedStatus, ...storyStatusesWithoutTypeId } = newState[storyId];
            newState[storyId] = storyStatusesWithoutTypeId;
          }
        return newState;
      });
    },
    typeId
  });
  return useUniversalStore ? {
    getStatusStoreByTypeId: getStatusStoreByTypeId2,
    fullStatusStore: fullStatusStore2,
    universalStatusStore: universalStatusStore2,
    useStatusStore: (selector) => useUniversalStore(universalStatusStore2, selector)[0]
  } : { getStatusStoreByTypeId: getStatusStoreByTypeId2, fullStatusStore: fullStatusStore2, universalStatusStore: universalStatusStore2 };
}

// src/core-server/stores/status.ts
var statusStore = createStatusStore({
  universalStatusStore: UniversalStore.create({
    ...UNIVERSAL_STATUS_STORE_OPTIONS,
    /*
      This is a temporary workaround, to ensure that the store is not created in the
      vitest sub-process in addon-vitest, even though it imports from core-server
      If it was created in the sub-process, it would try to connect to the leader in the dev server
      before it was ready.
      This will be fixed when we do the planned UniversalStore v0.2.
    */
    leader: !optionalEnvToBoolean(process.env.VITEST_CHILD_PROCESS)
  }),
  environment: "server"
}), { fullStatusStore, getStatusStoreByTypeId, universalStatusStore } = statusStore;

// src/shared/test-provider-store/index.ts
var UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS = {
  id: "storybook/test-provider",
  leader: !0,
  initialState: {}
};
function createTestProviderStore({
  universalTestProviderStore: universalTestProviderStore2,
  useUniversalStore
}) {
  let baseStore = {
    settingsChanged: () => {
      universalTestProviderStore2.untilReady().then(() => {
        universalTestProviderStore2.send({ type: "settings-changed" });
      });
    },
    onRunAll: (listener) => universalTestProviderStore2.subscribe("run-all", listener),
    onClearAll: (listener) => universalTestProviderStore2.subscribe("clear-all", listener)
  }, fullTestProviderStore2 = {
    ...baseStore,
    getFullState: universalTestProviderStore2.getState,
    setFullState: universalTestProviderStore2.setState,
    onSettingsChanged: (listener) => universalTestProviderStore2.subscribe("settings-changed", listener),
    runAll: async () => {
      await universalTestProviderStore2.untilReady(), universalTestProviderStore2.send({ type: "run-all" });
    },
    clearAll: async () => {
      await universalTestProviderStore2.untilReady(), universalTestProviderStore2.send({ type: "clear-all" });
    }
  }, getTestProviderStoreById2 = (testProviderId) => {
    let getStateForTestProvider = () => universalTestProviderStore2.getState()[testProviderId] ?? "test-provider-state:pending", setStateForTestProvider = (state) => {
      universalTestProviderStore2.untilReady().then(() => {
        universalTestProviderStore2.setState((currentState) => ({
          ...currentState,
          [testProviderId]: state
        }));
      });
    };
    return {
      ...baseStore,
      testProviderId,
      getState: getStateForTestProvider,
      setState: setStateForTestProvider,
      runWithState: async (callback) => {
        setStateForTestProvider("test-provider-state:running");
        try {
          await callback(), setStateForTestProvider("test-provider-state:succeeded");
        } catch {
          setStateForTestProvider("test-provider-state:crashed");
        }
      }
    };
  };
  return useUniversalStore ? {
    getTestProviderStoreById: getTestProviderStoreById2,
    fullTestProviderStore: fullTestProviderStore2,
    universalTestProviderStore: universalTestProviderStore2,
    useTestProviderStore: (selector) => useUniversalStore(universalTestProviderStore2, selector)[0]
  } : {
    getTestProviderStoreById: getTestProviderStoreById2,
    fullTestProviderStore: fullTestProviderStore2,
    universalTestProviderStore: universalTestProviderStore2
  };
}

// src/core-server/stores/test-provider.ts
var testProviderStore = createTestProviderStore({
  universalTestProviderStore: UniversalStore.create({
    ...UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS,
    /*
            This is a temporary workaround, to ensure that the store is not created in the
            vitest sub-process in addon-vitest, even though it imports from core-server
            If it was created in the sub-process, it would try to connect to the leader in the dev server
            before it was ready.
            This will be fixed when we do the planned UniversalStore v0.2.
          */
    leader: !optionalEnvToBoolean(process.env.VITEST_CHILD_PROCESS)
  })
}), { fullTestProviderStore, getTestProviderStoreById, universalTestProviderStore } = testProviderStore;
export {
  StoryIndexGenerator,
  standalone_default as build,
  buildDevStandalone,
  buildIndex,
  buildIndexStandalone,
  buildStaticStandalone,
  MockUniversalStore as experimental_MockUniversalStore,
  UniversalStore as experimental_UniversalStore,
  getStatusStoreByTypeId as experimental_getStatusStore,
  getTestProviderStoreById as experimental_getTestProviderStore,
  loadStorybook as experimental_loadStorybook,
  getErrorLevel,
  getPreviewBodyTemplate,
  getPreviewHeadTemplate,
  fullStatusStore as internal_fullStatusStore,
  fullTestProviderStore as internal_fullTestProviderStore,
  universalStatusStore as internal_universalStatusStore,
  universalTestProviderStore as internal_universalTestProviderStore,
  isTelemetryEnabled,
  mapStaticDir,
  sendTelemetryError,
  withTelemetry
};
