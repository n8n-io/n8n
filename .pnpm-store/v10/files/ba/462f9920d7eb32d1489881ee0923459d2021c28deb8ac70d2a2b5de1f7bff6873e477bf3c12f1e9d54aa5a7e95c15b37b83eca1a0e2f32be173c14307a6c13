"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
const CompilerDOM = require("@vue/compiler-dom");
const Vue2TemplateCompiler = require('@vue/compiler-vue2/build');
const compile = (template, options = {}) => {
    if (typeof template !== 'string') {
        throw new Error(`[@vue/language-core] compile() first argument must be string.`);
    }
    const onError = options.onError;
    const onWarn = options.onWarn;
    options.onError = error => {
        if (error.code === 33 // :key binding allowed in v-for template child in vue 2
            || error.code === 29 // fix https://github.com/vuejs/language-tools/issues/1638
        ) {
            return;
        }
        if (onError) {
            onError(error);
        }
        else {
            throw error;
        }
    };
    const vue2Result = Vue2TemplateCompiler.compile(template, { outputSourceRange: true });
    for (const error of vue2Result.errors) {
        onError?.({
            code: 'vue-template-compiler',
            name: '',
            message: error.msg,
            loc: {
                source: '',
                start: { column: -1, line: -1, offset: error.start },
                end: { column: -1, line: -1, offset: error.end ?? error.start },
            },
        });
    }
    for (const error of vue2Result.tips) {
        onWarn?.({
            code: 'vue-template-compiler',
            name: '',
            message: error.msg,
            loc: {
                source: '',
                start: { column: -1, line: -1, offset: error.start },
                end: { column: -1, line: -1, offset: error.end ?? error.start },
            },
        });
    }
    return baseCompile(template, Object.assign({}, CompilerDOM.parserOptions, options, {
        nodeTransforms: [
            ...CompilerDOM.DOMNodeTransforms,
            ...(options.nodeTransforms || [])
        ],
        directiveTransforms: Object.assign({}, CompilerDOM.DOMDirectiveTransforms, options.directiveTransforms || {}),
    }));
};
exports.compile = compile;
function baseCompile(template, options = {}) {
    const onError = options.onError || (error => { throw error; });
    const isModuleMode = options.mode === 'module';
    const prefixIdentifiers = options.prefixIdentifiers === true || isModuleMode;
    if (!prefixIdentifiers && options.cacheHandlers) {
        onError(CompilerDOM.createCompilerError(49));
    }
    if (options.scopeId && !isModuleMode) {
        onError(CompilerDOM.createCompilerError(50));
    }
    const ast = CompilerDOM.baseParse(template, options);
    const [nodeTransforms, directiveTransforms] = CompilerDOM.getBaseTransformPreset(prefixIdentifiers);
    // v-for > v-if in vue 2
    const transformIf = nodeTransforms[1];
    const transformFor = nodeTransforms[3];
    nodeTransforms[1] = transformFor;
    nodeTransforms[3] = transformIf;
    CompilerDOM.transform(ast, Object.assign({}, options, {
        prefixIdentifiers,
        nodeTransforms: [
            ...nodeTransforms,
            ...(options.nodeTransforms || []) // user transforms
        ],
        directiveTransforms: Object.assign({}, directiveTransforms, options.directiveTransforms || {} // user transforms
        )
    }));
    return CompilerDOM.generate(ast, Object.assign({}, options, {
        prefixIdentifiers
    }));
}
//# sourceMappingURL=vue2TemplateCompiler.js.map