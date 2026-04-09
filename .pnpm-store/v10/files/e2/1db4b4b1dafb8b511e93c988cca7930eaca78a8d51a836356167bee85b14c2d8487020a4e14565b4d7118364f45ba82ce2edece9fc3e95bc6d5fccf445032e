# Installation
> `npm install --save @types/esrecurse`

# Summary
This package contains type definitions for esrecurse (https://github.com/estools/esrecurse).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/esrecurse.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/esrecurse/index.d.ts)
````ts
/**
 * Options for the Visitor constructor and visit function.
 */
interface VisitorOptions {
    /**
     * Fallback strategy for unknown node types.
     * @default 'iteration'
     */
    fallback?: "iteration" | ((node: any) => string[]);

    /**
     * Custom keys for child nodes by node type.
     * @default {}
     */
    childVisitorKeys?: Record<string, string[]>;
}

/**
 * A visitor class for recursively traversing ECMAScript AST.
 */
declare class Visitor {
    /**
     * Creates a new Visitor instance.
     * @param options Configuration options for the visitor.
     */
    constructor(visitor?: Visitor | null, options?: VisitorOptions | null);

    /**
     * Visits a node, invoking the appropriate handler.
     * @param node The AST node to visit.
     */
    visit(node: any): void;

    /**
     * Visits the children of a node based on childVisitorKeys.
     * @param node The AST node whose children to visit.
     */
    visitChildren(node: any): void;
}

/**
 * Visits an AST node with the specified visitor.
 * @param ast The AST node to traverse.
 * @param visitor A visitor instance or visitor object.
 * @param options Configuration options for the traversal.
 */
declare function visit(
    ast: any,
    visitor?: Visitor | Record<string, (node: any) => void> | null,
    options?: VisitorOptions,
): void;

export { visit, Visitor, type VisitorOptions };

````

### Additional Details
 * Last updated: Sat, 19 Jul 2025 03:47:05 GMT
 * Dependencies: none

# Credits
These definitions were written by [Jimmy Leung](https://github.com/hkleungai).
