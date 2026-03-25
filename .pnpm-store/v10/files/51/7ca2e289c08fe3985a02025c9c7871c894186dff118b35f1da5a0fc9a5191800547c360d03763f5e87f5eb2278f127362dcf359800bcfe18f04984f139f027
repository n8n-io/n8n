/// <reference types="node" />
/// <reference types="node" />
import { Service } from './index';
export interface NodeLoaderHooksAPI1 {
    resolve: NodeLoaderHooksAPI1.ResolveHook;
    getFormat: NodeLoaderHooksAPI1.GetFormatHook;
    transformSource: NodeLoaderHooksAPI1.TransformSourceHook;
}
export declare namespace NodeLoaderHooksAPI1 {
    type ResolveHook = NodeLoaderHooksAPI2.ResolveHook;
    type GetFormatHook = (url: string, context: {}, defaultGetFormat: GetFormatHook) => Promise<{
        format: NodeLoaderHooksFormat;
    }>;
    type TransformSourceHook = (source: string | Buffer, context: {
        url: string;
        format: NodeLoaderHooksFormat;
    }, defaultTransformSource: NodeLoaderHooksAPI1.TransformSourceHook) => Promise<{
        source: string | Buffer;
    }>;
}
export interface NodeLoaderHooksAPI2 {
    resolve: NodeLoaderHooksAPI2.ResolveHook;
    load: NodeLoaderHooksAPI2.LoadHook;
}
export declare namespace NodeLoaderHooksAPI2 {
    type ResolveHook = (specifier: string, context: {
        conditions?: NodeImportConditions;
        importAssertions?: NodeImportAssertions;
        parentURL: string;
    }, defaultResolve: ResolveHook) => Promise<{
        url: string;
        format?: NodeLoaderHooksFormat;
        shortCircuit?: boolean;
    }>;
    type LoadHook = (url: string, context: {
        format: NodeLoaderHooksFormat | null | undefined;
        importAssertions?: NodeImportAssertions;
    }, defaultLoad: NodeLoaderHooksAPI2['load']) => Promise<{
        format: NodeLoaderHooksFormat;
        source: string | Buffer | undefined;
        shortCircuit?: boolean;
    }>;
    type NodeImportConditions = unknown;
    interface NodeImportAssertions {
        type?: 'json';
    }
}
export declare type NodeLoaderHooksFormat = 'builtin' | 'commonjs' | 'dynamic' | 'json' | 'module' | 'wasm';
export declare type NodeImportConditions = unknown;
export interface NodeImportAssertions {
    type?: 'json';
}
export declare function createEsmHooks(tsNodeService: Service): NodeLoaderHooksAPI1 | NodeLoaderHooksAPI2;
