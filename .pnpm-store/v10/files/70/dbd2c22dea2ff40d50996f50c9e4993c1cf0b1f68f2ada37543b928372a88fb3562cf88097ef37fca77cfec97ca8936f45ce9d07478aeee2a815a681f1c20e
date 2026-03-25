"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInterpolation = generateInterpolation;
exports.forEachInterpolationSegment = forEachInterpolationSegment;
const shared_1 = require("@vue/shared");
const scriptSetupRanges_1 = require("../../parsers/scriptSetupRanges");
const common_1 = require("../common");
function* generateInterpolation(options, ctx, _code, astHolder, start, data, prefix, suffix) {
    const code = prefix + _code + suffix;
    const ast = (0, common_1.createTsAst)(options.ts, astHolder, code);
    for (let [section, offset, type] of forEachInterpolationSegment(options.ts, options.destructuredPropNames, options.templateRefNames, ctx, code, start !== undefined ? start - prefix.length : undefined, ast)) {
        if (offset === undefined) {
            yield section;
        }
        else {
            offset -= prefix.length;
            let addSuffix = '';
            const overLength = offset + section.length - _code.length;
            if (overLength > 0) {
                addSuffix = section.substring(section.length - overLength);
                section = section.substring(0, section.length - overLength);
            }
            if (offset < 0) {
                yield section.substring(0, -offset);
                section = section.substring(-offset);
                offset = 0;
            }
            const shouldSkip = section.length === 0 && (type === 'startText' || type === 'endText');
            if (!shouldSkip) {
                if (start !== undefined
                    && data) {
                    yield [
                        section,
                        'template',
                        start + offset,
                        type === 'errorMappingOnly'
                            ? ctx.codeFeatures.verification
                            : typeof data === 'function' ? data(start + offset) : data,
                    ];
                }
                else {
                    yield section;
                }
            }
            yield addSuffix;
        }
    }
}
function* forEachInterpolationSegment(ts, destructuredPropNames, templateRefNames, ctx, code, offset, ast) {
    let ctxVars = [];
    const varCb = (id, isShorthand) => {
        const text = (0, scriptSetupRanges_1.getNodeText)(ts, id, ast);
        if (ctx.hasLocalVariable(text) ||
            // https://github.com/vuejs/core/blob/245230e135152900189f13a4281302de45fdcfaa/packages/compiler-core/src/transforms/transformExpression.ts#L342-L352
            (0, shared_1.isGloballyWhitelisted)(text) ||
            text === 'require' ||
            text.startsWith('__VLS_')) {
            // localVarOffsets.push(localVar.getStart(ast));
        }
        else {
            ctxVars.push({
                text,
                isShorthand: isShorthand,
                offset: (0, scriptSetupRanges_1.getStartEnd)(ts, id, ast).start,
            });
            if (destructuredPropNames?.has(text)) {
                return;
            }
            if (offset !== undefined) {
                ctx.accessExternalVariable(text, offset + (0, scriptSetupRanges_1.getStartEnd)(ts, id, ast).start);
            }
            else {
                ctx.accessExternalVariable(text);
            }
        }
    };
    ts.forEachChild(ast, node => walkIdentifiers(ts, node, ast, varCb, ctx));
    ctxVars = ctxVars.sort((a, b) => a.offset - b.offset);
    if (ctxVars.length) {
        if (ctxVars[0].isShorthand) {
            yield [code.substring(0, ctxVars[0].offset + ctxVars[0].text.length), 0];
            yield [': ', undefined];
        }
        else if (ctxVars[0].offset > 0) {
            yield [code.substring(0, ctxVars[0].offset), 0, 'startText'];
        }
        for (let i = 0; i < ctxVars.length - 1; i++) {
            const curVar = ctxVars[i];
            const nextVar = ctxVars[i + 1];
            yield* generateVar(code, destructuredPropNames, templateRefNames, curVar, nextVar);
            if (nextVar.isShorthand) {
                yield [code.substring(curVar.offset + curVar.text.length, nextVar.offset + nextVar.text.length), curVar.offset + curVar.text.length];
                yield [': ', undefined];
            }
            else {
                yield [code.substring(curVar.offset + curVar.text.length, nextVar.offset), curVar.offset + curVar.text.length];
            }
        }
        const lastVar = ctxVars.at(-1);
        yield* generateVar(code, destructuredPropNames, templateRefNames, lastVar);
        if (lastVar.offset + lastVar.text.length < code.length) {
            yield [code.substring(lastVar.offset + lastVar.text.length), lastVar.offset + lastVar.text.length, 'endText'];
        }
    }
    else {
        yield [code, 0];
    }
}
function* generateVar(code, destructuredPropNames, templateRefNames, curVar, nextVar = curVar) {
    // fix https://github.com/vuejs/language-tools/issues/1205
    // fix https://github.com/vuejs/language-tools/issues/1264
    yield ['', nextVar.offset, 'errorMappingOnly'];
    const isDestructuredProp = destructuredPropNames?.has(curVar.text) ?? false;
    const isTemplateRef = templateRefNames?.has(curVar.text) ?? false;
    if (isTemplateRef) {
        yield [`__VLS_unref(`, undefined];
        yield [code.substring(curVar.offset, curVar.offset + curVar.text.length), curVar.offset];
        yield [`)`, undefined];
    }
    else {
        if (!isDestructuredProp) {
            yield [`__VLS_ctx.`, undefined];
        }
        yield [code.substring(curVar.offset, curVar.offset + curVar.text.length), curVar.offset];
    }
}
function walkIdentifiers(ts, node, ast, cb, ctx, blockVars = [], isRoot = true) {
    if (ts.isIdentifier(node)) {
        cb(node, false);
    }
    else if (ts.isShorthandPropertyAssignment(node)) {
        cb(node.name, true);
    }
    else if (ts.isPropertyAccessExpression(node)) {
        walkIdentifiers(ts, node.expression, ast, cb, ctx, blockVars, false);
    }
    else if (ts.isVariableDeclaration(node)) {
        (0, common_1.collectVars)(ts, node.name, ast, blockVars);
        for (const varName of blockVars) {
            ctx.addLocalVariable(varName);
        }
        if (node.initializer) {
            walkIdentifiers(ts, node.initializer, ast, cb, ctx, blockVars, false);
        }
    }
    else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        processFunction(ts, node, ast, cb, ctx);
    }
    else if (ts.isObjectLiteralExpression(node)) {
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop)) {
                // fix https://github.com/vuejs/language-tools/issues/1176
                if (ts.isComputedPropertyName(prop.name)) {
                    walkIdentifiers(ts, prop.name.expression, ast, cb, ctx, blockVars, false);
                }
                walkIdentifiers(ts, prop.initializer, ast, cb, ctx, blockVars, false);
            }
            // fix https://github.com/vuejs/language-tools/issues/1156
            else if (ts.isShorthandPropertyAssignment(prop)) {
                walkIdentifiers(ts, prop, ast, cb, ctx, blockVars, false);
            }
            // fix https://github.com/vuejs/language-tools/issues/1148#issuecomment-1094378126
            else if (ts.isSpreadAssignment(prop)) {
                // TODO: cannot report "Spread types may only be created from object types.ts(2698)"
                walkIdentifiers(ts, prop.expression, ast, cb, ctx, blockVars, false);
            }
            // fix https://github.com/vuejs/language-tools/issues/4604
            else if (ts.isFunctionLike(prop) && prop.body) {
                processFunction(ts, prop, ast, cb, ctx);
            }
        }
    }
    else if (ts.isTypeReferenceNode(node)) {
        // fix https://github.com/vuejs/language-tools/issues/1422
        ts.forEachChild(node, node => walkIdentifiersInTypeReference(ts, node, cb));
    }
    else {
        const _blockVars = blockVars;
        if (ts.isBlock(node)) {
            blockVars = [];
        }
        ts.forEachChild(node, node => walkIdentifiers(ts, node, ast, cb, ctx, blockVars, false));
        if (ts.isBlock(node)) {
            for (const varName of blockVars) {
                ctx.removeLocalVariable(varName);
            }
        }
        blockVars = _blockVars;
    }
    if (isRoot) {
        for (const varName of blockVars) {
            ctx.removeLocalVariable(varName);
        }
    }
}
function processFunction(ts, node, ast, cb, ctx) {
    const functionArgs = [];
    for (const param of node.parameters) {
        (0, common_1.collectVars)(ts, param.name, ast, functionArgs);
        if (param.type) {
            walkIdentifiers(ts, param.type, ast, cb, ctx);
        }
    }
    for (const varName of functionArgs) {
        ctx.addLocalVariable(varName);
    }
    if (node.body) {
        walkIdentifiers(ts, node.body, ast, cb, ctx);
    }
    for (const varName of functionArgs) {
        ctx.removeLocalVariable(varName);
    }
}
function walkIdentifiersInTypeReference(ts, node, cb) {
    if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
        cb(node.exprName, false);
    }
    else {
        ts.forEachChild(node, node => walkIdentifiersInTypeReference(ts, node, cb));
    }
}
//# sourceMappingURL=interpolation.js.map