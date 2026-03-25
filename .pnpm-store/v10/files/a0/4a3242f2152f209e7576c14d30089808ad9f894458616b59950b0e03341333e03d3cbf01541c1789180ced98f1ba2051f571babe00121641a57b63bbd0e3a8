"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementDirectives = generateElementDirectives;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const shared_2 = require("../../utils/shared");
const common_1 = require("../common");
const camelized_1 = require("./camelized");
const interpolation_1 = require("./interpolation");
const objectProperty_1 = require("./objectProperty");
const stringLiteralKey_1 = require("./stringLiteralKey");
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
        yield* (0, common_1.wrapWith)(prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, `__VLS_asFunctionalDirective(`, ...generateIdentifier(ctx, prop), `)(null!, { ...__VLS_directiveBindingRestFields, `, ...generateArg(options, ctx, prop), ...generateModifiers(options, ctx, prop), ...generateValue(options, ctx, prop), `}, null!, null!)`);
        yield common_1.endOfLine;
    }
}
function* generateIdentifier(ctx, prop) {
    const rawName = 'v-' + prop.name;
    yield* (0, common_1.wrapWith)(prop.loc.start.offset, prop.loc.start.offset + rawName.length, ctx.codeFeatures.verification, `__VLS_directives.`, ...(0, camelized_1.generateCamelized)(rawName, prop.loc.start.offset, {
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
    yield* (0, common_1.wrapWith)(startOffset, startOffset + arg.content.length, ctx.codeFeatures.verification, 'arg');
    yield ': ';
    if (arg.isStatic) {
        yield* (0, stringLiteralKey_1.generateStringLiteralKey)(arg.content, startOffset, ctx.codeFeatures.withoutHighlight);
    }
    else {
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, arg.content, arg.loc, startOffset, ctx.codeFeatures.all, '(', ')');
    }
    yield ', ';
}
function* generateModifiers(options, ctx, prop) {
    if (options.vueCompilerOptions.target < 3.5) {
        return;
    }
    yield 'modifiers: { ';
    for (const mod of prop.modifiers) {
        yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, mod.content, mod.loc.start.offset, ctx.codeFeatures.withoutHighlight);
        yield ': true, ';
    }
    yield '}, ';
}
function* generateValue(options, ctx, prop) {
    if (prop.exp?.type !== CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        return;
    }
    yield* (0, common_1.wrapWith)(prop.exp.loc.start.offset, prop.exp.loc.end.offset, ctx.codeFeatures.verification, 'value');
    yield ': ';
    yield* (0, common_1.wrapWith)(prop.exp.loc.start.offset, prop.exp.loc.end.offset, ctx.codeFeatures.verification, ...(0, interpolation_1.generateInterpolation)(options, ctx, prop.exp.content, prop.exp.loc, prop.exp.loc.start.offset, ctx.codeFeatures.all, '(', ')'));
}
function getPropRenameApply(oldName) {
    return oldName === (0, shared_2.hyphenateAttr)(oldName) ? shared_2.hyphenateAttr : undefined;
}
//# sourceMappingURL=elementDirectives.js.map