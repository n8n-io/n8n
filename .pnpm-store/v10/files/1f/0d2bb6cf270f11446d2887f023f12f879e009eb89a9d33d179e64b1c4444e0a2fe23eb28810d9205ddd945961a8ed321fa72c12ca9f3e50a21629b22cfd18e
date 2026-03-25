import * as ts from 'typescript';
import type { MetaCheckerOptions } from './lib/types';
export * from './lib/types';
export declare function createCheckerByJson(rootPath: string, json: any, checkerOptions?: MetaCheckerOptions): {
    getExportNames: (componentPath: string) => string[];
    getComponentMeta: (componentPath: string, exportName?: string) => import("./lib/types").ComponentMeta;
    updateFile(fileName: string, text: string): void;
    deleteFile(fileName: string): void;
    reload(): void;
    clearCache(): void;
    __internal__: {
        tsLs: ts.LanguageService;
    };
};
export declare function createChecker(tsconfig: string, checkerOptions?: MetaCheckerOptions): {
    getExportNames: (componentPath: string) => string[];
    getComponentMeta: (componentPath: string, exportName?: string) => import("./lib/types").ComponentMeta;
    updateFile(fileName: string, text: string): void;
    deleteFile(fileName: string): void;
    reload(): void;
    clearCache(): void;
    __internal__: {
        tsLs: ts.LanguageService;
    };
};
