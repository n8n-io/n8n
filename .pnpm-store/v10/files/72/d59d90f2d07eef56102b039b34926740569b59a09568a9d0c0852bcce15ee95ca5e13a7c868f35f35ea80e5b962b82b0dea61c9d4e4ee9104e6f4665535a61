import type { VisitorKeys } from '@typescript-eslint/visitor-keys';
import type { TSESTree } from './ts-estree';
type SimpleTraverseOptions = Readonly<{
    visitorKeys?: Readonly<VisitorKeys>;
    enter: (node: TSESTree.Node, parent: TSESTree.Node | undefined) => void;
} | {
    visitorKeys?: Readonly<VisitorKeys>;
    visitors: Record<string, (node: TSESTree.Node, parent: TSESTree.Node | undefined) => void>;
}>;
export declare function simpleTraverse(startingNode: TSESTree.Node, options: SimpleTraverseOptions, setParentPointers?: boolean): void;
export {};
//# sourceMappingURL=simple-traverse.d.ts.map