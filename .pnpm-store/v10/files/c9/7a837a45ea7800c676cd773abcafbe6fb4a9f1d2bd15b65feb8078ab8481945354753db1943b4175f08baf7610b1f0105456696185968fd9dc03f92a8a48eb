"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    pattern: function() {
        return pattern;
    },
    withoutCapturing: function() {
        return withoutCapturing;
    },
    any: function() {
        return any;
    },
    optional: function() {
        return optional;
    },
    zeroOrMore: function() {
        return zeroOrMore;
    },
    nestedBrackets: function() {
        return nestedBrackets;
    },
    escape: function() {
        return escape;
    }
});
const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|]/g;
const REGEX_HAS_SPECIAL = RegExp(REGEX_SPECIAL.source);
/**
 * @param {string|RegExp|Array<string|RegExp>} source
 */ function toSource(source) {
    source = Array.isArray(source) ? source : [
        source
    ];
    source = source.map((item)=>item instanceof RegExp ? item.source : item);
    return source.join("");
}
function pattern(source) {
    return new RegExp(toSource(source), "g");
}
function withoutCapturing(source) {
    return new RegExp(`(?:${toSource(source)})`, "g");
}
function any(sources) {
    return `(?:${sources.map(toSource).join("|")})`;
}
function optional(source) {
    return `(?:${toSource(source)})?`;
}
function zeroOrMore(source) {
    return `(?:${toSource(source)})*`;
}
function nestedBrackets(open, close, depth = 1) {
    return withoutCapturing([
        escape(open),
        /[^\s]*/,
        depth === 1 ? `[^${escape(open)}${escape(close)}\s]*` : any([
            `[^${escape(open)}${escape(close)}\s]*`,
            nestedBrackets(open, close, depth - 1)
        ]),
        /[^\s]*/,
        escape(close)
    ]);
}
function escape(string) {
    return string && REGEX_HAS_SPECIAL.test(string) ? string.replace(REGEX_SPECIAL, "\\$&") : string || "";
}
