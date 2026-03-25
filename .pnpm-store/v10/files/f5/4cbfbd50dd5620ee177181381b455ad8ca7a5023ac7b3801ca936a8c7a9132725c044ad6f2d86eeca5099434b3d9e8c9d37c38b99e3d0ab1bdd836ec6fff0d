import { AST_NODE_TYPES } from '@typescript-eslint/types';
export const importDeclaration = (context, node) => {
    if (node.parent && node.parent.type === AST_NODE_TYPES.ImportDeclaration) {
        return node.parent;
    }
    const ancestors = context.sourceCode.getAncestors(node);
    return ancestors[ancestors.length - 1];
};
//# sourceMappingURL=import-declaration.js.map