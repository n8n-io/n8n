import * as t from '@babel/types';
export import Node = t.Node;

declare const traverse: {
    <S>(
        parent: Node | Node[] | null | undefined,
        opts: TraverseOptions<S>,
        scope: Scope | undefined,
        state: S,
        parentPath?: NodePath,
    ): void;
    (
        parent: Node | Node[] | null | undefined,
        opts?: TraverseOptions,
        scope?: Scope,
        state?: any,
        parentPath?: NodePath,
    ): void;

    visitors: typeof visitors;
    verify: typeof visitors.verify;
    explode: typeof visitors.explode;
};

export namespace visitors {
    /**
     * `explode()` will take a `Visitor` object with all of the various shorthands
     * that we support, and validates & normalizes it into a common format, ready
     * to be used in traversal.
     *
     * The various shorthands are:
     * - `Identifier() { ... }` -> `Identifier: { enter() { ... } }`
     * - `"Identifier|NumericLiteral": { ... }` -> `Identifier: { ... }, NumericLiteral: { ... }`
     * - Aliases in `@babel/types`: e.g. `Property: { ... }` -> `ObjectProperty: { ... }, ClassProperty: { ... }`
     *
     * Other normalizations are:
     * - Visitors of virtual types are wrapped, so that they are only visited when their dynamic check passes
     * - `enter` and `exit` functions are wrapped in arrays, to ease merging of visitors
     */
    function explode<S = {}>(
        visitor: Visitor<S>,
    ): {
        [Type in Node['type']]?: VisitNodeObject<S, Extract<Node, { type: Type }>>;
    };
    function verify(visitor: Visitor): void;
    function merge<S = {}>(visitors: Array<Visitor<S>>, states?: S[]): Visitor<unknown>;
}

export default traverse;

export interface TraverseOptions<S = Node> extends Visitor<S> {
    scope?: Scope;
    noScope?: boolean;
}

export type ArrayKeys<T> = { [P in keyof T]: T[P] extends any[] ? P : never }[keyof T];

export class Scope {
    constructor(path: NodePath, parentScope?: Scope);
    path: NodePath;
    block: Node;
    parentBlock: Node;
    parent: Scope;
    hub: HubInterface;
    bindings: { [name: string]: Binding };

    /** Traverse node with current scope and path. */
    traverse<S>(node: Node | Node[], opts: TraverseOptions<S>, state: S): void;
    traverse(node: Node | Node[], opts?: TraverseOptions, state?: any): void;

    /** Generate a unique identifier and add it to the current scope. */
    generateDeclaredUidIdentifier(name?: string): t.Identifier;

    /** Generate a unique identifier. */
    generateUidIdentifier(name?: string): t.Identifier;

    /** Generate a unique `_id1` binding. */
    generateUid(name?: string): string;

    /** Generate a unique identifier based on a node. */
    generateUidIdentifierBasedOnNode(parent: Node, defaultName?: string): t.Identifier;

    /**
     * Determine whether evaluating the specific input `node` is a consequenceless reference. ie.
     * evaluating it wont result in potentially arbitrary code from being ran. The following are
     * whitelisted and determined not to cause side effects:
     *
     *  - `this` expressions
     *  - `super` expressions
     *  - Bound identifiers
     */
    isStatic(node: Node): boolean;

    /** Possibly generate a memoised identifier if it is not static and has consequences. */
    maybeGenerateMemoised(node: Node, dontPush?: boolean): t.Identifier;

    checkBlockScopedCollisions(local: Binding, kind: BindingKind, name: string, id: object): void;

    rename(oldName: string, newName?: string, block?: Node): void;

    dump(): void;

    toArray(node: Node, i?: number): Node;

    registerDeclaration(path: NodePath): void;

    buildUndefinedNode(): Node;

    registerConstantViolation(path: NodePath): void;

    registerBinding(kind: string, path: NodePath, bindingPath?: NodePath): void;

    addGlobal(node: Node): void;

    hasUid(name: string): boolean;

    hasGlobal(name: string): boolean;

    hasReference(name: string): boolean;

    isPure(node: Node, constantsOnly?: boolean): boolean;

    setData(key: string, val: any): any;

    getData(key: string): any;

    removeData(key: string): void;

    crawl(): void;

    push(opts: { id: t.LVal; init?: t.Expression; unique?: boolean; kind?: 'var' | 'let' | 'const' }): void;

    getProgramParent(): Scope;

    getFunctionParent(): Scope | null;

    getBlockParent(): Scope;

    /** Walks the scope tree and gathers **all** bindings. */
    getAllBindings(...kinds: string[]): object;

    bindingIdentifierEquals(name: string, node: Node): boolean;

    getBinding(name: string): Binding | undefined;

    getOwnBinding(name: string): Binding | undefined;

    getBindingIdentifier(name: string): t.Identifier;

    getOwnBindingIdentifier(name: string): t.Identifier;

    hasOwnBinding(name: string): boolean;

    hasBinding(name: string, noGlobals?: boolean): boolean;

    parentHasBinding(name: string, noGlobals?: boolean): boolean;

    /** Move a binding of `name` to another `scope`. */
    moveBindingTo(name: string, scope: Scope): void;

    removeOwnBinding(name: string): void;

    removeBinding(name: string): void;
}

export type BindingKind = 'var' | 'let' | 'const' | 'module' | 'hoisted' | 'param' | 'local' | 'unknown';

export class Binding {
    constructor(opts: { identifier: t.Identifier; scope: Scope; path: NodePath; kind: BindingKind });
    identifier: t.Identifier;
    scope: Scope;
    path: NodePath;
    kind: BindingKind;
    referenced: boolean;
    references: number;
    referencePaths: NodePath[];
    constant: boolean;
    constantViolations: NodePath[];
    hasDeoptedValue: boolean;
    hasValue: boolean;
    value: any;

    deopValue(): void;
    setValue(value: any): void;
    clearValue(): void;

    reassign(path: any): void;
    reference(path: any): void;
    dereference(): void;
}

export type Visitor<S = {}> = VisitNodeObject<S, Node> & {
    [Type in Node['type']]?: VisitNode<S, Extract<Node, { type: Type }>>;
} & {
    [K in keyof t.Aliases]?: VisitNode<S, t.Aliases[K]>;
};

export type VisitNode<S, P extends Node> = VisitNodeFunction<S, P> | VisitNodeObject<S, P>;

export type VisitNodeFunction<S, P extends Node> = (this: S, path: NodePath<P>, state: S) => void;

type NodeType = Node['type'] | keyof t.Aliases;

export interface VisitNodeObject<S, P extends Node> {
    enter?: VisitNodeFunction<S, P>;
    exit?: VisitNodeFunction<S, P>;
    denylist?: NodeType[];
    /**
     * @deprecated will be removed in Babel 8
     */
    blacklist?: NodeType[];
}

export type NodePaths<T extends Node | readonly Node[]> = T extends readonly Node[]
    ? { -readonly [K in keyof T]: NodePath<Extract<T[K], Node>> }
    : T extends Node
    ? [NodePath<T>]
    : never;

export class NodePath<T = Node> {
    constructor(hub: Hub, parent: Node);
    parent: Node;
    hub: Hub;
    contexts: TraversalContext[];
    data: object;
    shouldSkip: boolean;
    shouldStop: boolean;
    removed: boolean;
    state: any;
    opts: object;
    skipKeys: object;
    parentPath: T extends t.Program ? null : NodePath;
    context: TraversalContext;
    container: object | object[];
    listKey: string;
    inList: boolean;
    parentKey: string;
    key: string | number;
    node: T;
    scope: Scope;
    type: T extends null | undefined ? undefined : T extends Node ? T['type'] : string | undefined;
    typeAnnotation: object;

    getScope(scope: Scope): Scope;

    setData(key: string, val: any): any;

    getData(key: string, def?: any): any;

    hasNode(): this is NodePath<NonNullable<this['node']>>;

    buildCodeFrameError<TError extends Error>(msg: string, Error?: new (msg: string) => TError): TError;

    traverse<T>(visitor: Visitor<T>, state: T): void;
    traverse(visitor: Visitor): void;

    set(key: string, node: Node): void;

    getPathLocation(): string;

    // Example: https://github.com/babel/babel/blob/63204ae51e020d84a5b246312f5eeb4d981ab952/packages/babel-traverse/src/path/modification.js#L83
    debug(buildMessage: () => string): void;

    static get<C extends Node, K extends keyof C>(opts: {
        hub: HubInterface;
        parentPath: NodePath | null;
        parent: Node;
        container: C;
        listKey?: string;
        key: K;
    }): NodePath<C[K]>;

    //#region ------------------------- ancestry -------------------------
    /**
     * Starting at the parent path of the current `NodePath` and going up the
     * tree, return the first `NodePath` that causes the provided `callback`
     * to return a truthy value, or `null` if the `callback` never returns a
     * truthy value.
     */
    findParent(callback: (path: NodePath) => boolean): NodePath | null;

    /**
     * Starting at current `NodePath` and going up the tree, return the first
     * `NodePath` that causes the provided `callback` to return a truthy value,
     * or `null` if the `callback` never returns a truthy value.
     */
    find(callback: (path: NodePath) => boolean): NodePath | null;

    /** Get the parent function of the current path. */
    getFunctionParent(): NodePath<t.Function> | null;

    /** Walk up the tree until we hit a parent node path in a list. */
    getStatementParent(): NodePath<t.Statement> | null;

    /**
     * Get the deepest common ancestor and then from it, get the earliest relationship path
     * to that ancestor.
     *
     * Earliest is defined as being "before" all the other nodes in terms of list container
     * position and visiting key.
     */
    getEarliestCommonAncestorFrom(paths: NodePath[]): NodePath;

    /** Get the earliest path in the tree where the provided `paths` intersect. */
    getDeepestCommonAncestorFrom(
        paths: NodePath[],
        filter?: (deepest: Node, i: number, ancestries: NodePath[]) => NodePath,
    ): NodePath;

    /**
     * Build an array of node paths containing the entire ancestry of the current node path.
     *
     * NOTE: The current node path is included in this.
     */
    getAncestry(): [this, ...NodePath[]];

    /**
     * A helper to find if `this` path is an ancestor of `maybeDescendant`
     */
    isAncestor(maybeDescendant: NodePath): boolean;

    /**
     * A helper to find if `this` path is a descendant of `maybeAncestor`
     */
    isDescendant(maybeAncestor: NodePath): boolean;

    inType(...candidateTypes: string[]): boolean;
    //#endregion

    //#region ------------------------- inference -------------------------
    /** Infer the type of the current `NodePath`. */
    getTypeAnnotation(): t.FlowType;

    isBaseType(baseName: string, soft?: boolean): boolean;

    couldBeBaseType(name: string): boolean;

    baseTypeStrictlyMatches(right: NodePath): boolean;

    isGenericType(genericName: string): boolean;
    //#endregion

    //#region ------------------------- replacement -------------------------
    /**
     * Replace a node with an array of multiple. This method performs the following steps:
     *
     *  - Inherit the comments of first provided node with that of the current node.
     *  - Insert the provided nodes after the current node.
     *  - Remove the current node.
     */
    replaceWithMultiple<Nodes extends readonly Node[]>(nodes: Nodes): NodePaths<Nodes>;

    /**
     * Parse a string as an expression and replace the current node with the result.
     *
     * NOTE: This is typically not a good idea to use. Building source strings when
     * transforming ASTs is an antipattern and SHOULD NOT be encouraged. Even if it's
     * easier to use, your transforms will be extremely brittle.
     */
    replaceWithSourceString(replacement: any): [NodePath];

    /** Replace the current node with another. */
    replaceWith<T extends Node>(replacement: T | NodePath<T>): [NodePath<T>];

    /**
     * This method takes an array of statements nodes and then explodes it
     * into expressions. This method retains completion records which is
     * extremely important to retain original semantics.
     */
    replaceExpressionWithStatements<Nodes extends readonly Node[]>(nodes: Nodes): NodePaths<Nodes>;

    replaceInline<Nodes extends Node | readonly Node[]>(nodes: Nodes): NodePaths<Nodes>;
    //#endregion

    //#region ------------------------- evaluation -------------------------
    /**
     * Walk the input `node` and statically evaluate if it's truthy.
     *
     * Returning `true` when we're sure that the expression will evaluate to a
     * truthy value, `false` if we're sure that it will evaluate to a falsy
     * value and `undefined` if we aren't sure. Because of this please do not
     * rely on coercion when using this method and check with === if it's false.
     */
    evaluateTruthy(): boolean;

    /**
     * Walk the input `node` and statically evaluate it.
     *
     * Returns an object in the form `{ confident, value }`. `confident` indicates
     * whether or not we had to drop out of evaluating the expression because of
     * hitting an unknown node that we couldn't confidently find the value of.
     *
     * Example:
     *
     *   t.evaluate(parse("5 + 5")) // { confident: true, value: 10 }
     *   t.evaluate(parse("!true")) // { confident: true, value: false }
     *   t.evaluate(parse("foo + foo")) // { confident: false, value: undefined }
     */
    evaluate(): { confident: boolean; value: any };
    //#endregion

    //#region ------------------------- introspection -------------------------
    /**
     * Match the current node if it matches the provided `pattern`.
     *
     * For example, given the match `React.createClass` it would match the
     * parsed nodes of `React.createClass` and `React["createClass"]`.
     */
    matchesPattern(pattern: string, allowPartial?: boolean): boolean;

    /**
     * Check whether we have the input `key`. If the `key` references an array then we check
     * if the array has any items, otherwise we just check if it's falsy.
     */
    has(key: string): boolean;

    isStatic(): boolean;

    /** Alias of `has`. */
    is(key: string): boolean;

    /** Opposite of `has`. */
    isnt(key: string): boolean;

    /** Check whether the path node `key` strict equals `value`. */
    equals(key: string, value: any): boolean;

    /**
     * Check the type against our stored internal type of the node. This is handy when a node has
     * been removed yet we still internally know the type and need it to calculate node replacement.
     */
    isNodeType(type: string): boolean;

    /**
     * This checks whether or not we're in one of the following positions:
     *
     *   for (KEY in right);
     *   for (KEY;;);
     *
     * This is because these spots allow VariableDeclarations AND normal expressions so we need
     * to tell the path replacement that it's ok to replace this with an expression.
     */
    canHaveVariableDeclarationOrExpression(): boolean;

    /**
     * This checks whether we are swapping an arrow function's body between an
     * expression and a block statement (or vice versa).
     *
     * This is because arrow functions may implicitly return an expression, which
     * is the same as containing a block statement.
     */
    canSwapBetweenExpressionAndStatement(replacement: Node): boolean;

    /** Check whether the current path references a completion record */
    isCompletionRecord(allowInsideFunction?: boolean): boolean;

    /**
     * Check whether or not the current `key` allows either a single statement or block statement
     * so we can explode it if necessary.
     */
    isStatementOrBlock(): boolean;

    /** Check if the currently assigned path references the `importName` of `moduleSource`. */
    referencesImport(moduleSource: string, importName: string): boolean;

    /** Get the source code associated with this node. */
    getSource(): string;

    /** Check if the current path will maybe execute before another path */
    willIMaybeExecuteBefore(path: NodePath): boolean;
    //#endregion

    //#region ------------------------- context -------------------------
    call(key: string): boolean;

    isBlacklisted(): boolean;

    visit(): boolean;

    skip(): void;

    skipKey(key: string): void;

    stop(): void;

    setScope(): void;

    setContext(context?: TraversalContext): this;

    popContext(): void;

    pushContext(context: TraversalContext): void;
    //#endregion

    //#region ------------------------- removal -------------------------
    remove(): void;
    //#endregion

    //#region ------------------------- modification -------------------------
    /** Insert the provided nodes before the current one. */
    insertBefore<Nodes extends Node | readonly Node[]>(nodes: Nodes): NodePaths<Nodes>;

    /**
     * Insert the provided nodes after the current one. When inserting nodes after an
     * expression, ensure that the completion record is correct by pushing the current node.
     */
    insertAfter<Nodes extends Node | readonly Node[]>(nodes: Nodes): NodePaths<Nodes>;

    /** Update all sibling node paths after `fromIndex` by `incrementBy`. */
    updateSiblingKeys(fromIndex: number, incrementBy: number): void;

    /**
     * Insert child nodes at the start of the current node.
     * @param listKey - The key at which the child nodes are stored (usually body).
     * @param nodes - the nodes to insert.
     */
    unshiftContainer<Nodes extends Node | readonly Node[]>(listKey: ArrayKeys<T>, nodes: Nodes): NodePaths<Nodes>;

    /**
     * Insert child nodes at the end of the current node.
     * @param listKey - The key at which the child nodes are stored (usually body).
     * @param nodes - the nodes to insert.
     */
    pushContainer<Nodes extends Node | readonly Node[]>(listKey: ArrayKeys<T>, nodes: Nodes): NodePaths<Nodes>;

    /** Hoist the current node to the highest scope possible and return a UID referencing it. */
    hoist(scope: Scope): void;
    //#endregion

    //#region ------------------------- family -------------------------
    getOpposite(): NodePath;

    getCompletionRecords(): NodePath[];

    getSibling(key: string | number): NodePath;
    getPrevSibling(): NodePath;
    getNextSibling(): NodePath;
    getAllPrevSiblings(): NodePath[];
    getAllNextSiblings(): NodePath[];

    get<K extends keyof T>(
        key: K,
        context?: boolean | TraversalContext,
    ): T[K] extends Array<Node | null | undefined>
        ? Array<NodePath<T[K][number]>>
        : T[K] extends Node | null | undefined
        ? NodePath<T[K]>
        : never;
    get(key: string, context?: boolean | TraversalContext): NodePath | NodePath[];

    getBindingIdentifiers(duplicates: true): Record<string, t.Identifier[]>;
    getBindingIdentifiers(duplicates?: false): Record<string, t.Identifier>;
    getBindingIdentifiers(duplicates?: boolean): Record<string, t.Identifier | t.Identifier[]>;

    getOuterBindingIdentifiers(duplicates: true): Record<string, t.Identifier[]>;
    getOuterBindingIdentifiers(duplicates?: false): Record<string, t.Identifier>;
    getOuterBindingIdentifiers(duplicates?: boolean): Record<string, t.Identifier | t.Identifier[]>;

    getBindingIdentifierPaths(duplicates: true, outerOnly?: boolean): Record<string, Array<NodePath<t.Identifier>>>;
    getBindingIdentifierPaths(duplicates?: false, outerOnly?: boolean): Record<string, NodePath<t.Identifier>>;
    getBindingIdentifierPaths(
        duplicates?: boolean,
        outerOnly?: boolean,
    ): Record<string, NodePath<t.Identifier> | Array<NodePath<t.Identifier>>>;

    getOuterBindingIdentifierPaths(duplicates: true): Record<string, Array<NodePath<t.Identifier>>>;
    getOuterBindingIdentifierPaths(duplicates?: false): Record<string, NodePath<t.Identifier>>;
    getOuterBindingIdentifierPaths(
        duplicates?: boolean,
        outerOnly?: boolean,
    ): Record<string, NodePath<t.Identifier> | Array<NodePath<t.Identifier>>>;
    //#endregion

    //#region ------------------------- comments -------------------------
    /** Share comments amongst siblings. */
    shareCommentsWithSiblings(): void;

    addComment(type: string, content: string, line?: boolean): void;

    /** Give node `comments` of the specified `type`. */
    addComments(type: string, comments: any[]): void;
    //#endregion

    //#region ------------------------- isXXX -------------------------
    isAnyTypeAnnotation(props?: object | null): this is NodePath<t.AnyTypeAnnotation>;
    isArrayExpression(props?: object | null): this is NodePath<t.ArrayExpression>;
    isArrayPattern(props?: object | null): this is NodePath<t.ArrayPattern>;
    isArrayTypeAnnotation(props?: object | null): this is NodePath<t.ArrayTypeAnnotation>;
    isArrowFunctionExpression(props?: object | null): this is NodePath<t.ArrowFunctionExpression>;
    isAssignmentExpression(props?: object | null): this is NodePath<t.AssignmentExpression>;
    isAssignmentPattern(props?: object | null): this is NodePath<t.AssignmentPattern>;
    isAwaitExpression(props?: object | null): this is NodePath<t.AwaitExpression>;
    isBigIntLiteral(props?: object | null): this is NodePath<t.BigIntLiteral>;
    isBinary(props?: object | null): this is NodePath<t.Binary>;
    isBinaryExpression(props?: object | null): this is NodePath<t.BinaryExpression>;
    isBindExpression(props?: object | null): this is NodePath<t.BindExpression>;
    isBlock(props?: object | null): this is NodePath<t.Block>;
    isBlockParent(props?: object | null): this is NodePath<t.BlockParent>;
    isBlockStatement(props?: object | null): this is NodePath<t.BlockStatement>;
    isBooleanLiteral(props?: object | null): this is NodePath<t.BooleanLiteral>;
    isBooleanLiteralTypeAnnotation(props?: object | null): this is NodePath<t.BooleanLiteralTypeAnnotation>;
    isBooleanTypeAnnotation(props?: object | null): this is NodePath<t.BooleanTypeAnnotation>;
    isBreakStatement(props?: object | null): this is NodePath<t.BreakStatement>;
    isCallExpression(props?: object | null): this is NodePath<t.CallExpression>;
    isCatchClause(props?: object | null): this is NodePath<t.CatchClause>;
    isClass(props?: object | null): this is NodePath<t.Class>;
    isClassBody(props?: object | null): this is NodePath<t.ClassBody>;
    isClassDeclaration(props?: object | null): this is NodePath<t.ClassDeclaration>;
    isClassExpression(props?: object | null): this is NodePath<t.ClassExpression>;
    isClassImplements(props?: object | null): this is NodePath<t.ClassImplements>;
    isClassMethod(props?: object | null): this is NodePath<t.ClassMethod>;
    isClassPrivateMethod(props?: object | null): this is NodePath<t.ClassPrivateMethod>;
    isClassPrivateProperty(props?: object | null): this is NodePath<t.ClassPrivateProperty>;
    isClassProperty(props?: object | null): this is NodePath<t.ClassProperty>;
    isCompletionStatement(props?: object | null): this is NodePath<t.CompletionStatement>;
    isConditional(props?: object | null): this is NodePath<t.Conditional>;
    isConditionalExpression(props?: object | null): this is NodePath<t.ConditionalExpression>;
    isContinueStatement(props?: object | null): this is NodePath<t.ContinueStatement>;
    isDebuggerStatement(props?: object | null): this is NodePath<t.DebuggerStatement>;
    isDeclaration(props?: object | null): this is NodePath<t.Declaration>;
    isDeclareClass(props?: object | null): this is NodePath<t.DeclareClass>;
    isDeclareExportAllDeclaration(props?: object | null): this is NodePath<t.DeclareExportAllDeclaration>;
    isDeclareExportDeclaration(props?: object | null): this is NodePath<t.DeclareExportDeclaration>;
    isDeclareFunction(props?: object | null): this is NodePath<t.DeclareFunction>;
    isDeclareInterface(props?: object | null): this is NodePath<t.DeclareInterface>;
    isDeclareModule(props?: object | null): this is NodePath<t.DeclareModule>;
    isDeclareModuleExports(props?: object | null): this is NodePath<t.DeclareModuleExports>;
    isDeclareOpaqueType(props?: object | null): this is NodePath<t.DeclareOpaqueType>;
    isDeclareTypeAlias(props?: object | null): this is NodePath<t.DeclareTypeAlias>;
    isDeclareVariable(props?: object | null): this is NodePath<t.DeclareVariable>;
    isDeclaredPredicate(props?: object | null): this is NodePath<t.DeclaredPredicate>;
    isDecorator(props?: object | null): this is NodePath<t.Decorator>;
    isDirective(props?: object | null): this is NodePath<t.Directive>;
    isDirectiveLiteral(props?: object | null): this is NodePath<t.DirectiveLiteral>;
    isDoExpression(props?: object | null): this is NodePath<t.DoExpression>;
    isDoWhileStatement(props?: object | null): this is NodePath<t.DoWhileStatement>;
    isEmptyStatement(props?: object | null): this is NodePath<t.EmptyStatement>;
    isEmptyTypeAnnotation(props?: object | null): this is NodePath<t.EmptyTypeAnnotation>;
    isExistsTypeAnnotation(props?: object | null): this is NodePath<t.ExistsTypeAnnotation>;
    isExportAllDeclaration(props?: object | null): this is NodePath<t.ExportAllDeclaration>;
    isExportDeclaration(props?: object | null): this is NodePath<t.ExportDeclaration>;
    isExportDefaultDeclaration(props?: object | null): this is NodePath<t.ExportDefaultDeclaration>;
    isExportDefaultSpecifier(props?: object | null): this is NodePath<t.ExportDefaultSpecifier>;
    isExportNamedDeclaration(props?: object | null): this is NodePath<t.ExportNamedDeclaration>;
    isExportNamespaceSpecifier(props?: object | null): this is NodePath<t.ExportNamespaceSpecifier>;
    isExportSpecifier(props?: object | null): this is NodePath<t.ExportSpecifier>;
    isExpression(props?: object | null): this is NodePath<t.Expression>;
    isExpressionStatement(props?: object | null): this is NodePath<t.ExpressionStatement>;
    isExpressionWrapper(props?: object | null): this is NodePath<t.ExpressionWrapper>;
    isFile(props?: object | null): this is NodePath<t.File>;
    isFlow(props?: object | null): this is NodePath<t.Flow>;
    isFlowBaseAnnotation(props?: object | null): this is NodePath<t.FlowBaseAnnotation>;
    isFlowDeclaration(props?: object | null): this is NodePath<t.FlowDeclaration>;
    isFlowPredicate(props?: object | null): this is NodePath<t.FlowPredicate>;
    isFlowType(props?: object | null): this is NodePath<t.FlowType>;
    isFor(props?: object | null): this is NodePath<t.For>;
    isForInStatement(props?: object | null): this is NodePath<t.ForInStatement>;
    isForOfStatement(props?: object | null): this is NodePath<t.ForOfStatement>;
    isForStatement(props?: object | null): this is NodePath<t.ForStatement>;
    isForXStatement(props?: object | null): this is NodePath<t.ForXStatement>;
    isFunction(props?: object | null): this is NodePath<t.Function>;
    isFunctionDeclaration(props?: object | null): this is NodePath<t.FunctionDeclaration>;
    isFunctionExpression(props?: object | null): this is NodePath<t.FunctionExpression>;
    isFunctionParent(props?: object | null): this is NodePath<t.FunctionParent>;
    isFunctionTypeAnnotation(props?: object | null): this is NodePath<t.FunctionTypeAnnotation>;
    isFunctionTypeParam(props?: object | null): this is NodePath<t.FunctionTypeParam>;
    isGenericTypeAnnotation(props?: object | null): this is NodePath<t.GenericTypeAnnotation>;
    isIdentifier(props?: object | null): this is NodePath<t.Identifier>;
    isIfStatement(props?: object | null): this is NodePath<t.IfStatement>;
    isImmutable(props?: object | null): this is NodePath<t.Immutable>;
    isImport(props?: object | null): this is NodePath<t.Import>;
    isImportDeclaration(props?: object | null): this is NodePath<t.ImportDeclaration>;
    isImportDefaultSpecifier(props?: object | null): this is NodePath<t.ImportDefaultSpecifier>;
    isImportNamespaceSpecifier(props?: object | null): this is NodePath<t.ImportNamespaceSpecifier>;
    isImportSpecifier(props?: object | null): this is NodePath<t.ImportSpecifier>;
    isInferredPredicate(props?: object | null): this is NodePath<t.InferredPredicate>;
    isInterfaceDeclaration(props?: object | null): this is NodePath<t.InterfaceDeclaration>;
    isInterfaceExtends(props?: object | null): this is NodePath<t.InterfaceExtends>;
    isInterfaceTypeAnnotation(props?: object | null): this is NodePath<t.InterfaceTypeAnnotation>;
    isInterpreterDirective(props?: object | null): this is NodePath<t.InterpreterDirective>;
    isIntersectionTypeAnnotation(props?: object | null): this is NodePath<t.IntersectionTypeAnnotation>;
    isJSX(props?: object | null): this is NodePath<t.JSX>;
    isJSXAttribute(props?: object | null): this is NodePath<t.JSXAttribute>;
    isJSXClosingElement(props?: object | null): this is NodePath<t.JSXClosingElement>;
    isJSXClosingFragment(props?: object | null): this is NodePath<t.JSXClosingFragment>;
    isJSXElement(props?: object | null): this is NodePath<t.JSXElement>;
    isJSXEmptyExpression(props?: object | null): this is NodePath<t.JSXEmptyExpression>;
    isJSXExpressionContainer(props?: object | null): this is NodePath<t.JSXExpressionContainer>;
    isJSXFragment(props?: object | null): this is NodePath<t.JSXFragment>;
    isJSXIdentifier(props?: object | null): this is NodePath<t.JSXIdentifier>;
    isJSXMemberExpression(props?: object | null): this is NodePath<t.JSXMemberExpression>;
    isJSXNamespacedName(props?: object | null): this is NodePath<t.JSXNamespacedName>;
    isJSXOpeningElement(props?: object | null): this is NodePath<t.JSXOpeningElement>;
    isJSXOpeningFragment(props?: object | null): this is NodePath<t.JSXOpeningFragment>;
    isJSXSpreadAttribute(props?: object | null): this is NodePath<t.JSXSpreadAttribute>;
    isJSXSpreadChild(props?: object | null): this is NodePath<t.JSXSpreadChild>;
    isJSXText(props?: object | null): this is NodePath<t.JSXText>;
    isLVal(props?: object | null): this is NodePath<t.LVal>;
    isLabeledStatement(props?: object | null): this is NodePath<t.LabeledStatement>;
    isLiteral(props?: object | null): this is NodePath<t.Literal>;
    isLogicalExpression(props?: object | null): this is NodePath<t.LogicalExpression>;
    isLoop(props?: object | null): this is NodePath<t.Loop>;
    isMemberExpression(props?: object | null): this is NodePath<t.MemberExpression>;
    isMetaProperty(props?: object | null): this is NodePath<t.MetaProperty>;
    isMethod(props?: object | null): this is NodePath<t.Method>;
    isMixedTypeAnnotation(props?: object | null): this is NodePath<t.MixedTypeAnnotation>;
    isModuleDeclaration(props?: object | null): this is NodePath<t.ModuleDeclaration>;
    isModuleSpecifier(props?: object | null): this is NodePath<t.ModuleSpecifier>;
    isNewExpression(props?: object | null): this is NodePath<t.NewExpression>;
    isNoop(props?: object | null): this is NodePath<t.Noop>;
    isNullLiteral(props?: object | null): this is NodePath<t.NullLiteral>;
    isNullLiteralTypeAnnotation(props?: object | null): this is NodePath<t.NullLiteralTypeAnnotation>;
    isNullableTypeAnnotation(props?: object | null): this is NodePath<t.NullableTypeAnnotation>;

    /** @deprecated Use `isNumericLiteral` */
    isNumberLiteral(props?: object | null): this is NodePath<t.NumericLiteral>;
    isNumberLiteralTypeAnnotation(props?: object | null): this is NodePath<t.NumberLiteralTypeAnnotation>;
    isNumberTypeAnnotation(props?: object | null): this is NodePath<t.NumberTypeAnnotation>;
    isNumericLiteral(props?: object | null): this is NodePath<t.NumericLiteral>;
    isObjectExpression(props?: object | null): this is NodePath<t.ObjectExpression>;
    isObjectMember(props?: object | null): this is NodePath<t.ObjectMember>;
    isObjectMethod(props?: object | null): this is NodePath<t.ObjectMethod>;
    isObjectPattern(props?: object | null): this is NodePath<t.ObjectPattern>;
    isObjectProperty(props?: object | null): this is NodePath<t.ObjectProperty>;
    isObjectTypeAnnotation(props?: object | null): this is NodePath<t.ObjectTypeAnnotation>;
    isObjectTypeCallProperty(props?: object | null): this is NodePath<t.ObjectTypeCallProperty>;
    isObjectTypeIndexer(props?: object | null): this is NodePath<t.ObjectTypeIndexer>;
    isObjectTypeInternalSlot(props?: object | null): this is NodePath<t.ObjectTypeInternalSlot>;
    isObjectTypeProperty(props?: object | null): this is NodePath<t.ObjectTypeProperty>;
    isObjectTypeSpreadProperty(props?: object | null): this is NodePath<t.ObjectTypeSpreadProperty>;
    isOpaqueType(props?: object | null): this is NodePath<t.OpaqueType>;
    isOptionalCallExpression(props?: object | null): this is NodePath<t.OptionalCallExpression>;
    isOptionalMemberExpression(props?: object | null): this is NodePath<t.OptionalMemberExpression>;
    isParenthesizedExpression(props?: object | null): this is NodePath<t.ParenthesizedExpression>;
    isPattern(props?: object | null): this is NodePath<t.Pattern>;
    isPatternLike(props?: object | null): this is NodePath<t.PatternLike>;
    isPipelineBareFunction(props?: object | null): this is NodePath<t.PipelineBareFunction>;
    isPipelinePrimaryTopicReference(props?: object | null): this is NodePath<t.PipelinePrimaryTopicReference>;
    isPipelineTopicExpression(props?: object | null): this is NodePath<t.PipelineTopicExpression>;
    isPrivate(props?: object | null): this is NodePath<t.Private>;
    isPrivateName(props?: object | null): this is NodePath<t.PrivateName>;
    isProgram(props?: object | null): this is NodePath<t.Program>;
    isProperty(props?: object | null): this is NodePath<t.Property>;
    isPureish(props?: object | null): this is NodePath<t.Pureish>;
    isQualifiedTypeIdentifier(props?: object | null): this is NodePath<t.QualifiedTypeIdentifier>;
    isRegExpLiteral(props?: object | null): this is NodePath<t.RegExpLiteral>;

    /** @deprecated Use `isRegExpLiteral` */
    isRegexLiteral(props?: object | null): this is NodePath<t.RegExpLiteral>;
    isRestElement(props?: object | null): this is NodePath<t.RestElement>;

    /** @deprecated Use `isRestElement` */
    isRestProperty(props?: object | null): this is NodePath<t.RestElement>;
    isReturnStatement(props?: object | null): this is NodePath<t.ReturnStatement>;
    isScopable(props?: object | null): this is NodePath<t.Scopable>;
    isSequenceExpression(props?: object | null): this is NodePath<t.SequenceExpression>;
    isSpreadElement(props?: object | null): this is NodePath<t.SpreadElement>;

    /** @deprecated Use `isSpreadElement` */
    isSpreadProperty(props?: object | null): this is NodePath<t.SpreadElement>;
    isStatement(props?: object | null): this is NodePath<t.Statement>;
    isStringLiteral(props?: object | null): this is NodePath<t.StringLiteral>;
    isStringLiteralTypeAnnotation(props?: object | null): this is NodePath<t.StringLiteralTypeAnnotation>;
    isStringTypeAnnotation(props?: object | null): this is NodePath<t.StringTypeAnnotation>;
    isSuper(props?: object | null): this is NodePath<t.Super>;
    isSwitchCase(props?: object | null): this is NodePath<t.SwitchCase>;
    isSwitchStatement(props?: object | null): this is NodePath<t.SwitchStatement>;
    isTSAnyKeyword(props?: object | null): this is NodePath<t.TSAnyKeyword>;
    isTSArrayType(props?: object | null): this is NodePath<t.TSArrayType>;
    isTSAsExpression(props?: object | null): this is NodePath<t.TSAsExpression>;
    isTSBooleanKeyword(props?: object | null): this is NodePath<t.TSBooleanKeyword>;
    isTSCallSignatureDeclaration(props?: object | null): this is NodePath<t.TSCallSignatureDeclaration>;
    isTSConditionalType(props?: object | null): this is NodePath<t.TSConditionalType>;
    isTSConstructSignatureDeclaration(props?: object | null): this is NodePath<t.TSConstructSignatureDeclaration>;
    isTSConstructorType(props?: object | null): this is NodePath<t.TSConstructorType>;
    isTSDeclareFunction(props?: object | null): this is NodePath<t.TSDeclareFunction>;
    isTSDeclareMethod(props?: object | null): this is NodePath<t.TSDeclareMethod>;
    isTSEntityName(props?: object | null): this is NodePath<t.TSEntityName>;
    isTSEnumDeclaration(props?: object | null): this is NodePath<t.TSEnumDeclaration>;
    isTSEnumMember(props?: object | null): this is NodePath<t.TSEnumMember>;
    isTSExportAssignment(props?: object | null): this is NodePath<t.TSExportAssignment>;
    isTSExpressionWithTypeArguments(props?: object | null): this is NodePath<t.TSExpressionWithTypeArguments>;
    isTSExternalModuleReference(props?: object | null): this is NodePath<t.TSExternalModuleReference>;
    isTSFunctionType(props?: object | null): this is NodePath<t.TSFunctionType>;
    isTSImportEqualsDeclaration(props?: object | null): this is NodePath<t.TSImportEqualsDeclaration>;
    isTSImportType(props?: object | null): this is NodePath<t.TSImportType>;
    isTSIndexSignature(props?: object | null): this is NodePath<t.TSIndexSignature>;
    isTSIndexedAccessType(props?: object | null): this is NodePath<t.TSIndexedAccessType>;
    isTSInferType(props?: object | null): this is NodePath<t.TSInferType>;
    isTSInterfaceBody(props?: object | null): this is NodePath<t.TSInterfaceBody>;
    isTSInterfaceDeclaration(props?: object | null): this is NodePath<t.TSInterfaceDeclaration>;
    isTSIntersectionType(props?: object | null): this is NodePath<t.TSIntersectionType>;
    isTSLiteralType(props?: object | null): this is NodePath<t.TSLiteralType>;
    isTSMappedType(props?: object | null): this is NodePath<t.TSMappedType>;
    isTSMethodSignature(props?: object | null): this is NodePath<t.TSMethodSignature>;
    isTSModuleBlock(props?: object | null): this is NodePath<t.TSModuleBlock>;
    isTSModuleDeclaration(props?: object | null): this is NodePath<t.TSModuleDeclaration>;
    isTSNamespaceExportDeclaration(props?: object | null): this is NodePath<t.TSNamespaceExportDeclaration>;
    isTSNeverKeyword(props?: object | null): this is NodePath<t.TSNeverKeyword>;
    isTSNonNullExpression(props?: object | null): this is NodePath<t.TSNonNullExpression>;
    isTSNullKeyword(props?: object | null): this is NodePath<t.TSNullKeyword>;
    isTSNumberKeyword(props?: object | null): this is NodePath<t.TSNumberKeyword>;
    isTSObjectKeyword(props?: object | null): this is NodePath<t.TSObjectKeyword>;
    isTSOptionalType(props?: object | null): this is NodePath<t.TSOptionalType>;
    isTSParameterProperty(props?: object | null): this is NodePath<t.TSParameterProperty>;
    isTSParenthesizedType(props?: object | null): this is NodePath<t.TSParenthesizedType>;
    isTSPropertySignature(props?: object | null): this is NodePath<t.TSPropertySignature>;
    isTSQualifiedName(props?: object | null): this is NodePath<t.TSQualifiedName>;
    isTSRestType(props?: object | null): this is NodePath<t.TSRestType>;
    isTSStringKeyword(props?: object | null): this is NodePath<t.TSStringKeyword>;
    isTSSymbolKeyword(props?: object | null): this is NodePath<t.TSSymbolKeyword>;
    isTSThisType(props?: object | null): this is NodePath<t.TSThisType>;
    isTSTupleType(props?: object | null): this is NodePath<t.TSTupleType>;
    isTSType(props?: object | null): this is NodePath<t.TSType>;
    isTSTypeAliasDeclaration(props?: object | null): this is NodePath<t.TSTypeAliasDeclaration>;
    isTSTypeAnnotation(props?: object | null): this is NodePath<t.TSTypeAnnotation>;
    isTSTypeAssertion(props?: object | null): this is NodePath<t.TSTypeAssertion>;
    isTSTypeElement(props?: object | null): this is NodePath<t.TSTypeElement>;
    isTSTypeLiteral(props?: object | null): this is NodePath<t.TSTypeLiteral>;
    isTSTypeOperator(props?: object | null): this is NodePath<t.TSTypeOperator>;
    isTSTypeParameter(props?: object | null): this is NodePath<t.TSTypeParameter>;
    isTSTypeParameterDeclaration(props?: object | null): this is NodePath<t.TSTypeParameterDeclaration>;
    isTSTypeParameterInstantiation(props?: object | null): this is NodePath<t.TSTypeParameterInstantiation>;
    isTSTypePredicate(props?: object | null): this is NodePath<t.TSTypePredicate>;
    isTSTypeQuery(props?: object | null): this is NodePath<t.TSTypeQuery>;
    isTSTypeReference(props?: object | null): this is NodePath<t.TSTypeReference>;
    isTSUndefinedKeyword(props?: object | null): this is NodePath<t.TSUndefinedKeyword>;
    isTSUnionType(props?: object | null): this is NodePath<t.TSUnionType>;
    isTSUnknownKeyword(props?: object | null): this is NodePath<t.TSUnknownKeyword>;
    isTSVoidKeyword(props?: object | null): this is NodePath<t.TSVoidKeyword>;
    isTaggedTemplateExpression(props?: object | null): this is NodePath<t.TaggedTemplateExpression>;
    isTemplateElement(props?: object | null): this is NodePath<t.TemplateElement>;
    isTemplateLiteral(props?: object | null): this is NodePath<t.TemplateLiteral>;
    isTerminatorless(props?: object | null): this is NodePath<t.Terminatorless>;
    isThisExpression(props?: object | null): this is NodePath<t.ThisExpression>;
    isThisTypeAnnotation(props?: object | null): this is NodePath<t.ThisTypeAnnotation>;
    isThrowStatement(props?: object | null): this is NodePath<t.ThrowStatement>;
    isTryStatement(props?: object | null): this is NodePath<t.TryStatement>;
    isTupleTypeAnnotation(props?: object | null): this is NodePath<t.TupleTypeAnnotation>;
    isTypeAlias(props?: object | null): this is NodePath<t.TypeAlias>;
    isTypeAnnotation(props?: object | null): this is NodePath<t.TypeAnnotation>;
    isTypeCastExpression(props?: object | null): this is NodePath<t.TypeCastExpression>;
    isTypeParameter(props?: object | null): this is NodePath<t.TypeParameter>;
    isTypeParameterDeclaration(props?: object | null): this is NodePath<t.TypeParameterDeclaration>;
    isTypeParameterInstantiation(props?: object | null): this is NodePath<t.TypeParameterInstantiation>;
    isTypeofTypeAnnotation(props?: object | null): this is NodePath<t.TypeofTypeAnnotation>;
    isUnaryExpression(props?: object | null): this is NodePath<t.UnaryExpression>;
    isUnaryLike(props?: object | null): this is NodePath<t.UnaryLike>;
    isUnionTypeAnnotation(props?: object | null): this is NodePath<t.UnionTypeAnnotation>;
    isUpdateExpression(props?: object | null): this is NodePath<t.UpdateExpression>;
    isUserWhitespacable(props?: object | null): this is NodePath<t.UserWhitespacable>;
    isVariableDeclaration(props?: object | null): this is NodePath<t.VariableDeclaration>;
    isVariableDeclarator(props?: object | null): this is NodePath<t.VariableDeclarator>;
    isVariance(props?: object | null): this is NodePath<t.Variance>;
    isVoidTypeAnnotation(props?: object | null): this is NodePath<t.VoidTypeAnnotation>;
    isWhile(props?: object | null): this is NodePath<t.While>;
    isWhileStatement(props?: object | null): this is NodePath<t.WhileStatement>;
    isWithStatement(props?: object | null): this is NodePath<t.WithStatement>;
    isYieldExpression(props?: object | null): this is NodePath<t.YieldExpression>;

    isBindingIdentifier(props?: object | null): this is NodePath<t.Identifier>;
    isBlockScoped(
        props?: object | null,
    ): this is NodePath<t.FunctionDeclaration | t.ClassDeclaration | t.VariableDeclaration>;
    isGenerated(props?: object | null): boolean;
    isPure(props?: object | null): boolean;
    isReferenced(props?: object | null): boolean;
    isReferencedIdentifier(props?: object | null): this is NodePath<t.Identifier | t.JSXIdentifier>;
    isReferencedMemberExpression(props?: object | null): this is NodePath<t.MemberExpression>;
    isScope(props?: object | null): this is NodePath<t.Scopable>;
    isUser(props?: object | null): boolean;
    isVar(props?: object | null): this is NodePath<t.VariableDeclaration>;
    //#endregion

    //#region ------------------------- assertXXX -------------------------
    assertAnyTypeAnnotation(props?: object | null): void;
    assertArrayExpression(props?: object | null): void;
    assertArrayPattern(props?: object | null): void;
    assertArrayTypeAnnotation(props?: object | null): void;
    assertArrowFunctionExpression(props?: object | null): void;
    assertAssignmentExpression(props?: object | null): void;
    assertAssignmentPattern(props?: object | null): void;
    assertAwaitExpression(props?: object | null): void;
    assertBigIntLiteral(props?: object | null): void;
    assertBinary(props?: object | null): void;
    assertBinaryExpression(props?: object | null): void;
    assertBindExpression(props?: object | null): void;
    assertBlock(props?: object | null): void;
    assertBlockParent(props?: object | null): void;
    assertBlockStatement(props?: object | null): void;
    assertBooleanLiteral(props?: object | null): void;
    assertBooleanLiteralTypeAnnotation(props?: object | null): void;
    assertBooleanTypeAnnotation(props?: object | null): void;
    assertBreakStatement(props?: object | null): void;
    assertCallExpression(props?: object | null): void;
    assertCatchClause(props?: object | null): void;
    assertClass(props?: object | null): void;
    assertClassBody(props?: object | null): void;
    assertClassDeclaration(props?: object | null): void;
    assertClassExpression(props?: object | null): void;
    assertClassImplements(props?: object | null): void;
    assertClassMethod(props?: object | null): void;
    assertClassPrivateMethod(props?: object | null): void;
    assertClassPrivateProperty(props?: object | null): void;
    assertClassProperty(props?: object | null): void;
    assertCompletionStatement(props?: object | null): void;
    assertConditional(props?: object | null): void;
    assertConditionalExpression(props?: object | null): void;
    assertContinueStatement(props?: object | null): void;
    assertDebuggerStatement(props?: object | null): void;
    assertDeclaration(props?: object | null): void;
    assertDeclareClass(props?: object | null): void;
    assertDeclareExportAllDeclaration(props?: object | null): void;
    assertDeclareExportDeclaration(props?: object | null): void;
    assertDeclareFunction(props?: object | null): void;
    assertDeclareInterface(props?: object | null): void;
    assertDeclareModule(props?: object | null): void;
    assertDeclareModuleExports(props?: object | null): void;
    assertDeclareOpaqueType(props?: object | null): void;
    assertDeclareTypeAlias(props?: object | null): void;
    assertDeclareVariable(props?: object | null): void;
    assertDeclaredPredicate(props?: object | null): void;
    assertDecorator(props?: object | null): void;
    assertDirective(props?: object | null): void;
    assertDirectiveLiteral(props?: object | null): void;
    assertDoExpression(props?: object | null): void;
    assertDoWhileStatement(props?: object | null): void;
    assertEmptyStatement(props?: object | null): void;
    assertEmptyTypeAnnotation(props?: object | null): void;
    assertExistsTypeAnnotation(props?: object | null): void;
    assertExportAllDeclaration(props?: object | null): void;
    assertExportDeclaration(props?: object | null): void;
    assertExportDefaultDeclaration(props?: object | null): void;
    assertExportDefaultSpecifier(props?: object | null): void;
    assertExportNamedDeclaration(props?: object | null): void;
    assertExportNamespaceSpecifier(props?: object | null): void;
    assertExportSpecifier(props?: object | null): void;
    assertExpression(props?: object | null): void;
    assertExpressionStatement(props?: object | null): void;
    assertExpressionWrapper(props?: object | null): void;
    assertFile(props?: object | null): void;
    assertFlow(props?: object | null): void;
    assertFlowBaseAnnotation(props?: object | null): void;
    assertFlowDeclaration(props?: object | null): void;
    assertFlowPredicate(props?: object | null): void;
    assertFlowType(props?: object | null): void;
    assertFor(props?: object | null): void;
    assertForInStatement(props?: object | null): void;
    assertForOfStatement(props?: object | null): void;
    assertForStatement(props?: object | null): void;
    assertForXStatement(props?: object | null): void;
    assertFunction(props?: object | null): void;
    assertFunctionDeclaration(props?: object | null): void;
    assertFunctionExpression(props?: object | null): void;
    assertFunctionParent(props?: object | null): void;
    assertFunctionTypeAnnotation(props?: object | null): void;
    assertFunctionTypeParam(props?: object | null): void;
    assertGenericTypeAnnotation(props?: object | null): void;
    assertIdentifier(props?: object | null): void;
    assertIfStatement(props?: object | null): void;
    assertImmutable(props?: object | null): void;
    assertImport(props?: object | null): void;
    assertImportDeclaration(props?: object | null): void;
    assertImportDefaultSpecifier(props?: object | null): void;
    assertImportNamespaceSpecifier(props?: object | null): void;
    assertImportSpecifier(props?: object | null): void;
    assertInferredPredicate(props?: object | null): void;
    assertInterfaceDeclaration(props?: object | null): void;
    assertInterfaceExtends(props?: object | null): void;
    assertInterfaceTypeAnnotation(props?: object | null): void;
    assertInterpreterDirective(props?: object | null): void;
    assertIntersectionTypeAnnotation(props?: object | null): void;
    assertJSX(props?: object | null): void;
    assertJSXAttribute(props?: object | null): void;
    assertJSXClosingElement(props?: object | null): void;
    assertJSXClosingFragment(props?: object | null): void;
    assertJSXElement(props?: object | null): void;
    assertJSXEmptyExpression(props?: object | null): void;
    assertJSXExpressionContainer(props?: object | null): void;
    assertJSXFragment(props?: object | null): void;
    assertJSXIdentifier(props?: object | null): void;
    assertJSXMemberExpression(props?: object | null): void;
    assertJSXNamespacedName(props?: object | null): void;
    assertJSXOpeningElement(props?: object | null): void;
    assertJSXOpeningFragment(props?: object | null): void;
    assertJSXSpreadAttribute(props?: object | null): void;
    assertJSXSpreadChild(props?: object | null): void;
    assertJSXText(props?: object | null): void;
    assertLVal(props?: object | null): void;
    assertLabeledStatement(props?: object | null): void;
    assertLiteral(props?: object | null): void;
    assertLogicalExpression(props?: object | null): void;
    assertLoop(props?: object | null): void;
    assertMemberExpression(props?: object | null): void;
    assertMetaProperty(props?: object | null): void;
    assertMethod(props?: object | null): void;
    assertMixedTypeAnnotation(props?: object | null): void;
    assertModuleDeclaration(props?: object | null): void;
    assertModuleSpecifier(props?: object | null): void;
    assertNewExpression(props?: object | null): void;
    assertNoop(props?: object | null): void;
    assertNullLiteral(props?: object | null): void;
    assertNullLiteralTypeAnnotation(props?: object | null): void;
    assertNullableTypeAnnotation(props?: object | null): void;

    /** @deprecated Use `assertNumericLiteral` */
    assertNumberLiteral(props?: object | null): void;
    assertNumberLiteralTypeAnnotation(props?: object | null): void;
    assertNumberTypeAnnotation(props?: object | null): void;
    assertNumericLiteral(props?: object | null): void;
    assertObjectExpression(props?: object | null): void;
    assertObjectMember(props?: object | null): void;
    assertObjectMethod(props?: object | null): void;
    assertObjectPattern(props?: object | null): void;
    assertObjectProperty(props?: object | null): void;
    assertObjectTypeAnnotation(props?: object | null): void;
    assertObjectTypeCallProperty(props?: object | null): void;
    assertObjectTypeIndexer(props?: object | null): void;
    assertObjectTypeInternalSlot(props?: object | null): void;
    assertObjectTypeProperty(props?: object | null): void;
    assertObjectTypeSpreadProperty(props?: object | null): void;
    assertOpaqueType(props?: object | null): void;
    assertOptionalCallExpression(props?: object | null): void;
    assertOptionalMemberExpression(props?: object | null): void;
    assertParenthesizedExpression(props?: object | null): void;
    assertPattern(props?: object | null): void;
    assertPatternLike(props?: object | null): void;
    assertPipelineBareFunction(props?: object | null): void;
    assertPipelinePrimaryTopicReference(props?: object | null): void;
    assertPipelineTopicExpression(props?: object | null): void;
    assertPrivate(props?: object | null): void;
    assertPrivateName(props?: object | null): void;
    assertProgram(props?: object | null): void;
    assertProperty(props?: object | null): void;
    assertPureish(props?: object | null): void;
    assertQualifiedTypeIdentifier(props?: object | null): void;
    assertRegExpLiteral(props?: object | null): void;

    /** @deprecated Use `assertRegExpLiteral` */
    assertRegexLiteral(props?: object | null): void;
    assertRestElement(props?: object | null): void;

    /** @deprecated Use `assertRestElement` */
    assertRestProperty(props?: object | null): void;
    assertReturnStatement(props?: object | null): void;
    assertScopable(props?: object | null): void;
    assertSequenceExpression(props?: object | null): void;
    assertSpreadElement(props?: object | null): void;

    /** @deprecated Use `assertSpreadElement` */
    assertSpreadProperty(props?: object | null): void;
    assertStatement(props?: object | null): void;
    assertStringLiteral(props?: object | null): void;
    assertStringLiteralTypeAnnotation(props?: object | null): void;
    assertStringTypeAnnotation(props?: object | null): void;
    assertSuper(props?: object | null): void;
    assertSwitchCase(props?: object | null): void;
    assertSwitchStatement(props?: object | null): void;
    assertTSAnyKeyword(props?: object | null): void;
    assertTSArrayType(props?: object | null): void;
    assertTSAsExpression(props?: object | null): void;
    assertTSBooleanKeyword(props?: object | null): void;
    assertTSCallSignatureDeclaration(props?: object | null): void;
    assertTSConditionalType(props?: object | null): void;
    assertTSConstructSignatureDeclaration(props?: object | null): void;
    assertTSConstructorType(props?: object | null): void;
    assertTSDeclareFunction(props?: object | null): void;
    assertTSDeclareMethod(props?: object | null): void;
    assertTSEntityName(props?: object | null): void;
    assertTSEnumDeclaration(props?: object | null): void;
    assertTSEnumMember(props?: object | null): void;
    assertTSExportAssignment(props?: object | null): void;
    assertTSExpressionWithTypeArguments(props?: object | null): void;
    assertTSExternalModuleReference(props?: object | null): void;
    assertTSFunctionType(props?: object | null): void;
    assertTSImportEqualsDeclaration(props?: object | null): void;
    assertTSImportType(props?: object | null): void;
    assertTSIndexSignature(props?: object | null): void;
    assertTSIndexedAccessType(props?: object | null): void;
    assertTSInferType(props?: object | null): void;
    assertTSInterfaceBody(props?: object | null): void;
    assertTSInterfaceDeclaration(props?: object | null): void;
    assertTSIntersectionType(props?: object | null): void;
    assertTSLiteralType(props?: object | null): void;
    assertTSMappedType(props?: object | null): void;
    assertTSMethodSignature(props?: object | null): void;
    assertTSModuleBlock(props?: object | null): void;
    assertTSModuleDeclaration(props?: object | null): void;
    assertTSNamespaceExportDeclaration(props?: object | null): void;
    assertTSNeverKeyword(props?: object | null): void;
    assertTSNonNullExpression(props?: object | null): void;
    assertTSNullKeyword(props?: object | null): void;
    assertTSNumberKeyword(props?: object | null): void;
    assertTSObjectKeyword(props?: object | null): void;
    assertTSOptionalType(props?: object | null): void;
    assertTSParameterProperty(props?: object | null): void;
    assertTSParenthesizedType(props?: object | null): void;
    assertTSPropertySignature(props?: object | null): void;
    assertTSQualifiedName(props?: object | null): void;
    assertTSRestType(props?: object | null): void;
    assertTSStringKeyword(props?: object | null): void;
    assertTSSymbolKeyword(props?: object | null): void;
    assertTSThisType(props?: object | null): void;
    assertTSTupleType(props?: object | null): void;
    assertTSType(props?: object | null): void;
    assertTSTypeAliasDeclaration(props?: object | null): void;
    assertTSTypeAnnotation(props?: object | null): void;
    assertTSTypeAssertion(props?: object | null): void;
    assertTSTypeElement(props?: object | null): void;
    assertTSTypeLiteral(props?: object | null): void;
    assertTSTypeOperator(props?: object | null): void;
    assertTSTypeParameter(props?: object | null): void;
    assertTSTypeParameterDeclaration(props?: object | null): void;
    assertTSTypeParameterInstantiation(props?: object | null): void;
    assertTSTypePredicate(props?: object | null): void;
    assertTSTypeQuery(props?: object | null): void;
    assertTSTypeReference(props?: object | null): void;
    assertTSUndefinedKeyword(props?: object | null): void;
    assertTSUnionType(props?: object | null): void;
    assertTSUnknownKeyword(props?: object | null): void;
    assertTSVoidKeyword(props?: object | null): void;
    assertTaggedTemplateExpression(props?: object | null): void;
    assertTemplateElement(props?: object | null): void;
    assertTemplateLiteral(props?: object | null): void;
    assertTerminatorless(props?: object | null): void;
    assertThisExpression(props?: object | null): void;
    assertThisTypeAnnotation(props?: object | null): void;
    assertThrowStatement(props?: object | null): void;
    assertTryStatement(props?: object | null): void;
    assertTupleTypeAnnotation(props?: object | null): void;
    assertTypeAlias(props?: object | null): void;
    assertTypeAnnotation(props?: object | null): void;
    assertTypeCastExpression(props?: object | null): void;
    assertTypeParameter(props?: object | null): void;
    assertTypeParameterDeclaration(props?: object | null): void;
    assertTypeParameterInstantiation(props?: object | null): void;
    assertTypeofTypeAnnotation(props?: object | null): void;
    assertUnaryExpression(props?: object | null): void;
    assertUnaryLike(props?: object | null): void;
    assertUnionTypeAnnotation(props?: object | null): void;
    assertUpdateExpression(props?: object | null): void;
    assertUserWhitespacable(props?: object | null): void;
    assertVariableDeclaration(props?: object | null): void;
    assertVariableDeclarator(props?: object | null): void;
    assertVariance(props?: object | null): void;
    assertVoidTypeAnnotation(props?: object | null): void;
    assertWhile(props?: object | null): void;
    assertWhileStatement(props?: object | null): void;
    assertWithStatement(props?: object | null): void;
    assertYieldExpression(props?: object | null): void;

    assertBindingIdentifier(props?: object | null): void;
    assertBlockScoped(props?: object | null): void;
    assertGenerated(props?: object | null): void;
    assertPure(props?: object | null): void;
    assertReferenced(props?: object | null): void;
    assertReferencedIdentifier(props?: object | null): void;
    assertReferencedMemberExpression(props?: object | null): void;
    assertScope(props?: object | null): void;
    assertUser(props?: object | null): void;
    assertVar(props?: object | null): void;
    //#endregion
}

export interface HubInterface {
    getCode(): string | undefined;
    getScope(): Scope | undefined;
    addHelper(name: string): any;
    buildError<E extends Error>(node: Node, msg: string, Error: new (message?: string) => E): E;
}

export class Hub implements HubInterface {
    constructor();
    getCode(): string | undefined;
    getScope(): Scope | undefined;
    addHelper(name: string): any;
    buildError<E extends Error>(node: Node, msg: string, Constructor: new (message?: string) => E): E;
}

export interface TraversalContext {
    parentPath: NodePath;
    scope: Scope;
    state: any;
    opts: any;
}
