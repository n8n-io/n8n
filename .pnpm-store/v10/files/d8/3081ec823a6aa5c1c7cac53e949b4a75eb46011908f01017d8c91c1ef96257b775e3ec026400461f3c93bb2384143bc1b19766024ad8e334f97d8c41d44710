import { createRequire as __prettierCreateRequire } from "module";
import { fileURLToPath as __prettierFileUrlToPath } from "url";
import { dirname as __prettierDirname } from "path";
const require = __prettierCreateRequire(import.meta.url);
const __filename = __prettierFileUrlToPath(import.meta.url);
const __dirname = __prettierDirname(__filename);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// node_modules/dashify/index.js
var require_dashify = __commonJS({
  "node_modules/dashify/index.js"(exports, module) {
    "use strict";
    module.exports = (str, options) => {
      if (typeof str !== "string") throw new TypeError("expected a string");
      return str.trim().replace(/([a-z])([A-Z])/g, "$1-$2").replace(/\W/g, (m) => /[À-ž]/.test(m) ? m : "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, (m) => options && options.condense ? "-" : m).toLowerCase();
    };
  }
});

// node_modules/minimist/index.js
var require_minimist = __commonJS({
  "node_modules/minimist/index.js"(exports, module) {
    "use strict";
    function hasKey(obj, keys2) {
      var o = obj;
      keys2.slice(0, -1).forEach(function(key2) {
        o = o[key2] || {};
      });
      var key = keys2[keys2.length - 1];
      return key in o;
    }
    function isNumber(x) {
      if (typeof x === "number") {
        return true;
      }
      if (/^0x[0-9a-f]+$/i.test(x)) {
        return true;
      }
      return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
    }
    function isConstructorOrProto(obj, key) {
      return key === "constructor" && typeof obj[key] === "function" || key === "__proto__";
    }
    module.exports = function(args, opts) {
      if (!opts) {
        opts = {};
      }
      var flags = {
        bools: {},
        strings: {},
        unknownFn: null
      };
      if (typeof opts.unknown === "function") {
        flags.unknownFn = opts.unknown;
      }
      if (typeof opts.boolean === "boolean" && opts.boolean) {
        flags.allBools = true;
      } else {
        [].concat(opts.boolean).filter(Boolean).forEach(function(key2) {
          flags.bools[key2] = true;
        });
      }
      var aliases = {};
      function aliasIsBoolean(key2) {
        return aliases[key2].some(function(x) {
          return flags.bools[x];
        });
      }
      Object.keys(opts.alias || {}).forEach(function(key2) {
        aliases[key2] = [].concat(opts.alias[key2]);
        aliases[key2].forEach(function(x) {
          aliases[x] = [key2].concat(aliases[key2].filter(function(y) {
            return x !== y;
          }));
        });
      });
      [].concat(opts.string).filter(Boolean).forEach(function(key2) {
        flags.strings[key2] = true;
        if (aliases[key2]) {
          [].concat(aliases[key2]).forEach(function(k) {
            flags.strings[k] = true;
          });
        }
      });
      var defaults = opts.default || {};
      var argv2 = { _: [] };
      function argDefined(key2, arg2) {
        return flags.allBools && /^--[^=]+$/.test(arg2) || flags.strings[key2] || flags.bools[key2] || aliases[key2];
      }
      function setKey(obj, keys2, value2) {
        var o = obj;
        for (var i2 = 0; i2 < keys2.length - 1; i2++) {
          var key2 = keys2[i2];
          if (isConstructorOrProto(o, key2)) {
            return;
          }
          if (o[key2] === void 0) {
            o[key2] = {};
          }
          if (o[key2] === Object.prototype || o[key2] === Number.prototype || o[key2] === String.prototype) {
            o[key2] = {};
          }
          if (o[key2] === Array.prototype) {
            o[key2] = [];
          }
          o = o[key2];
        }
        var lastKey = keys2[keys2.length - 1];
        if (isConstructorOrProto(o, lastKey)) {
          return;
        }
        if (o === Object.prototype || o === Number.prototype || o === String.prototype) {
          o = {};
        }
        if (o === Array.prototype) {
          o = [];
        }
        if (o[lastKey] === void 0 || flags.bools[lastKey] || typeof o[lastKey] === "boolean") {
          o[lastKey] = value2;
        } else if (Array.isArray(o[lastKey])) {
          o[lastKey].push(value2);
        } else {
          o[lastKey] = [o[lastKey], value2];
        }
      }
      function setArg(key2, val, arg2) {
        if (arg2 && flags.unknownFn && !argDefined(key2, arg2)) {
          if (flags.unknownFn(arg2) === false) {
            return;
          }
        }
        var value2 = !flags.strings[key2] && isNumber(val) ? Number(val) : val;
        setKey(argv2, key2.split("."), value2);
        (aliases[key2] || []).forEach(function(x) {
          setKey(argv2, x.split("."), value2);
        });
      }
      Object.keys(flags.bools).forEach(function(key2) {
        setArg(key2, defaults[key2] === void 0 ? false : defaults[key2]);
      });
      var notFlags = [];
      if (args.indexOf("--") !== -1) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
      }
      for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        var key;
        var next;
        if (/^--.+=/.test(arg)) {
          var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
          key = m[1];
          var value = m[2];
          if (flags.bools[key]) {
            value = value !== "false";
          }
          setArg(key, value, arg);
        } else if (/^--no-.+/.test(arg)) {
          key = arg.match(/^--no-(.+)/)[1];
          setArg(key, false, arg);
        } else if (/^--.+/.test(arg)) {
          key = arg.match(/^--(.+)/)[1];
          next = args[i + 1];
          if (next !== void 0 && !/^(-|--)[^-]/.test(next) && !flags.bools[key] && !flags.allBools && (aliases[key] ? !aliasIsBoolean(key) : true)) {
            setArg(key, next, arg);
            i += 1;
          } else if (/^(true|false)$/.test(next)) {
            setArg(key, next === "true", arg);
            i += 1;
          } else {
            setArg(key, flags.strings[key] ? "" : true, arg);
          }
        } else if (/^-[^-]+/.test(arg)) {
          var letters = arg.slice(1, -1).split("");
          var broken = false;
          for (var j = 0; j < letters.length; j++) {
            next = arg.slice(j + 2);
            if (next === "-") {
              setArg(letters[j], next, arg);
              continue;
            }
            if (/[A-Za-z]/.test(letters[j]) && next[0] === "=") {
              setArg(letters[j], next.slice(1), arg);
              broken = true;
              break;
            }
            if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
              setArg(letters[j], next, arg);
              broken = true;
              break;
            }
            if (letters[j + 1] && letters[j + 1].match(/\W/)) {
              setArg(letters[j], arg.slice(j + 2), arg);
              broken = true;
              break;
            } else {
              setArg(letters[j], flags.strings[letters[j]] ? "" : true, arg);
            }
          }
          key = arg.slice(-1)[0];
          if (!broken && key !== "-") {
            if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !flags.bools[key] && (aliases[key] ? !aliasIsBoolean(key) : true)) {
              setArg(key, args[i + 1], arg);
              i += 1;
            } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
              setArg(key, args[i + 1] === "true", arg);
              i += 1;
            } else {
              setArg(key, flags.strings[key] ? "" : true, arg);
            }
          }
        } else {
          if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
            argv2._.push(flags.strings._ || !isNumber(arg) ? arg : Number(arg));
          }
          if (opts.stopEarly) {
            argv2._.push.apply(argv2._, args.slice(i + 1));
            break;
          }
        }
      }
      Object.keys(defaults).forEach(function(k) {
        if (!hasKey(argv2, k.split("."))) {
          setKey(argv2, k.split("."), defaults[k]);
          (aliases[k] || []).forEach(function(x) {
            setKey(argv2, x.split("."), defaults[k]);
          });
        }
      });
      if (opts["--"]) {
        argv2["--"] = notFlags.slice();
      } else {
        notFlags.forEach(function(k) {
          argv2._.push(k);
        });
      }
      return argv2;
    };
  }
});

// node_modules/fast-json-stable-stringify/index.js
var require_fast_json_stable_stringify = __commonJS({
  "node_modules/fast-json-stable-stringify/index.js"(exports, module) {
    "use strict";
    module.exports = function(data, opts) {
      if (!opts) opts = {};
      if (typeof opts === "function") opts = { cmp: opts };
      var cycles = typeof opts.cycles === "boolean" ? opts.cycles : false;
      var cmp = opts.cmp && /* @__PURE__ */ function(f) {
        return function(node) {
          return function(a, b) {
            var aobj = { key: a, value: node[a] };
            var bobj = { key: b, value: node[b] };
            return f(aobj, bobj);
          };
        };
      }(opts.cmp);
      var seen = [];
      return function stringify5(node) {
        if (node && node.toJSON && typeof node.toJSON === "function") {
          node = node.toJSON();
        }
        if (node === void 0) return;
        if (typeof node == "number") return isFinite(node) ? "" + node : "null";
        if (typeof node !== "object") return JSON.stringify(node);
        var i, out;
        if (Array.isArray(node)) {
          out = "[";
          for (i = 0; i < node.length; i++) {
            if (i) out += ",";
            out += stringify5(node[i]) || "null";
          }
          return out + "]";
        }
        if (node === null) return "null";
        if (seen.indexOf(node) !== -1) {
          if (cycles) return JSON.stringify("__cycle__");
          throw new TypeError("Converting circular structure to JSON");
        }
        var seenIndex = seen.push(node) - 1;
        var keys2 = Object.keys(node).sort(cmp && cmp(node));
        out = "";
        for (i = 0; i < keys2.length; i++) {
          var key = keys2[i];
          var value = stringify5(node[key]);
          if (!value) continue;
          if (out) out += ",";
          out += JSON.stringify(key) + ":" + value;
        }
        seen.splice(seenIndex, 1);
        return "{" + out + "}";
      }(data);
    };
  }
});

// node_modules/common-path-prefix/index.js
var require_common_path_prefix = __commonJS({
  "node_modules/common-path-prefix/index.js"(exports, module) {
    "use strict";
    var { sep: DEFAULT_SEPARATOR } = __require("path");
    var determineSeparator = (paths) => {
      for (const path13 of paths) {
        const match = /(\/|\\)/.exec(path13);
        if (match !== null) return match[0];
      }
      return DEFAULT_SEPARATOR;
    };
    module.exports = function commonPathPrefix2(paths, sep = determineSeparator(paths)) {
      const [first = "", ...remaining] = paths;
      if (first === "" || remaining.length === 0) return "";
      const parts = first.split(sep);
      let endOfPrefix = parts.length;
      for (const path13 of remaining) {
        const compare = path13.split(sep);
        for (let i = 0; i < endOfPrefix; i++) {
          if (compare[i] !== parts[i]) {
            endOfPrefix = i;
          }
        }
        if (endOfPrefix === 0) return "";
      }
      const prefix = parts.slice(0, endOfPrefix).join(sep);
      return prefix.endsWith(sep) ? prefix : prefix + sep;
    };
  }
});

// node_modules/ci-info/vendors.json
var require_vendors = __commonJS({
  "node_modules/ci-info/vendors.json"(exports, module) {
    module.exports = [
      {
        name: "Agola CI",
        constant: "AGOLA",
        env: "AGOLA_GIT_REF",
        pr: "AGOLA_PULL_REQUEST_ID"
      },
      {
        name: "Appcircle",
        constant: "APPCIRCLE",
        env: "AC_APPCIRCLE",
        pr: {
          env: "AC_GIT_PR",
          ne: "false"
        }
      },
      {
        name: "AppVeyor",
        constant: "APPVEYOR",
        env: "APPVEYOR",
        pr: "APPVEYOR_PULL_REQUEST_NUMBER"
      },
      {
        name: "AWS CodeBuild",
        constant: "CODEBUILD",
        env: "CODEBUILD_BUILD_ARN",
        pr: {
          env: "CODEBUILD_WEBHOOK_EVENT",
          any: [
            "PULL_REQUEST_CREATED",
            "PULL_REQUEST_UPDATED",
            "PULL_REQUEST_REOPENED"
          ]
        }
      },
      {
        name: "Azure Pipelines",
        constant: "AZURE_PIPELINES",
        env: "TF_BUILD",
        pr: {
          BUILD_REASON: "PullRequest"
        }
      },
      {
        name: "Bamboo",
        constant: "BAMBOO",
        env: "bamboo_planKey"
      },
      {
        name: "Bitbucket Pipelines",
        constant: "BITBUCKET",
        env: "BITBUCKET_COMMIT",
        pr: "BITBUCKET_PR_ID"
      },
      {
        name: "Bitrise",
        constant: "BITRISE",
        env: "BITRISE_IO",
        pr: "BITRISE_PULL_REQUEST"
      },
      {
        name: "Buddy",
        constant: "BUDDY",
        env: "BUDDY_WORKSPACE_ID",
        pr: "BUDDY_EXECUTION_PULL_REQUEST_ID"
      },
      {
        name: "Buildkite",
        constant: "BUILDKITE",
        env: "BUILDKITE",
        pr: {
          env: "BUILDKITE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "CircleCI",
        constant: "CIRCLE",
        env: "CIRCLECI",
        pr: "CIRCLE_PULL_REQUEST"
      },
      {
        name: "Cirrus CI",
        constant: "CIRRUS",
        env: "CIRRUS_CI",
        pr: "CIRRUS_PR"
      },
      {
        name: "Cloudflare Pages",
        constant: "CLOUDFLARE_PAGES",
        env: "CF_PAGES"
      },
      {
        name: "Codefresh",
        constant: "CODEFRESH",
        env: "CF_BUILD_ID",
        pr: {
          any: [
            "CF_PULL_REQUEST_NUMBER",
            "CF_PULL_REQUEST_ID"
          ]
        }
      },
      {
        name: "Codemagic",
        constant: "CODEMAGIC",
        env: "CM_BUILD_ID",
        pr: "CM_PULL_REQUEST"
      },
      {
        name: "Codeship",
        constant: "CODESHIP",
        env: {
          CI_NAME: "codeship"
        }
      },
      {
        name: "Drone",
        constant: "DRONE",
        env: "DRONE",
        pr: {
          DRONE_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "dsari",
        constant: "DSARI",
        env: "DSARI"
      },
      {
        name: "Earthly",
        constant: "EARTHLY",
        env: "EARTHLY_CI"
      },
      {
        name: "Expo Application Services",
        constant: "EAS",
        env: "EAS_BUILD"
      },
      {
        name: "Gerrit",
        constant: "GERRIT",
        env: "GERRIT_PROJECT"
      },
      {
        name: "Gitea Actions",
        constant: "GITEA_ACTIONS",
        env: "GITEA_ACTIONS"
      },
      {
        name: "GitHub Actions",
        constant: "GITHUB_ACTIONS",
        env: "GITHUB_ACTIONS",
        pr: {
          GITHUB_EVENT_NAME: "pull_request"
        }
      },
      {
        name: "GitLab CI",
        constant: "GITLAB",
        env: "GITLAB_CI",
        pr: "CI_MERGE_REQUEST_ID"
      },
      {
        name: "GoCD",
        constant: "GOCD",
        env: "GO_PIPELINE_LABEL"
      },
      {
        name: "Google Cloud Build",
        constant: "GOOGLE_CLOUD_BUILD",
        env: "BUILDER_OUTPUT"
      },
      {
        name: "Harness CI",
        constant: "HARNESS",
        env: "HARNESS_BUILD_ID"
      },
      {
        name: "Heroku",
        constant: "HEROKU",
        env: {
          env: "NODE",
          includes: "/app/.heroku/node/bin/node"
        }
      },
      {
        name: "Hudson",
        constant: "HUDSON",
        env: "HUDSON_URL"
      },
      {
        name: "Jenkins",
        constant: "JENKINS",
        env: [
          "JENKINS_URL",
          "BUILD_ID"
        ],
        pr: {
          any: [
            "ghprbPullId",
            "CHANGE_ID"
          ]
        }
      },
      {
        name: "LayerCI",
        constant: "LAYERCI",
        env: "LAYERCI",
        pr: "LAYERCI_PULL_REQUEST"
      },
      {
        name: "Magnum CI",
        constant: "MAGNUM",
        env: "MAGNUM"
      },
      {
        name: "Netlify CI",
        constant: "NETLIFY",
        env: "NETLIFY",
        pr: {
          env: "PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Nevercode",
        constant: "NEVERCODE",
        env: "NEVERCODE",
        pr: {
          env: "NEVERCODE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Prow",
        constant: "PROW",
        env: "PROW_JOB_ID"
      },
      {
        name: "ReleaseHub",
        constant: "RELEASEHUB",
        env: "RELEASE_BUILD_ID"
      },
      {
        name: "Render",
        constant: "RENDER",
        env: "RENDER",
        pr: {
          IS_PULL_REQUEST: "true"
        }
      },
      {
        name: "Sail CI",
        constant: "SAIL",
        env: "SAILCI",
        pr: "SAIL_PULL_REQUEST_NUMBER"
      },
      {
        name: "Screwdriver",
        constant: "SCREWDRIVER",
        env: "SCREWDRIVER",
        pr: {
          env: "SD_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Semaphore",
        constant: "SEMAPHORE",
        env: "SEMAPHORE",
        pr: "PULL_REQUEST_NUMBER"
      },
      {
        name: "Sourcehut",
        constant: "SOURCEHUT",
        env: {
          CI_NAME: "sourcehut"
        }
      },
      {
        name: "Strider CD",
        constant: "STRIDER",
        env: "STRIDER"
      },
      {
        name: "TaskCluster",
        constant: "TASKCLUSTER",
        env: [
          "TASK_ID",
          "RUN_ID"
        ]
      },
      {
        name: "TeamCity",
        constant: "TEAMCITY",
        env: "TEAMCITY_VERSION"
      },
      {
        name: "Travis CI",
        constant: "TRAVIS",
        env: "TRAVIS",
        pr: {
          env: "TRAVIS_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Vela",
        constant: "VELA",
        env: "VELA",
        pr: {
          VELA_PULL_REQUEST: "1"
        }
      },
      {
        name: "Vercel",
        constant: "VERCEL",
        env: {
          any: [
            "NOW_BUILDER",
            "VERCEL"
          ]
        },
        pr: "VERCEL_GIT_PULL_REQUEST_ID"
      },
      {
        name: "Visual Studio App Center",
        constant: "APPCENTER",
        env: "APPCENTER_BUILD_ID"
      },
      {
        name: "Woodpecker",
        constant: "WOODPECKER",
        env: {
          CI: "woodpecker"
        },
        pr: {
          CI_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "Xcode Cloud",
        constant: "XCODE_CLOUD",
        env: "CI_XCODE_PROJECT",
        pr: "CI_PULL_REQUEST_NUMBER"
      },
      {
        name: "Xcode Server",
        constant: "XCODE_SERVER",
        env: "XCS"
      }
    ];
  }
});

// node_modules/ci-info/index.js
var require_ci_info = __commonJS({
  "node_modules/ci-info/index.js"(exports) {
    "use strict";
    var vendors = require_vendors();
    var env3 = process.env;
    Object.defineProperty(exports, "_vendors", {
      value: vendors.map(function(v) {
        return v.constant;
      })
    });
    exports.name = null;
    exports.isPR = null;
    exports.id = null;
    vendors.forEach(function(vendor) {
      const envs = Array.isArray(vendor.env) ? vendor.env : [vendor.env];
      const isCI2 = envs.every(function(obj) {
        return checkEnv(obj);
      });
      exports[vendor.constant] = isCI2;
      if (!isCI2) {
        return;
      }
      exports.name = vendor.name;
      exports.isPR = checkPR(vendor);
      exports.id = vendor.constant;
    });
    exports.isCI = !!(env3.CI !== "false" && // Bypass all checks if CI env is explicitly set to 'false'
    (env3.BUILD_ID || // Jenkins, Cloudbees
    env3.BUILD_NUMBER || // Jenkins, TeamCity
    env3.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari, Cloudflare Pages
    env3.CI_APP_ID || // Appflow
    env3.CI_BUILD_ID || // Appflow
    env3.CI_BUILD_NUMBER || // Appflow
    env3.CI_NAME || // Codeship and others
    env3.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
    env3.RUN_ID || // TaskCluster, dsari
    exports.name || false));
    function checkEnv(obj) {
      if (typeof obj === "string") return !!env3[obj];
      if ("env" in obj) {
        return env3[obj.env] && env3[obj.env].includes(obj.includes);
      }
      if ("any" in obj) {
        return obj.any.some(function(k) {
          return !!env3[k];
        });
      }
      return Object.keys(obj).every(function(k) {
        return env3[k] === obj[k];
      });
    }
    function checkPR(vendor) {
      switch (typeof vendor.pr) {
        case "string":
          return !!env3[vendor.pr];
        case "object":
          if ("env" in vendor.pr) {
            if ("any" in vendor.pr) {
              return vendor.pr.any.some(function(key) {
                return env3[vendor.pr.env] === key;
              });
            } else {
              return vendor.pr.env in env3 && env3[vendor.pr.env] !== vendor.pr.ne;
            }
          } else if ("any" in vendor.pr) {
            return vendor.pr.any.some(function(key) {
              return !!env3[key];
            });
          } else {
            return checkEnv(vendor.pr);
          }
        default:
          return null;
      }
    }
  }
});

// src/cli/index.js
import * as prettier2 from "../index.mjs";

// scripts/build/shims/at.js
var at = (isOptionalObject, object2, index) => {
  if (isOptionalObject && (object2 === void 0 || object2 === null)) {
    return;
  }
  if (Array.isArray(object2) || typeof object2 === "string") {
    return object2[index < 0 ? object2.length + index : index];
  }
  return object2.at(index);
};
var at_default = at;

// src/cli/options/get-context-options.js
var import_dashify = __toESM(require_dashify(), 1);
import { getSupportInfo } from "../index.mjs";

// src/cli/cli-options.evaluate.js
var cli_options_evaluate_default = {
  "cache": {
    "default": false,
    "description": "Only format changed files. Cannot use with --stdin-filepath.",
    "type": "boolean"
  },
  "cacheLocation": {
    "description": "Path to the cache file.",
    "type": "path"
  },
  "cacheStrategy": {
    "choices": [
      {
        "description": "Use the file metadata such as timestamps as cache keys",
        "value": "metadata"
      },
      {
        "description": "Use the file content as cache keys",
        "value": "content"
      }
    ],
    "description": "Strategy for the cache to use for detecting changed files.",
    "type": "choice"
  },
  "check": {
    "alias": "c",
    "category": "Output",
    "description": "Check if the given files are formatted, print a human-friendly summary\nmessage and paths to unformatted files (see also --list-different).",
    "type": "boolean"
  },
  "color": {
    "default": true,
    "description": "Colorize error messages.",
    "oppositeDescription": "Do not colorize error messages.",
    "type": "boolean"
  },
  "config": {
    "category": "Config",
    "description": "Path to a Prettier configuration file (.prettierrc, package.json, prettier.config.js).",
    "exception": (value) => value === false,
    "oppositeDescription": "Do not look for a configuration file.",
    "type": "path"
  },
  "configPrecedence": {
    "category": "Config",
    "choices": [
      {
        "description": "CLI options take precedence over config file",
        "value": "cli-override"
      },
      {
        "description": "Config file take precedence over CLI options",
        "value": "file-override"
      },
      {
        "description": "If a config file is found will evaluate it and ignore other CLI options.\nIf no config file is found CLI options will evaluate as normal.",
        "value": "prefer-file"
      }
    ],
    "default": "cli-override",
    "description": "Define in which order config files and CLI options should be evaluated.",
    "type": "choice"
  },
  "debugBenchmark": {
    "type": "boolean"
  },
  "debugCheck": {
    "type": "boolean"
  },
  "debugPrintAst": {
    "type": "boolean"
  },
  "debugPrintComments": {
    "type": "boolean"
  },
  "debugPrintDoc": {
    "type": "boolean"
  },
  "debugRepeat": {
    "default": 0,
    "type": "int"
  },
  "editorconfig": {
    "category": "Config",
    "default": true,
    "description": "Take .editorconfig into account when parsing configuration.",
    "oppositeDescription": "Don't take .editorconfig into account when parsing configuration.",
    "type": "boolean"
  },
  "errorOnUnmatchedPattern": {
    "oppositeDescription": "Prevent errors when pattern is unmatched.",
    "type": "boolean"
  },
  "fileInfo": {
    "description": "Extract the following info (as JSON) for a given file path. Reported fields:\n* ignored (boolean) - true if file path is filtered by --ignore-path\n* inferredParser (string | null) - name of parser inferred from file path",
    "type": "path"
  },
  "findConfigPath": {
    "category": "Config",
    "description": "Find and print the path to a configuration file for the given input file.",
    "type": "path"
  },
  "help": {
    "alias": "h",
    "description": "Show CLI usage, or details about the given flag.\nExample: --help write",
    "exception": (value) => value === "",
    "type": "flag"
  },
  "ignorePath": {
    "array": true,
    "category": "Config",
    "default": [
      {
        "value": [
          ".gitignore",
          ".prettierignore"
        ]
      }
    ],
    "description": "Path to a file with patterns describing files to ignore.\nMultiple values are accepted.",
    "type": "path"
  },
  "ignoreUnknown": {
    "alias": "u",
    "description": "Ignore unknown files.",
    "type": "boolean"
  },
  "listDifferent": {
    "alias": "l",
    "category": "Output",
    "description": "Print the names of files that are different from Prettier's formatting (see also --check).",
    "type": "boolean"
  },
  "logLevel": {
    "choices": [
      "silent",
      "error",
      "warn",
      "log",
      "debug"
    ],
    "default": "log",
    "description": "What level of logs to report.",
    "type": "choice"
  },
  "supportInfo": {
    "description": "Print support information as JSON.",
    "type": "boolean"
  },
  "version": {
    "alias": "v",
    "description": "Print Prettier version.",
    "type": "boolean"
  },
  "withNodeModules": {
    "category": "Config",
    "description": "Process files inside 'node_modules' directory.",
    "type": "boolean"
  },
  "write": {
    "alias": "w",
    "category": "Output",
    "description": "Edit files in-place. (Beware!)",
    "type": "boolean"
  }
};

// src/cli/prettier-internal.js
import { __internal as sharedWithCli } from "../index.mjs";
var {
  errors,
  optionCategories,
  createIsIgnoredFunction,
  formatOptionsHiddenDefaults,
  normalizeOptions,
  getSupportInfoWithoutPlugins,
  normalizeOptionSettings,
  vnopts,
  fastGlob,
  createTwoFilesPatch,
  picocolors,
  leven
} = sharedWithCli;

// src/cli/options/get-context-options.js
var detailedCliOptions = normalizeOptionSettings(cli_options_evaluate_default).map(
  (option) => normalizeDetailedOption(option)
);
function apiOptionToCliOption(apiOption) {
  const cliOption = {
    ...apiOption,
    description: apiOption.cliDescription ?? apiOption.description,
    category: apiOption.cliCategory ?? optionCategories.CATEGORY_FORMAT,
    forwardToApi: apiOption.name
  };
  if (apiOption.deprecated) {
    delete cliOption.forwardToApi;
    delete cliOption.description;
    delete cliOption.oppositeDescription;
    cliOption.deprecated = true;
  }
  return normalizeDetailedOption(cliOption);
}
function normalizeDetailedOption(option) {
  var _a;
  return {
    category: optionCategories.CATEGORY_OTHER,
    ...option,
    name: option.cliName ?? (0, import_dashify.default)(option.name),
    choices: (_a = option.choices) == null ? void 0 : _a.map((choice) => {
      const newChoice = {
        description: "",
        deprecated: false,
        ...typeof choice === "object" ? choice : { value: choice }
      };
      if (newChoice.value === true) {
        newChoice.value = "";
      }
      return newChoice;
    })
  };
}
function supportInfoToContextOptions({ options: supportOptions, languages }) {
  const detailedOptions = [
    ...detailedCliOptions,
    ...supportOptions.map((apiOption) => apiOptionToCliOption(apiOption))
  ];
  return {
    supportOptions,
    languages,
    detailedOptions
  };
}
async function getContextOptions(plugins) {
  const supportInfo = await getSupportInfo({
    showDeprecated: true,
    plugins
  });
  return supportInfoToContextOptions(supportInfo);
}
function getContextOptionsWithoutPlugins() {
  const supportInfo = getSupportInfoWithoutPlugins();
  return supportInfoToContextOptions(supportInfo);
}

// scripts/build/shims/string-replace-all.js
var stringReplaceAll = (isOptionalObject, original, pattern, replacement) => {
  if (isOptionalObject && (original === void 0 || original === null)) {
    return;
  }
  if (original.replaceAll) {
    return original.replaceAll(pattern, replacement);
  }
  if (pattern.global) {
    return original.replace(pattern, replacement);
  }
  return original.split(pattern).join(replacement);
};
var string_replace_all_default = stringReplaceAll;

// node_modules/camelcase/index.js
var UPPERCASE = /[\p{Lu}]/u;
var LOWERCASE = /[\p{Ll}]/u;
var LEADING_CAPITAL = /^[\p{Lu}](?![\p{Lu}])/gu;
var IDENTIFIER = /([\p{Alpha}\p{N}_]|$)/u;
var SEPARATORS = /[_.\- ]+/;
var LEADING_SEPARATORS = new RegExp("^" + SEPARATORS.source);
var SEPARATORS_AND_IDENTIFIER = new RegExp(SEPARATORS.source + IDENTIFIER.source, "gu");
var NUMBERS_AND_IDENTIFIER = new RegExp("\\d+" + IDENTIFIER.source, "gu");
var preserveCamelCase = (string, toLowerCase, toUpperCase, preserveConsecutiveUppercase2) => {
  let isLastCharLower = false;
  let isLastCharUpper = false;
  let isLastLastCharUpper = false;
  let isLastLastCharPreserved = false;
  for (let index = 0; index < string.length; index++) {
    const character = string[index];
    isLastLastCharPreserved = index > 2 ? string[index - 3] === "-" : true;
    if (isLastCharLower && UPPERCASE.test(character)) {
      string = string.slice(0, index) + "-" + string.slice(index);
      isLastCharLower = false;
      isLastLastCharUpper = isLastCharUpper;
      isLastCharUpper = true;
      index++;
    } else if (isLastCharUpper && isLastLastCharUpper && LOWERCASE.test(character) && (!isLastLastCharPreserved || preserveConsecutiveUppercase2)) {
      string = string.slice(0, index - 1) + "-" + string.slice(index - 1);
      isLastLastCharUpper = isLastCharUpper;
      isLastCharUpper = false;
      isLastCharLower = true;
    } else {
      isLastCharLower = toLowerCase(character) === character && toUpperCase(character) !== character;
      isLastLastCharUpper = isLastCharUpper;
      isLastCharUpper = toUpperCase(character) === character && toLowerCase(character) !== character;
    }
  }
  return string;
};
var preserveConsecutiveUppercase = (input, toLowerCase) => {
  LEADING_CAPITAL.lastIndex = 0;
  return string_replace_all_default(
    /* isOptionalObject */
    false,
    input,
    LEADING_CAPITAL,
    (match) => toLowerCase(match)
  );
};
var postProcess = (input, toUpperCase) => {
  SEPARATORS_AND_IDENTIFIER.lastIndex = 0;
  NUMBERS_AND_IDENTIFIER.lastIndex = 0;
  return string_replace_all_default(
    /* isOptionalObject */
    false,
    string_replace_all_default(
      /* isOptionalObject */
      false,
      input,
      NUMBERS_AND_IDENTIFIER,
      (match, pattern, offset) => ["_", "-"].includes(input.charAt(offset + match.length)) ? match : toUpperCase(match)
    ),
    SEPARATORS_AND_IDENTIFIER,
    (_2, identifier) => toUpperCase(identifier)
  );
};
function camelCase(input, options) {
  if (!(typeof input === "string" || Array.isArray(input))) {
    throw new TypeError("Expected the input to be `string | string[]`");
  }
  options = {
    pascalCase: false,
    preserveConsecutiveUppercase: false,
    ...options
  };
  if (Array.isArray(input)) {
    input = input.map((x) => x.trim()).filter((x) => x.length).join("-");
  } else {
    input = input.trim();
  }
  if (input.length === 0) {
    return "";
  }
  const toLowerCase = options.locale === false ? (string) => string.toLowerCase() : (string) => string.toLocaleLowerCase(options.locale);
  const toUpperCase = options.locale === false ? (string) => string.toUpperCase() : (string) => string.toLocaleUpperCase(options.locale);
  if (input.length === 1) {
    if (SEPARATORS.test(input)) {
      return "";
    }
    return options.pascalCase ? toUpperCase(input) : toLowerCase(input);
  }
  const hasUpperCase = input !== toLowerCase(input);
  if (hasUpperCase) {
    input = preserveCamelCase(input, toLowerCase, toUpperCase, options.preserveConsecutiveUppercase);
  }
  input = input.replace(LEADING_SEPARATORS, "");
  input = options.preserveConsecutiveUppercase ? preserveConsecutiveUppercase(input, toLowerCase) : toLowerCase(input);
  if (options.pascalCase) {
    input = toUpperCase(input.charAt(0)) + input.slice(1);
  }
  return postProcess(input, toUpperCase);
}

// src/cli/utils.js
import fs from "fs/promises";
import path from "path";

// node_modules/sdbm/index.js
function sdbm(string) {
  let hash2 = 0;
  for (let i = 0; i < string.length; i++) {
    hash2 = string.charCodeAt(i) + (hash2 << 6) + (hash2 << 16) - hash2;
  }
  return hash2 >>> 0;
}

// src/cli/utils.js
import { __internal as sharedWithCli2 } from "../index.mjs";
var printToScreen = console.log.bind(console);
function groupBy(array, iteratee) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const value of array) {
    const key = iteratee(value);
    if (Array.isArray(result[key])) {
      result[key].push(value);
    } else {
      result[key] = [value];
    }
  }
  return result;
}
function pick(object2, keys2) {
  const entries = keys2.map((key) => [key, object2[key]]);
  return Object.fromEntries(entries);
}
function createHash(source) {
  return String(sdbm(source));
}
async function statSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function lstatSafe(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
function isJson(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
var normalizeToPosix = path.sep === "\\" ? (filepath) => string_replace_all_default(
  /* isOptionalObject */
  false,
  filepath,
  "\\",
  "/"
) : (filepath) => filepath;
var { omit } = sharedWithCli2.utils;

// src/cli/options/create-minimist-options.js
function createMinimistOptions(detailedOptions) {
  const booleanNames = [];
  const stringNames = [];
  const defaultValues = {};
  for (const option of detailedOptions) {
    const { name, alias, type } = option;
    const names = type === "boolean" ? booleanNames : stringNames;
    names.push(name);
    if (alias) {
      names.push(alias);
    }
    if (!option.deprecated && (!option.forwardToApi || name === "plugin") && option.default !== void 0) {
      defaultValues[option.name] = option.default;
    }
  }
  return {
    // we use vnopts' AliasSchema to handle aliases for better error messages
    alias: {},
    boolean: booleanNames,
    string: stringNames,
    default: defaultValues
  };
}

// src/cli/options/minimist.js
var import_minimist = __toESM(require_minimist(), 1);
var PLACEHOLDER = null;
function minimistParse(args, options) {
  const boolean = options.boolean ?? [];
  const defaults = options.default ?? {};
  const booleanWithoutDefault = boolean.filter((key) => !(key in defaults));
  const newDefaults = {
    ...defaults,
    ...Object.fromEntries(
      booleanWithoutDefault.map((key) => [key, PLACEHOLDER])
    )
  };
  const parsed = (0, import_minimist.default)(args, { ...options, default: newDefaults });
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== PLACEHOLDER)
  );
}

// src/cli/options/normalize-cli-options.js
var descriptor = {
  key: (key) => key.length === 1 ? `-${key}` : `--${key}`,
  value: (value) => vnopts.apiDescriptor.value(value),
  pair: ({ key, value }) => value === false ? `--no-${key}` : value === true ? descriptor.key(key) : value === "" ? `${descriptor.key(key)} without an argument` : `${descriptor.key(key)}=${value}`
};
var _flags;
var FlagSchema = class extends vnopts.ChoiceSchema {
  constructor({ name, flags }) {
    super({ name, choices: flags });
    __privateAdd(this, _flags, []);
    __privateSet(this, _flags, [...flags].sort());
  }
  preprocess(value, utils) {
    if (typeof value === "string" && value.length > 0 && !__privateGet(this, _flags).includes(value)) {
      const suggestion = __privateGet(this, _flags).find((flag) => leven(flag, value) < 3);
      if (suggestion) {
        utils.logger.warn(
          [
            `Unknown flag ${picocolors.yellow(utils.descriptor.value(value))},`,
            `did you mean ${picocolors.blue(utils.descriptor.value(suggestion))}?`
          ].join(" ")
        );
        return suggestion;
      }
    }
    return value;
  }
  expected() {
    return "a flag";
  }
};
_flags = new WeakMap();
function normalizeCliOptions(options, optionInfos, opts) {
  return normalizeOptions(options, optionInfos, {
    ...opts,
    isCLI: true,
    FlagSchema,
    descriptor
  });
}
var normalize_cli_options_default = normalizeCliOptions;

// src/cli/options/parse-cli-arguments.js
function parseArgv(rawArguments, detailedOptions, logger, keys2) {
  var _a;
  const minimistOptions = createMinimistOptions(detailedOptions);
  let argv2 = minimistParse(rawArguments, minimistOptions);
  if (keys2) {
    detailedOptions = detailedOptions.filter(
      (option) => keys2.includes(option.name)
    );
    argv2 = pick(argv2, keys2);
  }
  const normalized = normalize_cli_options_default(argv2, detailedOptions, { logger });
  return {
    ...Object.fromEntries(
      Object.entries(normalized).map(([key, value]) => {
        const option = detailedOptions.find(({ name }) => name === key) || {};
        return [option.forwardToApi || camelCase(key), value];
      })
    ),
    _: (_a = normalized._) == null ? void 0 : _a.map(String),
    get __raw() {
      return argv2;
    }
  };
}
var { detailedOptions: detailedOptionsWithoutPlugins } = getContextOptionsWithoutPlugins();
function parseArgvWithoutPlugins(rawArguments, logger, keys2) {
  return parseArgv(
    rawArguments,
    detailedOptionsWithoutPlugins,
    logger,
    typeof keys2 === "string" ? [keys2] : keys2
  );
}

// src/cli/context.js
var _stack;
var Context = class {
  constructor({ rawArguments, logger }) {
    __privateAdd(this, _stack, []);
    this.rawArguments = rawArguments;
    this.logger = logger;
  }
  async init() {
    const { rawArguments, logger } = this;
    const { plugins } = parseArgvWithoutPlugins(rawArguments, logger, [
      "plugin"
    ]);
    await this.pushContextPlugins(plugins);
    const argv2 = parseArgv(rawArguments, this.detailedOptions, logger);
    this.argv = argv2;
    this.filePatterns = argv2._;
  }
  /**
   * @param {string[]} plugins
   */
  async pushContextPlugins(plugins) {
    const options = await getContextOptions(plugins);
    __privateGet(this, _stack).push(options);
    Object.assign(this, options);
  }
  popContextPlugins() {
    __privateGet(this, _stack).pop();
    Object.assign(this, at_default(
      /* isOptionalObject */
      false,
      __privateGet(this, _stack),
      -1
    ));
  }
  // eslint-disable-next-line getter-return
  get performanceTestFlag() {
    const { debugBenchmark, debugRepeat } = this.argv;
    if (debugBenchmark) {
      return {
        name: "--debug-benchmark",
        debugBenchmark: true
      };
    }
    if (debugRepeat > 0) {
      return {
        name: "--debug-repeat",
        debugRepeat
      };
    }
    const { PRETTIER_PERF_REPEAT } = process.env;
    if (PRETTIER_PERF_REPEAT && /^\d+$/u.test(PRETTIER_PERF_REPEAT)) {
      return {
        name: "PRETTIER_PERF_REPEAT (environment variable)",
        debugRepeat: Number(PRETTIER_PERF_REPEAT)
      };
    }
  }
};
_stack = new WeakMap();
var context_default = Context;

// src/cli/file-info.js
var import_fast_json_stable_stringify = __toESM(require_fast_json_stable_stringify(), 1);
import path2 from "path";
import { format, getFileInfo } from "../index.mjs";
async function logFileInfoOrDie(context) {
  const {
    fileInfo: file,
    ignorePath,
    withNodeModules: withNodeModules2,
    plugins,
    config
  } = context.argv;
  const fileInfo = await getFileInfo(path2.resolve(file), {
    ignorePath,
    withNodeModules: withNodeModules2,
    plugins: plugins.length > 0 ? plugins : void 0,
    resolveConfig: config !== false
  });
  const result = await format((0, import_fast_json_stable_stringify.default)(fileInfo), { parser: "json" });
  printToScreen(result.trim());
}
var file_info_default = logFileInfoOrDie;

// src/cli/find-config-path.js
import path3 from "path";
import { resolveConfigFile } from "../index.mjs";
async function logResolvedConfigPathOrDie(context) {
  const file = context.argv.findConfigPath;
  const configFile = await resolveConfigFile(file);
  if (configFile) {
    printToScreen(normalizeToPosix(path3.relative(process.cwd(), configFile)));
  } else {
    throw new Error(`Can not find configure file for "${file}".`);
  }
}
var find_config_path_default = logResolvedConfigPathOrDie;

// src/cli/format.js
import fs9 from "fs/promises";
import path12 from "path";

// node_modules/get-stdin/index.js
var { stdin } = process;
async function getStdin() {
  let result = "";
  if (stdin.isTTY) {
    return result;
  }
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) {
    result += chunk;
  }
  return result;
}
getStdin.buffer = async () => {
  const result = [];
  let length = 0;
  if (stdin.isTTY) {
    return Buffer.concat([]);
  }
  for await (const chunk of stdin) {
    result.push(chunk);
    length += chunk.length;
  }
  return Buffer.concat(result, length);
};

// src/cli/format.js
import * as prettier from "../index.mjs";

// src/cli/expand-patterns.js
import path5 from "path";

// src/cli/directory-ignorer.js
import path4 from "path";
var alwaysIgnoredDirectories = [".git", ".sl", ".svn", ".hg", ".jj"];
var withNodeModules = [...alwaysIgnoredDirectories, "node_modules"];
var cwd = process.cwd();
var _directories;
var DirectoryIgnorer = class {
  constructor(shouldIgnoreNodeModules) {
    __privateAdd(this, _directories);
    __publicField(this, "ignorePatterns");
    const directories = shouldIgnoreNodeModules ? withNodeModules : alwaysIgnoredDirectories;
    const patterns = directories.map((directory) => `**/${directory}`);
    __privateSet(this, _directories, new Set(directories));
    this.ignorePatterns = patterns;
  }
  /**
   * @param {string} absolutePathOrPattern
   */
  shouldIgnore(absolutePathOrPattern) {
    const directoryNames = path4.relative(cwd, absolutePathOrPattern).split(path4.sep);
    return directoryNames.some(
      (directoryName) => __privateGet(this, _directories).has(directoryName)
    );
  }
};
_directories = new WeakMap();
var directoryIgnorerWithNodeModules = new DirectoryIgnorer(
  /* shouldIgnoreNodeModules */
  true
);
var directoryIgnorerWithoutNodeModules = new DirectoryIgnorer(
  /* shouldIgnoreNodeModules */
  false
);

// src/cli/expand-patterns.js
async function* expandPatterns(context) {
  const seen = /* @__PURE__ */ new Set();
  let noResults = true;
  for await (const { filePath, ignoreUnknown, error } of expandPatternsInternal(
    context
  )) {
    noResults = false;
    if (error) {
      yield { error };
      continue;
    }
    const filename = path5.resolve(filePath);
    if (seen.has(filename)) {
      continue;
    }
    seen.add(filename);
    yield { filename, ignoreUnknown };
  }
  if (noResults && context.argv.errorOnUnmatchedPattern !== false) {
    yield {
      error: `No matching files. Patterns: ${context.filePatterns.join(" ")}`
    };
  }
}
async function* expandPatternsInternal(context) {
  const directoryIgnorer = context.argv.withNodeModules === true ? directoryIgnorerWithoutNodeModules : directoryIgnorerWithNodeModules;
  const globOptions = {
    dot: true,
    ignore: [...directoryIgnorer.ignorePatterns],
    followSymbolicLinks: false
  };
  const cwd3 = process.cwd();
  const entries = [];
  for (const pattern of context.filePatterns) {
    const absolutePath = path5.resolve(pattern);
    if (directoryIgnorer.shouldIgnore(absolutePath)) {
      continue;
    }
    const stat = await lstatSafe(absolutePath);
    if (stat) {
      if (stat.isSymbolicLink()) {
        if (context.argv.errorOnUnmatchedPattern !== false) {
          yield {
            error: `Explicitly specified pattern "${pattern}" is a symbolic link.`
          };
        } else {
          context.logger.debug(
            `Skipping pattern "${pattern}", as it is a symbolic link.`
          );
        }
      } else if (stat.isFile()) {
        entries.push({
          type: "file",
          glob: escapePathForGlob(fixWindowsSlashes(pattern)),
          input: pattern
        });
      } else if (stat.isDirectory()) {
        const relativePath = path5.relative(cwd3, absolutePath) || ".";
        const prefix = escapePathForGlob(fixWindowsSlashes(relativePath));
        entries.push({
          type: "dir",
          glob: `${prefix}/**/*`,
          input: pattern,
          ignoreUnknown: true
        });
      }
    } else if (pattern[0] === "!") {
      globOptions.ignore.push(fixWindowsSlashes(pattern.slice(1)));
    } else {
      entries.push({
        type: "glob",
        glob: fixWindowsSlashes(pattern),
        input: pattern
      });
    }
  }
  for (const { type, glob, input, ignoreUnknown } of entries) {
    let result;
    try {
      result = await fastGlob(glob, globOptions);
    } catch ({ message }) {
      yield {
        error: `${errorMessages.globError[type]}: "${input}".
${message}`
      };
      continue;
    }
    if (result.length === 0) {
      if (context.argv.errorOnUnmatchedPattern !== false) {
        yield { error: `${errorMessages.emptyResults[type]}: "${input}".` };
      }
    } else {
      yield* sortPaths(result).map((filePath) => ({ filePath, ignoreUnknown }));
    }
  }
}
var errorMessages = {
  globError: {
    file: "Unable to resolve file",
    dir: "Unable to expand directory",
    glob: "Unable to expand glob pattern"
  },
  emptyResults: {
    file: "Explicitly specified file was ignored due to negative glob patterns",
    dir: "No supported files were found in the directory",
    glob: "No files matching the pattern were found"
  }
};
function sortPaths(paths) {
  return paths.sort((a, b) => a.localeCompare(b));
}
function escapePathForGlob(path13) {
  return string_replace_all_default(
    /* isOptionalObject */
    false,
    string_replace_all_default(
      /* isOptionalObject */
      false,
      fastGlob.escapePath(
        string_replace_all_default(
          /* isOptionalObject */
          false,
          path13,
          "\\",
          "\0"
        )
        // Workaround for fast-glob#262 (part 1)
      ),
      String.raw`\!`,
      "@(!)"
    ),
    "\0",
    String.raw`@(\\)`
  );
}
var fixWindowsSlashes = normalizeToPosix;

// src/cli/find-cache-file.js
import fs4 from "fs/promises";
import os from "os";
import path9 from "path";

// node_modules/find-cache-directory/index.js
var import_common_path_prefix = __toESM(require_common_path_prefix(), 1);
import process3 from "process";
import path8 from "path";
import fs3 from "fs";

// node_modules/pkg-dir/index.js
import path7 from "path";

// node_modules/find-up-simple/index.js
import process2 from "process";
import { fileURLToPath } from "url";
import fs2 from "fs";
import path6 from "path";
var toPath = (urlOrPath) => urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;
function findUpSync(name, {
  cwd: cwd3 = process2.cwd(),
  type = "file",
  stopAt
} = {}) {
  let directory = path6.resolve(toPath(cwd3) ?? "");
  const { root } = path6.parse(directory);
  stopAt = path6.resolve(directory, toPath(stopAt) ?? root);
  const isAbsoluteName = path6.isAbsolute(name);
  while (directory) {
    const filePath = isAbsoluteName ? name : path6.join(directory, name);
    try {
      const stats = fs2.statSync(filePath, { throwIfNoEntry: false });
      if (type === "file" && (stats == null ? void 0 : stats.isFile()) || type === "directory" && (stats == null ? void 0 : stats.isDirectory())) {
        return filePath;
      }
    } catch {
    }
    if (directory === stopAt || directory === root) {
      break;
    }
    directory = path6.dirname(directory);
  }
}

// node_modules/pkg-dir/index.js
function packageDirectorySync({ cwd: cwd3 } = {}) {
  const filePath = findUpSync("package.json", { cwd: cwd3 });
  return filePath && path7.dirname(filePath);
}

// node_modules/find-cache-directory/index.js
var { env, cwd: cwd2 } = process3;
var isWritable = (path13) => {
  try {
    fs3.accessSync(path13, fs3.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};
function useDirectory(directory, options) {
  if (options.create) {
    fs3.mkdirSync(directory, { recursive: true });
  }
  return directory;
}
function getNodeModuleDirectory(directory) {
  const nodeModules = path8.join(directory, "node_modules");
  if (!isWritable(nodeModules) && (fs3.existsSync(nodeModules) || !isWritable(path8.join(directory)))) {
    return;
  }
  return nodeModules;
}
function findCacheDirectory(options = {}) {
  if (env.CACHE_DIR && !["true", "false", "1", "0"].includes(env.CACHE_DIR)) {
    return useDirectory(path8.join(env.CACHE_DIR, options.name), options);
  }
  let { cwd: directory = cwd2(), files } = options;
  if (files) {
    if (!Array.isArray(files)) {
      throw new TypeError(`Expected \`files\` option to be an array, got \`${typeof files}\`.`);
    }
    directory = (0, import_common_path_prefix.default)(files.map((file) => path8.resolve(directory, file)));
  }
  directory = packageDirectorySync({ cwd: directory });
  if (!directory) {
    return;
  }
  const nodeModules = getNodeModuleDirectory(directory);
  if (!nodeModules) {
    return;
  }
  return useDirectory(path8.join(directory, "node_modules", ".cache", options.name), options);
}

// src/cli/find-cache-file.js
function findDefaultCacheFile() {
  const cacheDir = findCacheDirectory({ name: "prettier", create: true }) || os.tmpdir();
  const cacheFilePath = path9.join(cacheDir, ".prettier-cache");
  return cacheFilePath;
}
async function findCacheFileFromOption(cacheLocation) {
  const cacheFile = path9.resolve(cacheLocation);
  const stat = await statSafe(cacheFile);
  if (stat) {
    if (stat.isDirectory()) {
      throw new Error(
        `Resolved --cache-location '${cacheFile}' is a directory`
      );
    }
    const data = await fs4.readFile(cacheFile, "utf8");
    if (!isJson(data)) {
      throw new Error(`'${cacheFile}' isn't a valid JSON file`);
    }
  }
  return cacheFile;
}
async function findCacheFile(cacheLocation) {
  if (!cacheLocation) {
    return findDefaultCacheFile();
  }
  const cacheFile = await findCacheFileFromOption(cacheLocation);
  return cacheFile;
}
var find_cache_file_default = findCacheFile;

// src/cli/format-results-cache.js
var import_fast_json_stable_stringify2 = __toESM(require_fast_json_stable_stringify(), 1);
import fs7 from "fs";

// node_modules/file-entry-cache/dist/index.js
import crypto2 from "crypto";
import fs6 from "fs";
import path11 from "path";

// node_modules/file-entry-cache/node_modules/flat-cache/dist/index.js
import path10 from "path";
import fs5 from "fs";

// node_modules/hookified/dist/node/index.js
var n = class {
  _eventListeners;
  _maxListeners;
  _logger;
  constructor(e) {
    this._eventListeners = /* @__PURE__ */ new Map(), this._maxListeners = 100, this._logger = e == null ? void 0 : e.logger;
  }
  once(e, t) {
    let s = (...r) => {
      this.off(e, s), t(...r);
    };
    return this.on(e, s), this;
  }
  listenerCount(e) {
    if (!e) return this.getAllListeners().length;
    let t = this._eventListeners.get(e);
    return t ? t.length : 0;
  }
  eventNames() {
    return [...this._eventListeners.keys()];
  }
  rawListeners(e) {
    return e ? this._eventListeners.get(e) ?? [] : this.getAllListeners();
  }
  prependListener(e, t) {
    let s = this._eventListeners.get(e) ?? [];
    return s.unshift(t), this._eventListeners.set(e, s), this;
  }
  prependOnceListener(e, t) {
    let s = (...r) => {
      this.off(e, s), t(...r);
    };
    return this.prependListener(e, s), this;
  }
  maxListeners() {
    return this._maxListeners;
  }
  addListener(e, t) {
    return this.on(e, t), this;
  }
  on(e, t) {
    this._eventListeners.has(e) || this._eventListeners.set(e, []);
    let s = this._eventListeners.get(e);
    return s && (s.length >= this._maxListeners && console.warn(`MaxListenersExceededWarning: Possible event memory leak detected. ${s.length + 1} ${e} listeners added. Use setMaxListeners() to increase limit.`), s.push(t)), this;
  }
  removeListener(e, t) {
    return this.off(e, t), this;
  }
  off(e, t) {
    let s = this._eventListeners.get(e) ?? [], r = s.indexOf(t);
    return r !== -1 && s.splice(r, 1), s.length === 0 && this._eventListeners.delete(e), this;
  }
  emit(e, ...t) {
    let s = false, r = this._eventListeners.get(e);
    if (r && r.length > 0) for (let i of r) i(...t), s = true;
    return s;
  }
  listeners(e) {
    return this._eventListeners.get(e) ?? [];
  }
  removeAllListeners(e) {
    return e ? this._eventListeners.delete(e) : this._eventListeners.clear(), this;
  }
  setMaxListeners(e) {
    this._maxListeners = e;
    for (let t of this._eventListeners.values()) t.length > e && t.splice(e);
  }
  getAllListeners() {
    let e = new Array();
    for (let t of this._eventListeners.values()) e = [...e, ...t];
    return e;
  }
};
var l = class extends n {
  _hooks;
  _throwHookErrors = false;
  constructor(e) {
    super({ logger: e == null ? void 0 : e.logger }), this._hooks = /* @__PURE__ */ new Map(), (e == null ? void 0 : e.throwHookErrors) !== void 0 && (this._throwHookErrors = e.throwHookErrors);
  }
  get hooks() {
    return this._hooks;
  }
  get throwHookErrors() {
    return this._throwHookErrors;
  }
  set throwHookErrors(e) {
    this._throwHookErrors = e;
  }
  get logger() {
    return this._logger;
  }
  set logger(e) {
    this._logger = e;
  }
  onHook(e, t) {
    let s = this._hooks.get(e);
    s ? s.push(t) : this._hooks.set(e, [t]);
  }
  onHooks(e) {
    for (let t of e) this.onHook(t.event, t.handler);
  }
  prependHook(e, t) {
    let s = this._hooks.get(e);
    s ? s.unshift(t) : this._hooks.set(e, [t]);
  }
  prependOnceHook(e, t) {
    let s = async (...r) => (this.removeHook(e, s), t(...r));
    this.prependHook(e, s);
  }
  onceHook(e, t) {
    let s = async (...r) => (this.removeHook(e, s), t(...r));
    this.onHook(e, s);
  }
  removeHook(e, t) {
    let s = this._hooks.get(e);
    if (s) {
      let r = s.indexOf(t);
      r !== -1 && s.splice(r, 1);
    }
  }
  removeHooks(e) {
    for (let t of e) this.removeHook(t.event, t.handler);
  }
  async hook(e, ...t) {
    let s = this._hooks.get(e);
    if (s) for (let r of s) try {
      await r(...t);
    } catch (i) {
      let o = `${e}: ${i.message}`;
      if (this.emit("error", new Error(o)), this._logger && this._logger.error(o), this._throwHookErrors) throw new Error(o);
    }
  }
  getHooks(e) {
    return this._hooks.get(e);
  }
  clearHooks() {
    this._hooks.clear();
  }
};

// node_modules/cacheable/dist/index.js
import * as crypto from "crypto";
var structuredClone = globalThis.structuredClone ?? ((value) => JSON.parse(JSON.stringify(value)));
var shorthandToMilliseconds = (shorthand) => {
  let milliseconds;
  if (shorthand === void 0) {
    return void 0;
  }
  if (typeof shorthand === "number") {
    milliseconds = shorthand;
  } else if (typeof shorthand === "string") {
    shorthand = shorthand.trim();
    if (Number.isNaN(Number(shorthand))) {
      const match = /^([\d.]+)\s*(ms|s|m|h|hr|d)$/i.exec(shorthand);
      if (!match) {
        throw new Error(
          `Unsupported time format: "${shorthand}". Use 'ms', 's', 'm', 'h', 'hr', or 'd'.`
        );
      }
      const [, value, unit] = match;
      const numericValue = Number.parseFloat(value);
      const unitLower = unit.toLowerCase();
      switch (unitLower) {
        case "ms": {
          milliseconds = numericValue;
          break;
        }
        case "s": {
          milliseconds = numericValue * 1e3;
          break;
        }
        case "m": {
          milliseconds = numericValue * 1e3 * 60;
          break;
        }
        case "h": {
          milliseconds = numericValue * 1e3 * 60 * 60;
          break;
        }
        case "hr": {
          milliseconds = numericValue * 1e3 * 60 * 60;
          break;
        }
        case "d": {
          milliseconds = numericValue * 1e3 * 60 * 60 * 24;
          break;
        }
        /* c8 ignore next 3 */
        default: {
          milliseconds = Number(shorthand);
        }
      }
    } else {
      milliseconds = Number(shorthand);
    }
  } else {
    throw new TypeError("Time must be a string or a number.");
  }
  return milliseconds;
};
var shorthandToTime = (shorthand, fromDate) => {
  fromDate || (fromDate = /* @__PURE__ */ new Date());
  const milliseconds = shorthandToMilliseconds(shorthand);
  if (milliseconds === void 0) {
    return fromDate.getTime();
  }
  return fromDate.getTime() + milliseconds;
};
function hash(object2, algorithm = "sha256") {
  const objectString = JSON.stringify(object2);
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: '${algorithm}'`);
  }
  const hasher = crypto.createHash(algorithm);
  hasher.update(objectString);
  return hasher.digest("hex");
}
function hashToNumber(object2, min = 0, max = 10, algorithm = "sha256") {
  const objectString = JSON.stringify(object2);
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: '${algorithm}'`);
  }
  const hasher = crypto.createHash(algorithm);
  hasher.update(objectString);
  const hashHex = hasher.digest("hex");
  const hashNumber = Number.parseInt(hashHex, 16);
  const range = max - min + 1;
  return min + hashNumber % range;
}
function djb2Hash(string_, min = 0, max = 10) {
  let hash2 = 5381;
  for (let i = 0; i < string_.length; i++) {
    hash2 = hash2 * 33 ^ string_.charCodeAt(i);
  }
  const range = max - min + 1;
  return min + Math.abs(hash2) % range;
}
function wrapSync(function_, options) {
  const { ttl, keyPrefix, cache } = options;
  return function(...arguments_) {
    const cacheKey = createWrapKey(function_, arguments_, keyPrefix);
    let value = cache.get(cacheKey);
    if (value === void 0) {
      try {
        value = function_(...arguments_);
        cache.set(cacheKey, value, ttl);
      } catch (error) {
        cache.emit("error", error);
        if (options.cacheErrors) {
          cache.set(cacheKey, error, ttl);
        }
      }
    }
    return value;
  };
}
function createWrapKey(function_, arguments_, keyPrefix) {
  if (!keyPrefix) {
    return `${function_.name}::${hash(arguments_)}`;
  }
  return `${keyPrefix}::${function_.name}::${hash(arguments_)}`;
}
var ListNode = class {
  // eslint-disable-next-line @typescript-eslint/parameter-properties
  value;
  prev = void 0;
  next = void 0;
  constructor(value) {
    this.value = value;
  }
};
var DoublyLinkedList = class {
  head = void 0;
  tail = void 0;
  nodesMap = /* @__PURE__ */ new Map();
  // Add a new node to the front (most recently used)
  addToFront(value) {
    const newNode = new ListNode(value);
    if (this.head) {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    } else {
      this.head = this.tail = newNode;
    }
    this.nodesMap.set(value, newNode);
  }
  // Move an existing node to the front (most recently used)
  moveToFront(value) {
    const node = this.nodesMap.get(value);
    if (!node || this.head === node) {
      return;
    }
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }
    node.prev = void 0;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    this.tail || (this.tail = node);
  }
  // Get the oldest node (tail)
  getOldest() {
    return this.tail ? this.tail.value : void 0;
  }
  // Remove the oldest node (tail)
  removeOldest() {
    if (!this.tail) {
      return void 0;
    }
    const oldValue = this.tail.value;
    if (this.tail.prev) {
      this.tail = this.tail.prev;
      this.tail.next = void 0;
    } else {
      this.head = this.tail = void 0;
    }
    this.nodesMap.delete(oldValue);
    return oldValue;
  }
  get size() {
    return this.nodesMap.size;
  }
};
var defaultStoreHashSize = 16;
var maximumMapSize = 16777216;
var CacheableMemory = class extends l {
  _lru = new DoublyLinkedList();
  _storeHashSize = defaultStoreHashSize;
  _storeHashAlgorithm = "djb2Hash";
  // Default is djb2Hash
  _store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
  _ttl;
  // Turned off by default
  _useClone = true;
  // Turned on by default
  _lruSize = 0;
  // Turned off by default
  _checkInterval = 0;
  // Turned off by default
  _interval = 0;
  // Turned off by default
  /**
   * @constructor
   * @param {CacheableMemoryOptions} [options] - The options for the CacheableMemory
   */
  constructor(options) {
    super();
    if (options == null ? void 0 : options.ttl) {
      this.setTtl(options.ttl);
    }
    if ((options == null ? void 0 : options.useClone) !== void 0) {
      this._useClone = options.useClone;
    }
    if ((options == null ? void 0 : options.storeHashSize) && options.storeHashSize > 0) {
      this._storeHashSize = options.storeHashSize;
    }
    if (options == null ? void 0 : options.lruSize) {
      if (options.lruSize > maximumMapSize) {
        this.emit("error", new Error(`LRU size cannot be larger than ${maximumMapSize} due to Map limitations.`));
      } else {
        this._lruSize = options.lruSize;
      }
    }
    if (options == null ? void 0 : options.checkInterval) {
      this._checkInterval = options.checkInterval;
    }
    if (options == null ? void 0 : options.storeHashAlgorithm) {
      this._storeHashAlgorithm = options.storeHashAlgorithm;
    }
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
    this.startIntervalCheck();
  }
  /**
   * Gets the time-to-live
   * @returns {number|string|undefined} - The time-to-live in miliseconds or a human-readable format. If undefined, it will not have a time-to-live.
   */
  get ttl() {
    return this._ttl;
  }
  /**
   * Sets the time-to-live
   * @param {number|string|undefined} value - The time-to-live in miliseconds or a human-readable format (example '1s' = 1 second, '1h' = 1 hour). If undefined, it will not have a time-to-live.
   */
  set ttl(value) {
    this.setTtl(value);
  }
  /**
   * Gets whether to use clone
   * @returns {boolean} - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
   */
  get useClone() {
    return this._useClone;
  }
  /**
   * Sets whether to use clone
   * @param {boolean} value - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
   */
  set useClone(value) {
    this._useClone = value;
  }
  /**
   * Gets the size of the LRU cache
   * @returns {number} - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
   */
  get lruSize() {
    return this._lruSize;
  }
  /**
   * Sets the size of the LRU cache
   * @param {number} value - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
   */
  set lruSize(value) {
    if (value > maximumMapSize) {
      this.emit("error", new Error(`LRU size cannot be larger than ${maximumMapSize} due to Map limitations.`));
      return;
    }
    this._lruSize = value;
    if (this._lruSize === 0) {
      this._lru = new DoublyLinkedList();
      return;
    }
    this.lruResize();
  }
  /**
   * Gets the check interval
   * @returns {number} - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
   */
  get checkInterval() {
    return this._checkInterval;
  }
  /**
   * Sets the check interval
   * @param {number} value - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
   */
  set checkInterval(value) {
    this._checkInterval = value;
  }
  /**
   * Gets the size of the cache
   * @returns {number} - The size of the cache
   */
  get size() {
    let size = 0;
    for (const store of this._store) {
      size += store.size;
    }
    return size;
  }
  /**
   * Gets the number of hash stores
   * @returns {number} - The number of hash stores
   */
  get storeHashSize() {
    return this._storeHashSize;
  }
  /**
   * Sets the number of hash stores. This will recreate the store and all data will be cleared
   * @param {number} value - The number of hash stores
   */
  set storeHashSize(value) {
    if (value === this._storeHashSize) {
      return;
    }
    this._storeHashSize = value;
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
  }
  /**
   * Gets the store hash algorithm
   * @returns {StoreHashAlgorithm | StoreHashAlgorithmFunction} - The store hash algorithm
   */
  get storeHashAlgorithm() {
    return this._storeHashAlgorithm;
  }
  /**
   * Sets the store hash algorithm. This will recreate the store and all data will be cleared
   * @param {StoreHashAlgorithm | StoreHashAlgorithmFunction} value - The store hash algorithm
   */
  set storeHashAlgorithm(value) {
    this._storeHashAlgorithm = value;
  }
  /**
   * Gets the keys
   * @returns {IterableIterator<string>} - The keys
   */
  get keys() {
    const keys2 = new Array();
    for (const store of this._store) {
      for (const key of store.keys()) {
        const item = store.get(key);
        if (item && this.hasExpired(item)) {
          store.delete(key);
          continue;
        }
        keys2.push(key);
      }
    }
    return keys2.values();
  }
  /**
   * Gets the items
   * @returns {IterableIterator<CacheableStoreItem>} - The items
   */
  get items() {
    const items = new Array();
    for (const store of this._store) {
      for (const item of store.values()) {
        if (this.hasExpired(item)) {
          store.delete(item.key);
          continue;
        }
        items.push(item);
      }
    }
    return items.values();
  }
  /**
   * Gets the store
   * @returns {Array<Map<string, CacheableStoreItem>>} - The store
   */
  get store() {
    return this._store;
  }
  /**
   * Gets the value of the key
   * @param {string} key - The key to get the value
   * @returns {T | undefined} - The value of the key
   */
  get(key) {
    const store = this.getStore(key);
    const item = store.get(key);
    if (!item) {
      return void 0;
    }
    if (item.expires && Date.now() > item.expires) {
      store.delete(key);
      return void 0;
    }
    this.lruMoveToFront(key);
    if (!this._useClone) {
      return item.value;
    }
    return this.clone(item.value);
  }
  /**
   * Gets the values of the keys
   * @param {string[]} keys - The keys to get the values
   * @returns {T[]} - The values of the keys
   */
  getMany(keys2) {
    const result = new Array();
    for (const key of keys2) {
      result.push(this.get(key));
    }
    return result;
  }
  /**
   * Gets the raw value of the key
   * @param {string} key - The key to get the value
   * @returns {CacheableStoreItem | undefined} - The raw value of the key
   */
  getRaw(key) {
    const store = this.getStore(key);
    const item = store.get(key);
    if (!item) {
      return void 0;
    }
    if (item.expires && item.expires && Date.now() > item.expires) {
      store.delete(key);
      return void 0;
    }
    this.lruMoveToFront(key);
    return item;
  }
  /**
   * Gets the raw values of the keys
   * @param {string[]} keys - The keys to get the values
   * @returns {CacheableStoreItem[]} - The raw values of the keys
   */
  getManyRaw(keys2) {
    const result = new Array();
    for (const key of keys2) {
      result.push(this.getRaw(key));
    }
    return result;
  }
  /**
   * Sets the value of the key
   * @param {string} key - The key to set the value
   * @param {any} value - The value to set
   * @param {number|string|SetOptions} [ttl] - Time to Live - If you set a number it is miliseconds, if you set a string it is a human-readable.
   * If you want to set expire directly you can do that by setting the expire property in the SetOptions.
   * If you set undefined, it will use the default time-to-live. If both are undefined then it will not have a time-to-live.
   * @returns {void}
   */
  set(key, value, ttl) {
    const store = this.getStore(key);
    let expires;
    if (ttl !== void 0 || this._ttl !== void 0) {
      if (typeof ttl === "object") {
        if (ttl.expire) {
          expires = typeof ttl.expire === "number" ? ttl.expire : ttl.expire.getTime();
        }
        if (ttl.ttl) {
          const finalTtl = shorthandToTime(ttl.ttl);
          if (finalTtl !== void 0) {
            expires = finalTtl;
          }
        }
      } else {
        const finalTtl = shorthandToTime(ttl ?? this._ttl);
        if (finalTtl !== void 0) {
          expires = finalTtl;
        }
      }
    }
    if (this._lruSize > 0) {
      if (store.has(key)) {
        this.lruMoveToFront(key);
      } else {
        this.lruAddToFront(key);
        if (this._lru.size > this._lruSize) {
          const oldestKey = this._lru.getOldest();
          if (oldestKey) {
            this._lru.removeOldest();
            this.delete(oldestKey);
          }
        }
      }
    }
    const item = { key, value, expires };
    store.set(
      key,
      item
    );
  }
  /**
   * Sets the values of the keys
   * @param {CacheableItem[]} items - The items to set
   * @returns {void}
   */
  setMany(items) {
    for (const item of items) {
      this.set(item.key, item.value, item.ttl);
    }
  }
  /**
   * Checks if the key exists
   * @param {string} key - The key to check
   * @returns {boolean} - If true, the key exists. If false, the key does not exist.
   */
  has(key) {
    const item = this.get(key);
    return Boolean(item);
  }
  /**
   * @function hasMany
   * @param {string[]} keys - The keys to check
   * @returns {boolean[]} - If true, the key exists. If false, the key does not exist.
   */
  hasMany(keys2) {
    const result = new Array();
    for (const key of keys2) {
      const item = this.get(key);
      result.push(Boolean(item));
    }
    return result;
  }
  /**
   * Take will get the key and delete the entry from cache
   * @param {string} key - The key to take
   * @returns {T | undefined} - The value of the key
   */
  take(key) {
    const item = this.get(key);
    if (!item) {
      return void 0;
    }
    this.delete(key);
    return item;
  }
  /**
   * TakeMany will get the keys and delete the entries from cache
   * @param {string[]} keys - The keys to take
   * @returns {T[]} - The values of the keys
   */
  takeMany(keys2) {
    const result = new Array();
    for (const key of keys2) {
      result.push(this.take(key));
    }
    return result;
  }
  /**
   * Delete the key
   * @param {string} key - The key to delete
   * @returns {void}
   */
  delete(key) {
    const store = this.getStore(key);
    store.delete(key);
  }
  /**
   * Delete the keys
   * @param {string[]} keys - The keys to delete
   * @returns {void}
   */
  deleteMany(keys2) {
    for (const key of keys2) {
      this.delete(key);
    }
  }
  /**
   * Clear the cache
   * @returns {void}
   */
  clear() {
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
    this._lru = new DoublyLinkedList();
  }
  /**
   * Get the store based on the key (internal use)
   * @param {string} key - The key to get the store
   * @returns {CacheableHashStore} - The store
   */
  getStore(key) {
    var _a;
    const hash2 = this.getKeyStoreHash(key);
    (_a = this._store)[hash2] || (_a[hash2] = /* @__PURE__ */ new Map());
    return this._store[hash2];
  }
  /**
   * Hash the key for which store to go to (internal use)
   * @param {string} key - The key to hash
   * Available algorithms are: SHA256, SHA1, MD5, and djb2Hash.
   * @returns {number} - The hashed key as a number
   */
  getKeyStoreHash(key) {
    if (this._store.length === 1) {
      return 0;
    }
    if (this._storeHashAlgorithm === "djb2Hash") {
      return djb2Hash(key, 0, this._storeHashSize);
    }
    if (typeof this._storeHashAlgorithm === "function") {
      return this._storeHashAlgorithm(key, this._storeHashSize);
    }
    return hashToNumber(key, 0, this._storeHashSize, this._storeHashAlgorithm);
  }
  /**
   * Clone the value. This is for internal use
   * @param {any} value - The value to clone
   * @returns {any} - The cloned value
   */
  clone(value) {
    if (this.isPrimitive(value)) {
      return value;
    }
    return structuredClone(value);
  }
  /**
   * Add to the front of the LRU cache. This is for internal use
   * @param {string} key - The key to add to the front
   * @returns {void}
   */
  lruAddToFront(key) {
    if (this._lruSize === 0) {
      return;
    }
    this._lru.addToFront(key);
  }
  /**
   * Move to the front of the LRU cache. This is for internal use
   * @param {string} key - The key to move to the front
   * @returns {void}
   */
  lruMoveToFront(key) {
    if (this._lruSize === 0) {
      return;
    }
    this._lru.moveToFront(key);
  }
  /**
   * Resize the LRU cache. This is for internal use.
   * @returns {void}
   */
  lruResize() {
    while (this._lru.size > this._lruSize) {
      const oldestKey = this._lru.getOldest();
      if (oldestKey) {
        this._lru.removeOldest();
        this.delete(oldestKey);
      }
    }
  }
  /**
   * Check for expiration. This is for internal use
   * @returns {void}
   */
  checkExpiration() {
    for (const store of this._store) {
      for (const item of store.values()) {
        if (item.expires && Date.now() > item.expires) {
          store.delete(item.key);
        }
      }
    }
  }
  /**
   * Start the interval check. This is for internal use
   * @returns {void}
   */
  startIntervalCheck() {
    if (this._checkInterval > 0) {
      if (this._interval) {
        clearInterval(this._interval);
      }
      this._interval = setInterval(() => {
        this.checkExpiration();
      }, this._checkInterval).unref();
    }
  }
  /**
   * Stop the interval check. This is for internal use
   * @returns {void}
   */
  stopIntervalCheck() {
    if (this._interval) {
      clearInterval(this._interval);
    }
    this._interval = 0;
    this._checkInterval = 0;
  }
  /**
   * Wrap the function for caching
   * @param {Function} function_ - The function to wrap
   * @param {Object} [options] - The options to wrap
   * @returns {Function} - The wrapped function
   */
  wrap(function_, options) {
    const wrapOptions = {
      ttl: (options == null ? void 0 : options.ttl) ?? this._ttl,
      keyPrefix: options == null ? void 0 : options.keyPrefix,
      cache: this
    };
    return wrapSync(function_, wrapOptions);
  }
  isPrimitive(value) {
    const result = false;
    if (value === null || value === void 0) {
      return true;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return true;
    }
    return result;
  }
  setTtl(ttl) {
    if (typeof ttl === "string" || ttl === void 0) {
      this._ttl = ttl;
    } else if (ttl > 0) {
      this._ttl = ttl;
    } else {
      this._ttl = void 0;
    }
  }
  hasExpired(item) {
    if (item.expires && Date.now() > item.expires) {
      return true;
    }
    return false;
  }
};

// node_modules/flatted/esm/index.js
var { parse: $parse, stringify: $stringify } = JSON;
var { keys } = Object;
var Primitive = String;
var primitive = "string";
var ignore = {};
var object = "object";
var noop = (_2, value) => value;
var primitives = (value) => value instanceof Primitive ? Primitive(value) : value;
var Primitives = (_2, value) => typeof value === primitive ? new Primitive(value) : value;
var revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({ k, a: [input, parsed, tmp, $] });
      } else
        output[k] = $.call(output, k, tmp);
    } else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let { length } = lazy, i = 0; i < length; i++) {
    const { k, a } = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};
var set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};
var parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ? revive(input, /* @__PURE__ */ new Set(), value, $) : value;
  return $.call({ "": tmp }, "", tmp);
};
var stringify2 = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ? (k, v) => k === "" || -1 < replacer.indexOf(k) ? v : void 0 : replacer || noop;
  const known = /* @__PURE__ */ new Map();
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({ "": value }, "", value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return "[" + output.join(",") + "]";
  function replace(key, value2) {
    if (firstRun) {
      firstRun = !firstRun;
      return value2;
    }
    const after = $.call(this, key, value2);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};

// node_modules/file-entry-cache/node_modules/flat-cache/dist/index.js
var FlatCache = class extends l {
  _cache = new CacheableMemory();
  _cacheDir = ".cache";
  _cacheId = "cache1";
  _persistInterval = 0;
  _persistTimer;
  _changesSinceLastSave = false;
  _parse = parse;
  _stringify = stringify2;
  constructor(options) {
    super();
    if (options) {
      this._cache = new CacheableMemory({
        ttl: options.ttl,
        useClone: options.useClone,
        lruSize: options.lruSize,
        checkInterval: options.expirationInterval
      });
    }
    if (options == null ? void 0 : options.cacheDir) {
      this._cacheDir = options.cacheDir;
    }
    if (options == null ? void 0 : options.cacheId) {
      this._cacheId = options.cacheId;
    }
    if (options == null ? void 0 : options.persistInterval) {
      this._persistInterval = options.persistInterval;
      this.startAutoPersist();
    }
    if (options == null ? void 0 : options.deserialize) {
      this._parse = options.deserialize;
    }
    if (options == null ? void 0 : options.serialize) {
      this._stringify = options.serialize;
    }
  }
  /**
   * The cache object
   * @property cache
   * @type {CacheableMemory}
   */
  get cache() {
    return this._cache;
  }
  /**
   * The cache directory
   * @property cacheDir
   * @type {String}
   * @default '.cache'
   */
  get cacheDir() {
    return this._cacheDir;
  }
  /**
   * Set the cache directory
   * @property cacheDir
   * @type {String}
   * @default '.cache'
   */
  set cacheDir(value) {
    this._cacheDir = value;
  }
  /**
   * The cache id
   * @property cacheId
   * @type {String}
   * @default 'cache1'
   */
  get cacheId() {
    return this._cacheId;
  }
  /**
   * Set the cache id
   * @property cacheId
   * @type {String}
   * @default 'cache1'
   */
  set cacheId(value) {
    this._cacheId = value;
  }
  /**
   * The flag to indicate if there are changes since the last save
   * @property changesSinceLastSave
   * @type {Boolean}
   * @default false
   */
  get changesSinceLastSave() {
    return this._changesSinceLastSave;
  }
  /**
   * The interval to persist the cache to disk. 0 means no timed persistence
   * @property persistInterval
   * @type {Number}
   * @default 0
   */
  get persistInterval() {
    return this._persistInterval;
  }
  /**
   * Set the interval to persist the cache to disk. 0 means no timed persistence
   * @property persistInterval
   * @type {Number}
   * @default 0
   */
  set persistInterval(value) {
    this._persistInterval = value;
  }
  /**
   * Load a cache identified by the given Id. If the element does not exists, then initialize an empty
   * cache storage. If specified `cacheDir` will be used as the directory to persist the data to. If omitted
   * then the cache module directory `.cacheDir` will be used instead
   *
   * @method load
   * @param cacheId {String} the id of the cache, would also be used as the name of the file cache
   * @param cacheDir {String} directory for the cache entry
   */
  load(cacheId, cacheDir) {
    try {
      const filePath = path10.resolve(`${cacheDir ?? this._cacheDir}/${cacheId ?? this._cacheId}`);
      this.loadFile(filePath);
      this.emit(
        "load"
        /* LOAD */
      );
    } catch (error) {
      this.emit("error", error);
    }
  }
  /**
   * Load the cache from the provided file
   * @method loadFile
   * @param  {String} pathToFile the path to the file containing the info for the cache
   */
  loadFile(pathToFile) {
    if (fs5.existsSync(pathToFile)) {
      const data = fs5.readFileSync(pathToFile, "utf8");
      const items = this._parse(data);
      for (const key of Object.keys(items)) {
        this._cache.set(items[key].key, items[key].value, { expire: items[key].expires });
      }
      this._changesSinceLastSave = true;
    }
  }
  /**
   * Returns the entire persisted object
   * @method all
   * @returns {*}
   */
  all() {
    const result = {};
    const items = [...this._cache.items];
    for (const item of items) {
      result[item.key] = item.value;
    }
    return result;
  }
  /**
   * Returns an array with all the items in the cache { key, value, ttl }
   * @method items
   * @returns {Array}
   */
  get items() {
    return [...this._cache.items];
  }
  /**
   * Returns the path to the file where the cache is persisted
   * @method cacheFilePath
   * @returns {String}
   */
  get cacheFilePath() {
    return path10.resolve(`${this._cacheDir}/${this._cacheId}`);
  }
  /**
   * Returns the path to the cache directory
   * @method cacheDirPath
   * @returns {String}
   */
  get cacheDirPath() {
    return path10.resolve(this._cacheDir);
  }
  /**
   * Returns an array with all the keys in the cache
   * @method keys
   * @returns {Array}
   */
  keys() {
    return [...this._cache.keys];
  }
  /**
   * (Legacy) set key method. This method will be deprecated in the future
   * @method setKey
   * @param key {string} the key to set
   * @param value {object} the value of the key. Could be any object that can be serialized with JSON.stringify
   */
  setKey(key, value, ttl) {
    this.set(key, value, ttl);
  }
  /**
   * Sets a key to a given value
   * @method set
   * @param key {string} the key to set
   * @param value {object} the value of the key. Could be any object that can be serialized with JSON.stringify
   * @param [ttl] {number} the time to live in milliseconds
   */
  set(key, value, ttl) {
    this._cache.set(key, value, ttl);
    this._changesSinceLastSave = true;
  }
  /**
   * (Legacy) Remove a given key from the cache. This method will be deprecated in the future
   * @method removeKey
   * @param key {String} the key to remove from the object
   */
  removeKey(key) {
    this.delete(key);
  }
  /**
   * Remove a given key from the cache
   * @method delete
   * @param key {String} the key to remove from the object
   */
  delete(key) {
    this._cache.delete(key);
    this._changesSinceLastSave = true;
    this.emit("delete", key);
  }
  /**
  * (Legacy) Return the value of the provided key. This method will be deprecated in the future
  * @method getKey<T>
  * @param key {String} the name of the key to retrieve
  * @returns {*} at T the value from the key
  */
  getKey(key) {
    return this.get(key);
  }
  /**
   * Return the value of the provided key
   * @method get<T>
   * @param key {String} the name of the key to retrieve
   * @returns {*} at T the value from the key
   */
  get(key) {
    return this._cache.get(key);
  }
  /**
   * Clear the cache and save the state to disk
   * @method clear
   */
  clear() {
    try {
      this._cache.clear();
      this._changesSinceLastSave = true;
      this.save();
      this.emit(
        "clear"
        /* CLEAR */
      );
    } catch (error) {
      this.emit("error", error);
    }
  }
  /**
   * Save the state of the cache identified by the docId to disk
   * as a JSON structure
   * @method save
   */
  save(force = false) {
    try {
      if (this._changesSinceLastSave || force) {
        const filePath = this.cacheFilePath;
        const items = [...this._cache.items];
        const data = this._stringify(items);
        if (!fs5.existsSync(this._cacheDir)) {
          fs5.mkdirSync(this._cacheDir, { recursive: true });
        }
        fs5.writeFileSync(filePath, data);
        this._changesSinceLastSave = false;
        this.emit(
          "save"
          /* SAVE */
        );
      }
    } catch (error) {
      this.emit("error", error);
    }
  }
  /**
   * Remove the file where the cache is persisted
   * @method removeCacheFile
   * @return {Boolean} true or false if the file was successfully deleted
   */
  removeCacheFile() {
    try {
      if (fs5.existsSync(this.cacheFilePath)) {
        fs5.rmSync(this.cacheFilePath);
        return true;
      }
    } catch (error) {
      this.emit("error", error);
    }
    return false;
  }
  /**
   * Destroy the cache. This will remove the directory, file, and memory cache
   * @method destroy
   * @param [includeCacheDir=false] {Boolean} if true, the cache directory will be removed
   * @return {undefined}
   */
  destroy(includeCacheDirectory = false) {
    try {
      this._cache.clear();
      this.stopAutoPersist();
      if (includeCacheDirectory) {
        fs5.rmSync(this.cacheDirPath, { recursive: true, force: true });
      } else {
        fs5.rmSync(this.cacheFilePath, { recursive: true, force: true });
      }
      this._changesSinceLastSave = false;
      this.emit(
        "destroy"
        /* DESTROY */
      );
    } catch (error) {
      this.emit("error", error);
    }
  }
  /**
   * Start the auto persist interval
   * @method startAutoPersist
   */
  startAutoPersist() {
    if (this._persistInterval > 0) {
      if (this._persistTimer) {
        clearInterval(this._persistTimer);
        this._persistTimer = void 0;
      }
      this._persistTimer = setInterval(() => {
        this.save();
      }, this._persistInterval);
    }
  }
  /**
   * Stop the auto persist interval
   * @method stopAutoPersist
   */
  stopAutoPersist() {
    if (this._persistTimer) {
      clearInterval(this._persistTimer);
      this._persistTimer = void 0;
    }
  }
};
function createFromFile(filePath, options) {
  const cache = new FlatCache(options);
  cache.loadFile(filePath);
  return cache;
}

// node_modules/file-entry-cache/dist/index.js
function createFromFile2(filePath, useCheckSum, currentWorkingDirectory) {
  const fname = path11.basename(filePath);
  const directory = path11.dirname(filePath);
  return create(fname, directory, useCheckSum, currentWorkingDirectory);
}
function create(cacheId, cacheDirectory, useCheckSum, currentWorkingDirectory) {
  const options = {
    currentWorkingDirectory,
    useCheckSum,
    cache: {
      cacheId,
      cacheDir: cacheDirectory
    }
  };
  const fileEntryCache = new FileEntryCache(options);
  if (cacheDirectory) {
    const cachePath = `${cacheDirectory}/${cacheId}`;
    if (fs6.existsSync(cachePath)) {
      fileEntryCache.cache = createFromFile(cachePath, options.cache);
    }
  }
  return fileEntryCache;
}
var FileEntryDefault = class {
  static create = create;
  static createFromFile = createFromFile2;
};
var FileEntryCache = class {
  _cache = new FlatCache({ useClone: false });
  _useCheckSum = false;
  _useModifiedTime = true;
  _currentWorkingDirectory;
  _hashAlgorithm = "md5";
  /**
   * Create a new FileEntryCache instance
   * @param options - The options for the FileEntryCache
   */
  constructor(options) {
    if (options == null ? void 0 : options.cache) {
      this._cache = new FlatCache(options.cache);
    }
    if (options == null ? void 0 : options.useModifiedTime) {
      this._useModifiedTime = options.useModifiedTime;
    }
    if (options == null ? void 0 : options.useCheckSum) {
      this._useCheckSum = options.useCheckSum;
    }
    if (options == null ? void 0 : options.currentWorkingDirectory) {
      this._currentWorkingDirectory = options.currentWorkingDirectory;
    }
    if (options == null ? void 0 : options.hashAlgorithm) {
      this._hashAlgorithm = options.hashAlgorithm;
    }
  }
  /**
   * Get the cache
   * @returns {FlatCache} The cache
   */
  get cache() {
    return this._cache;
  }
  /**
   * Set the cache
   * @param {FlatCache} cache - The cache to set
   */
  set cache(cache) {
    this._cache = cache;
  }
  /**
   * Use the hash to check if the file has changed
   * @returns {boolean} if the hash is used to check if the file has changed
   */
  get useCheckSum() {
    return this._useCheckSum;
  }
  /**
   * Set the useCheckSum value
   * @param {boolean} value - The value to set
   */
  set useCheckSum(value) {
    this._useCheckSum = value;
  }
  /**
   * Use the modified time to check if the file has changed
   * @returns {boolean} if the modified time is used to check if the file has changed
   */
  get useModifiedTime() {
    return this._useModifiedTime;
  }
  /**
   * Set the useModifiedTime value
   * @param {boolean} value - The value to set
   */
  set useModifiedTime(value) {
    this._useModifiedTime = value;
  }
  /**
   * Get the hash algorithm
   * @returns {string} The hash algorithm
   */
  get hashAlgorithm() {
    return this._hashAlgorithm;
  }
  /**
   * Set the hash algorithm
   * @param {string} value - The value to set
   */
  set hashAlgorithm(value) {
    this._hashAlgorithm = value;
  }
  /**
   * Get the current working directory
   * @returns {string | undefined} The current working directory
   */
  get currentWorkingDirectory() {
    return this._currentWorkingDirectory;
  }
  /**
   * Set the current working directory
   * @param {string | undefined} value - The value to set
   */
  set currentWorkingDirectory(value) {
    this._currentWorkingDirectory = value;
  }
  /**
   * Given a buffer, calculate md5 hash of its content.
   * @method getHash
   * @param  {Buffer} buffer   buffer to calculate hash on
   * @return {String}          content hash digest
   */
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  getHash(buffer) {
    return crypto2.createHash(this._hashAlgorithm).update(buffer).digest("hex");
  }
  /**
   * Create the key for the file path used for caching.
   * @method createFileKey
   * @param {String} filePath
   * @return {String}
   */
  createFileKey(filePath, options) {
    let result = filePath;
    const currentWorkingDirectory = (options == null ? void 0 : options.currentWorkingDirectory) ?? this._currentWorkingDirectory;
    if (currentWorkingDirectory && filePath.startsWith(currentWorkingDirectory)) {
      const splitPath = filePath.split(currentWorkingDirectory).pop();
      if (splitPath) {
        result = splitPath;
        if (result.startsWith("/")) {
          result = result.slice(1);
        }
      }
    }
    return result;
  }
  /**
   * Check if the file path is a relative path
   * @method isRelativePath
   * @param filePath - The file path to check
   * @returns {boolean} if the file path is a relative path, false otherwise
   */
  isRelativePath(filePath) {
    return !path11.isAbsolute(filePath);
  }
  /**
  * Delete the cache file from the disk
  * @method deleteCacheFile
  * @return {boolean}       true if the file was deleted, false otherwise
  */
  deleteCacheFile() {
    return this._cache.removeCacheFile();
  }
  /**
  * Remove the cache from the file and clear the memory cache
  * @method destroy
  */
  destroy() {
    this._cache.destroy();
  }
  /**
   * Remove and Entry From the Cache
   * @method removeEntry
   * @param filePath - The file path to remove from the cache
   */
  removeEntry(filePath, options) {
    if (this.isRelativePath(filePath)) {
      filePath = this.getAbsolutePath(filePath, { currentWorkingDirectory: options == null ? void 0 : options.currentWorkingDirectory });
      this._cache.removeKey(this.createFileKey(filePath));
    }
    const key = this.createFileKey(filePath, { currentWorkingDirectory: options == null ? void 0 : options.currentWorkingDirectory });
    this._cache.removeKey(key);
  }
  /**
   * Reconcile the cache
   * @method reconcile
   */
  reconcile() {
    const { items } = this._cache;
    for (const item of items) {
      const fileDescriptor = this.getFileDescriptor(item.key);
      if (fileDescriptor.notFound) {
        this._cache.removeKey(item.key);
      }
    }
    this._cache.save();
  }
  /**
   * Check if the file has changed
   * @method hasFileChanged
   * @param filePath - The file path to check
   * @returns {boolean} if the file has changed, false otherwise
   */
  hasFileChanged(filePath) {
    let result = false;
    const fileDescriptor = this.getFileDescriptor(filePath);
    if ((!fileDescriptor.err || !fileDescriptor.notFound) && fileDescriptor.changed) {
      result = true;
    }
    return result;
  }
  /**
   * Get the file descriptor for the file path
   * @method getFileDescriptor
   * @param filePath - The file path to get the file descriptor for
   * @param options - The options for getting the file descriptor
   * @returns The file descriptor
   */
  // eslint-disable-next-line complexity
  getFileDescriptor(filePath, options) {
    var _a, _b, _c;
    let fstat;
    const result = {
      key: this.createFileKey(filePath),
      changed: false,
      meta: {}
    };
    result.meta = this._cache.getKey(result.key) ?? {};
    filePath = this.getAbsolutePath(filePath, { currentWorkingDirectory: options == null ? void 0 : options.currentWorkingDirectory });
    const useCheckSumValue = (options == null ? void 0 : options.useCheckSum) ?? this._useCheckSum;
    const useModifiedTimeValue = (options == null ? void 0 : options.useModifiedTime) ?? this._useModifiedTime;
    try {
      fstat = fs6.statSync(filePath);
      result.meta = {
        size: fstat.size
      };
      result.meta.mtime = fstat.mtime.getTime();
      if (useCheckSumValue) {
        const buffer = fs6.readFileSync(filePath);
        result.meta.hash = this.getHash(buffer);
      }
    } catch (error) {
      this.removeEntry(filePath);
      let notFound = false;
      if (error.message.includes("ENOENT")) {
        notFound = true;
      }
      return {
        key: result.key,
        err: error,
        notFound,
        meta: {}
      };
    }
    const metaCache = this._cache.getKey(result.key);
    if (!metaCache) {
      result.changed = true;
      this._cache.setKey(result.key, result.meta);
      return result;
    }
    if (result.meta.data === void 0) {
      result.meta.data = metaCache.data;
    }
    if (useModifiedTimeValue && (metaCache == null ? void 0 : metaCache.mtime) !== ((_a = result.meta) == null ? void 0 : _a.mtime)) {
      result.changed = true;
    }
    if ((metaCache == null ? void 0 : metaCache.size) !== ((_b = result.meta) == null ? void 0 : _b.size)) {
      result.changed = true;
    }
    if (useCheckSumValue && (metaCache == null ? void 0 : metaCache.hash) !== ((_c = result.meta) == null ? void 0 : _c.hash)) {
      result.changed = true;
    }
    this._cache.setKey(result.key, result.meta);
    return result;
  }
  /**
   * Get the file descriptors for the files
   * @method normalizeEntries
   * @param files?: string[] - The files to get the file descriptors for
   * @returns The file descriptors
   */
  normalizeEntries(files) {
    const result = new Array();
    if (files) {
      for (const file of files) {
        const fileDescriptor = this.getFileDescriptor(file);
        result.push(fileDescriptor);
      }
      return result;
    }
    const keys2 = this.cache.keys();
    for (const key of keys2) {
      const fileDescriptor = this.getFileDescriptor(key);
      if (!fileDescriptor.notFound && !fileDescriptor.err) {
        result.push(fileDescriptor);
      }
    }
    return result;
  }
  /**
   * Analyze the files
   * @method analyzeFiles
   * @param files - The files to analyze
   * @returns {AnalyzedFiles} The analysis of the files
   */
  analyzeFiles(files) {
    const result = {
      changedFiles: [],
      notFoundFiles: [],
      notChangedFiles: []
    };
    const fileDescriptors = this.normalizeEntries(files);
    for (const fileDescriptor of fileDescriptors) {
      if (fileDescriptor.notFound) {
        result.notFoundFiles.push(fileDescriptor.key);
      } else if (fileDescriptor.changed) {
        result.changedFiles.push(fileDescriptor.key);
      } else {
        result.notChangedFiles.push(fileDescriptor.key);
      }
    }
    return result;
  }
  /**
   * Get the updated files
   * @method getUpdatedFiles
   * @param files - The files to get the updated files for
   * @returns {string[]} The updated files
   */
  getUpdatedFiles(files) {
    const result = new Array();
    const fileDescriptors = this.normalizeEntries(files);
    for (const fileDescriptor of fileDescriptors) {
      if (fileDescriptor.changed) {
        result.push(fileDescriptor.key);
      }
    }
    return result;
  }
  /**
   * Get the not found files
   * @method getFileDescriptorsByPath
   * @param filePath - the files that you want to get from a path
   * @returns {FileDescriptor[]} The not found files
   */
  getFileDescriptorsByPath(filePath) {
    const result = new Array();
    const keys2 = this._cache.keys();
    for (const key of keys2) {
      const absolutePath = this.getAbsolutePath(filePath);
      if (absolutePath.startsWith(filePath)) {
        const fileDescriptor = this.getFileDescriptor(key);
        result.push(fileDescriptor);
      }
    }
    return result;
  }
  /**
   * Get the Absolute Path. If it is already absolute it will return the path as is.
   * @method getAbsolutePath
   * @param filePath - The file path to get the absolute path for
   * @param options - The options for getting the absolute path. The current working directory is used if not provided.
   * @returns {string}
   */
  getAbsolutePath(filePath, options) {
    if (this.isRelativePath(filePath)) {
      const currentWorkingDirectory = (options == null ? void 0 : options.currentWorkingDirectory) ?? this._currentWorkingDirectory ?? process.cwd();
      filePath = path11.resolve(currentWorkingDirectory, filePath);
    }
    return filePath;
  }
  /**
   * Rename the absolute path keys. This is used when a directory is changed or renamed.
   * @method renameAbsolutePathKeys
   * @param oldPath - The old path to rename
   * @param newPath - The new path to rename to
   */
  renameAbsolutePathKeys(oldPath, newPath) {
    const keys2 = this._cache.keys();
    for (const key of keys2) {
      if (key.startsWith(oldPath)) {
        const newKey = key.replace(oldPath, newPath);
        const meta = this._cache.getKey(key);
        this._cache.removeKey(key);
        this._cache.setKey(newKey, meta);
      }
    }
  }
};

// src/cli/format-results-cache.js
import { version as prettierVersion } from "../index.mjs";
var optionsHashCache = /* @__PURE__ */ new WeakMap();
var nodeVersion = process.version;
function getHashOfOptions(options) {
  if (optionsHashCache.has(options)) {
    return optionsHashCache.get(options);
  }
  const hash2 = createHash(
    `${prettierVersion}_${nodeVersion}_${(0, import_fast_json_stable_stringify2.default)(options)}`
  );
  optionsHashCache.set(options, hash2);
  return hash2;
}
function getMetadataFromFileDescriptor(fileDescriptor) {
  return fileDescriptor.meta;
}
var _useChecksum, _fileEntryCache, _FormatResultsCache_instances, getFileDescriptor_fn;
var FormatResultsCache = class {
  /**
   * @param {string} cacheFileLocation The path of cache file location. (default: `node_modules/.cache/prettier/.prettier-cache`)
   * @param {string} cacheStrategy
   */
  constructor(cacheFileLocation, cacheStrategy) {
    __privateAdd(this, _FormatResultsCache_instances);
    __privateAdd(this, _useChecksum);
    __privateAdd(this, _fileEntryCache);
    const useChecksum = cacheStrategy === "content";
    try {
      __privateSet(this, _fileEntryCache, FileEntryDefault.createFromFile(
        /* filePath */
        cacheFileLocation,
        useChecksum
      ));
    } catch {
      if (fs7.existsSync(cacheFileLocation)) {
        fs7.unlinkSync(cacheFileLocation);
        __privateSet(this, _fileEntryCache, FileEntryDefault.createFromFile(
          /* filePath */
          cacheFileLocation,
          useChecksum
        ));
      }
    }
    __privateSet(this, _useChecksum, useChecksum);
  }
  /**
   * @param {string} filePath
   * @param {any} options
   */
  existsAvailableFormatResultsCache(filePath, options) {
    var _a;
    const fileDescriptor = __privateMethod(this, _FormatResultsCache_instances, getFileDescriptor_fn).call(this, filePath);
    if (fileDescriptor.notFound || fileDescriptor.changed) {
      return false;
    }
    const hashOfOptions = (_a = getMetadataFromFileDescriptor(fileDescriptor).data) == null ? void 0 : _a.hashOfOptions;
    return hashOfOptions && hashOfOptions === getHashOfOptions(options);
  }
  /**
   * @param {string} filePath
   * @param {any} options
   */
  setFormatResultsCache(filePath, options) {
    const fileDescriptor = __privateMethod(this, _FormatResultsCache_instances, getFileDescriptor_fn).call(this, filePath);
    if (!fileDescriptor.notFound) {
      const meta = getMetadataFromFileDescriptor(fileDescriptor);
      meta.data = { ...meta.data, hashOfOptions: getHashOfOptions(options) };
    }
  }
  /**
   * @param {string} filePath
   */
  removeFormatResultsCache(filePath) {
    __privateGet(this, _fileEntryCache).removeEntry(filePath);
  }
  reconcile() {
    __privateGet(this, _fileEntryCache).reconcile();
  }
};
_useChecksum = new WeakMap();
_fileEntryCache = new WeakMap();
_FormatResultsCache_instances = new WeakSet();
getFileDescriptor_fn = function(filePath) {
  return __privateGet(this, _fileEntryCache).getFileDescriptor(filePath, {
    useModifiedTime: !__privateGet(this, _useChecksum)
  });
};
var format_results_cache_default = FormatResultsCache;

// src/cli/mockable.js
var import_ci_info = __toESM(require_ci_info(), 1);
import fs8 from "fs/promises";
import { performance } from "perf_hooks";
import { __internal as sharedWithCli3 } from "../index.mjs";

// src/cli/utilities/clear-stream-text.js
import readline from "readline";

// node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}

// node_modules/strip-ansi/index.js
var regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}

// node_modules/wcwidth.js/combining.js
var combining_default = [
  [768, 879],
  [1155, 1158],
  [1160, 1161],
  [1425, 1469],
  [1471, 1471],
  [1473, 1474],
  [1476, 1477],
  [1479, 1479],
  [1536, 1539],
  [1552, 1557],
  [1611, 1630],
  [1648, 1648],
  [1750, 1764],
  [1767, 1768],
  [1770, 1773],
  [1807, 1807],
  [1809, 1809],
  [1840, 1866],
  [1958, 1968],
  [2027, 2035],
  [2305, 2306],
  [2364, 2364],
  [2369, 2376],
  [2381, 2381],
  [2385, 2388],
  [2402, 2403],
  [2433, 2433],
  [2492, 2492],
  [2497, 2500],
  [2509, 2509],
  [2530, 2531],
  [2561, 2562],
  [2620, 2620],
  [2625, 2626],
  [2631, 2632],
  [2635, 2637],
  [2672, 2673],
  [2689, 2690],
  [2748, 2748],
  [2753, 2757],
  [2759, 2760],
  [2765, 2765],
  [2786, 2787],
  [2817, 2817],
  [2876, 2876],
  [2879, 2879],
  [2881, 2883],
  [2893, 2893],
  [2902, 2902],
  [2946, 2946],
  [3008, 3008],
  [3021, 3021],
  [3134, 3136],
  [3142, 3144],
  [3146, 3149],
  [3157, 3158],
  [3260, 3260],
  [3263, 3263],
  [3270, 3270],
  [3276, 3277],
  [3298, 3299],
  [3393, 3395],
  [3405, 3405],
  [3530, 3530],
  [3538, 3540],
  [3542, 3542],
  [3633, 3633],
  [3636, 3642],
  [3655, 3662],
  [3761, 3761],
  [3764, 3769],
  [3771, 3772],
  [3784, 3789],
  [3864, 3865],
  [3893, 3893],
  [3895, 3895],
  [3897, 3897],
  [3953, 3966],
  [3968, 3972],
  [3974, 3975],
  [3984, 3991],
  [3993, 4028],
  [4038, 4038],
  [4141, 4144],
  [4146, 4146],
  [4150, 4151],
  [4153, 4153],
  [4184, 4185],
  [4448, 4607],
  [4959, 4959],
  [5906, 5908],
  [5938, 5940],
  [5970, 5971],
  [6002, 6003],
  [6068, 6069],
  [6071, 6077],
  [6086, 6086],
  [6089, 6099],
  [6109, 6109],
  [6155, 6157],
  [6313, 6313],
  [6432, 6434],
  [6439, 6440],
  [6450, 6450],
  [6457, 6459],
  [6679, 6680],
  [6912, 6915],
  [6964, 6964],
  [6966, 6970],
  [6972, 6972],
  [6978, 6978],
  [7019, 7027],
  [7616, 7626],
  [7678, 7679],
  [8203, 8207],
  [8234, 8238],
  [8288, 8291],
  [8298, 8303],
  [8400, 8431],
  [12330, 12335],
  [12441, 12442],
  [43014, 43014],
  [43019, 43019],
  [43045, 43046],
  [64286, 64286],
  [65024, 65039],
  [65056, 65059],
  [65279, 65279],
  [65529, 65531],
  [68097, 68099],
  [68101, 68102],
  [68108, 68111],
  [68152, 68154],
  [68159, 68159],
  [119143, 119145],
  [119155, 119170],
  [119173, 119179],
  [119210, 119213],
  [119362, 119364],
  [917505, 917505],
  [917536, 917631],
  [917760, 917999]
];

// node_modules/wcwidth.js/index.js
var DEFAULTS = {
  nul: 0,
  control: 0
};
function bisearch(ucs) {
  let min = 0;
  let max = combining_default.length - 1;
  let mid;
  if (ucs < combining_default[0][0] || ucs > combining_default[max][1]) return false;
  while (max >= min) {
    mid = Math.floor((min + max) / 2);
    if (ucs > combining_default[mid][1]) min = mid + 1;
    else if (ucs < combining_default[mid][0]) max = mid - 1;
    else return true;
  }
  return false;
}
function wcwidth(ucs, opts) {
  if (ucs === 0) return opts.nul;
  if (ucs < 32 || ucs >= 127 && ucs < 160) return opts.control;
  if (bisearch(ucs)) return 0;
  return 1 + (ucs >= 4352 && (ucs <= 4447 || // Hangul Jamo init. consonants
  ucs == 9001 || ucs == 9002 || ucs >= 11904 && ucs <= 42191 && ucs != 12351 || // CJK ... Yi
  ucs >= 44032 && ucs <= 55203 || // Hangul Syllables
  ucs >= 63744 && ucs <= 64255 || // CJK Compatibility Ideographs
  ucs >= 65040 && ucs <= 65049 || // Vertical forms
  ucs >= 65072 && ucs <= 65135 || // CJK Compatibility Forms
  ucs >= 65280 && ucs <= 65376 || // Fullwidth Forms
  ucs >= 65504 && ucs <= 65510 || ucs >= 131072 && ucs <= 196605 || ucs >= 196608 && ucs <= 262141));
}
function wcswidth(str, opts) {
  let h;
  let l2;
  let s = 0;
  let n2;
  if (typeof str !== "string") return wcwidth(str, opts);
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i);
    if (h >= 55296 && h <= 56319) {
      l2 = str.charCodeAt(++i);
      if (l2 >= 56320 && l2 <= 57343) {
        h = (h - 55296) * 1024 + (l2 - 56320) + 65536;
      } else {
        i--;
      }
    }
    n2 = wcwidth(h, opts);
    if (n2 < 0) return -1;
    s += n2;
  }
  return s;
}
var _ = (str) => wcswidth(str, DEFAULTS);
_.config = (opts = {}) => {
  opts = {
    ...DEFAULTS,
    ...opts
  };
  return (str) => wcswidth(str, opts);
};
var wcwidth_default = _;

// src/cli/utilities/clear-stream-text.js
var countLines = (stream, text) => {
  const columns = stream.columns || 80;
  let lineCount = 0;
  for (const line of stripAnsi(text).split("\n")) {
    lineCount += Math.max(1, Math.ceil(wcwidth_default(line) / columns));
  }
  return lineCount;
};
function clearStreamText(stream, text) {
  const lineCount = countLines(stream, text);
  for (let line = 0; line < lineCount; line++) {
    if (line > 0) {
      readline.moveCursor(stream, 0, -1);
    }
    readline.clearLine(stream, 0);
    readline.cursorTo(stream, 0);
  }
}
var clear_stream_text_default = clearStreamText;

// src/cli/mockable.js
var mockable = sharedWithCli3.utils.createMockable({
  clearStreamText: clear_stream_text_default,
  getTimestamp: performance.now.bind(performance),
  isCI: () => import_ci_info.isCI,
  isStreamTTY: (stream) => stream.isTTY,
  writeFormattedFile: (file, data) => fs8.writeFile(file, data)
});
var mockable_default = mockable.mocked;

// src/cli/options/get-options-for-file.js
var import_dashify2 = __toESM(require_dashify(), 1);
import { resolveConfig } from "../index.mjs";
function getOptions(argv2, detailedOptions) {
  return Object.fromEntries(
    detailedOptions.filter(({ forwardToApi }) => forwardToApi).map(({ forwardToApi, name }) => [forwardToApi, argv2[name]])
  );
}
function cliifyOptions(object2, apiDetailedOptionMap) {
  return Object.fromEntries(
    Object.entries(object2 || {}).map(([key, value]) => {
      const apiOption = apiDetailedOptionMap[key];
      const cliKey = apiOption ? apiOption.name : key;
      return [(0, import_dashify2.default)(cliKey), value];
    })
  );
}
function createApiDetailedOptionMap(detailedOptions) {
  return Object.fromEntries(
    detailedOptions.filter(
      (option) => option.forwardToApi && option.forwardToApi !== option.name
    ).map((option) => [option.forwardToApi, option])
  );
}
function parseArgsToOptions(context, overrideDefaults) {
  const minimistOptions = createMinimistOptions(context.detailedOptions);
  const apiDetailedOptionMap = createApiDetailedOptionMap(
    context.detailedOptions
  );
  return getOptions(
    normalize_cli_options_default(
      minimistParse(context.rawArguments, {
        string: minimistOptions.string,
        boolean: minimistOptions.boolean,
        default: cliifyOptions(overrideDefaults, apiDetailedOptionMap)
      }),
      context.detailedOptions,
      { logger: false }
    ),
    context.detailedOptions
  );
}
async function getOptionsOrDie(context, filePath) {
  try {
    if (context.argv.config === false) {
      context.logger.debug(
        "'--no-config' option found, skip loading config file."
      );
      return null;
    }
    context.logger.debug(
      context.argv.config ? `load config file from '${context.argv.config}'` : `resolve config from '${filePath}'`
    );
    const options = await resolveConfig(filePath, {
      editorconfig: context.argv.editorconfig,
      config: context.argv.config
    });
    context.logger.debug("loaded options `" + JSON.stringify(options) + "`");
    return options;
  } catch (error) {
    context.logger.error(
      `Invalid configuration${filePath ? ` for file "${filePath}"` : ""}:
` + error.message
    );
    process.exit(2);
  }
}
function applyConfigPrecedence(context, options) {
  try {
    switch (context.argv.configPrecedence) {
      case "cli-override":
        return parseArgsToOptions(context, options);
      case "file-override":
        return { ...parseArgsToOptions(context), ...options };
      case "prefer-file":
        return options || parseArgsToOptions(context);
    }
  } catch (error) {
    context.logger.error(error.toString());
    process.exit(2);
  }
}
async function getOptionsForFile(context, filepath) {
  const options = await getOptionsOrDie(context, filepath);
  const hasPlugins = options == null ? void 0 : options.plugins;
  if (hasPlugins) {
    await context.pushContextPlugins(options.plugins);
  }
  const appliedOptions = {
    filepath,
    ...applyConfigPrecedence(
      context,
      options && normalizeOptions(options, context.supportOptions, {
        logger: context.logger
      })
    )
  };
  context.logger.debug(
    `applied config-precedence (${context.argv.configPrecedence}): ${JSON.stringify(appliedOptions)}`
  );
  if (hasPlugins) {
    context.popContextPlugins();
  }
  return appliedOptions;
}
var get_options_for_file_default = getOptionsForFile;

// src/cli/format.js
function diff(a, b) {
  return createTwoFilesPatch("", "", a, b, "", "", { context: 2 });
}
var DebugError = class extends Error {
  name = "DebugError";
};
function handleError(context, filename, error, printedFilename, ignoreUnknown) {
  ignoreUnknown || (ignoreUnknown = context.argv.ignoreUnknown);
  const errorIsUndefinedParseError = error instanceof errors.UndefinedParserError;
  if (errorIsUndefinedParseError && ignoreUnknown) {
    printedFilename == null ? void 0 : printedFilename.clear();
    return true;
  }
  if (printedFilename) {
    process.stdout.write("\n");
  }
  if (errorIsUndefinedParseError) {
    context.logger.error(error.message);
    process.exitCode = 2;
    return;
  }
  const isParseError = Boolean(error == null ? void 0 : error.loc);
  const isValidationError = /^Invalid \S+ value\./u.test(error == null ? void 0 : error.message);
  if (isParseError) {
    context.logger.error(`${filename}: ${String(error)}`);
  } else if (isValidationError || error instanceof errors.ConfigError) {
    context.logger.error(error.message);
    process.exit(1);
  } else if (error instanceof DebugError) {
    context.logger.error(`${filename}: ${error.message}`);
  } else {
    context.logger.error(filename + ": " + (error.stack || error));
  }
  process.exitCode = 2;
}
function writeOutput(context, result, options) {
  process.stdout.write(
    context.argv.debugCheck ? result.filepath : result.formatted
  );
  if (options && options.cursorOffset >= 0) {
    process.stderr.write(result.cursorOffset + "\n");
  }
}
async function listDifferent(context, input, options, filename) {
  if (!context.argv.check && !context.argv.listDifferent) {
    return;
  }
  try {
    if (!await prettier.check(input, options) && !context.argv.write) {
      context.logger.log(filename);
      process.exitCode = 1;
    }
  } catch (error) {
    context.logger.error(error.message);
  }
  return true;
}
async function format3(context, input, opt) {
  if (context.argv.debugPrintDoc) {
    const doc = await prettier.__debug.printToDoc(input, opt);
    return { formatted: await prettier.__debug.formatDoc(doc) + "\n" };
  }
  if (context.argv.debugPrintComments) {
    return {
      formatted: await prettier.format(
        JSON.stringify(
          (await prettier.formatWithCursor(input, opt)).comments || []
        ),
        { parser: "json" }
      )
    };
  }
  if (context.argv.debugPrintAst) {
    const { ast } = await prettier.__debug.parse(input, opt);
    return {
      formatted: JSON.stringify(ast)
    };
  }
  if (context.argv.debugCheck) {
    const pp = await prettier.format(input, opt);
    const pppp = await prettier.format(pp, opt);
    if (pp !== pppp) {
      throw new DebugError(
        "prettier(input) !== prettier(prettier(input))\n" + diff(pp, pppp)
      );
    } else {
      const stringify5 = (obj) => JSON.stringify(obj, null, 2);
      const ast = stringify5(
        (await prettier.__debug.parse(input, opt, { massage: true })).ast
      );
      const past = stringify5(
        (await prettier.__debug.parse(pp, opt, { massage: true })).ast
      );
      if (ast !== past) {
        const MAX_AST_SIZE = 2097152;
        const astDiff = ast.length > MAX_AST_SIZE || past.length > MAX_AST_SIZE ? "AST diff too large to render" : diff(ast, past);
        throw new DebugError(
          "ast(input) !== ast(prettier(input))\n" + astDiff + "\n" + diff(input, pp)
        );
      }
    }
    return { formatted: pp, filepath: opt.filepath || "(stdin)\n" };
  }
  const { performanceTestFlag } = context;
  if (performanceTestFlag == null ? void 0 : performanceTestFlag.debugBenchmark) {
    let Bench;
    try {
      ({ Bench } = await import("tinybench"));
    } catch {
      context.logger.debug(
        "'--debug-benchmark' requires the 'tinybench' package to be installed."
      );
      process.exit(2);
    }
    context.logger.debug(
      "'--debug-benchmark' option found, measuring formatWithCursor with 'tinybench' module."
    );
    const bench = new Bench();
    bench.add("Format", () => prettier.formatWithCursor(input, opt));
    await bench.run();
    const [result] = bench.table();
    context.logger.debug(
      "'--debug-benchmark' measurements for formatWithCursor: " + JSON.stringify(result, void 0, 2)
    );
  } else if (performanceTestFlag == null ? void 0 : performanceTestFlag.debugRepeat) {
    const repeat = performanceTestFlag.debugRepeat;
    context.logger.debug(
      `'${performanceTestFlag.name}' found, running formatWithCursor ${repeat} times.`
    );
    const start = mockable_default.getTimestamp();
    for (let i = 0; i < repeat; ++i) {
      await prettier.formatWithCursor(input, opt);
    }
    const averageMs = (mockable_default.getTimestamp() - start) / repeat;
    const results = {
      repeat,
      hz: 1e3 / averageMs,
      ms: averageMs
    };
    context.logger.debug(
      `'${performanceTestFlag.name}' measurements for formatWithCursor: ${JSON.stringify(
        results,
        null,
        2
      )}`
    );
  }
  return prettier.formatWithCursor(input, opt);
}
async function createIsIgnoredFromContextOrDie(context) {
  try {
    return await createIsIgnoredFunction(
      context.argv.ignorePath,
      context.argv.withNodeModules
    );
  } catch (e) {
    context.logger.error(e.message);
    process.exit(2);
  }
}
async function formatStdin(context) {
  const { filepath } = context.argv;
  try {
    const input = await getStdin();
    const absoluteFilepath = filepath ? path12.resolve(filepath) : void 0;
    let isFileIgnored = false;
    if (absoluteFilepath) {
      const isIgnored = await createIsIgnoredFromContextOrDie(context);
      isFileIgnored = isIgnored(absoluteFilepath);
    }
    if (isFileIgnored) {
      writeOutput(context, { formatted: input });
      return;
    }
    const options = {
      ...await get_options_for_file_default(context, absoluteFilepath),
      // `getOptionsForFile` forwards `--stdin-filepath` directly, which can be a relative path
      filepath: absoluteFilepath
    };
    if (await listDifferent(context, input, options, "(stdin)")) {
      return;
    }
    const formatted = await format3(context, input, options);
    const { performanceTestFlag } = context;
    if (performanceTestFlag) {
      context.logger.log(
        `'${performanceTestFlag.name}' option found, skipped print code to screen.`
      );
      return;
    }
    writeOutput(context, formatted, options);
  } catch (error) {
    handleError(context, filepath || "stdin", error);
  }
}
async function formatFiles(context) {
  const isIgnored = await createIsIgnoredFromContextOrDie(context);
  const cwd3 = process.cwd();
  let numberOfUnformattedFilesFound = 0;
  let numberOfFilesWithError = 0;
  const { performanceTestFlag } = context;
  if (context.argv.check && !performanceTestFlag) {
    context.logger.log("Checking formatting...");
  }
  let formatResultsCache;
  const cacheFilePath = await find_cache_file_default(context.argv.cacheLocation);
  if (context.argv.cache) {
    formatResultsCache = new format_results_cache_default(
      cacheFilePath,
      context.argv.cacheStrategy || "content"
    );
  } else if (!context.argv.cacheLocation) {
    const stat = await statSafe(cacheFilePath);
    if (stat) {
      await fs9.unlink(cacheFilePath);
    }
  }
  const isTTY = mockable_default.isStreamTTY(process.stdout) && !mockable_default.isCI();
  for await (const { error, filename, ignoreUnknown } of expandPatterns(
    context
  )) {
    if (error) {
      context.logger.error(error);
      process.exitCode = 2;
      continue;
    }
    const isFileIgnored = isIgnored(filename);
    if (isFileIgnored && (context.argv.debugCheck || context.argv.write || context.argv.check || context.argv.listDifferent)) {
      continue;
    }
    const options = {
      ...await get_options_for_file_default(context, filename),
      filepath: filename
    };
    const fileNameToDisplay = normalizeToPosix(path12.relative(cwd3, filename));
    let printedFilename;
    if (isTTY) {
      printedFilename = context.logger.log(fileNameToDisplay, {
        newline: false,
        clearable: true
      });
    }
    let input;
    try {
      input = await fs9.readFile(filename, "utf8");
    } catch (error2) {
      context.logger.log("");
      context.logger.error(
        `Unable to read file "${fileNameToDisplay}":
${error2.message}`
      );
      process.exitCode = 2;
      continue;
    }
    if (isFileIgnored) {
      printedFilename == null ? void 0 : printedFilename.clear();
      writeOutput(context, { formatted: input }, options);
      continue;
    }
    const start = mockable_default.getTimestamp();
    const isCacheExists = formatResultsCache == null ? void 0 : formatResultsCache.existsAvailableFormatResultsCache(
      filename,
      options
    );
    let result;
    let output;
    try {
      if (isCacheExists) {
        result = { formatted: input };
      } else {
        result = await format3(context, input, options);
      }
      output = result.formatted;
    } catch (error2) {
      const errorIsIgnored = handleError(
        context,
        fileNameToDisplay,
        error2,
        printedFilename,
        ignoreUnknown
      );
      if (!errorIsIgnored) {
        numberOfFilesWithError += 1;
      }
      continue;
    }
    const isDifferent = output !== input;
    let shouldSetCache = !isDifferent;
    printedFilename == null ? void 0 : printedFilename.clear();
    if (performanceTestFlag) {
      context.logger.log(
        `'${performanceTestFlag.name}' option found, skipped print code or write files.`
      );
      return;
    }
    if (context.argv.write) {
      const timeToDisplay = `${Math.round(mockable_default.getTimestamp() - start)}ms`;
      if (isDifferent) {
        if (!context.argv.check && !context.argv.listDifferent) {
          context.logger.log(`${fileNameToDisplay} ${timeToDisplay}`);
        }
        try {
          await mockable_default.writeFormattedFile(filename, output);
          shouldSetCache = true;
        } catch (error2) {
          context.logger.error(
            `Unable to write file "${fileNameToDisplay}":
${error2.message}`
          );
          process.exitCode = 2;
        }
      } else if (!context.argv.check && !context.argv.listDifferent) {
        const message = `${picocolors.gray(fileNameToDisplay)} ${timeToDisplay} (unchanged)`;
        if (isCacheExists) {
          context.logger.log(`${message} (cached)`);
        } else {
          context.logger.log(message);
        }
      }
    } else if (context.argv.debugCheck) {
      if (result.filepath) {
        context.logger.log(fileNameToDisplay);
      } else {
        process.exitCode = 2;
      }
    } else if (!context.argv.check && !context.argv.listDifferent) {
      writeOutput(context, result, options);
    }
    if (shouldSetCache) {
      formatResultsCache == null ? void 0 : formatResultsCache.setFormatResultsCache(filename, options);
    } else {
      formatResultsCache == null ? void 0 : formatResultsCache.removeFormatResultsCache(filename);
    }
    if (isDifferent) {
      if (context.argv.check) {
        context.logger.warn(fileNameToDisplay);
      } else if (context.argv.listDifferent) {
        context.logger.log(fileNameToDisplay);
      }
      numberOfUnformattedFilesFound += 1;
    }
  }
  formatResultsCache == null ? void 0 : formatResultsCache.reconcile();
  if (context.argv.check) {
    if (numberOfFilesWithError > 0) {
      const files = numberOfFilesWithError === 1 ? "the above file" : `${numberOfFilesWithError} files`;
      context.logger.log(
        `Error occurred when checking code style in ${files}.`
      );
    } else if (numberOfUnformattedFilesFound === 0) {
      context.logger.log("All matched files use Prettier code style!");
    } else {
      const files = numberOfUnformattedFilesFound === 1 ? "the above file" : `${numberOfUnformattedFilesFound} files`;
      context.logger.warn(
        context.argv.write ? `Code style issues fixed in ${files}.` : `Code style issues found in ${files}. Run Prettier with --write to fix.`
      );
    }
  }
  if ((context.argv.check || context.argv.listDifferent) && numberOfUnformattedFilesFound > 0 && !process.exitCode && !context.argv.write) {
    process.exitCode = 1;
  }
}

// src/cli/logger.js
var { argv, env: env2 } = process;
var isStderrColorSupported = !(Boolean(env2.NO_COLOR) || argv.includes("--no-color")) && (Boolean(env2.FORCE_COLOR) || argv.includes("--color") || process.platform === "win32" || process.stderr.isTTY && env2.TERM !== "dumb" || Boolean(env2.CI));
var picocolorsStderr = picocolors.createColors(isStderrColorSupported);
var emptyLogResult = { clear() {
} };
function createLogger(logLevel = "log") {
  return {
    logLevel,
    warn: createLogFunc("warn", "yellow"),
    error: createLogFunc("error", "red"),
    debug: createLogFunc("debug", "blue"),
    log: createLogFunc("log")
  };
  function createLogFunc(loggerName, color) {
    if (!shouldLog(loggerName)) {
      return () => emptyLogResult;
    }
    const stream = process[loggerName === "log" ? "stdout" : "stderr"];
    const colors = loggerName === "log" ? picocolors : picocolorsStderr;
    const prefix = color ? `[${colors[color](loggerName)}] ` : "";
    return (message, options) => {
      options = {
        newline: true,
        clearable: false,
        ...options
      };
      message = string_replace_all_default(
        /* isOptionalObject */
        false,
        message,
        /^/gmu,
        prefix
      ) + (options.newline ? "\n" : "");
      stream.write(message);
      if (options.clearable) {
        return {
          clear: () => mockable_default.clearStreamText(stream, message)
        };
      }
    };
  }
  function shouldLog(loggerName) {
    switch (logLevel) {
      case "silent":
        return false;
      case "debug":
        if (loggerName === "debug") {
          return true;
        }
      // fall through
      case "log":
        if (loggerName === "log") {
          return true;
        }
      // fall through
      case "warn":
        if (loggerName === "warn") {
          return true;
        }
      // fall through
      case "error":
        return loggerName === "error";
    }
  }
}
var logger_default = createLogger;

// src/cli/print-support-info.js
var import_fast_json_stable_stringify3 = __toESM(require_fast_json_stable_stringify(), 1);
import { format as format4, getSupportInfo as getSupportInfo2 } from "../index.mjs";
var sortByName = (array) => array.sort((a, b) => a.name.localeCompare(b.name));
async function printSupportInfo() {
  const { languages, options } = await getSupportInfo2();
  const supportInfo = {
    languages: sortByName(languages),
    options: sortByName(options).map(
      (option) => omit(option, ["cliName", "cliCategory", "cliDescription"])
    )
  };
  const result = await format4((0, import_fast_json_stable_stringify3.default)(supportInfo), { parser: "json" });
  printToScreen(result.trim());
}
var print_support_info_default = printSupportInfo;

// src/cli/constants.evaluate.js
var categoryOrder = [
  "Output",
  "Format",
  "Config",
  "Editor",
  "Other"
];
var usageSummary = "Usage: prettier [options] [file/dir/glob ...]\n\nBy default, output is written to stdout.\nStdin is read if it is piped to Prettier and no files are given.";

// src/cli/usage.js
var OPTION_USAGE_THRESHOLD = 25;
var CHOICE_USAGE_MARGIN = 3;
var CHOICE_USAGE_INDENTATION = 2;
function indent(str, spaces) {
  return string_replace_all_default(
    /* isOptionalObject */
    false,
    str,
    /^/gmu,
    " ".repeat(spaces)
  );
}
function createDefaultValueDisplay(value) {
  return Array.isArray(value) ? `[${value.map(createDefaultValueDisplay).join(", ")}]` : value;
}
function getOptionDefaultValue(context, optionName) {
  var _a;
  const option = context.detailedOptions.find(
    ({ name }) => name === optionName
  );
  if ((option == null ? void 0 : option.default) !== void 0) {
    return option.default;
  }
  const optionCamelName = camelCase(optionName);
  return formatOptionsHiddenDefaults[optionCamelName] ?? ((_a = context.supportOptions.find(
    (option2) => !option2.deprecated && option2.name === optionCamelName
  )) == null ? void 0 : _a.default);
}
function createOptionUsageHeader(option) {
  const name = `--${option.name}`;
  const alias = option.alias ? `-${option.alias},` : null;
  const type = createOptionUsageType(option);
  return [alias, name, type].filter(Boolean).join(" ");
}
function createOptionUsageRow(header, content, threshold) {
  const separator = header.length >= threshold ? `
${" ".repeat(threshold)}` : " ".repeat(threshold - header.length);
  const description = string_replace_all_default(
    /* isOptionalObject */
    false,
    content,
    "\n",
    `
${" ".repeat(threshold)}`
  );
  return `${header}${separator}${description}`;
}
function createOptionUsageType(option) {
  switch (option.type) {
    case "boolean":
      return null;
    case "choice":
      return `<${option.choices.filter((choice) => !choice.deprecated).map((choice) => choice.value).join("|")}>`;
    default:
      return `<${option.type}>`;
  }
}
function createChoiceUsages(choices, margin, indentation) {
  const activeChoices = choices.filter((choice) => !choice.deprecated);
  const threshold = Math.max(0, ...activeChoices.map((choice) => choice.value.length)) + margin;
  return activeChoices.map(
    (choice) => indent(
      createOptionUsageRow(choice.value, choice.description, threshold),
      indentation
    )
  );
}
function createOptionUsage(context, option, threshold) {
  const header = createOptionUsageHeader(option);
  const optionDefaultValue = getOptionDefaultValue(context, option.name);
  return createOptionUsageRow(
    header,
    `${option.description}${optionDefaultValue === void 0 ? "" : `
Defaults to ${createDefaultValueDisplay(optionDefaultValue)}.`}`,
    threshold
  );
}
function getOptionsWithOpposites(options) {
  const optionsWithOpposites = options.map((option) => [
    option.description ? option : null,
    option.oppositeDescription ? {
      ...option,
      name: `no-${option.name}`,
      type: "boolean",
      description: option.oppositeDescription
    } : null
  ]);
  return optionsWithOpposites.flat().filter(Boolean);
}
function createUsage(context) {
  const sortedOptions = context.detailedOptions.sort(
    (optionA, optionB) => optionA.name.localeCompare(optionB.name)
  );
  const options = getOptionsWithOpposites(sortedOptions).filter(
    // remove unnecessary option (e.g. `semi`, `color`, etc.), which is only used for --help <flag>
    (option) => !(option.type === "boolean" && option.oppositeDescription && !option.name.startsWith("no-"))
  );
  const groupedOptions = groupBy(options, (option) => option.category);
  const firstCategories = categoryOrder.slice(0, -1);
  const lastCategories = categoryOrder.slice(-1);
  const restCategories = Object.keys(groupedOptions).filter(
    (category) => !categoryOrder.includes(category)
  );
  const allCategories = [
    ...firstCategories,
    ...restCategories,
    ...lastCategories
  ];
  const optionsUsage = allCategories.map((category) => {
    const categoryOptions = groupedOptions[category].map(
      (option) => createOptionUsage(context, option, OPTION_USAGE_THRESHOLD)
    ).join("\n");
    return `${category} options:

${indent(categoryOptions, 2)}`;
  });
  return [usageSummary, ...optionsUsage, ""].join("\n\n");
}
function createPluginDefaults(pluginDefaults) {
  if (!pluginDefaults || Object.keys(pluginDefaults).length === 0) {
    return "";
  }
  const defaults = Object.entries(pluginDefaults).sort(
    ([pluginNameA], [pluginNameB]) => pluginNameA.localeCompare(pluginNameB)
  ).map(
    ([plugin, value]) => `* ${plugin}: ${createDefaultValueDisplay(value)}`
  ).join("\n");
  return `
Plugin defaults:
${defaults}`;
}
function createDetailedUsage(context, flag) {
  const option = getOptionsWithOpposites(context.detailedOptions).find(
    (option2) => option2.name === flag || option2.alias === flag
  );
  const header = createOptionUsageHeader(option);
  const description = `

${indent(option.description, 2)}`;
  const choices = option.type !== "choice" ? "" : `

Valid options:

${createChoiceUsages(
    option.choices,
    CHOICE_USAGE_MARGIN,
    CHOICE_USAGE_INDENTATION
  ).join("\n")}`;
  const optionDefaultValue = getOptionDefaultValue(context, option.name);
  const defaults = optionDefaultValue !== void 0 ? `

Default: ${createDefaultValueDisplay(optionDefaultValue)}` : "";
  const pluginDefaults = createPluginDefaults(option.pluginDefaults);
  return `${header}${description}${choices}${defaults}${pluginDefaults}`;
}

// src/cli/index.js
async function run(rawArguments = process.argv.slice(2)) {
  let logger = logger_default();
  try {
    const { logLevel } = parseArgvWithoutPlugins(
      rawArguments,
      logger,
      "log-level"
    );
    if (logLevel !== logger.logLevel) {
      logger = logger_default(logLevel);
    }
    const context = new context_default({ rawArguments, logger });
    await context.init();
    if (logger.logLevel !== "debug" && context.performanceTestFlag) {
      context.logger = logger_default("debug");
    }
    await main(context);
  } catch (error) {
    logger.error(error.message);
    process.exitCode = 1;
  }
}
async function main(context) {
  context.logger.debug(`normalized argv: ${JSON.stringify(context.argv)}`);
  if (context.argv.config === false && context.argv.__raw.config !== false || context.argv.config && context.rawArguments.includes("--no-config")) {
    throw new Error("Cannot use --no-config and --config together.");
  }
  if (context.argv.check && context.argv.listDifferent) {
    throw new Error("Cannot use --check and --list-different together.");
  }
  if (context.argv.write && context.argv.debugCheck) {
    throw new Error("Cannot use --write and --debug-check together.");
  }
  if (context.argv.findConfigPath && context.filePatterns.length > 0) {
    throw new Error("Cannot use --find-config-path with multiple files");
  }
  if (context.argv.fileInfo && context.filePatterns.length > 0) {
    throw new Error("Cannot use --file-info with multiple files");
  }
  if (!context.argv.cache && context.argv.cacheStrategy) {
    throw new Error("`--cache-strategy` cannot be used without `--cache`.");
  }
  if (context.argv.version) {
    printToScreen(prettier2.version);
    return;
  }
  if (context.argv.help !== void 0) {
    printToScreen(
      typeof context.argv.help === "string" && context.argv.help !== "" ? createDetailedUsage(context, context.argv.help) : createUsage(context)
    );
    return;
  }
  if (context.argv.supportInfo) {
    return print_support_info_default();
  }
  if (context.argv.findConfigPath) {
    await find_config_path_default(context);
    return;
  }
  if (context.argv.fileInfo) {
    await file_info_default(context);
    return;
  }
  const hasFilePatterns = context.filePatterns.length > 0;
  const useStdin = !hasFilePatterns && (!mockable_default.isStreamTTY(process.stdin) || context.argv.filepath);
  if (useStdin) {
    if (context.argv.cache) {
      throw new Error("`--cache` cannot be used when formatting stdin.");
    }
    await formatStdin(context);
    return;
  }
  if (hasFilePatterns) {
    await formatFiles(context);
    return;
  }
  process.exitCode = 1;
  printToScreen(createUsage(context));
}
export {
  mockable,
  run
};
