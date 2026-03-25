import type * as ts from 'typescript';
import type { Language, LanguagePlugin } from '@volar/language-core';
export declare let getLanguagePlugins: (ts: typeof import('typescript'), options: ts.CreateProgramOptions) => LanguagePlugin<string>[] | {
    languagePlugins: LanguagePlugin<string>[];
    setup?(language: Language<string>): void;
};
export declare function runTsc(tscPath: string, options: string[] | {
    extraSupportedExtensions: string[];
    extraExtensionsToRemove: string[];
}, _getLanguagePlugins: typeof getLanguagePlugins, typescriptObject?: string): void;
/**
 * Replaces the code of typescript to add support for additional extensions and language plugins.
 *
 * @param tsc - The original code of typescript.
 * @param proxyApiPath - The path to the proxy API.
 * @param extraSupportedExtensions - An array of additional supported extensions.
 * @param extraExtensionsToRemove - An array of extensions to remove.
 * @param getLanguagePluginsFile - The file to get language plugins from.
 * @param typescriptObject - The object to use as typescript.
 * @returns The modified typescript code.
 */
export declare function transformTscContent(tsc: string, proxyApiPath: string, extraSupportedExtensions: string[], extraExtensionsToRemove: string[], getLanguagePluginsFile?: string, typescriptObject?: string): string;
