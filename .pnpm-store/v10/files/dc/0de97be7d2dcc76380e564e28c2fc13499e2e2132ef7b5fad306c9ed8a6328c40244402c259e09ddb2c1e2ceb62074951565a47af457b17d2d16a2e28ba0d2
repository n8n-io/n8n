"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EXTENSIONS = exports.getBinaryMetadata = exports.__experimental_registerGlobalTraceConfig = exports.minifySync = exports.minify = exports.bundle = exports.transformFileSync = exports.transformFile = exports.transformSync = exports.transform = exports.printSync = exports.print = exports.parseFileSync = exports.parseFile = exports.parseSync = exports.parse = exports.experimental_analyze = exports.Compiler = exports.plugins = exports.version = exports.experimental_newMangleNameCache = void 0;
const path_1 = require("path");
// @ts-ignore
var binding_1 = require("./binding");
Object.defineProperty(exports, "experimental_newMangleNameCache", { enumerable: true, get: function () { return binding_1.newMangleNameCache; } });
const spack_1 = require("./spack");
const assert = __importStar(require("assert"));
// Allow overrides to the location of the .node binding file
const bindingsOverride = process.env["SWC_BINARY_PATH"];
// `@swc/core` includes d.ts for the `@swc/wasm` to provide typed fallback bindings
// todo: fix package.json scripts
let fallbackBindings;
const bindings = (() => {
    let binding;
    try {
        binding = !!bindingsOverride
            ? require((0, path_1.resolve)(bindingsOverride))
            : require("./binding.js");
        // If native binding loaded successfully, it should return proper target triple constant.
        const triple = binding.getTargetTriple();
        assert.ok(triple, "Failed to read target triple from native binary.");
        return binding;
    }
    catch (_) {
        // postinstall supposed to install `@swc/wasm` already
        fallbackBindings = require("@swc/wasm");
    }
    finally {
        return binding;
    }
})();
/**
 * Version of the swc binding.
 */
exports.version = require("./package.json").version;
/**
 * @deprecated JavaScript API is deprecated. Please use Wasm plugin instead.
 */
function plugins(ps) {
    return (mod) => {
        let m = mod;
        for (const p of ps) {
            m = p(m);
        }
        return m;
    };
}
exports.plugins = plugins;
class Compiler {
    constructor() {
        this.fallbackBindingsPluginWarningDisplayed = false;
    }
    minify(src, opts, extras) {
        return __awaiter(this, void 0, void 0, function* () {
            if (bindings) {
                return bindings.minify(Buffer.from(!Buffer.isBuffer(src) && typeof src === 'object' ? JSON.stringify(src) : src), toBuffer(opts !== null && opts !== void 0 ? opts : {}), !Buffer.isBuffer(src) && typeof src === 'object', extras !== null && extras !== void 0 ? extras : {});
            }
            else if (fallbackBindings) {
                return fallbackBindings.minify(src, opts);
            }
            throw new Error("Bindings not found.");
        });
    }
    minifySync(src, opts, extras) {
        if (bindings) {
            return bindings.minifySync(Buffer.from(!Buffer.isBuffer(src) && typeof src === 'object' ? JSON.stringify(src) : src), toBuffer(opts !== null && opts !== void 0 ? opts : {}), !Buffer.isBuffer(src) && typeof src === 'object', extras !== null && extras !== void 0 ? extras : {});
        }
        else if (fallbackBindings) {
            return fallbackBindings.minifySync(src, opts);
        }
        throw new Error("Bindings not found.");
    }
    parse(src, options, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || { syntax: "ecmascript" };
            options.syntax = options.syntax || "ecmascript";
            if (!bindings && !!fallbackBindings) {
                throw new Error("Fallback bindings does not support this interface yet.");
            }
            else if (!bindings) {
                throw new Error("Bindings not found.");
            }
            if (bindings) {
                const res = yield bindings.parse(src, toBuffer(options), filename);
                return JSON.parse(res);
            }
            else if (fallbackBindings) {
                return fallbackBindings.parse(src, options);
            }
            throw new Error("Bindings not found.");
        });
    }
    parseSync(src, options, filename) {
        options = options || { syntax: "ecmascript" };
        options.syntax = options.syntax || "ecmascript";
        if (bindings) {
            return JSON.parse(bindings.parseSync(src, toBuffer(options), filename));
        }
        else if (fallbackBindings) {
            return fallbackBindings.parseSync(src, options);
        }
        throw new Error("Bindings not found.");
    }
    parseFile(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || { syntax: "ecmascript" };
            options.syntax = options.syntax || "ecmascript";
            if (!bindings && !!fallbackBindings) {
                throw new Error("Fallback bindings does not support filesystem access.");
            }
            else if (!bindings) {
                throw new Error("Bindings not found.");
            }
            const res = yield bindings.parseFile(path, toBuffer(options));
            return JSON.parse(res);
        });
    }
    parseFileSync(path, options) {
        options = options || { syntax: "ecmascript" };
        options.syntax = options.syntax || "ecmascript";
        if (!bindings && !!fallbackBindings) {
            throw new Error("Fallback bindings does not support filesystem access");
        }
        else if (!bindings) {
            throw new Error("Bindings not found.");
        }
        return JSON.parse(bindings.parseFileSync(path, toBuffer(options)));
    }
    /**
     * Note: this method should be invoked on the compiler instance used
     *  for `parse()` / `parseSync()`.
     */
    print(m, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            if (bindings) {
                return bindings.print(JSON.stringify(m), toBuffer(options));
            }
            else if (fallbackBindings) {
                return fallbackBindings.print(m, options);
            }
            throw new Error("Bindings not found.");
        });
    }
    /**
     * Note: this method should be invoked on the compiler instance used
     *  for `parse()` / `parseSync()`.
     */
    printSync(m, options) {
        options = options || {};
        if (bindings) {
            return bindings.printSync(JSON.stringify(m), toBuffer(options));
        }
        else if (fallbackBindings) {
            return fallbackBindings.printSync(m, options);
        }
        throw new Error("Bindings not found.");
    }
    transform(src, options) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const isModule = typeof src !== "string";
            options = options || {};
            if ((_a = options === null || options === void 0 ? void 0 : options.jsc) === null || _a === void 0 ? void 0 : _a.parser) {
                options.jsc.parser.syntax =
                    (_b = options.jsc.parser.syntax) !== null && _b !== void 0 ? _b : "ecmascript";
            }
            const { plugin } = options, newOptions = __rest(options, ["plugin"]);
            if (bindings) {
                if (plugin) {
                    const m = typeof src === "string"
                        ? yield this.parse(src, (_c = options === null || options === void 0 ? void 0 : options.jsc) === null || _c === void 0 ? void 0 : _c.parser, options.filename)
                        : src;
                    return this.transform(plugin(m), newOptions);
                }
                return bindings.transform(isModule ? JSON.stringify(src) : src, isModule, toBuffer(newOptions));
            }
            else if (fallbackBindings) {
                if (plugin && !this.fallbackBindingsPluginWarningDisplayed) {
                    console.warn(`Fallback bindings does not support legacy plugins, it'll be ignored.`);
                    this.fallbackBindingsPluginWarningDisplayed = true;
                }
                return fallbackBindings.transform(src, options);
            }
            throw new Error("Bindings not found.");
        });
    }
    transformSync(src, options) {
        var _a, _b, _c;
        const isModule = typeof src !== "string";
        options = options || {};
        if ((_a = options === null || options === void 0 ? void 0 : options.jsc) === null || _a === void 0 ? void 0 : _a.parser) {
            options.jsc.parser.syntax =
                (_b = options.jsc.parser.syntax) !== null && _b !== void 0 ? _b : "ecmascript";
        }
        const { plugin } = options, newOptions = __rest(options, ["plugin"]);
        if (bindings) {
            if (plugin) {
                const m = typeof src === "string"
                    ? this.parseSync(src, (_c = options === null || options === void 0 ? void 0 : options.jsc) === null || _c === void 0 ? void 0 : _c.parser, options.filename)
                    : src;
                return this.transformSync(plugin(m), newOptions);
            }
            return bindings.transformSync(isModule ? JSON.stringify(src) : src, isModule, toBuffer(newOptions));
        }
        else if (fallbackBindings) {
            if (plugin && !this.fallbackBindingsPluginWarningDisplayed) {
                console.warn(`Fallback bindings does not support legacy plugins, it'll be ignored.`);
                this.fallbackBindingsPluginWarningDisplayed = true;
            }
            return fallbackBindings.transformSync(isModule ? JSON.stringify(src) : src, options);
        }
        throw new Error("Bindings not found");
    }
    transformFile(path, options) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!bindings && !!fallbackBindings) {
                throw new Error("Fallback bindings does not support filesystem access.");
            }
            else if (!bindings) {
                throw new Error("Bindings not found.");
            }
            options = options || {};
            if ((_a = options === null || options === void 0 ? void 0 : options.jsc) === null || _a === void 0 ? void 0 : _a.parser) {
                options.jsc.parser.syntax =
                    (_b = options.jsc.parser.syntax) !== null && _b !== void 0 ? _b : "ecmascript";
            }
            const { plugin } = options, newOptions = __rest(options, ["plugin"]);
            newOptions.filename = path;
            if (plugin) {
                const m = yield this.parseFile(path, (_c = options === null || options === void 0 ? void 0 : options.jsc) === null || _c === void 0 ? void 0 : _c.parser);
                return this.transform(plugin(m), newOptions);
            }
            return bindings.transformFile(path, false, toBuffer(newOptions));
        });
    }
    transformFileSync(path, options) {
        var _a, _b, _c;
        if (!bindings && !!fallbackBindings) {
            throw new Error("Fallback bindings does not support filesystem access.");
        }
        else if (!bindings) {
            throw new Error("Bindings not found.");
        }
        options = options || {};
        if ((_a = options === null || options === void 0 ? void 0 : options.jsc) === null || _a === void 0 ? void 0 : _a.parser) {
            options.jsc.parser.syntax =
                (_b = options.jsc.parser.syntax) !== null && _b !== void 0 ? _b : "ecmascript";
        }
        const { plugin } = options, newOptions = __rest(options, ["plugin"]);
        newOptions.filename = path;
        if (plugin) {
            const m = this.parseFileSync(path, (_c = options === null || options === void 0 ? void 0 : options.jsc) === null || _c === void 0 ? void 0 : _c.parser);
            return this.transformSync(plugin(m), newOptions);
        }
        return bindings.transformFileSync(path, 
        /* isModule */ false, toBuffer(newOptions));
    }
    bundle(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!bindings && !!fallbackBindings) {
                throw new Error("Fallback bindings does not support this interface yet.");
            }
            else if (!bindings) {
                throw new Error("Bindings not found.");
            }
            const opts = yield (0, spack_1.compileBundleOptions)(options);
            if (Array.isArray(opts)) {
                const all = yield Promise.all(opts.map((opt) => __awaiter(this, void 0, void 0, function* () {
                    return this.bundle(opt);
                })));
                let obj = {};
                for (const o of all) {
                    obj = Object.assign(Object.assign({}, obj), o);
                }
                return obj;
            }
            return bindings.bundle(toBuffer(Object.assign({}, opts)));
        });
    }
}
exports.Compiler = Compiler;
const compiler = new Compiler();
function experimental_analyze(src, options) {
    return bindings.analyze(src, toBuffer(options));
}
exports.experimental_analyze = experimental_analyze;
function parse(src, options) {
    return compiler.parse(src, options);
}
exports.parse = parse;
function parseSync(src, options) {
    return compiler.parseSync(src, options);
}
exports.parseSync = parseSync;
function parseFile(path, options) {
    return compiler.parseFile(path, options);
}
exports.parseFile = parseFile;
function parseFileSync(path, options) {
    return compiler.parseFileSync(path, options);
}
exports.parseFileSync = parseFileSync;
function print(m, options) {
    return compiler.print(m, options);
}
exports.print = print;
function printSync(m, options) {
    return compiler.printSync(m, options);
}
exports.printSync = printSync;
function transform(src, options) {
    return compiler.transform(src, options);
}
exports.transform = transform;
function transformSync(src, options) {
    return compiler.transformSync(src, options);
}
exports.transformSync = transformSync;
function transformFile(path, options) {
    return compiler.transformFile(path, options);
}
exports.transformFile = transformFile;
function transformFileSync(path, options) {
    return compiler.transformFileSync(path, options);
}
exports.transformFileSync = transformFileSync;
function bundle(options) {
    return compiler.bundle(options);
}
exports.bundle = bundle;
function minify(src, opts, extras) {
    return __awaiter(this, void 0, void 0, function* () {
        return compiler.minify(src, opts, extras);
    });
}
exports.minify = minify;
function minifySync(src, opts, extras) {
    return compiler.minifySync(src, opts, extras);
}
exports.minifySync = minifySync;
/**
 * Configure custom trace configuration runs for a process lifecycle.
 * Currently only chromium's trace event format is supported.
 * (https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview)
 *
 * This should be called before calling any binding interfaces exported in `@swc/core`, such as
 * `transform*`, or `parse*` or anything. To avoid breaking changes, each binding fn internally
 * sets default trace subscriber if not set.
 *
 * Unlike other configuration, this does not belong to individual api surface using swcrc
 * or api's parameters (`transform(..., {trace})`). This is due to current tracing subscriber
 * can be configured only once for the global scope. Calling `registerGlobalTraceConfig` multiple
 * time won't cause error, subsequent calls will be ignored.
 *
 * As name implies currently this is experimental interface may change over time without semver
 * major breaking changes. Please provide feedbacks,
 * or bug report at https://github.com/swc-project/swc/discussions.
 */
function __experimental_registerGlobalTraceConfig(traceConfig) {
    // Do not raise error if binding doesn't exists - fallback binding will not support
    // this ever.
    if (bindings) {
        if (traceConfig.type === "traceEvent") {
            bindings.initCustomTraceSubscriber(traceConfig.fileName);
        }
    }
}
exports.__experimental_registerGlobalTraceConfig = __experimental_registerGlobalTraceConfig;
/**
 * @ignore
 *
 * Returns current binary's metadata to determine which binary is actually loaded.
 *
 * This is undocumented interface, does not guarantee stability across `@swc/core`'s semver
 * as internal representation may change anytime. Use it with caution.
 */
function getBinaryMetadata() {
    return {
        target: bindings ? bindings === null || bindings === void 0 ? void 0 : bindings.getTargetTriple() : undefined,
    };
}
exports.getBinaryMetadata = getBinaryMetadata;
exports.DEFAULT_EXTENSIONS = Object.freeze([
    ".js",
    ".jsx",
    ".es6",
    ".es",
    ".mjs",
    ".ts",
    ".tsx",
    ".cts",
    ".mts",
]);
function toBuffer(t) {
    return Buffer.from(JSON.stringify(t));
}
