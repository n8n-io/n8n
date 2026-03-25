"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = void 0;
const visitor_keys_1 = require("@typescript-eslint/visitor-keys");
const referencer_1 = require("./referencer");
const ScopeManager_1 = require("./ScopeManager");
const DEFAULT_OPTIONS = {
    childVisitorKeys: visitor_keys_1.visitorKeys,
    globalReturn: false,
    impliedStrict: false,
    jsxPragma: 'React',
    jsxFragmentName: null,
    lib: ['es2018'],
    sourceType: 'script',
    emitDecoratorMetadata: false,
};
/**
 * Takes an AST and returns the analyzed scopes.
 */
function analyze(tree, providedOptions) {
    const options = {
        childVisitorKeys: providedOptions?.childVisitorKeys ?? DEFAULT_OPTIONS.childVisitorKeys,
        globalReturn: providedOptions?.globalReturn ?? DEFAULT_OPTIONS.globalReturn,
        impliedStrict: providedOptions?.impliedStrict ?? DEFAULT_OPTIONS.impliedStrict,
        jsxPragma: providedOptions?.jsxPragma === undefined
            ? DEFAULT_OPTIONS.jsxPragma
            : providedOptions.jsxPragma,
        jsxFragmentName: providedOptions?.jsxFragmentName ?? DEFAULT_OPTIONS.jsxFragmentName,
        sourceType: providedOptions?.sourceType ?? DEFAULT_OPTIONS.sourceType,
        lib: providedOptions?.lib ?? ['esnext'],
        emitDecoratorMetadata: providedOptions?.emitDecoratorMetadata ??
            DEFAULT_OPTIONS.emitDecoratorMetadata,
    };
    // ensure the option is lower cased
    options.lib = options.lib.map(l => l.toLowerCase());
    const scopeManager = new ScopeManager_1.ScopeManager(options);
    const referencer = new referencer_1.Referencer(options, scopeManager);
    referencer.visit(tree);
    return scopeManager;
}
exports.analyze = analyze;
//# sourceMappingURL=analyze.js.map