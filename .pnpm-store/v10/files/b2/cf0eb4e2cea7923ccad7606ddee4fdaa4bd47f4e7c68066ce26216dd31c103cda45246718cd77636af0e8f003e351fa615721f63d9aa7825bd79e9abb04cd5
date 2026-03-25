"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfStop = exports.perfStart = exports.getChildNodes = exports.parseHTML = exports.truthyStr = exports.getTrailingWhitespaceInfo = exports.tagSurround = exports.splitSpecial = exports.isWhiteSpaceOnly = exports.surround = exports.trimNewLines = void 0;
const config_1 = require("./config");
/* ****************************************************************************************************************** */
// region: String Utils
/* ****************************************************************************************************************** */
const trimNewLines = (s) => s.replace(/^\n+|\n+$/g, '');
exports.trimNewLines = trimNewLines;
const surround = (source, surroundStr) => `${surroundStr}${source}${surroundStr}`;
exports.surround = surround;
const isWhiteSpaceOnly = (s) => !/\S/.test(s);
exports.isWhiteSpaceOnly = isWhiteSpaceOnly;
/**
 * Split string, preserving specific newline used for each line
 */
function splitSpecial(s) {
    const lines = [];
    const strLen = s.length;
    for (let i = 0, startPos = 0; i < strLen; ++i) {
        let char = s.charAt(i);
        let newLineChar = '';
        if (char === '\r')
            newLineChar = (s.charAt(i + 1) === '\n') ? '\r\n' : char;
        else if (char === '\n')
            newLineChar = char;
        const endPos = newLineChar ? i :
            i === (strLen - 1) ? i + 1 :
                undefined;
        if (endPos === undefined)
            continue;
        lines.push({
            text: s.slice(startPos, endPos),
            newLineChar
        });
        startPos = endPos + newLineChar.length;
        if (newLineChar.length > 1)
            ++i;
    }
    return lines;
}
exports.splitSpecial = splitSpecial;
/**
 * Surround tag content with delimiter (moving any leading/trailing space to outside the tag
 */
function tagSurround(content, surroundStr) {
    // If un-escaped surroundStr already occurs, remove all instances
    // See: https://github.com/crosstype/node-html-markdown/issues/18
    const nestedSurroundStrIndex = content.indexOf(surroundStr);
    if (nestedSurroundStrIndex >= 0)
        content = content.replace(new RegExp(`([^\\\\])\\${surroundStr.split('').join('\\')}`, 'gm'), '$1');
    const lines = splitSpecial(content);
    let res = '';
    for (const { text, newLineChar } of lines) {
        let i = 0;
        let startPos = undefined;
        let endPos = undefined;
        while (i >= 0 && i < text.length) {
            if (/[\S]/.test(text[i])) {
                if (startPos === undefined) {
                    startPos = i;
                    i = text.length;
                }
                else {
                    endPos = i;
                    i = NaN;
                }
            }
            if (startPos === undefined)
                ++i;
            else
                --i;
        }
        // If whole string is non-breaking whitespace, don't surround it
        if (startPos === undefined) {
            res += text + newLineChar;
            continue;
        }
        if (endPos === undefined)
            endPos = text.length - 1;
        const leadingSpace = startPos > 0 ? text[startPos - 1] : '';
        const trailingSpace = endPos < (text.length - 1) ? text[endPos + 1] : '';
        const slicedText = text.slice(startPos, endPos + 1);
        res += leadingSpace + surroundStr + slicedText + surroundStr + trailingSpace + newLineChar;
    }
    return res;
}
exports.tagSurround = tagSurround;
const getTrailingWhitespaceInfo = (s) => {
    const res = { whitespace: 0, newLines: 0 };
    const minI = Math.max(s.length - 10, 0);
    for (let i = s.length - 1; i >= minI; --i) {
        const token = s.slice(i, i + 1);
        if (!/\s/.test(token))
            break;
        ++res.whitespace;
        if (['\r', '\n'].includes(token))
            ++res.newLines;
    }
    return res;
};
exports.getTrailingWhitespaceInfo = getTrailingWhitespaceInfo;
/**
 * If value is truthy, returns `value` (or `v` if no `value` provided), otherwise, returns an empty string
 * @param v - Var to check for truthiness
 * @param value - Value to return if true
 */
const truthyStr = (v, value) => v ? ((value !== undefined) ? value : String(v)) : '';
exports.truthyStr = truthyStr;
// endregion
/* ****************************************************************************************************************** */
// region: Parser
/* ****************************************************************************************************************** */
function tryParseWithNativeDom(html) {
    try {
        if (!((window === null || window === void 0 ? void 0 : window.DOMParser) && (new window.DOMParser()).parseFromString('', 'text/html')))
            return void 0;
    }
    catch (_a) {
        return void 0;
    }
    /* Get a document */
    let doc;
    try {
        doc = document.implementation.createHTMLDocument('').open();
    }
    catch (e) {
        const { ActiveXObject } = window;
        if (ActiveXObject) {
            const doc = ActiveXObject('htmlfile');
            doc.designMode = 'on'; // disable on-page scripts
            return doc.open();
        }
        throw e;
    }
    // Prepare document, ensuring we have a wrapper node
    doc.write('<node-html-markdown>' + html + '</node-html-markdown>');
    doc.close();
    return doc.documentElement;
}
const getNodeHtmlParser = () => {
    try {
        return require('node-html-parser').parse;
    }
    catch (_a) {
        return undefined;
    }
};
/**
 * Parser string to HTMLElement
 */
function parseHTML(html, options) {
    let nodeHtmlParse;
    /* If specified, try to parse with native engine, fallback to node-html-parser */
    perfStart('parse');
    let el;
    if (options.preferNativeParser) {
        try {
            el = tryParseWithNativeDom(html);
        }
        catch (e) {
            nodeHtmlParse = getNodeHtmlParser();
            if (nodeHtmlParse)
                console.warn('Native DOM parser encountered an error during parse', e);
            else
                throw e;
        }
    }
    else
        nodeHtmlParse = getNodeHtmlParser();
    if (!el)
        el = nodeHtmlParse(html, config_1.nodeHtmlParserConfig);
    perfStop('parse');
    return el;
}
exports.parseHTML = parseHTML;
function getChildNodes(node) {
    if (!isNodeList(node.childNodes))
        return node.childNodes;
    const res = [];
    node.childNodes.forEach(n => res.push(n));
    return res;
    function isNodeList(v) {
        return (v != null) || (typeof v[Symbol.iterator] === 'function');
    }
}
exports.getChildNodes = getChildNodes;
function perfStart(label) {
    if (process.env.LOG_PERF)
        console.time(label);
}
exports.perfStart = perfStart;
function perfStop(label) {
    if (process.env.LOG_PERF)
        console.timeEnd(label);
}
exports.perfStop = perfStop;
// endregion
//# sourceMappingURL=utilities.js.map