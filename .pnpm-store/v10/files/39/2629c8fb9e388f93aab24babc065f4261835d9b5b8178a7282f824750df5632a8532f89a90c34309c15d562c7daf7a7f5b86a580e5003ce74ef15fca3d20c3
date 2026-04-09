import type { InternalOptions, Predicate, Adapter } from "../types.js";
/**
 * Find all elements matching the query. If not in XML mode, the query will ignore
 * the contents of `<template>` elements.
 *
 * @param query - Function that returns true if the element matches the query.
 * @param elems - Nodes to query. If a node is an element, its children will be queried.
 * @param options - Options for querying the document.
 * @returns All matching elements.
 */
export declare function findAll<Node, ElementNode extends Node>(query: Predicate<ElementNode>, elems: Node[], options: InternalOptions<Node, ElementNode>): ElementNode[];
/**
 * Find the first element matching the query. If not in XML mode, the query will ignore
 * the contents of `<template>` elements.
 *
 * @param query - Function that returns true if the element matches the query.
 * @param elems - Nodes to query. If a node is an element, its children will be queried.
 * @param options - Options for querying the document.
 * @returns The first matching element, or null if there was no match.
 */
export declare function findOne<Node, ElementNode extends Node>(query: Predicate<ElementNode>, elems: Node[], options: InternalOptions<Node, ElementNode>): ElementNode | null;
export declare function getNextSiblings<Node, ElementNode extends Node>(elem: Node, adapter: Adapter<Node, ElementNode>): ElementNode[];
export declare function getElementParent<Node, ElementNode extends Node>(node: ElementNode, adapter: Adapter<Node, ElementNode>): ElementNode | null;
//# sourceMappingURL=querying.d.ts.map