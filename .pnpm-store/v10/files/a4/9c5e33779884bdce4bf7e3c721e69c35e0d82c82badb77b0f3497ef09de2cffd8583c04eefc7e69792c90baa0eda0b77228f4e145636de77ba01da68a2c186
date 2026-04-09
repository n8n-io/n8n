"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplate = generateTemplate;
exports.forEachElementNode = forEachElementNode;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("../../utils/shared");
const utils_1 = require("../utils");
const wrapWith_1 = require("../utils/wrapWith");
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
    const slotsPropertyName = (0, shared_1.getSlotsPropertyName)(options.vueCompilerOptions.target);
    if (options.vueCompilerOptions.inferTemplateDollarSlots) {
        ctx.dollarVars.add(slotsPropertyName);
    }
    if (options.vueCompilerOptions.inferTemplateDollarAttrs) {
        ctx.dollarVars.add('$attrs');
    }
    if (options.vueCompilerOptions.inferTemplateDollarRefs) {
        ctx.dollarVars.add('$refs');
    }
    if (options.vueCompilerOptions.inferTemplateDollarEl) {
        ctx.dollarVars.add('$el');
    }
    if (options.template.ast) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, options.template.ast, undefined);
    }
    yield* (0, styleScopedClasses_1.generateStyleScopedClassReferences)(ctx);
    yield* ctx.generateAutoImportCompletion();
    yield* ctx.generateHoistVariables();
    const speicalTypes = [
        [slotsPropertyName, yield* generateSlots(options, ctx)],
        ['$attrs', yield* generateInheritedAttrs(options, ctx)],
        ['$refs', yield* generateTemplateRefs(options, ctx)],
        ['$el', yield* generateRootEl(ctx)]
    ];
    yield `var __VLS_dollars!: {${utils_1.newLine}`;
    for (const [name, type] of speicalTypes) {
        yield `${name}: ${type}${utils_1.endOfLine}`;
    }
    yield `} & { [K in keyof import('${options.vueCompilerOptions.lib}').ComponentPublicInstance]: unknown }${utils_1.endOfLine}`;
    return ctx;
}
function* generateSlots(options, ctx) {
    if (!options.hasDefineSlots) {
        yield `type __VLS_Slots = {}`;
        for (const { expVar, propsVar } of ctx.dynamicSlots) {
            yield `${utils_1.newLine}& { [K in NonNullable<typeof ${expVar}>]?: (props: typeof ${propsVar}) => any }`;
        }
        for (const slot of ctx.slots) {
            yield `${utils_1.newLine}& { `;
            if (slot.name && slot.offset !== undefined) {
                yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, slot.name, slot.offset, ctx.codeFeatures.withoutHighlightAndCompletion, slot.nodeLoc);
            }
            else {
                yield* (0, wrapWith_1.wrapWith)(slot.tagRange[0], slot.tagRange[1], ctx.codeFeatures.withoutHighlightAndCompletion, `default`);
            }
            yield `?: (props: typeof ${slot.propsVar}) => any }`;
        }
        yield `${utils_1.endOfLine}`;
    }
    return `__VLS_Slots`;
}
function* generateInheritedAttrs(options, ctx) {
    yield `type __VLS_InheritedAttrs = {}`;
    for (const varName of ctx.inheritedAttrVars) {
        yield ` & typeof ${varName}`;
    }
    yield utils_1.endOfLine;
    if (ctx.bindingAttrLocs.length) {
        yield `[`;
        for (const loc of ctx.bindingAttrLocs) {
            yield `__VLS_dollars.`;
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
    return `import('${options.vueCompilerOptions.lib}').ComponentPublicInstance['$attrs'] & Partial<__VLS_InheritedAttrs>`;
}
function* generateTemplateRefs(options, ctx) {
    yield `type __VLS_TemplateRefs = {${utils_1.newLine}`;
    for (const [name, { typeExp, offset }] of ctx.templateRefs) {
        yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, name, offset, ctx.codeFeatures.navigationAndCompletion);
        yield `: ${typeExp},${utils_1.newLine}`;
    }
    yield `}${utils_1.endOfLine}`;
    return `__VLS_TemplateRefs`;
}
function* generateRootEl(ctx) {
    yield `type __VLS_RootEl = `;
    if (ctx.singleRootElTypes.length && !ctx.singleRootNodes.has(null)) {
        for (const type of ctx.singleRootElTypes) {
            yield `${utils_1.newLine}| ${type}`;
        }
    }
    else {
        yield `any`;
    }
    yield utils_1.endOfLine;
    return `__VLS_RootEl`;
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