import * as acorn from "acorn"

export type FullWalkerCallback<TState> = (
  node: acorn.Node,
  state: TState,
  type: string
) => void

export type FullAncestorWalkerCallback<TState> = (
  node: acorn.Node,
  state: TState,
  ancestors: acorn.Node[],
  type: string
) => void

type AggregateType = {
  Expression: acorn.Expression,
  Statement: acorn.Statement,
  Function: acorn.Function,
  Class: acorn.Class,
  Pattern: acorn.Pattern,
  ForInit: acorn.VariableDeclaration | acorn.Expression
}

export type SimpleVisitors<TState> = {
  [type in acorn.AnyNode["type"]]?: (node: Extract<acorn.AnyNode, { type: type }>, state: TState) => void
} & {
  [type in keyof AggregateType]?: (node: AggregateType[type], state: TState) => void
}

export type AncestorVisitors<TState> = {
  [type in acorn.AnyNode["type"]]?: ( node: Extract<acorn.AnyNode, { type: type }>, state: TState, ancestors: acorn.Node[]
) => void
} & {
  [type in keyof AggregateType]?: (node: AggregateType[type], state: TState, ancestors: acorn.Node[]) => void
}

export type WalkerCallback<TState> = (node: acorn.Node, state: TState) => void

export type RecursiveVisitors<TState> = {
  [type in acorn.AnyNode["type"]]?: ( node: Extract<acorn.AnyNode, { type: type }>, state: TState, callback: WalkerCallback<TState>) => void
} &  {
  [type in keyof AggregateType]?: (node: AggregateType[type], state: TState, callback: WalkerCallback<TState>) => void
}

export type FindPredicate = (type: string, node: acorn.Node) => boolean

export interface Found<TState> {
  node: acorn.Node,
  state: TState
}

/**
 * does a 'simple' walk over a tree
 * @param node the AST node to walk
 * @param visitors an object with properties whose names correspond to node types in the {@link https://github.com/estree/estree | ESTree spec}. The properties should contain functions that will be called with the node object and, if applicable the state at that point.
 * @param base a walker algorithm
 * @param state a start state. The default walker will simply visit all statements and expressions and not produce a meaningful state. (An example of a use of state is to track scope at each point in the tree.)
 */
export function simple<TState>(
  node: acorn.Node,
  visitors: SimpleVisitors<TState>,
  base?: RecursiveVisitors<TState>,
  state?: TState
): void

/**
 * does a 'simple' walk over a tree, building up an array of ancestor nodes (including the current node) and passing the array to the callbacks as a third parameter.
 * @param node
 * @param visitors
 * @param base
 * @param state
 */
export function ancestor<TState>(
    node: acorn.Node,
    visitors: AncestorVisitors<TState>,
    base?: RecursiveVisitors<TState>,
    state?: TState
  ): void

/**
 * does a 'recursive' walk, where the walker functions are responsible for continuing the walk on the child nodes of their target node.
 * @param node
 * @param state the start state
 * @param functions contain an object that maps node types to walker functions
 * @param base provides the fallback walker functions for node types that aren't handled in the {@link functions} object. If not given, the default walkers will be used.
 */
export function recursive<TState>(
  node: acorn.Node,
  state: TState,
  functions: RecursiveVisitors<TState>,
  base?: RecursiveVisitors<TState>
): void

/**
 * does a 'full' walk over a tree, calling the {@link callback} with the arguments (node, state, type) for each node
 * @param node
 * @param callback
 * @param base
 * @param state
 */
export function full<TState>(
  node: acorn.Node,
  callback: FullWalkerCallback<TState>,
  base?: RecursiveVisitors<TState>,
  state?: TState
): void

/**
 * does a 'full' walk over a tree, building up an array of ancestor nodes (including the current node) and passing the array to the callbacks as a third parameter.
 * @param node
 * @param callback
 * @param base
 * @param state
 */
export function fullAncestor<TState>(
  node: acorn.Node,
  callback: FullAncestorWalkerCallback<TState>,
  base?: RecursiveVisitors<TState>,
  state?: TState
): void

/**
 * builds a new walker object by using the walker functions in {@link functions} and filling in the missing ones by taking defaults from {@link base}.
 * @param functions
 * @param base
 */
export function make<TState>(
  functions: RecursiveVisitors<TState>,
  base?: RecursiveVisitors<TState>
): RecursiveVisitors<TState>

/**
 * tries to locate a node in a tree at the given start and/or end offsets, which satisfies the predicate test. {@link start} and {@link end} can be either `null` (as wildcard) or a `number`. {@link test} may be a string (indicating a node type) or a function that takes (nodeType, node) arguments and returns a boolean indicating whether this node is interesting. {@link base} and {@link state} are optional, and can be used to specify a custom walker. Nodes are tested from inner to outer, so if two nodes match the boundaries, the inner one will be preferred.
 * @param node
 * @param start
 * @param end
 * @param type
 * @param base
 * @param state
 */
export function findNodeAt<TState>(
  node: acorn.Node,
  start: number | undefined,
  end?: number | undefined,
  type?: FindPredicate | string,
  base?: RecursiveVisitors<TState>,
  state?: TState
): Found<TState> | undefined

/**
 * like {@link findNodeAt}, but will match any node that exists 'around' (spanning) the given position.
 * @param node
 * @param start
 * @param type
 * @param base
 * @param state
 */
export function findNodeAround<TState>(
  node: acorn.Node,
  start: number | undefined,
  type?: FindPredicate | string,
  base?: RecursiveVisitors<TState>,
  state?: TState
): Found<TState> | undefined

/**
 * Find the outermost matching node after a given position.
 */
export const findNodeAfter: typeof findNodeAround

/**
 * Find the outermost matching node before a given position.
 */
export const findNodeBefore: typeof findNodeAround

export const base: RecursiveVisitors<any>
