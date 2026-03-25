export function declaredScope(context, node, name) {
    const references = context.sourceCode.getScope(node).references;
    const reference = references.find(x => x.identifier.name === name);
    return reference?.resolved?.scope.type;
}
//# sourceMappingURL=declared-scope.js.map