"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeframe = getCodeframe;
exports.getLineColLocation = getLineColLocation;
exports.getAstNodeByPointer = getAstNodeByPointer;
const yamlAst = require("yaml-ast-parser");
const ref_utils_1 = require("../ref-utils");
const logger_1 = require("../logger");
const MAX_LINE_LENGTH = 150;
const MAX_CODEFRAME_LINES = 3;
// TODO: temporary
function parsePointer(pointer) {
    return pointer.substr(2).split('/').map(ref_utils_1.unescapePointer);
}
function getCodeframe(location, color) {
    logger_1.colorOptions.enabled = color;
    const { start, end = { line: start.line, col: start.col + 1 }, source } = location;
    const lines = source.getLines();
    const startLineNum = start.line;
    const endLineNum = Math.max(Math.min(end.line, lines.length), start.line);
    let skipLines = Math.max(endLineNum - startLineNum - MAX_CODEFRAME_LINES + 1, 0);
    if (skipLines < 2)
        skipLines = 0; // do not skip one line
    // Lines specified like this: ["prefix", "string"],
    const prefixedLines = [];
    let currentPad = 0;
    for (let i = startLineNum; i <= endLineNum; i++) {
        if (skipLines > 0 && i >= endLineNum - skipLines)
            break;
        const line = lines[i - 1] || '';
        if (line !== '')
            currentPad = padSize(line);
        const startIdx = i === startLineNum ? start.col - 1 : currentPad;
        const endIdx = i === endLineNum ? end.col - 1 : line.length;
        prefixedLines.push([`${i}`, markLine(line, startIdx, endIdx, logger_1.colorize.red)]);
        if (!color)
            prefixedLines.push(['', underlineLine(line, startIdx, endIdx)]);
    }
    if (skipLines > 0) {
        prefixedLines.push([
            `…`,
            `${whitespace(currentPad)}${logger_1.colorize.gray(`< ${skipLines} more lines >`)}`,
        ]);
        // print last line
        prefixedLines.push([
            `${endLineNum}`,
            markLine(lines[endLineNum - 1], -1, end.col - 1, logger_1.colorize.red),
        ]);
        if (!color)
            prefixedLines.push(['', underlineLine(lines[endLineNum - 1], -1, end.col - 1)]);
    }
    return printPrefixedLines([
        [`${startLineNum - 2}`, markLine(lines[startLineNum - 1 - 2])],
        [`${startLineNum - 1}`, markLine(lines[startLineNum - 1 - 1])],
        ...prefixedLines,
        [`${endLineNum + 1}`, markLine(lines[endLineNum - 1 + 1])],
        [`${endLineNum + 2}`, markLine(lines[endLineNum - 1 + 2])],
    ]);
    function markLine(line, startIdx = -1, endIdx = +Infinity, variant = logger_1.colorize.gray) {
        if (!color)
            return line;
        if (!line)
            return line;
        if (startIdx === -1) {
            startIdx = padSize(line);
        }
        endIdx = Math.min(endIdx, line.length);
        return (line.substr(0, startIdx) + variant(line.substring(startIdx, endIdx)) + line.substr(endIdx));
    }
}
function printPrefixedLines(lines) {
    const existingLines = lines.filter(([_, line]) => line !== undefined);
    const padLen = Math.max(...existingLines.map(([prefix]) => prefix.length));
    const dedentLen = Math.min(...existingLines.map(([_, line]) => (line === '' ? Infinity : padSize(line))));
    return existingLines
        .map(([prefix, line]) => logger_1.colorize.gray(leftPad(padLen, prefix) + ' |') +
        (line ? ' ' + limitLineLength(line.substring(dedentLen)) : ''))
        .join('\n');
}
function limitLineLength(line, maxLen = MAX_LINE_LENGTH) {
    const overflowLen = line.length - maxLen;
    if (overflowLen > 0) {
        const charsMoreText = logger_1.colorize.gray(`...<${overflowLen} chars>`);
        return line.substring(0, maxLen - charsMoreText.length) + charsMoreText;
    }
    else {
        return line;
    }
}
function underlineLine(line, startIdx = -1, endIdx = +Infinity) {
    if (startIdx === -1) {
        startIdx = padSize(line);
    }
    endIdx = Math.min(endIdx, line.length);
    return whitespace(startIdx) + '^'.repeat(Math.max(endIdx - startIdx, 1));
}
function whitespace(len) {
    return ' '.repeat(len);
}
function leftPad(len, str) {
    return whitespace(len - str.length) + str;
}
function padSize(line) {
    for (let i = 0; i < line.length; i++) {
        if (line[i] !== ' ')
            return i;
    }
    return line.length;
}
function getLineColLocation(location) {
    if (location.pointer === undefined)
        return location;
    const { source, pointer, reportOnKey } = location;
    const ast = source.getAst(yamlAst.safeLoad);
    const astNode = getAstNodeByPointer(ast, pointer, !!reportOnKey);
    return {
        ...location,
        pointer: undefined,
        ...positionsToLoc(source.body, astNode?.startPosition ?? 1, astNode?.endPosition ?? 1),
    };
}
function positionsToLoc(source, startPos, endPos) {
    let currentLine = 1;
    let currentCol = 1;
    let start = { line: 1, col: 1 };
    for (let i = 0; i < endPos - 1; i++) {
        if (i === startPos - 1) {
            start = { line: currentLine, col: currentCol + 1 };
        }
        if (source[i] === '\n') {
            currentLine++;
            currentCol = 1;
            if (i === startPos - 1) {
                start = { line: currentLine, col: currentCol };
            }
            if (source[i + 1] === '\r')
                i++; // TODO: test it
            continue;
        }
        currentCol++;
    }
    const end = startPos === endPos ? { ...start } : { line: currentLine, col: currentCol + 1 };
    return { start, end };
}
function getAstNodeByPointer(root, pointer, reportOnKey) {
    const pointerSegments = parsePointer(pointer);
    if (root === undefined) {
        return undefined;
    }
    let currentNode = root;
    for (const key of pointerSegments) {
        if (currentNode.kind === yamlAst.Kind.MAP) {
            const mapping = currentNode.mappings.find((m) => m.key.value === key);
            if (!mapping)
                break;
            currentNode = mapping;
            if (!mapping?.value)
                break; // If node has value - return value, if not - return node itself
            currentNode = mapping.value;
        }
        else if (currentNode.kind === yamlAst.Kind.SEQ) {
            const elem = currentNode.items[parseInt(key, 10)];
            if (!elem)
                break;
            currentNode = elem;
        }
    }
    if (!reportOnKey) {
        return currentNode;
    }
    else {
        const parent = currentNode.parent;
        if (!parent)
            return currentNode;
        if (parent.kind === yamlAst.Kind.SEQ) {
            return currentNode;
        }
        else if (parent.kind === yamlAst.Kind.MAPPING) {
            return parent.key;
        }
        else {
            return currentNode;
        }
    }
}
