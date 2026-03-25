"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponentSelf = generateComponentSelf;
const path = require("path-browserify");
const common_1 = require("../common");
const component_1 = require("./component");
const index_1 = require("./index");
const template_1 = require("./template");
function* generateComponentSelf(options, ctx, templateCodegenCtx) {
    if (options.sfc.scriptSetup && options.scriptSetupRanges) {
        yield `const __VLS_self = (await import('${options.vueCompilerOptions.lib}')).defineComponent({${common_1.newLine}`;
        yield `setup() {${common_1.newLine}`;
        yield `return {${common_1.newLine}`;
        if (ctx.bypassDefineComponent) {
            yield* (0, component_1.generateComponentSetupReturns)(options.scriptSetupRanges);
        }
        // bindings
        const templateUsageVars = (0, template_1.getTemplateUsageVars)(options, ctx);
        for (const [content, bindings] of [
            [options.sfc.scriptSetup.content, options.scriptSetupRanges.bindings],
            options.sfc.script && options.scriptRanges
                ? [options.sfc.script.content, options.scriptRanges.bindings]
                : ['', []],
        ]) {
            for (const expose of bindings) {
                const varName = content.substring(expose.start, expose.end);
                if (!templateUsageVars.has(varName) && !templateCodegenCtx.accessExternalVariables.has(varName)) {
                    continue;
                }
                const templateOffset = options.getGeneratedLength();
                yield `${varName}: ${varName} as typeof `;
                const scriptOffset = options.getGeneratedLength();
                yield `${varName},${common_1.newLine}`;
                options.linkedCodeMappings.push({
                    sourceOffsets: [scriptOffset],
                    generatedOffsets: [templateOffset],
                    lengths: [varName.length],
                    data: undefined,
                });
            }
        }
        yield `}${common_1.endOfLine}`; // return {
        yield `},${common_1.newLine}`; // setup() {
        if (options.sfc.scriptSetup && options.scriptSetupRanges && !ctx.bypassDefineComponent) {
            const emitOptionCodes = [...(0, component_1.generateEmitsOption)(options, options.scriptSetupRanges)];
            for (const code of emitOptionCodes) {
                yield code;
            }
            yield* (0, component_1.generatePropsOption)(options, ctx, options.sfc.scriptSetup, options.scriptSetupRanges, !!emitOptionCodes.length, false);
        }
        if (options.sfc.script && options.scriptRanges?.exportDefault?.args) {
            const { args } = options.scriptRanges.exportDefault;
            yield (0, common_1.generateSfcBlockSection)(options.sfc.script, args.start + 1, args.end - 1, index_1.codeFeatures.all);
        }
        yield `})${common_1.endOfLine}`; // defineComponent {
    }
    else if (options.sfc.script) {
        yield `let __VLS_self!: typeof import('./${path.basename(options.fileName)}').default${common_1.endOfLine}`;
    }
    else {
        yield `const __VLS_self = (await import('${options.vueCompilerOptions.lib}')).defineComponent({})${common_1.endOfLine}`;
    }
}
//# sourceMappingURL=componentSelf.js.map