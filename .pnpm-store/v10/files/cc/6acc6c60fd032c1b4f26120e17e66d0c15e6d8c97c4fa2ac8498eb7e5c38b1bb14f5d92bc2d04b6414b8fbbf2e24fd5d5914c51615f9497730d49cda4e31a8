import { type Language, type LanguagePlugin } from '@volar/language-core/lib/types';
import type * as ts from 'typescript';
export declare const externalFiles: WeakMap<ts.server.Project, string[]>;
export declare const projectExternalFileExtensions: WeakMap<ts.server.Project, string[]>;
export declare const decoratedLanguageServices: WeakSet<ts.LanguageService>;
export declare const decoratedLanguageServiceHosts: WeakSet<ts.LanguageServiceHost>;
/**
 * Wrap `getScriptInfo` to handle large files that may crash the language service.
 *
 * Introduced to fix issues with converting `relatedInformation` (in Diagnostics)
 * when working with large files.
 *
 * https://github.com/volarjs/volar.js/commit/e242709a91e9d2919dc4fa59278dd266fd11e7a3
 */
export declare function makeGetScriptInfoWithLargeFileFailsafe(info: ts.server.PluginCreateInfo): (fileName: string) => ts.server.ScriptInfo | undefined;
export declare function createLanguageCommon(createPluginResult: createPluginCallbackReturnValue, ts: typeof import('typescript'), info: ts.server.PluginCreateInfo, initializeProxiedLanguageService: (language: Language<string>) => void): void;
export declare const makeGetExternalFiles: (ts: typeof import("typescript")) => (project: ts.server.Project, updateLevel?: number) => string[];
export type createPluginCallbackReturnValue = {
    languagePlugins: LanguagePlugin<string>[];
    setup?: (language: Language<string>) => void;
};
export type createPluginCallbackSync = (ts: typeof import('typescript'), info: ts.server.PluginCreateInfo) => createPluginCallbackReturnValue;
export type createPluginCallbackAsync = (ts: typeof import('typescript'), info: ts.server.PluginCreateInfo) => Promise<createPluginCallbackReturnValue>;
export declare function isHasAlreadyDecoratedLanguageService(info: ts.server.PluginCreateInfo): boolean;
