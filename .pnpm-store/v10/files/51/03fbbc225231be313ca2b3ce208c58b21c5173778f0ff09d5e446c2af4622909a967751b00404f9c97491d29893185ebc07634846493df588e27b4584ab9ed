import { type Language } from '@volar/language-core';
import type * as ts from 'typescript';
import type { TypeScriptExtraServiceScript } from '../..';
import type { createSys } from './createSys';
export interface TypeScriptProjectHost extends Pick<ts.LanguageServiceHost, 'getLocalizedDiagnosticMessages' | 'getCurrentDirectory' | 'getCompilationSettings' | 'getProjectReferences' | 'getScriptFileNames' | 'getProjectVersion'> {
}
declare module 'typescript' {
    interface LanguageServiceHost {
        /**
         * @internal
         */
        getModuleResolutionCache?(): ts.ModuleResolutionCache;
    }
}
export declare function createLanguageServiceHost<T>(ts: typeof import('typescript'), sys: ReturnType<typeof createSys> | ts.System, language: Language<T>, asScriptId: (fileName: string) => T, projectHost: TypeScriptProjectHost): {
    languageServiceHost: ts.LanguageServiceHost;
    getExtraServiceScript: (fileName: string) => TypeScriptExtraServiceScript | undefined;
};
