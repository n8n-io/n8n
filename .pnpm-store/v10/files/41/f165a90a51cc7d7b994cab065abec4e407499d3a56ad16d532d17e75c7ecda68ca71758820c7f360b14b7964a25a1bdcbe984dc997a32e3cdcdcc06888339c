export * from './lib/common';
export * from './lib/node/proxyLanguageService';
export * from './lib/node/decorateLanguageServiceHost';
export * from './lib/node/decorateProgram';
export * from './lib/node/proxyCreateProgram';
export * from './lib/protocol/createProject';
export * from './lib/protocol/createSys';
import type { VirtualCode } from '@volar/language-core';
import type * as ts from 'typescript';
import { URI } from 'vscode-uri';
declare module '@volar/language-service' {
    interface ProjectContext {
        typescript?: {
            configFileName: string | undefined;
            sys: ts.System & {
                version?: number;
                sync?(): Promise<number>;
            };
            languageServiceHost: ts.LanguageServiceHost;
            getExtraServiceScript(fileName: string): TypeScriptExtraServiceScript | undefined;
            uriConverter: {
                asUri(fileName: string): URI;
                asFileName(uri: URI): string;
            };
        };
    }
}
declare module '@volar/language-core' {
    interface LanguagePlugin {
        typescript?: TypeScriptGenericOptions & TypeScriptNonTSPluginOptions;
    }
}
/**
 * The following options available to all situations.
 */
interface TypeScriptGenericOptions {
    extraFileExtensions: ts.FileExtensionInfo[];
    resolveHiddenExtensions?: boolean;
    getServiceScript(root: VirtualCode): TypeScriptServiceScript | undefined;
}
/**
 * The following options will not be available in TS plugin.
 */
interface TypeScriptNonTSPluginOptions {
    getExtraServiceScripts?(fileName: string, root: VirtualCode): TypeScriptExtraServiceScript[];
    /**
     * @deprecated Remove in 2.5.0
     */
    resolveLanguageServiceHost?(host: ts.LanguageServiceHost): ts.LanguageServiceHost;
}
export interface TypeScriptServiceScript {
    code: VirtualCode;
    extension: '.ts' | '.js' | '.mts' | '.mjs' | '.cjs' | '.cts' | '.d.ts' | string;
    scriptKind: ts.ScriptKind;
    /** See #188 */
    preventLeadingOffset?: boolean;
}
export interface TypeScriptExtraServiceScript extends TypeScriptServiceScript {
    fileName: string;
}
