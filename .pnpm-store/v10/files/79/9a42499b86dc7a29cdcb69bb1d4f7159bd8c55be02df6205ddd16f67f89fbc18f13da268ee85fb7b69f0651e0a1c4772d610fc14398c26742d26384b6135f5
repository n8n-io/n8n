"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifierRegex = exports.combineLastMapping = exports.endOfLine = exports.newLine = void 0;
exports.collectVars = collectVars;
exports.collectIdentifiers = collectIdentifiers;
exports.normalizeAttributeValue = normalizeAttributeValue;
exports.createTsAst = createTsAst;
exports.generateSfcBlockSection = generateSfcBlockSection;
exports.generateSfcBlockAttrValue = generateSfcBlockAttrValue;
const scriptSetupRanges_1 = require("../../parsers/scriptSetupRanges");
exports.newLine = `\n`;
exports.endOfLine = `;${exports.newLine}`;
exports.combineLastMapping = { __combineOffset: 1 };
exports.identifierRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
function collectVars(ts, node, ast, results = []) {
    const identifiers = collectIdentifiers(ts, node, []);
    for (const { id } of identifiers) {
        results.push((0, scriptSetupRanges_1.getNodeText)(ts, id, ast));
    }
    return results;
}
function collectIdentifiers(ts, node, results = [], isRest = false, initializer = undefined) {
    if (ts.isIdentifier(node)) {
        results.push({ id: node, isRest, initializer });
    }
    else if (ts.isObjectBindingPattern(node)) {
        for (const el of node.elements) {
            collectIdentifiers(ts, el.name, results, !!el.dotDotDotToken, el.initializer);
        }
    }
    else if (ts.isArrayBindingPattern(node)) {
        for (const el of node.elements) {
            if (ts.isBindingElement(el)) {
                collectIdentifiers(ts, el.name, results, !!el.dotDotDotToken);
            }
        }
    }
    else {
        ts.forEachChild(node, node => collectIdentifiers(ts, node, results, false));
    }
    return results;
}
function normalizeAttributeValue(node) {
    let offset = node.loc.start.offset;
    let content = node.loc.source;
    if ((content.startsWith(`'`) && content.endsWith(`'`))
        || (content.startsWith(`"`) && content.endsWith(`"`))) {
        offset++;
        content = content.slice(1, -1);
    }
    return [content, offset];
}
function createTsAst(ts, astHolder, text) {
    if (astHolder.__volar_ast_text !== text) {
        astHolder.__volar_ast_text = text;
        astHolder.__volar_ast = ts.createSourceFile('/a.ts', text, 99);
    }
    return astHolder.__volar_ast;
}
function generateSfcBlockSection(block, start, end, features) {
    return [
        block.content.slice(start, end),
        block.name,
        start,
        features,
    ];
}
function* generateSfcBlockAttrValue(src, text, features) {
    const { offset, quotes } = src;
    if (!quotes) {
        yield [``, 'main', offset, { verification: true }];
    }
    yield [
        `'${text}'`,
        'main',
        quotes ? offset - 1 : offset,
        features
    ];
    if (!quotes) {
        yield [``, 'main', offset + text.length, { __combineOffset: 2 }];
    }
}
//# sourceMappingURL=index.js.map