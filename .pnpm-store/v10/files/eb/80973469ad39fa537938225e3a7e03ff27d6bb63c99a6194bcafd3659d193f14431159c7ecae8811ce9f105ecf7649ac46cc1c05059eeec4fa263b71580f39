"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementDirectives = generateElementDirectives;
exports.generateModifiers = generateModifiers;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const shared_2 = require("../../utils/shared");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const stringLiteralKey_1 = require("../utils/stringLiteralKey");
const interpolation_1 = require("./interpolation");
const objectProperty_1 = require("./objectProperty");
function* generateElementDirectives(options, ctx, node) {
    for (const prop of node.props) {
        if (prop.type !== CompilerDOM.NodeTypes.DIRECTIVE
            || prop.name === 'slot'
            || prop.name === 'on'
            || prop.name === 'model'
            || prop.name === 'bind'
            || prop.name === 'scope'
            || prop.name === 'data') {
            continue;
        }
        ctx.accessExternalVariable((0, shared_1.camelize)('v-' + prop.name), prop.loc.start.offset);
        yield* (0, utils_1.wrapWith)(prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, `__VLS_asFunctionalDirective(`, ...generateIdentifier(ctx, prop), `)(null!, { ...__VLS_directiveBindingRestFields, `, ...generateArg(options, ctx, prop), ...generateModifiers(options, ctx, prop), ...generateValue(options, ctx, prop), ` }, null!, null!)`);
        yield utils_1.endOfLine;
    }
}
function* generateIdentifier(ctx, prop) {
    const rawName = 'v-' + prop.name;
    yield* (0, utils_1.wrapWith)(prop.loc.start.offset, prop.loc.start.offset + rawName.length, ctx.codeFeatures.verification, `__VLS_directives.`, ...(0, camelized_1.generateCamelized)(rawName, prop.loc.start.offset, {
        ...ctx.codeFeatures.all,
        verification: false,
        completion: {
            // fix https://github.com/vuejs/language-tools/issues/1905
            isAdditional: true,
        },
        navigation: {
            resolveRenameNewName: shared_1.camelize,
            resolveRenameEditText: getPropRenameApply(prop.name),
        },
    }));
}
function* generateArg(options, ctx, prop) {
    const { arg } = prop;
    if (arg?.type !== CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        return;
    }
    const startOffset = arg.loc.start.offset + arg.loc.source.indexOf(arg.content);
    yield* (0, utils_1.wrapWith)(startOffset, startOffset + arg.content.length, ctx.codeFeatures.verification, `arg`);
    yield `: `;
    if (arg.isStatic) {
        yield* (0, stringLiteralKey_1.generateStringLiteralKey)(arg.content, startOffset, ctx.codeFeatures.all);
    }
    else {
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, arg.content, startOffset, arg.loc, `(`, `)`);
    }
    yield `, `;
}
function* generateModifiers(options, ctx, prop, propertyName = 'modifiers') {
    const { modifiers } = prop;
    if (!modifiers.length) {
        return;
    }
    const startOffset = modifiers[0].loc.start.offset - 1;
    const endOffset = modifiers.at(-1).loc.end.offset;
    yield* (0, utils_1.wrapWith)(startOffset, endOffset, ctx.codeFeatures.verification, propertyName);
    yield `: { `;
    for (const mod of modifiers) {
        yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, mod.content, mod.loc.start.offset, ctx.codeFeatures.withoutNavigation);
        yield `: true, `;
    }
    yield `}, `;
}
function* generateValue(options, ctx, prop) {
    const { exp } = prop;
    if (exp?.type !== CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        return;
    }
    yield* (0, utils_1.wrapWith)(exp.loc.start.offset, exp.loc.end.offset, ctx.codeFeatures.verification, `value`);
    yield `: `;
    yield* (0, utils_1.wrapWith)(exp.loc.start.offset, exp.loc.end.offset, ctx.codeFeatures.verification, ...(0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, exp.content, exp.loc.start.offset, exp.loc, `(`, `)`));
}
function getPropRenameApply(oldName) {
    return oldName === (0, shared_2.hyphenateAttr)(oldName) ? shared_2.hyphenateAttr : undefined;
}
//# sourceMappingURL=elementDirectives.js.map