import * as vue from '@vue/language-core';
import type * as ts from 'typescript';
import type { ComponentMeta, MetaCheckerOptions } from './types';
export * from './types';
export declare function createCheckerByJsonConfigBase(ts: typeof import('typescript'), rootDir: string, json: any, checkerOptions?: MetaCheckerOptions): {
    getExportNames: (componentPath: string) => string[];
    getComponentMeta: (componentPath: string, exportName?: string) => ComponentMeta;
    updateFile(fileName: string, text: string): void;
    deleteFile(fileName: string): void;
    reload(): void;
    clearCache(): void;
    __internal__: {
        tsLs: ts.LanguageService;
    };
};
export declare function createCheckerBase(ts: typeof import('typescript'), tsconfig: string, checkerOptions?: MetaCheckerOptions): {
    getExportNames: (componentPath: string) => string[];
    getComponentMeta: (componentPath: string, exportName?: string) => ComponentMeta;
    updateFile(fileName: string, text: string): void;
    deleteFile(fileName: string): void;
    reload(): void;
    clearCache(): void;
    __internal__: {
        tsLs: ts.LanguageService;
    };
};
export declare function baseCreate(ts: typeof import('typescript'), getCommandLine: () => vue.ParsedCommandLine, checkerOptions: MetaCheckerOptions, rootPath: string, globalComponentName: string): {
    getExportNames: (componentPath: string) => string[];
    getComponentMeta: (componentPath: string, exportName?: string) => ComponentMeta;
    updateFile(fileName: string, text: string): void;
    deleteFile(fileName: string): void;
    reload(): void;
    clearCache(): void;
    __internal__: {
        tsLs: ts.LanguageService;
    };
};
