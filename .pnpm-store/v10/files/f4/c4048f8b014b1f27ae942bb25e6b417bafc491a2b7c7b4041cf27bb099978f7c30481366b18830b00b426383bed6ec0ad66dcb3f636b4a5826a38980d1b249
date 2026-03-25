"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScriptCodegenContext = createScriptCodegenContext;
const localTypes_1 = require("../localTypes");
function createScriptCodegenContext(options) {
    const localTypes = (0, localTypes_1.getLocalTypesGenerator)(options.compilerOptions, options.vueCompilerOptions);
    const inlayHints = [];
    return {
        generatedTemplate: false,
        generatedPropsType: false,
        scriptSetupGeneratedOffset: undefined,
        bypassDefineComponent: options.lang === 'js' || options.lang === 'jsx',
        bindingNames: new Set([
            ...options.scriptRanges?.bindings.map(range => options.sfc.script.content.substring(range.start, range.end)) ?? [],
            ...options.scriptSetupRanges?.bindings.map(range => options.sfc.scriptSetup.content.substring(range.start, range.end)) ?? [],
        ]),
        localTypes,
        inlayHints,
    };
}
//# sourceMappingURL=context.js.map