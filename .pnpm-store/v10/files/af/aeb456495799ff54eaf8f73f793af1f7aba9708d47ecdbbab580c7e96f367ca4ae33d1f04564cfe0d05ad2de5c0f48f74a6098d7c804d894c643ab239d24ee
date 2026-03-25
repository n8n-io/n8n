import { type ResolvedResult } from 'eslint-import-context';
import { ResolverFactory } from 'unrs-resolver';
import type { TypeScriptResolverOptions } from './types.js';
export * from './constants.js';
export * from './helpers.js';
export * from './normalize-options.js';
export type * from './types.js';
export declare const resolve: (source: string, file: string, options?: TypeScriptResolverOptions | null, resolver?: ResolverFactory | null) => ResolvedResult;
export declare const createTypeScriptImportResolver: (options?: TypeScriptResolverOptions | null) => {
    interfaceVersion: number;
    name: string;
    resolve(source: string, file: string): ResolvedResult;
};
