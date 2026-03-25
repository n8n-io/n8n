import type { TSESTree } from '@typescript-eslint/utils';
export declare function visit(node: TSESTree.Node, keys: {
    [k in TSESTree.Node['type']]?: Array<keyof TSESTree.Node>;
} | undefined | null, visitorSpec: {
    [k in TSESTree.Node['type'] | `${TSESTree.Node['type']}:Exit`]?: (node: TSESTree.Node) => void;
}): void;
