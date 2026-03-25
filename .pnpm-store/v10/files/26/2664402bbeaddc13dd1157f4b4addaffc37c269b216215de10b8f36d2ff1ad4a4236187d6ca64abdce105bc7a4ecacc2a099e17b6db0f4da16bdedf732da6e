"use strict";
var protobuf = require("../..");

/**
 * Debugging utility functions. Only present in debug builds.
 * @namespace
 */
var debug = protobuf.debug = module.exports = {};

var codegen = protobuf.util.codegen;

var debugFnRe = /function ([^(]+)\(([^)]*)\) {/g;

// Counts number of calls to any generated function
function codegen_debug() {
    codegen_debug.supported = codegen.supported;
    codegen_debug.verbose = codegen.verbose;
    var gen = codegen.apply(null, Array.prototype.slice.call(arguments));
    gen.str = (function(str) { return function str_debug() {
        return str.apply(null, Array.prototype.slice.call(arguments)).replace(debugFnRe, "function $1($2) {\n\t$1.calls=($1.calls|0)+1");
    };})(gen.str);
    return gen;
}

/**
 * Returns a list of unused types within the specified root.
 * @param {NamespaceBase} ns Namespace to search
 * @returns {Type[]} Unused types
 */
debug.unusedTypes = function unusedTypes(ns) {

    /* istanbul ignore if */
    if (!(ns instanceof protobuf.Namespace))
        throw TypeError("ns must be a Namespace");

    /* istanbul ignore if */
    if (!ns.nested)
        return [];

    var unused = [];
    for (var names = Object.keys(ns.nested), i = 0; i < names.length; ++i) {
        var nested = ns.nested[names[i]];
        if (nested instanceof protobuf.Type) {
            var calls = (nested.encode.calls|0)
                      + (nested.decode.calls|0)
                      + (nested.verify.calls|0)
                      + (nested.toObject.calls|0)
                      + (nested.fromObject.calls|0);
            if (!calls)
                unused.push(nested);
        } else if (nested instanceof protobuf.Namespace)
            Array.prototype.push.apply(unused, unusedTypes(nested));
    }
    return unused;
};

/**
 * Enables debugging extensions.
 * @returns {undefined}
 */
debug.enable = function enable() {
    protobuf.util.codegen = codegen_debug;
};

/**
 * Disables debugging extensions.
 * @returns {undefined}
 */
debug.disable = function disable() {
    protobuf.util.codegen = codegen;
};
