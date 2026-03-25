"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSourceCode = exports.getScope = exports.getFilename = exports.getDeclaredVariables = exports.getCwd = exports.getAncestors = void 0;
function getAncestors(context) {
    // TODO: Use `SourceCode#getAncestors` (we'll be forced to soon)
    return context.getAncestors();
}
exports.getAncestors = getAncestors;
function getCwd(context) {
    return context.cwd ?? context.getCwd();
}
exports.getCwd = getCwd;
function getDeclaredVariables(context, node) {
    const sourceCode = getSourceCode(context);
    return (sourceCode.getDeclaredVariables?.(node) ??
        context.getDeclaredVariables(node));
}
exports.getDeclaredVariables = getDeclaredVariables;
function getFilename(context) {
    return context.filename ?? context.getFilename();
}
exports.getFilename = getFilename;
function getScope(context) {
    // TODO: Use `SourceCode#getScope` (we'll be forced to soon)
    return context.getScope();
}
exports.getScope = getScope;
function getSourceCode(context) {
    return context.sourceCode ?? context.getSourceCode();
}
exports.getSourceCode = getSourceCode;
//# sourceMappingURL=context.js.map