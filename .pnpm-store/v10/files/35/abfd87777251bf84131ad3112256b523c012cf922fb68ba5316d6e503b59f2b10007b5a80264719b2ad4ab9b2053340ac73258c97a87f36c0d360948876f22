import { TSESTree } from '@typescript-eslint/types';
export const getValue = (node) => {
    switch (node.type) {
        case TSESTree.AST_NODE_TYPES.Identifier: {
            return node.name;
        }
        case TSESTree.AST_NODE_TYPES.Literal: {
            return node.value;
        }
        default: {
            throw new Error(`Unsupported node type: ${node.type}`);
        }
    }
};
//# sourceMappingURL=get-value.js.map