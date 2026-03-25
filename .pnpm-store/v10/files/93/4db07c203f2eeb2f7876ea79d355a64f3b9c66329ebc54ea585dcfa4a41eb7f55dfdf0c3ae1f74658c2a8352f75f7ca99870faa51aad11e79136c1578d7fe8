"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplate = generateTemplate;
exports.forEachElementNode = forEachElementNode;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("../../utils/shared");
const utils_1 = require("../utils");
const stringLiteralKey_1 = require("../utils/stringLiteralKey");
const context_1 = require("./context");
const objectProperty_1 = require("./objectProperty");
const styleScopedClasses_1 = require("./styleScopedClasses");
const templateChild_1 = require("./templateChild");
function* generateTemplate(options) {
    const ctx = (0, context_1.createTemplateCodegenContext)(options);
    if (options.slotsAssignName) {
        ctx.addLocalVariable(options.slotsAssignName);
    }
    if (options.propsAssignName) {
        ctx.addLocalVariable(options.propsAssignName);
    }
    ctx.addLocalVariable((0, shared_1.getSlotsPropertyName)(options.vueCompilerOptions.target));
    ctx.addLocalVariable('$attrs');
    ctx.addLocalVariable('$refs');
    ctx.addLocalVariable('$el');
    if (options.template.ast) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, options.template.ast, undefined);
    }
    yield* (0, styleScopedClasses_1.generateStyleScopedClassReferences)(ctx);
    yield* generateSlots(options, ctx);
    yield* generateInheritedAttrs(ctx);
    yield* generateRefs(ctx);
    yield* generateRootEl(ctx);
    yield* ctx.generateAutoImportCompletion();
    return ctx;
}
function* generateSlots(options, ctx) {
    if (!options.hasDefineSlots) {
        yield `var __VLS_slots!: `;
        for (const { expVar, varName } of ctx.dynamicSlots) {
            ctx.hasSlot = true;
            yield `Partial<Record<NonNullable<typeof ${expVar}>, (_: typeof ${varName}) => any>> &${utils_1.newLine}`;
        }
        yield `{${utils_1.newLine}`;
        for (const slot of ctx.slots) {
            ctx.hasSlot = true;
            if (slot.name && slot.loc !== undefined) {
                yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, slot.name, slot.loc, ctx.codeFeatures.withoutHighlightAndCompletion, slot.nodeLoc);
            }
            else {
                yield* (0, utils_1.wrapWith)(slot.tagRange[0], slot.tagRange[1], ctx.codeFeatures.withoutHighlightAndCompletion, `default`);
            }
            yield `?(_: typeof ${slot.varName}): any,${utils_1.newLine}`;
        }
        yield `}${utils_1.endOfLine}`;
    }
    const name = (0, shared_1.getSlotsPropertyName)(options.vueCompilerOptions.target);
    yield `var ${name}!: typeof ${options.slotsAssignName ?? '__VLS_slots'}${utils_1.endOfLine}`;
}
function* generateInheritedAttrs(ctx) {
    yield 'let __VLS_inheritedAttrs!: {}';
    for (const varName of ctx.inheritedAttrVars) {
        yield ` & typeof ${varName}`;
    }
    yield utils_1.endOfLine;
    yield `var $attrs!: Partial<typeof __VLS_inheritedAttrs> & Record<string, unknown>${utils_1.endOfLine}`;
    if (ctx.bindingAttrLocs.length) {
        yield `[`;
        for (const loc of ctx.bindingAttrLocs) {
            yield [
                loc.source,
                'template',
                loc.start.offset,
                ctx.codeFeatures.all
            ];
            yield `,`;
        }
        yield `]${utils_1.endOfLine}`;
    }
}
function* generateRefs(ctx) {
    yield `const __VLS_refs = {${utils_1.newLine}`;
    for (const [name, [varName, offset]] of ctx.templateRefs) {
        yield* (0, stringLiteralKey_1.generateStringLiteralKey)(name, offset, ctx.codeFeatures.navigationAndCompletion);
        yield `: ${varName},${utils_1.newLine}`;
    }
    yield `}${utils_1.endOfLine}`;
    yield `var $refs!: typeof __VLS_refs${utils_1.endOfLine}`;
}
function* generateRootEl(ctx) {
    if (ctx.singleRootElType) {
        yield `var $el!: ${ctx.singleRootElType}${utils_1.endOfLine}`;
    }
    else {
        yield `var $el!: any${utils_1.endOfLine}`;
    }
}
function* forEachElementNode(node) {
    if (node.type === CompilerDOM.NodeTypes.ROOT) {
        for (const child of node.children) {
            yield* forEachElementNode(child);
        }
    }
    else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
        const patchForNode = (0, templateChild_1.getVForNode)(node);
        if (patchForNode) {
            yield* forEachElementNode(patchForNode);
        }
        else {
            yield node;
            for (const child of node.children) {
                yield* forEachElementNode(child);
            }
        }
    }
    else if (node.type === CompilerDOM.NodeTypes.IF) {
        // v-if / v-else-if / v-else
        for (let i = 0; i < node.branches.length; i++) {
            const branch = node.branches[i];
            for (const childNode of branch.children) {
                yield* forEachElementNode(childNode);
            }
        }
    }
    else if (node.type === CompilerDOM.NodeTypes.FOR) {
        // v-for
        for (const child of node.children) {
            yield* forEachElementNode(child);
        }
    }
}
//# sourceMappingURL=index.js.map