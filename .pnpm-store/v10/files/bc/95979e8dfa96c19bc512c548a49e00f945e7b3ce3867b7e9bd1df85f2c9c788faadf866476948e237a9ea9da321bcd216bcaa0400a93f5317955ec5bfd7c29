"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = encode;
exports.decodeEntity = decodeEntity;
exports.decode = decode;
var named_references_js_1 = require("./named-references.js");
var numeric_unicode_map_js_1 = require("./numeric-unicode-map.js");
var surrogate_pairs_js_1 = require("./surrogate-pairs.js");
var allNamedReferences = __assign(__assign({}, named_references_js_1.namedReferences), { all: named_references_js_1.namedReferences.html5 });
var encodeRegExps = {
    specialChars: /[<>'"&]/g,
    nonAscii: /[<>'"&\u0080-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
    nonAsciiPrintable: /[<>'"&\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
    nonAsciiPrintableOnly: /[\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
    extensive: /[\x01-\x0c\x0e-\x1f\x21-\x2c\x2e-\x2f\x3a-\x40\x5b-\x60\x7b-\x7d\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g
};
var defaultEncodeOptions = {
    mode: 'specialChars',
    level: 'all',
    numeric: 'decimal'
};
/** Encodes all the necessary (specified by `level`) characters in the text */
function encode(text, _a) {
    var _b = _a === void 0 ? defaultEncodeOptions : _a, _c = _b.mode, mode = _c === void 0 ? 'specialChars' : _c, _d = _b.numeric, numeric = _d === void 0 ? 'decimal' : _d, _e = _b.level, level = _e === void 0 ? 'all' : _e;
    if (!text) {
        return '';
    }
    var encodeRegExp = encodeRegExps[mode];
    var references = allNamedReferences[level].characters;
    var isHex = numeric === 'hexadecimal';
    return String.prototype.replace.call(text, encodeRegExp, function (input) {
        var result = references[input];
        if (!result) {
            var code = input.length > 1 ? (0, surrogate_pairs_js_1.getCodePoint)(input, 0) : input.charCodeAt(0);
            result = (isHex ? '&#x' + code.toString(16) : '&#' + code) + ';';
        }
        return result;
    });
}
var defaultDecodeOptions = {
    scope: 'body',
    level: 'all'
};
var strict = /&(?:#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+);/g;
var attribute = /&(?:#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+)[;=]?/g;
var baseDecodeRegExps = {
    xml: {
        strict: strict,
        attribute: attribute,
        body: named_references_js_1.bodyRegExps.xml
    },
    html4: {
        strict: strict,
        attribute: attribute,
        body: named_references_js_1.bodyRegExps.html4
    },
    html5: {
        strict: strict,
        attribute: attribute,
        body: named_references_js_1.bodyRegExps.html5
    }
};
var decodeRegExps = __assign(__assign({}, baseDecodeRegExps), { all: baseDecodeRegExps.html5 });
var fromCharCode = String.fromCharCode;
var outOfBoundsChar = fromCharCode(65533);
var defaultDecodeEntityOptions = {
    level: 'all'
};
function getDecodedEntity(entity, references, isAttribute, isStrict) {
    var decodeResult = entity;
    var decodeEntityLastChar = entity[entity.length - 1];
    if (isAttribute && decodeEntityLastChar === '=') {
        decodeResult = entity;
    }
    else if (isStrict && decodeEntityLastChar !== ';') {
        decodeResult = entity;
    }
    else {
        var decodeResultByReference = references[entity];
        if (decodeResultByReference) {
            decodeResult = decodeResultByReference;
        }
        else if (entity[0] === '&' && entity[1] === '#') {
            var decodeSecondChar = entity[2];
            var decodeCode = decodeSecondChar == 'x' || decodeSecondChar == 'X'
                ? parseInt(entity.substr(3), 16)
                : parseInt(entity.substr(2));
            decodeResult =
                decodeCode >= 0x10ffff
                    ? outOfBoundsChar
                    : decodeCode > 65535
                        ? (0, surrogate_pairs_js_1.fromCodePoint)(decodeCode)
                        : fromCharCode(numeric_unicode_map_js_1.numericUnicodeMap[decodeCode] || decodeCode);
        }
    }
    return decodeResult;
}
/** Decodes a single entity */
function decodeEntity(entity, _a) {
    var _b = _a === void 0 ? defaultDecodeEntityOptions : _a, _c = _b.level, level = _c === void 0 ? 'all' : _c;
    if (!entity) {
        return '';
    }
    return getDecodedEntity(entity, allNamedReferences[level].entities, false, false);
}
/** Decodes all entities in the text */
function decode(text, _a) {
    var _b = _a === void 0 ? defaultDecodeOptions : _a, _c = _b.level, level = _c === void 0 ? 'all' : _c, _d = _b.scope, scope = _d === void 0 ? level === 'xml' ? 'strict' : 'body' : _d;
    if (!text) {
        return '';
    }
    var decodeRegExp = decodeRegExps[level][scope];
    var references = allNamedReferences[level].entities;
    var isAttribute = scope === 'attribute';
    var isStrict = scope === 'strict';
    return text.replace(decodeRegExp, function (entity) { return getDecodedEntity(entity, references, isAttribute, isStrict); });
}
//# sourceMappingURL=index.js.map