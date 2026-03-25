/** @typedef { import('estree').BaseNode} BaseNode */
/** @typedef { import('./walker').WalkerContext} WalkerContext */
/** @typedef {(
 *    this: WalkerContext,
 *    node: BaseNode,
 *    parent: BaseNode,
 *    key: string,
 *    index: number
 * ) => Promise<void>} AsyncHandler */
export class AsyncWalker extends WalkerBase {
    /**
     *
     * @param {AsyncHandler} enter
     * @param {AsyncHandler} leave
     */
    constructor(enter: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>, leave: (this: {
        skip: () => void;
        remove: () => void;
        replace: (node: import("estree").BaseNode) => void;
    }, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>);
    /** @type {AsyncHandler} */
    enter: AsyncHandler;
    /** @type {AsyncHandler} */
    leave: AsyncHandler;
    /**
     *
     * @param {BaseNode} node
     * @param {BaseNode} parent
     * @param {string} [prop]
     * @param {number} [index]
     * @returns {Promise<BaseNode>}
     */
    visit(node: import("estree").BaseNode, parent: import("estree").BaseNode, prop?: string, index?: number): Promise<import("estree").BaseNode>;
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
export type AsyncHandler = (this: {
    skip: () => void;
    remove: () => void;
    replace: (node: import("estree").BaseNode) => void;
}, node: import("estree").BaseNode, parent: import("estree").BaseNode, key: string, index: number) => Promise<void>;
import { WalkerBase } from "./walker.js";
