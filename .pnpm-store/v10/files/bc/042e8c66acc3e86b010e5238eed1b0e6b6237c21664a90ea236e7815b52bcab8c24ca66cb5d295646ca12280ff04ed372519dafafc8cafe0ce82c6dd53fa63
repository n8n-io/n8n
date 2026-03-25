"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variableNameRegex = exports.combineLastMapping = exports.endOfLine = exports.newLine = void 0;
exports.wrapWith = wrapWith;
exports.collectVars = collectVars;
exports.collectIdentifiers = collectIdentifiers;
exports.createTsAst = createTsAst;
exports.generateSfcBlockSection = generateSfcBlockSection;
const scriptSetupRanges_1 = require("../../parsers/scriptSetupRanges");
exports.newLine = `\n`;
exports.endOfLine = `;${exports.newLine}`;
exports.combineLastMapping = { __combineLastMapping: true };
exports.variableNameRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
function* wrapWith(startOffset, endOffset, features, ...wrapCodes) {
    yield ['', 'template', startOffset, features];
    let offset = 1;
    for (const wrapCode of wrapCodes) {
        if (typeof wrapCode !== 'string') {
            offset++;
        }
        yield wrapCode;
    }
    yield ['', 'template', endOffset, { __combineOffsetMapping: offset }];
}
function collectVars(ts, node, ast, results = []) {
    const identifiers = collectIdentifiers(ts, node, []);
    for (const [id] of identifiers) {
        results.push((0, scriptSetupRanges_1.getNodeText)(ts, id, ast));
    }
    return results;
}
function collectIdentifiers(ts, node, results = [], isRest = false) {
    if (ts.isIdentifier(node)) {
        results.push([node, isRest]);
    }
    else if (ts.isObjectBindingPattern(node)) {
        for (const el of node.elements) {
            collectIdentifiers(ts, el.name, results, !!el.dotDotDotToken);
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
//# sourceMappingURL=index.js.map