import type * as ts from 'typescript';
import type { VueCompilerOptions } from '../types';
export type ParsedCommandLine = ts.ParsedCommandLine & {
    vueOptions: VueCompilerOptions;
};
export declare function createParsedCommandLineByJson(ts: typeof import('typescript'), parseConfigHost: ts.ParseConfigHost & {
    writeFile?(path: string, data: string): void;
}, rootDir: string, json: any, configFileName?: string, skipGlobalTypesSetup?: boolean): ParsedCommandLine;
export declare function createParsedCommandLine(ts: typeof import('typescript'), parseConfigHost: ts.ParseConfigHost, tsConfigPath: string, skipGlobalTypesSetup?: boolean): ParsedCommandLine;
export declare function resolveVueCompilerOptions(vueOptions: Partial<VueCompilerOptions>): VueCompilerOptions;
export declare function setupGlobalTypes(rootDir: string, vueOptions: VueCompilerOptions, host: {
    fileExists(path: string): boolean;
    writeFile?(path: string, data: string): void;
}): VueCompilerOptions['__setupedGlobalTypes'];
