"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrie = exports.encodeHTMLTrieRe = exports.getCodePoint = void 0;
var entities_json_1 = __importDefault(require("./maps/entities.json"));
function isHighSurrugate(c) {
    return (c & 64512 /* Mask */) === 55296 /* High */;
}
// For compatibility with node < 4, we wrap `codePointAt`
exports.getCodePoint = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
String.prototype.codePointAt != null
    ? function (str, index) { return str.codePointAt(index); }
    : // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        function (c, index) {
            return isHighSurrugate(c.charCodeAt(index))
                ? (c.charCodeAt(index) - 55296 /* High */) * 0x400 +
                    c.charCodeAt(index + 1) -
                    0xdc00 +
                    0x10000
                : c.charCodeAt(index);
        };
var htmlTrie = getTrie(entities_json_1.default);
function encodeHTMLTrieRe(regExp, str) {
    var _a;
    var ret = "";
    var lastIdx = 0;
    var match;
    while ((match = regExp.exec(str)) !== null) {
        var i = match.index;
        var char = str.charCodeAt(i);
        var next = htmlTrie.get(char);
        if (next) {
            if (next.next != null && i + 1 < str.length) {
                var value = (_a = next.next.get(str.charCodeAt(i + 1))) === null || _a === void 0 ? void 0 : _a.value;
                if (value != null) {
                    ret += str.substring(lastIdx, i) + value;
                    regExp.lastIndex += 1;
                    lastIdx = i + 2;
                    continue;
                }
            }
            ret += str.substring(lastIdx, i) + next.value;
            lastIdx = i + 1;
        }
        else {
            ret += str.substring(lastIdx, i) + "&#x" + exports.getCodePoint(str, i).toString(16) + ";";
            // Increase by 1 if we have a surrogate pair
            lastIdx = regExp.lastIndex += Number(isHighSurrugate(char));
        }
    }
    return ret + str.substr(lastIdx);
}
exports.encodeHTMLTrieRe = encodeHTMLTrieRe;
function getTrie(map) {
    var _a, _b, _c, _d;
    var trie = new Map();
    for (var _i = 0, _e = Object.keys(map); _i < _e.length; _i++) {
        var value = _e[_i];
        var key = map[value];
        // Resolve the key
        var lastMap = trie;
        for (var i = 0; i < key.length - 1; i++) {
            var char = key.charCodeAt(i);
            var next = (_a = lastMap.get(char)) !== null && _a !== void 0 ? _a : {};
            lastMap.set(char, next);
            lastMap = (_b = next.next) !== null && _b !== void 0 ? _b : (next.next = new Map());
        }
        var val = (_c = lastMap.get(key.charCodeAt(key.length - 1))) !== null && _c !== void 0 ? _c : {};
        (_d = val.value) !== null && _d !== void 0 ? _d : (val.value = "&" + value + ";");
        lastMap.set(key.charCodeAt(key.length - 1), val);
    }
    return trie;
}
exports.getTrie = getTrie;
