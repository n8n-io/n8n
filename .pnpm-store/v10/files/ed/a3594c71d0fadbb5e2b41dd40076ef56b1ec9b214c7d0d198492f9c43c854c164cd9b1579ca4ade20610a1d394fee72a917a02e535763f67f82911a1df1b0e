/** @typedef { import('estree').BaseNode} BaseNode */
/** @typedef { import('./sync.js').SyncHandler} SyncHandler */
/** @typedef { import('./async.js').AsyncHandler} AsyncHandler */
/**
 *
 * @param {BaseNode} ast
 * @param {{
 *   enter?: SyncHandler
 *   leave?: SyncHandler
 * }} walker
 * @returns {BaseNode}
 */
export function walk(ast: import("estree").BaseNode, { enter, leave }: {
    enter?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void;
    leave?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void;
}): import("estree").BaseNode;
/**
 *
 * @param {BaseNode} ast
 * @param {{
 *   enter?: AsyncHandler
 *   leave?: AsyncHandler
 * }} walker
 * @returns {Promise<BaseNode>}
 */
export function asyncWalk(ast: import("estree").BaseNode, { enter, leave }: {
    enter?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>;
    leave?: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>;
}): Promise<import("estree").BaseNode>;
export type BaseNode = import("estree").BaseNode;
export type SyncHandler = (this: {
    skip: () => void;
    remove: () => void;
    replace: (node: import("estree").BaseNode) => void;
}, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void;
export type AsyncHandler = (this: {
    skip: () => void;
    remove: () => void;
    replace: (node: import("estree").BaseNode) => void;
}, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>;
