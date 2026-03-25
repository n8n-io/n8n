"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeUTF8 = exports.escape = exports.encodeNonAsciiHTML = exports.encodeHTML = exports.encodeXML = void 0;
var xml_json_1 = __importDefault(require("./maps/xml.json"));
var encode_trie_1 = require("./encode-trie");
var entities_json_1 = __importDefault(require("./maps/entities.json"));
var htmlReplacer = getCharRegExp(entities_json_1.default, true);
var xmlReplacer = getCharRegExp(xml_json_1.default, true);
var xmlInvalidChars = getCharRegExp(xml_json_1.default, false);
var xmlCodeMap = new Map(Object.keys(xml_json_1.default).map(function (k) { return [
    xml_json_1.default[k].charCodeAt(0),
    "&" + k + ";",
]; }));
/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using XML entities.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
function encodeXML(str) {
    var ret = "";
    var lastIdx = 0;
    var match;
    while ((match = xmlReplacer.exec(str)) !== null) {
        var i = match.index;
        var char = str.charCodeAt(i);
        var next = xmlCodeMap.get(char);
        if (next) {
            ret += str.substring(lastIdx, i) + next;
            lastIdx = i + 1;
        }
        else {
            ret += str.substring(lastIdx, i) + "&#x" + encode_trie_1.getCodePoint(str, i).toString(16) + ";";
            // Increase by 1 if we have a surrogate pair
            lastIdx = xmlReplacer.lastIndex += Number((char & 65408) === 0xd800);
        }
    }
    return ret + str.substr(lastIdx);
}
exports.encodeXML = encodeXML;
/**
 * Encodes all entities and non-ASCII characters in the input.
 *
 * This includes characters that are valid ASCII characters in HTML documents.
 * For example `#` will be encoded as `&num;`. To get a more compact output,
 * consider using the `encodeNonAsciiHTML` function.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
function encodeHTML(data) {
    return encode_trie_1.encodeHTMLTrieRe(htmlReplacer, data);
}
exports.encodeHTML = encodeHTML;
/**
 * Encodes all non-ASCII characters, as well as characters not valid in HTML
 * documents using HTML entities.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
function encodeNonAsciiHTML(data) {
    return encode_trie_1.encodeHTMLTrieRe(xmlReplacer, data);
}
exports.encodeNonAsciiHTML = encodeNonAsciiHTML;
function getCharRegExp(map, nonAscii) {
    // Collect the start characters of all entities
    var chars = Object.keys(map)
        .map(function (k) { return "\\" + map[k].charAt(0); })
        .filter(function (v) { return !nonAscii || v.charCodeAt(1) < 128; })
        .sort(function (a, b) { return a.charCodeAt(1) - b.charCodeAt(1); })
        // Remove duplicates
        .filter(function (v, i, a) { return v !== a[i + 1]; });
    // Add ranges to single characters.
    for (var start = 0; start < chars.length - 1; start++) {
        // Find the end of a run of characters
        var end = start;
        while (end < chars.length - 1 &&
            chars[end].charCodeAt(1) + 1 === chars[end + 1].charCodeAt(1)) {
            end += 1;
        }
        var count = 1 + end - start;
        // We want to replace at least three characters
        if (count < 3)
            continue;
        chars.splice(start, count, chars[start] + "-" + chars[end]);
    }
    return new RegExp("[" + chars.join("") + (nonAscii ? "\\x80-\\uFFFF" : "") + "]", "g");
}
/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using numeric hexadecimal reference (eg. `&#xfc;`).
 *
 * Have a look at `escapeUTF8` if you want a more concise output at the expense
 * of reduced transportability.
 *
 * @param data String to escape.
 */
exports.escape = encodeXML;
/**
 * Encodes all characters not valid in XML documents using XML entities.
 *
 * Note that the output will be character-set dependent.
 *
 * @param data String to escape.
 */
function escapeUTF8(data) {
    var match;
    var lastIdx = 0;
    var result = "";
    while ((match = xmlInvalidChars.exec(data))) {
        if (lastIdx !== match.index) {
            result += data.substring(lastIdx, match.index);
        }
        // We know that this chararcter will be in `inverseXML`
        result += xmlCodeMap.get(match[0].charCodeAt(0));
        // Every match will be of length 1
        lastIdx = match.index + 1;
    }
    return result + data.substring(lastIdx);
}
exports.escapeUTF8 = escapeUTF8;
