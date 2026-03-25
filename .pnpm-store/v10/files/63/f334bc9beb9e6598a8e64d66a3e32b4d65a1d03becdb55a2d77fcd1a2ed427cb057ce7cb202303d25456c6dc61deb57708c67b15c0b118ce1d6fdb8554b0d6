"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVSlot = generateVSlot;
exports.generateImplicitDefaultSlot = generateImplicitDefaultSlot;
const CompilerDOM = require("@vue/compiler-dom");
const utils_1 = require("../utils");
const wrapWith_1 = require("../utils/wrapWith");
const objectProperty_1 = require("./objectProperty");
const templateChild_1 = require("./templateChild");
function* generateVSlot(options, ctx, node, slotDir) {
    if (!ctx.currentComponent) {
        return;
    }
    ctx.currentComponent.used = true;
    const slotBlockVars = [];
    yield `{${utils_1.newLine}`;
    yield `const { `;
    if (slotDir.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && slotDir.arg.content) {
        yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, slotDir.arg.loc.source, slotDir.arg.loc.start.offset, slotDir.arg.isStatic ? ctx.codeFeatures.withoutHighlight : ctx.codeFeatures.all, slotDir.arg.loc, false, true);
    }
    else {
        yield* (0, wrapWith_1.wrapWith)(slotDir.loc.start.offset, slotDir.loc.start.offset + (slotDir.rawName?.length ?? 0), ctx.codeFeatures.withoutHighlightAndCompletion, `default`);
    }
    yield `: __VLS_thisSlot } = ${ctx.currentComponent.ctxVar}.slots!${utils_1.endOfLine}`;
    if (slotDir.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        const slotAst = (0, utils_1.createTsAst)(options.ts, slotDir, `(${slotDir.exp.content}) => {}`);
        (0, utils_1.collectVars)(options.ts, slotAst, slotAst, slotBlockVars);
        if (!slotDir.exp.content.includes(':')) {
            yield `const [`;
            yield [
                slotDir.exp.content,
                'template',
                slotDir.exp.loc.start.offset,
                ctx.codeFeatures.all,
            ];
            yield `] = __VLS_getSlotParams(__VLS_thisSlot)${utils_1.endOfLine}`;
        }
        else {
            yield `const `;
            yield [
                slotDir.exp.content,
                'template',
                slotDir.exp.loc.start.offset,
                ctx.codeFeatures.all,
            ];
            yield ` = __VLS_getSlotParam(__VLS_thisSlot)${utils_1.endOfLine}`;
        }
    }
    for (const varName of slotBlockVars) {
        ctx.addLocalVariable(varName);
    }
    yield* ctx.resetDirectiveComments('end of slot children start');
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, prev);
        prev = childNode;
    }
    for (const varName of slotBlockVars) {
        ctx.removeLocalVariable(varName);
    }
    let isStatic = true;
    if (slotDir.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        isStatic = slotDir.arg.isStatic;
    }
    if (isStatic && !slotDir.arg) {
        yield `${ctx.currentComponent.ctxVar}.slots!['`;
        yield [
            '',
            'template',
            slotDir.loc.start.offset + (slotDir.loc.source.startsWith('#')
                ? '#'.length
                : slotDir.loc.source.startsWith('v-slot:')
                    ? 'v-slot:'.length
                    : 0),
            ctx.codeFeatures.completion,
        ];
        yield `'/* empty slot name completion */]${utils_1.endOfLine}`;
    }
    yield* ctx.generateAutoImportCompletion();
    yield `}${utils_1.newLine}`;
}
function* generateImplicitDefaultSlot(ctx, node) {
    if (!ctx.currentComponent) {
        return;
    }
    if (node.children.length) {
        ctx.currentComponent.used = true;
        yield `${ctx.currentComponent.ctxVar}.slots!.`;
        yield* (0, wrapWith_1.wrapWith)(node.children[0].loc.start.offset, node.children[node.children.length - 1].loc.end.offset, ctx.codeFeatures.navigation, `default`);
        yield utils_1.endOfLine;
    }
}
//# sourceMappingURL=vSlot.js.map