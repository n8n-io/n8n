import { ASTNode, Fork, Omit } from "./types";
import { NodePath } from "./node-path";
export interface PathVisitor {
    _reusableContextStack: any;
    _methodNameTable: any;
    _shouldVisitComments: any;
    Context: any;
    _visiting: any;
    _changeReported: any;
    _abortRequested: boolean;
    visit(...args: any[]): any;
    reset(...args: any[]): any;
    visitWithoutReset(path: any): any;
    AbortRequest: any;
    abort(): void;
    visitor: any;
    acquireContext(path: any): any;
    releaseContext(context: any): void;
    reportChanged(): void;
    wasChangeReported(): any;
}
export interface PathVisitorStatics {
    fromMethodsObject(methods?: any): Visitor;
    visit<M = {}>(node: ASTNode, methods?: import("./gen/visitor").Visitor<M>): any;
}
export interface PathVisitorConstructor extends PathVisitorStatics {
    new (): PathVisitor;
}
export interface Visitor extends PathVisitor {
}
export interface VisitorConstructor extends PathVisitorStatics {
    new (): Visitor;
}
export interface VisitorMethods {
    [visitorMethod: string]: (path: NodePath) => any;
}
export interface SharedContextMethods {
    currentPath: any;
    needToCallTraverse: boolean;
    Context: any;
    visitor: any;
    reset(path: any, ...args: any[]): any;
    invokeVisitorMethod(methodName: string): any;
    traverse(path: any, newVisitor?: VisitorMethods): any;
    visit(path: any, newVisitor?: VisitorMethods): any;
    reportChanged(): void;
    abort(): void;
}
export interface Context extends Omit<PathVisitor, "visit" | "reset">, SharedContextMethods {
}
export default function pathVisitorPlugin(fork: Fork): PathVisitorConstructor;
