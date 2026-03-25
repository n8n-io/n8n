"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = void 0;
var util_1 = require("./util");
var defaults = {
    parser: require("../parsers/esprima"),
    tabWidth: 4,
    useTabs: false,
    reuseWhitespace: true,
    lineTerminator: util_1.getLineTerminator(),
    wrapColumn: 74,
    sourceFileName: null,
    sourceMapName: null,
    sourceRoot: null,
    inputSourceMap: null,
    range: false,
    tolerant: true,
    quote: null,
    trailingComma: false,
    arrayBracketSpacing: false,
    objectCurlySpacing: true,
    arrowParensAlways: false,
    flowObjectCommas: true,
    tokens: true,
};
var hasOwn = defaults.hasOwnProperty;
// Copy options and fill in default values.
function normalize(opts) {
    var options = opts || defaults;
    function get(key) {
        return hasOwn.call(options, key) ? options[key] : defaults[key];
    }
    return {
        tabWidth: +get("tabWidth"),
        useTabs: !!get("useTabs"),
        reuseWhitespace: !!get("reuseWhitespace"),
        lineTerminator: get("lineTerminator"),
        wrapColumn: Math.max(get("wrapColumn"), 0),
        sourceFileName: get("sourceFileName"),
        sourceMapName: get("sourceMapName"),
        sourceRoot: get("sourceRoot"),
        inputSourceMap: get("inputSourceMap"),
        parser: get("esprima") || get("parser"),
        range: get("range"),
        tolerant: get("tolerant"),
        quote: get("quote"),
        trailingComma: get("trailingComma"),
        arrayBracketSpacing: get("arrayBracketSpacing"),
        objectCurlySpacing: get("objectCurlySpacing"),
        arrowParensAlways: get("arrowParensAlways"),
        flowObjectCommas: get("flowObjectCommas"),
        tokens: !!get("tokens"),
    };
}
exports.normalize = normalize;
