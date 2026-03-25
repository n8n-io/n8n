"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
var match_path_sync_1 = require("./match-path-sync");
var config_loader_1 = require("./config-loader");
var noOp = function () { return void 0; };
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
        "zlib",
    ];
    var coreModules = {};
    for (var _i = 0, builtinModules_1 = builtinModules; _i < builtinModules_1.length; _i++) {
        var module_1 = builtinModules_1[_i];
        coreModules[module_1] = true;
    }
    return coreModules;
}
/**
 * Installs a custom module load function that can adhere to paths in tsconfig.
 * Returns a function to undo paths registration.
 */
function register(params) {
    var cwd;
    var explicitParams;
    if (params) {
        cwd = params.cwd;
        if (params.baseUrl || params.paths) {
            explicitParams = params;
        }
    }
    else {
        // eslint-disable-next-line
        var minimist = require("minimist");
        var argv = minimist(process.argv.slice(2), {
            // eslint-disable-next-line id-denylist
            string: ["project"],
            alias: {
                project: ["P"],
            },
        });
        cwd = argv.project;
    }
    var configLoaderResult = (0, config_loader_1.configLoader)({
        cwd: cwd !== null && cwd !== void 0 ? cwd : process.cwd(),
        explicitParams: explicitParams,
    });
    if (configLoaderResult.resultType === "failed") {
        console.warn("".concat(configLoaderResult.message, ". tsconfig-paths will be skipped"));
        return noOp;
    }
    var matchPath = (0, match_path_sync_1.createMatchPath)(configLoaderResult.absoluteBaseUrl, configLoaderResult.paths, configLoaderResult.mainFields, configLoaderResult.addMatchAll);
    // Patch node's module loading
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    var Module = require("module");
    // eslint-disable-next-line no-underscore-dangle
    var originalResolveFilename = Module._resolveFilename;
    var coreModules = getCoreModules(Module.builtinModules);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,no-underscore-dangle
    Module._resolveFilename = function (request, _parent) {
        var isCoreModule = coreModules.hasOwnProperty(request);
        if (!isCoreModule) {
            var found = matchPath(request);
            if (found) {
                var modifiedArguments = __spreadArray([found], [].slice.call(arguments, 1), true); // Passes all arguments. Even those that is not specified above.
                return originalResolveFilename.apply(this, modifiedArguments);
            }
        }
        return originalResolveFilename.apply(this, arguments);
    };
    return function () {
        // Return node's module loading to original state.
        // eslint-disable-next-line no-underscore-dangle
        Module._resolveFilename = originalResolveFilename;
    };
}
exports.register = register;
//# sourceMappingURL=register.js.map