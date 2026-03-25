import { NodePath } from "./node-path";
import { Fork } from "./types";
export interface Scope {
    path: NodePath;
    node: any;
    isGlobal: boolean;
    depth: number;
    parent: any;
    bindings: any;
    types: any;
    didScan: boolean;
    declares(name: any): any;
    declaresType(name: any): any;
    declareTemporary(prefix?: any): any;
    injectTemporary(identifier: any, init: any): any;
    scan(force?: any): any;
    getBindings(): any;
    getTypes(): any;
    lookup(name: any): any;
    lookupType(name: any): any;
    getGlobalScope(): Scope;
}
export interface ScopeConstructor {
    new (path: NodePath, parentScope: any): Scope;
    isEstablishedBy(node: any): any;
}
export default function scopePlugin(fork: Fork): ScopeConstructor;
