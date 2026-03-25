"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScript = generateScript;
exports.generateScriptSectionPartiallyEnding = generateScriptSectionPartiallyEnding;
const path = require("path-browserify");
const codeFeatures_1 = require("../codeFeatures");
const globalTypes_1 = require("../globalTypes");
const utils_1 = require("../utils");
const componentSelf_1 = require("./componentSelf");
const context_1 = require("./context");
const scriptSetup_1 = require("./scriptSetup");
const src_1 = require("./src");
const template_1 = require("./template");
function* generateScript(options) {
    const ctx = (0, context_1.createScriptCodegenContext)(options);
    if (options.vueCompilerOptions.__setupedGlobalTypes) {
        const globalTypes = options.vueCompilerOptions.__setupedGlobalTypes;
        if (typeof globalTypes === 'object') {
            let relativePath = path.relative(path.dirname(options.fileName), globalTypes.absolutePath);
            if (relativePath !== globalTypes.absolutePath && !relativePath.startsWith('./') && !relativePath.startsWith('../')) {
                relativePath = './' + relativePath;
            }
            yield `/// <reference types="${relativePath}" />${utils_1.newLine}`;
        }
        else {
            yield `/// <reference types=".vue-global-types/${(0, globalTypes_1.getGlobalTypesFileName)(options.vueCompilerOptions)}" />${utils_1.newLine}`;
        }
    }
    else {
        yield `/* placeholder */`;
    }
    if (options.sfc.script?.src) {
        yield* (0, src_1.generateSrc)(options.sfc.script.src);
    }
    if (options.sfc.scriptSetup && options.scriptSetupRanges) {
        yield* (0, scriptSetup_1.generateScriptSetupImports)(options.sfc.scriptSetup, options.scriptSetupRanges);
    }
    if (options.sfc.script && options.scriptRanges) {
        const { exportDefault, classBlockEnd } = options.scriptRanges;
        const isExportRawObject = exportDefault
            && options.sfc.script.content[exportDefault.expression.start] === '{';
        if (options.sfc.scriptSetup && options.scriptSetupRanges) {
            if (exportDefault) {
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, exportDefault.expression.start, codeFeatures_1.codeFeatures.all);
                yield* (0, scriptSetup_1.generateScriptSetup)(options, ctx, options.sfc.scriptSetup, options.scriptSetupRanges);
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, exportDefault.expression.end, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
            }
            else {
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
                yield* generateScriptSectionPartiallyEnding(options.sfc.script.name, options.sfc.script.content.length, '#3632/both.vue');
                yield* (0, scriptSetup_1.generateScriptSetup)(options, ctx, options.sfc.scriptSetup, options.scriptSetupRanges);
            }
        }
        else if (exportDefault && isExportRawObject && options.vueCompilerOptions.optionsWrapper.length) {
            ctx.inlayHints.push({
                blockName: options.sfc.script.name,
                offset: exportDefault.expression.start,
                setting: 'vue.inlayHints.optionsWrapper',
                label: options.vueCompilerOptions.optionsWrapper.length
                    ? options.vueCompilerOptions.optionsWrapper[0]
                    : '[Missing optionsWrapper[0]]',
                tooltip: [
                    'This is virtual code that is automatically wrapped for type support, it does not affect your runtime behavior, you can customize it via `vueCompilerOptions.optionsWrapper` option in tsconfig / jsconfig.',
                    'To hide it, you can set `"vue.inlayHints.optionsWrapper": false` in IDE settings.',
                ].join('\n\n'),
            }, {
                blockName: options.sfc.script.name,
                offset: exportDefault.expression.end,
                setting: 'vue.inlayHints.optionsWrapper',
                label: options.vueCompilerOptions.optionsWrapper.length >= 2
                    ? options.vueCompilerOptions.optionsWrapper[1]
                    : '[Missing optionsWrapper[1]]',
            });
            yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, exportDefault.expression.start, codeFeatures_1.codeFeatures.all);
            yield options.vueCompilerOptions.optionsWrapper[0];
            yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, exportDefault.expression.start, exportDefault.expression.end, codeFeatures_1.codeFeatures.all);
            yield options.vueCompilerOptions.optionsWrapper[1];
            yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, exportDefault.expression.end, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
        }
        else if (classBlockEnd !== undefined) {
            if (options.vueCompilerOptions.skipTemplateCodegen) {
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
            }
            else {
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, classBlockEnd, codeFeatures_1.codeFeatures.all);
                yield `__VLS_template = () => {${utils_1.newLine}`;
                const templateCodegenCtx = yield* (0, template_1.generateTemplate)(options, ctx);
                yield* (0, componentSelf_1.generateComponentSelf)(options, ctx, templateCodegenCtx);
                yield `}${utils_1.endOfLine}`;
                yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, classBlockEnd, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
            }
        }
        else {
            yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, 0, options.sfc.script.content.length, codeFeatures_1.codeFeatures.all);
            yield* generateScriptSectionPartiallyEnding(options.sfc.script.name, options.sfc.script.content.length, '#3632/script.vue');
        }
    }
    else if (options.sfc.scriptSetup && options.scriptSetupRanges) {
        yield* (0, scriptSetup_1.generateScriptSetup)(options, ctx, options.sfc.scriptSetup, options.scriptSetupRanges);
    }
    if (options.sfc.scriptSetup) {
        yield* generateScriptSectionPartiallyEnding(options.sfc.scriptSetup.name, options.sfc.scriptSetup.content.length, '#4569/main.vue', ';');
    }
    if (!ctx.generatedTemplate) {
        const templateCodegenCtx = yield* (0, template_1.generateTemplate)(options, ctx);
        yield* (0, componentSelf_1.generateComponentSelf)(options, ctx, templateCodegenCtx);
    }
    if (options.edited) {
        yield `type __VLS_IntrinsicElementsCompletion = __VLS_IntrinsicElements${utils_1.endOfLine}`;
    }
    yield* ctx.localTypes.generate([...ctx.localTypes.getUsedNames()]);
    if (options.appendGlobalTypes) {
        yield (0, globalTypes_1.generateGlobalTypes)(options.vueCompilerOptions);
    }
    if (options.sfc.scriptSetup) {
        yield ['', 'scriptSetup', options.sfc.scriptSetup.content.length, codeFeatures_1.codeFeatures.verification];
    }
    return ctx;
}
function* generateScriptSectionPartiallyEnding(source, end, mark, delimiter = 'debugger') {
    yield delimiter;
    yield ['', source, end, codeFeatures_1.codeFeatures.verification];
    yield `/* PartiallyEnd: ${mark} */${utils_1.newLine}`;
}
//# sourceMappingURL=index.js.map