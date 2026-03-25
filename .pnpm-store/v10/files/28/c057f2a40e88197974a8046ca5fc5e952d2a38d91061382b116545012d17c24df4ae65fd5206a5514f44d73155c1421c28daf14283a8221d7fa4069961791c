import { ASTNode, Fork } from "./types";
export interface Path<V = any> {
    value: V;
    parentPath: any;
    name: any;
    __childCache: object | null;
    getValueProperty(name: any): any;
    get(...names: any[]): any;
    each(callback: any, context?: any): any;
    map(callback: any, context?: any): any;
    filter(callback: any, context?: any): any;
    shift(): any;
    unshift(...args: any[]): any;
    push(...args: any[]): any;
    pop(): any;
    insertAt(index: number, ...args: any[]): any;
    insertBefore(...args: any[]): any;
    insertAfter(...args: any[]): any;
    replace(replacement?: ASTNode, ...args: ASTNode[]): any;
}
export interface PathConstructor {
    new <V = any>(value: any, parentPath?: any, name?: any): Path<V>;
}
export default function pathPlugin(fork: Fork): PathConstructor;
