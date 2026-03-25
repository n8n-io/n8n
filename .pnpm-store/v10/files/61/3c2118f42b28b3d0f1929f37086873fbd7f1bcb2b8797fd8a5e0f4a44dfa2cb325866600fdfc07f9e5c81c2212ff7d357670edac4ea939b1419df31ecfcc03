/** @typedef { import('estree').BaseNode} BaseNode */
/** @typedef { import('./walker.js').WalkerContext} WalkerContext */
/** @typedef {(
 *    this: WalkerContext,
 *    node: BaseNode,
 *    parent: BaseNode,
 *    key: string,
 *    index: number
 * ) => void} SyncHandler */
export class SyncWalker extends WalkerBase {
    /**
     *
     * @param {SyncHandler} enter
     * @param {SyncHandler} leave
     */
    constructor(enter: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void, leave: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void);
    /** @type {SyncHandler} */
    enter: SyncHandler;
    /** @type {SyncHandler} */
    leave: SyncHandler;
    /**
     *
     * @param {BaseNode} node
     * @param {BaseNode} parent
     * @param {string} [prop]
     * @param {number} [index]
     * @returns {BaseNode}
     */
    visit(node: import("estree").BaseNode, parent: import("estree").BaseNode, prop?: string, index?: number): import("estree").BaseNode;
    should_skip: any;
    should_remove: any;
    replacement: any;
}
export type BaseNode = import("estree").BaseNode;
export type WalkerContext = {
    skip: () => void;
    remove: () => void;
    replace: (node: import("estree").BaseNode) => void;
};
export type SyncHandler = (this: {
    skip: () => void;
    remove: () => void;
    replace: (node: import("estree").BaseNode) => void;
}, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => void;
import { WalkerBase } from "./walker.js";
