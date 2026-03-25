import type * as ts from 'typescript';
import type { RawVueCompilerOptions, VueCompilerOptions, VueLanguagePlugin } from '../types';
export type ParsedCommandLine = ts.ParsedCommandLine & {
    vueOptions: VueCompilerOptions;
};
export declare function createParsedCommandLineByJson(ts: typeof import('typescript'), parseConfigHost: ts.ParseConfigHost & {
    writeFile?(path: string, data: string): void;
}, rootDir: string, json: any, configFileName?: string, skipGlobalTypesSetup?: boolean): ParsedCommandLine;
export declare function createParsedCommandLine(ts: typeof import('typescript'), parseConfigHost: ts.ParseConfigHost, tsConfigPath: string, skipGlobalTypesSetup?: boolean): ParsedCommandLine;
export declare class CompilerOptionsResolver {
    options: Omit<RawVueCompilerOptions, 'target' | 'plugin'>;
    fallbackTarget: number | undefined;
    target: number | undefined;
    plugins: VueLanguagePlugin[];
    addConfig(options: RawVueCompilerOptions, rootDir: string): void;
    build(defaults?: VueCompilerOptions): VueCompilerOptions;
}
export declare function getDefaultCompilerOptions(target?: number, lib?: string, strictTemplates?: boolean): VueCompilerOptions;
/**
 * @deprecated use `getDefaultCompilerOptions` instead
 */
export declare function resolveVueCompilerOptions(options: Partial<VueCompilerOptions>): VueCompilerOptions;
export declare function setupGlobalTypes(rootDir: string, vueOptions: VueCompilerOptions, host: {
    fileExists(path: string): boolean;
    writeFile?(path: string, data: string): void;
}): VueCompilerOptions['__setupedGlobalTypes'];
